mod service_bridge;

use service_bridge::ServiceBridge;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

// Managed state: the service bridge singleton
struct AppState {
    bridge: Arc<Mutex<ServiceBridge>>,
}

// ---------------------------------------------------------------------------
// Tauri commands — the renderer calls these via invoke()
// ---------------------------------------------------------------------------

#[tauri::command]
async fn service_call(
    state: tauri::State<'_, AppState>,
    method: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut bridge = state.bridge.lock().await;

    if !bridge.is_running() {
        return Ok(serde_json::json!({
            "__serviceUnavailable": true,
            "error": "Service not running. Running in demo mode."
        }));
    }

    match bridge.call(&method, params).await {
        Ok(result) => Ok(result),
        Err(e) => Ok(serde_json::json!({
            "__serviceError": true,
            "error": e.to_string()
        })),
    }
}

#[tauri::command]
async fn service_status(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let bridge = state.bridge.lock().await;
    Ok(serde_json::json!({
        "running": bridge.is_running(),
        "mode": if bridge.is_running() { "live" } else { "demo" },
        "isAdmin": bridge.is_admin(),
        "platform": std::env::consts::OS
    }))
}

#[tauri::command]
async fn save_log(content: String) -> Result<serde_json::Value, String> {
    let desktop = match dirs::desktop_dir() {
        Some(d) => d,
        None => return Ok(serde_json::json!({ "ok": false, "error": "Cannot find Desktop" })),
    };

    let ts = chrono_free_timestamp();
    let filename = format!("redcore-os-log-{ts}.txt");
    let path = desktop.join(&filename);

    match std::fs::write(&path, &content) {
        Ok(_) => Ok(serde_json::json!({
            "ok": true,
            "path": path.to_string_lossy()
        })),
        Err(e) => Ok(serde_json::json!({
            "ok": false,
            "error": e.to_string()
        })),
    }
}

#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("Only https:// URLs allowed".into());
    }
    open::that(&url).map_err(|e| e.to_string())
}

// Timestamp without pulling in chrono
fn chrono_free_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now}")
}

// Desktop directory fallback
mod dirs {
    use std::path::PathBuf;

    pub fn desktop_dir() -> Option<PathBuf> {
        #[cfg(windows)]
        {
            std::env::var("USERPROFILE")
                .ok()
                .map(|p| PathBuf::from(p).join("Desktop"))
        }
        #[cfg(not(windows))]
        {
            std::env::var("HOME")
                .ok()
                .map(|p| PathBuf::from(p).join("Desktop"))
        }
    }
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let bridge = Arc::new(Mutex::new(ServiceBridge::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            bridge: bridge.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            service_call,
            service_status,
            save_log,
            open_external,
        ])
        .setup(move |app| {
            let resource_dir = app
                .path()
                .resource_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));

            // Start the privileged service in background
            let bridge_clone = bridge.clone();
            let res_dir = resource_dir.clone();
            tauri::async_runtime::spawn(async move {
                let mut b = bridge_clone.lock().await;
                if let Err(e) = b.start(&res_dir) {
                    eprintln!("[Tauri] Failed to start service: {e}");
                }
            });

            // Show window once webview is ready
            if let Some(win) = app.get_webview_window("main") {
                let w = win.clone();
                win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(_) = event {
                        let _ = w.show();
                    }
                });
                // Show after a short delay to avoid white flash
                let w2 = win.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(150));
                    let _ = w2.show();
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
