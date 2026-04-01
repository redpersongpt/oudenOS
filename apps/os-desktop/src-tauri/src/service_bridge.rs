// Service bridge: manages the privileged Rust service child process.
// Communicates via line-delimited JSON-RPC over stdin/stdout.
// This is the SAME protocol the Electron main process used — the service
// binary is unchanged.

use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::time::Duration;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

pub struct ServiceBridge {
    process: Option<Child>,
    pending: HashMap<u64, mpsc::Sender<Result<Value, String>>>,
    next_id: AtomicU64,
    admin: bool,
    #[allow(dead_code)]
    reader_handle: Option<std::thread::JoinHandle<()>>,
    response_rx: Option<mpsc::Receiver<(u64, Result<Value, String>)>>,
}

impl ServiceBridge {
    pub fn new() -> Self {
        Self {
            process: None,
            pending: HashMap::new(),
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

        if let Some(ref pb_dir) = playbook_dir {
            cmd.env("REDCORE_PLAYBOOK_DIR", pb_dir);
        }

        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn service: {e}"))?;

        // Drain stderr to prevent pipe deadlock
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

        // Read stdout responses in a background thread
        let (tx, rx) = mpsc::channel::<(u64, Result<Value, String>)>();
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
        // Drain any responses that arrived for previous requests
        self.drain_responses();

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

        stdin
            .write_all(line.as_bytes())
            .map_err(|e| format!("Failed to write to service: {e}"))?;
        stdin
            .flush()
            .map_err(|e| format!("Failed to flush service stdin: {e}"))?;

        // Wait for response with timeout
        let deadline = std::time::Instant::now() + REQUEST_TIMEOUT;

        loop {
            self.drain_responses();

            if let Some(result) = self.pending.remove(&id) {
                // We stored the sender; we need a different approach
                // Actually let's simplify: just poll the rx directly
                drop(result); // won't use sender pattern
            }

            // Poll the response channel
            if let Some(ref rx) = self.response_rx {
                match rx.recv_timeout(Duration::from_millis(50)) {
                    Ok((resp_id, result)) => {
                        if resp_id == id {
                            return result;
                        }
                        // Response for a different request — discard (timed out)
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        if std::time::Instant::now() > deadline {
                            return Err(format!("Service call '{method}' timed out after 30s"));
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        self.process = None;
                        return Err("Service process died".into());
                    }
                }
            } else {
                return Err("No response channel".into());
            }
        }
    }

    fn drain_responses(&mut self) {
        if let Some(ref rx) = self.response_rx {
            while let Ok((_id, _result)) = rx.try_recv() {
                // Discard stale responses from timed-out requests
            }
        }
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn detect_admin() -> bool {
    #[cfg(windows)]
    {
        std::process::Command::new("net")
            .arg("session")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(not(windows))]
    {
        // On non-Windows, check if running as root (for dev testing)
        unsafe { libc::geteuid() == 0 }
    }
}

fn find_service_binary(resource_dir: &Path) -> Option<PathBuf> {
    let exe = if cfg!(windows) {
        "redcore-os-service.exe"
    } else {
        "redcore-os-service"
    };

    let candidates = [
        resource_dir.join(exe),
        resource_dir.join("_up_").join(exe), // Tauri resource nesting
        PathBuf::from("../../services/os-service/target/release").join(exe),
        PathBuf::from("../../services/os-service/target/debug").join(exe),
    ];

    candidates.into_iter().find(|p| p.exists())
}

fn find_playbook_dir(resource_dir: &Path) -> Option<PathBuf> {
    let candidates = [
        resource_dir.join("playbooks"),
        PathBuf::from("../../playbooks"),
    ];

    candidates.into_iter().find(|p| p.is_dir())
}
