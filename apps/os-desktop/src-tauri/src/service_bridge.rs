// Service bridge: manages the privileged Rust service child process.
// Communicates via line-delimited JSON-RPC over stdin/stdout.
//
// Concurrency model:
// - Every request gets its own `oneshot` channel registered in `pending`
//   before the line is written. A single reader thread routes each response
//   line to the matching sender. No lock is held while a call is waiting, so
//   a slow call (restore point, AppX removal) never blocks `service_status`
//   or the bookkeeping calls of other tasks.
// - Timeouts are per method (see `timeout_for`). A timed-out request is
//   removed from `pending`; if its response arrives later it is logged and
//   dropped instead of being mistaken for another request's answer.
// - When the child exits, the reader thread fails every pending request and
//   marks the bridge dead. The next call makes exactly one restart attempt.

// Logging to stderr must never be able to take the app down: `eprintln!`
// panics when stderr is a closed pipe (e.g. the app was started by a launcher
// that redirected stderr and then exited). A panic in the service stderr
// forwarder would stop draining the service's pipe and break every request.
macro_rules! elog {
    ($($arg:tt)*) => {{
        use std::io::Write as _;
        let _ = writeln!(std::io::stderr(), $($arg)*);
    }};
}
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::oneshot;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// A failed call: the JSON-RPC error `code` when the service answered with an
/// error object (e.g. -23 not applicable, -403 not elevated), None for
/// transport failures (timeout, service exited, write failed).
#[derive(Debug, Clone, PartialEq)]
pub struct CallError {
    pub code: Option<i64>,
    pub message: String,
}

impl From<String> for CallError {
    fn from(message: String) -> Self {
        Self { code: None, message }
    }
}

impl From<&str> for CallError {
    fn from(message: &str) -> Self {
        Self { code: None, message: message.to_string() }
    }
}

impl std::fmt::Display for CallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

type Pending = Arc<Mutex<HashMap<u64, oneshot::Sender<Result<Value, CallError>>>>>;

/// Per-method timeout. The service handles requests sequentially, so these
/// are generous for anything that shells out to PowerShell / WMI.
pub fn timeout_for(method: &str) -> Duration {
    let secs = match method {
        "system.createRestorePoint" => 300,
        "execute.applyAction" => 300,
        "rollback.restore" | "personalize.apply" | "personalize.revert" => 180,
        "assess.full" | "classify.machine" | "pipeline.assessClassifyPlan" => 120,
        "system.reboot" | "journal.resume" => 60,
        _ => 60,
    };
    Duration::from_secs(secs)
}

#[derive(Default)]
struct Process {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
}

pub struct ServiceBridge {
    process: Mutex<Process>,
    pending: Pending,
    next_id: AtomicU64,
    alive: Arc<AtomicBool>,
    restart_attempted: AtomicBool,
    admin: Mutex<Option<bool>>,
    start_error: Mutex<Option<String>>,
    resource_dir: Mutex<Option<PathBuf>>,
}

