
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use tokio::sync::mpsc;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

pub struct ServiceBridge {
    process: Option<Child>,
    buffered: HashMap<u64, Result<Value, String>>,
    next_id: AtomicU64,
    admin: bool,
    #[allow(dead_code)]
    reader_handle: Option<std::thread::JoinHandle<()>>,
    response_rx: Option<mpsc::UnboundedReceiver<(u64, Result<Value, String>)>>,
}

impl ServiceBridge {
    pub fn new() -> Self {
        Self {
            process: None,
            buffered: HashMap::new(),
            next_id: AtomicU64::new(1),
            admin: false,
            reader_handle: None,
            response_rx: None,
        }
    }

    pub fn is_running(&self) -> bool {
        self.process.is_some()
    }

    pub fn is_admin(&self) -> bool {
        self.admin
    }

    pub fn start(&mut self, resource_dir: &Path) -> Result<(), String> {
        self.admin = detect_admin();

        let service_path = find_service_binary(resource_dir)
            .ok_or("Could not find redcore-os-service binary")?;

        let playbook_dir = find_playbook_dir(resource_dir);

        let mut cmd = Command::new(&service_path);
        cmd.stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Some(ref pb_dir) = playbook_dir {
            cmd.env("REDCORE_PLAYBOOK_DIR", pb_dir);
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn service: {e}"))?;

        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(l) = line {
                        eprintln!("[service:stderr] {l}");
                    }
                }
            });
        }

        // Use tokio unbounded_channel: UnboundedSender::send() is sync and non-blocking,
        // so the std reader thread can call it directly without a tokio runtime.
        let (tx, rx) = mpsc::unbounded_channel::<(u64, Result<Value, String>)>();
        if let Some(stdout) = child.stdout.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    let line = match line {
                        Ok(l) => l,
                        Err(_) => break,
                    };
                    let parsed: Value = match serde_json::from_str(&line) {
                        Ok(v) => v,
                        Err(_) => continue, // skip non-JSON lines (service logs)
                    };
                    if let Some(id) = parsed.get("id").and_then(|v| v.as_u64()) {
                        let result = if let Some(err) = parsed.get("error") {
                            let msg = err
                                .get("message")
                                .and_then(|m| m.as_str())
                                .unwrap_or("Unknown service error");
                            Err(msg.to_string())
                        } else {
                            Ok(parsed.get("result").cloned().unwrap_or(Value::Null))
                        };
                        if tx.send((id, result)).is_err() {
                            break;
                        }
                    }
                }
            });
        }

        self.response_rx = Some(rx);
        self.process = Some(child);

        eprintln!(
            "[Tauri] Service started: {} (admin={})",
            service_path.display(),
            self.admin
        );

        Ok(())
    }

    pub async fn call(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let child = self.process.as_mut().ok_or("Service not running")?;
        let stdin = child
            .stdin
            .as_mut()
            .ok_or("Service stdin not available")?;

        let id = self.next_id.fetch_add(1, Ordering::SeqCst);

        let request = serde_json::json!({
            "id": id,
            "method": method,
            "params": params
        });

        let mut line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
        line.push('\n');

        // stdin write to a pipe is fast (sub-ms); no async wrapper needed
        stdin
            .write_all(line.as_bytes())
            .map_err(|e| format!("Failed to write to service: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush service stdin: {e}"))?;

        if let Some(result) = self.buffered.remove(&id) {
            return result;
        }

        // Take rx out so we can .await on it without holding a conflicting borrow on self.
        let mut rx = match self.response_rx.take() {
            Some(rx) => rx,
            None => return Err("No response channel".into()),
        };

        let deadline = tokio::time::Instant::now() + REQUEST_TIMEOUT;
        let final_result = loop {
            let now = tokio::time::Instant::now();
            if now >= deadline {
                break Err(format!("Service call '{method}' timed out after 30s"));
            }
            let remaining = deadline - now;

            // Await the next response asynchronously, yielding to the tokio runtime.
            match tokio::time::timeout(remaining, rx.recv()).await {
                Ok(Some((resp_id, resp_result))) => {
                    if resp_id == id {
                        break resp_result;
                    }
                    // Out-of-order response — buffer it.
                    self.buffered.insert(resp_id, resp_result);
                    // Evict stale entries to prevent unbounded growth (#5).
                    if self.buffered.len() > 50 {
                        let min_id = id.saturating_sub(50);
                        self.buffered.retain(|&k, _| k > min_id);
                    }
                }
                Ok(None) => {
                    self.process = None;
                    break Err("Service process died".into());
                }
                Err(_elapsed) => {
                    break Err(format!("Service call '{method}' timed out after 30s"));
                }
            }
        };

        self.response_rx = Some(rx);
        final_result
    }
}

impl Drop for ServiceBridge {
    fn drop(&mut self) {
        if let Some(ref mut child) = self.process {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn detect_admin() -> bool {
    #[cfg(windows)]
    {
        let mut cmd = std::process::Command::new("net");
        cmd.arg("session")
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(not(windows))]
    {
        unsafe { libc::geteuid() == 0 }
    }
}

fn find_service_binary(resource_dir: &Path) -> Option<PathBuf> {
    let exe = if cfg!(windows) {
        "redcore-os-service.exe"
    } else {
        "redcore-os-service"
    };

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|pp| pp.to_path_buf()));

    let mut candidates: Vec<PathBuf> = vec![
        resource_dir.join(exe),
        resource_dir.join("_up_").join(exe),
    ];

    if let Some(ref dir) = exe_dir {
        candidates.push(dir.join(exe));
        candidates.push(dir.join("resources").join(exe));
    }

    candidates.push(PathBuf::from("../../services/os-service/target/release").join(exe));
    candidates.push(PathBuf::from("../../services/os-service/target/debug").join(exe));

    eprintln!("[service-bridge] resource_dir = {}", resource_dir.display());
    if let Some(ref dir) = exe_dir {
        eprintln!("[service-bridge] exe_dir = {}", dir.display());
    }
    for c in &candidates {
        let exists = c.exists();
        eprintln!("[service-bridge]   candidate: {} (exists={})", c.display(), exists);
    }

    candidates.into_iter().find(|p| p.exists())
}

fn find_playbook_dir(resource_dir: &Path) -> Option<PathBuf> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|pp| pp.to_path_buf()));

    let mut candidates = vec![
        resource_dir.join("playbooks"),
    ];

    if let Some(ref dir) = exe_dir {
        candidates.push(dir.join("playbooks"));
        candidates.push(dir.join("resources").join("playbooks"));
    }

    candidates.push(PathBuf::from("../../playbooks"));

    for c in &candidates {
        let exists = c.is_dir();
        eprintln!("[service-bridge] playbook candidate: {} (exists={})", c.display(), exists);
    }

    candidates.into_iter().find(|p| p.is_dir())
}