impl ServiceBridge {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(Process::default()),
            pending: Arc::new(Mutex::new(HashMap::new())),
            next_id: AtomicU64::new(1),
            alive: Arc::new(AtomicBool::new(false)),
            restart_attempted: AtomicBool::new(false),
            admin: Mutex::new(None),
            start_error: Mutex::new(None),
            resource_dir: Mutex::new(None),
        }
    }

    pub fn is_running(&self) -> bool {
        if !self.alive.load(Ordering::SeqCst) {
            return false;
        }
        // Double-check the OS process: the reader thread may not have seen EOF yet.
        let mut proc = self.process.lock().unwrap();
        match proc.child.as_mut().map(|c| c.try_wait()) {
            Some(Ok(None)) => true,
            Some(Ok(Some(status))) => {
                elog!("[service-bridge] service exited with {status}");
                self.alive.store(false, Ordering::SeqCst);
                false
            }
            Some(Err(_)) | None => false,
        }
    }

    pub fn admin(&self) -> Option<bool> {
        *self.admin.lock().unwrap()
    }

    pub fn set_admin(&self, value: bool) {
        *self.admin.lock().unwrap() = Some(value);
    }

    pub fn start_error(&self) -> Option<String> {
        self.start_error.lock().unwrap().clone()
    }

    pub fn restarted(&self) -> bool {
        self.restart_attempted.load(Ordering::SeqCst)
    }

    pub fn mode(&self) -> &'static str {
        if !self.is_running() {
            "demo"
        } else if cfg!(windows) {
            "live"
        } else {
            "simulated"
        }
    }

    /// Start (or restart) the service. Records the error so `service_status`
    /// can report it — events emitted before the webview listens are lost.
    pub fn start(&self, resource_dir: &Path) -> Result<(), String> {
        *self.resource_dir.lock().unwrap() = Some(resource_dir.to_path_buf());
        let result = self.spawn(resource_dir);
        *self.start_error.lock().unwrap() = result.as_ref().err().cloned();
        result
    }

    fn spawn(&self, resource_dir: &Path) -> Result<(), String> {
        let service_path =
            find_service_binary(resource_dir).ok_or("Could not find the oudenOS service binary")?;

        let mut cmd = Command::new(&service_path);
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Some(pb_dir) = find_playbook_dir(resource_dir) {
            cmd.env("OUDENOS_PLAYBOOK_DIR", pb_dir);
        }
        // Release builds never override the data dir: the service then uses its
        // own per-machine default. Only debug builds point it at the repo's .demo.
        if let Some(service_data_dir) = find_service_data_dir() {
            cmd.env("OUDENOS_OS_DATA_DIR", service_data_dir);
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to start the oudenOS service: {e}"))?;

        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    elog!("[service:stderr] {line}");
                }
            });
        }

        let stdout = child.stdout.take().ok_or("Service stdout not available")?;
        let stdin = child.stdin.take().ok_or("Service stdin not available")?;

        let pending = self.pending.clone();
        let alive = self.alive.clone();
        alive.store(true, Ordering::SeqCst);
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                let line = match line {
                    Ok(l) => l,
                    Err(_) => break,
                };
                let Some((id, result)) = parse_response_line(&line) else {
                    continue; // non-JSON log line
                };
                let sender = pending.lock().unwrap().remove(&id);
                match sender {
                    Some(tx) => {
                        let _ = tx.send(result);
                    }
                    None => elog!(
                        "[service-bridge] dropping late response for request {id} (caller timed out)"
                    ),
                }
            }
            alive.store(false, Ordering::SeqCst);
            let drained: Vec<_> = pending.lock().unwrap().drain().collect();
            for (_, tx) in drained {
                let _ = tx.send(Err(CallError::from("The oudenOS service stopped unexpectedly.")));
            }
            elog!("[service-bridge] service stdout closed");
        });

        let mut proc = self.process.lock().unwrap();
        proc.child = Some(child);
        proc.stdin = Some(stdin);

        elog!("[Tauri] Service started: {}", service_path.display());
        Ok(())
    }

    /// Restart once if the service died. A second death is reported, not retried.
    fn ensure_running(&self) -> Result<(), String> {
        if self.is_running() {
            return Ok(());
        }
        if self.restart_attempted.swap(true, Ordering::SeqCst) {
            return Err(match self.start_error() {
                Some(e) => format!("The oudenOS service is not running: {e}"),
                None => "The oudenOS service stopped and could not be restarted. Close and reopen oudenOS.".into(),
            });
        }
        let dir = self.resource_dir.lock().unwrap().clone();
        let Some(dir) = dir else {
            return Err("The oudenOS service was never started.".into());
        };
        elog!("[service-bridge] service not running — attempting one restart");
        self.shutdown_child();
        self.start(&dir)
            .map_err(|e| format!("The oudenOS service stopped and the restart failed: {e}"))
    }

    pub async fn call(&self, method: &str, params: Value) -> Result<Value, CallError> {
        self.ensure_running()?;

        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();
        self.pending.lock().unwrap().insert(id, tx);

        let request = serde_json::json!({ "id": id, "method": method, "params": params });
        let mut line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
        line.push('\n');

        let write_result = {
            let mut proc = self.process.lock().unwrap();
            match proc.stdin.as_mut() {
                Some(stdin) => stdin
                    .write_all(line.as_bytes())
                    .and_then(|_| stdin.flush())
                    .map_err(|e| format!("Failed to send '{method}' to the service: {e}")),
                None => Err("Service stdin not available".to_string()),
            }
        };
        if let Err(e) = write_result {
            self.pending.lock().unwrap().remove(&id);
            self.alive.store(false, Ordering::SeqCst);
            return Err(e.into());
        }

        let timeout = timeout_for(method);
        match tokio::time::timeout(timeout, rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err(CallError::from("The oudenOS service stopped unexpectedly.")),
            Err(_) => {
                self.pending.lock().unwrap().remove(&id);
                Err(format!(
                    "Service call '{method}' timed out after {}s. It may still finish in the background.",
                    timeout.as_secs()
                )
                .into())
            }
        }
    }

    /// Close stdin (the service exits on EOF), give it a moment, then kill.
    pub fn shutdown(&self) {
        self.alive.store(false, Ordering::SeqCst);
        self.shutdown_child();
    }

    fn shutdown_child(&self) {
        let mut proc = self.process.lock().unwrap();
        proc.stdin = None;
        if let Some(mut child) = proc.child.take() {
            for _ in 0..20 {
                if let Ok(Some(_)) = child.try_wait() {
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

impl Drop for ServiceBridge {
    fn drop(&mut self) {
        self.shutdown_child();
    }
}

/// Parse one stdout line into (request id, result). Non-JSON lines and lines
/// without a numeric id return None.
pub fn parse_response_line(line: &str) -> Option<(u64, Result<Value, CallError>)> {
    let parsed: Value = serde_json::from_str(line).ok()?;
    let id = parsed.get("id").and_then(|v| v.as_u64())?;
    let result = match parsed.get("error") {
        Some(err) if !err.is_null() => Err(CallError {
            code: err.get("code").and_then(|c| c.as_i64()),
            message: err
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Unknown service error")
                .to_string(),
        }),
        _ => Ok(parsed.get("result").cloned().unwrap_or(Value::Null)),
    };
    Some((id, result))
}

// ---------------------------------------------------------------------------
// Path discovery
//
// Release builds resolve the service binary and playbooks ONLY from the
// bundle's resource dir / the executable's dir. Environment overrides and the
// compile-time repository path are debug-only: an elevated process must not
// load binaries or playbooks from a path chosen by the environment, and the
// CI checkout path (CARGO_MANIFEST_DIR) means nothing on a user's machine.
// ---------------------------------------------------------------------------

#[cfg(debug_assertions)]
fn repo_root() -> Option<PathBuf> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .map(Path::to_path_buf)
}

#[cfg(debug_assertions)]
fn env_override(name: &str, want_dir: bool) -> Option<PathBuf> {
    let candidate = PathBuf::from(std::env::var(name).ok()?);
    let ok = if want_dir { candidate.is_dir() } else { candidate.exists() };
    if ok {
        elog!("[service-bridge] using {name}={}", candidate.display());
        Some(candidate)
    } else {
        elog!("[service-bridge] {name} not found: {}", candidate.display());
        None
    }
}

fn exe_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(Path::to_path_buf))
}

pub fn service_exe_name() -> &'static str {
    if cfg!(windows) {
        "oudenos-os-service.exe"
    } else {
        "oudenos-os-service"
    }
}

pub fn service_binary_candidates(resource_dir: &Path, exe_dir: Option<&Path>) -> Vec<PathBuf> {
    let exe = service_exe_name();
    let mut candidates = vec![resource_dir.join(exe), resource_dir.join("_up_").join(exe)];
    if let Some(dir) = exe_dir {
        candidates.push(dir.join(exe));
        candidates.push(dir.join("resources").join(exe));
    }
    #[cfg(debug_assertions)]
    if let Some(root) = repo_root() {
        let target = root.join("services").join("os-service").join("target");
        candidates.push(target.join("debug").join(exe));
        candidates.push(target.join("release").join(exe));
    }
    candidates
}

fn find_service_binary(resource_dir: &Path) -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    if let Some(p) = env_override("OUDENOS_OS_SERVICE_BIN", false) {
        return Some(p);
    }
    let exe_dir = exe_dir();
    let candidates = service_binary_candidates(resource_dir, exe_dir.as_deref());
    for c in &candidates {
        elog!("[service-bridge]   candidate: {} (exists={})", c.display(), c.exists());
    }
    candidates.into_iter().find(|p| p.exists())
}

pub fn playbook_dir_candidates(resource_dir: &Path, exe_dir: Option<&Path>) -> Vec<PathBuf> {
    let mut candidates = vec![resource_dir.join("playbooks")];
    if let Some(dir) = exe_dir {
        candidates.push(dir.join("playbooks"));
        candidates.push(dir.join("resources").join("playbooks"));
    }
    #[cfg(debug_assertions)]
    if let Some(root) = repo_root() {
        candidates.push(root.join("playbooks"));
    }
    candidates
}

pub fn find_playbook_dir(resource_dir: &Path) -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    if let Some(p) = env_override("OUDENOS_PLAYBOOK_DIR", true) {
        return Some(p);
    }
    let exe_dir = exe_dir();
    playbook_dir_candidates(resource_dir, exe_dir.as_deref())
        .into_iter()
        .find(|p| p.is_dir())
}

/// Debug builds keep demo data inside the repo; release builds return None so
/// the service falls back to its own machine-local default directory.
pub fn find_service_data_dir() -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    {
        if let Ok(explicit) = std::env::var("OUDENOS_OS_DATA_DIR") {
            if !explicit.is_empty() {
                return Some(PathBuf::from(explicit));
            }
        }
        repo_root().map(|root| root.join(".demo").join("os-service-data"))
    }
    #[cfg(not(debug_assertions))]
    {
        None
    }
}
