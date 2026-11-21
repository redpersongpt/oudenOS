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
mod apbx;
pub mod service_bridge;
pub mod util;

use service_bridge::ServiceBridge;
pub use util::{encode_log, ALLOWED_SERVICE_METHODS};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};

// Session-wide log call counter (prevents disk exhaustion via repeated calls)
static LOG_CALLS: AtomicU32 = AtomicU32::new(0);
const MAX_LOG_CALLS_PER_SESSION: u32 = 10;

// Managed state: the service bridge singleton + "work in progress" flag that
// blocks closing the window while changes are being applied.
struct AppState {
    bridge: Arc<ServiceBridge>,
    busy: Arc<AtomicBool>,
    resource_dir: PathBuf,
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
    if !ALLOWED_SERVICE_METHODS.contains(&method.as_str()) {
        elog!("[Tauri] Rejected unauthorized IPC method: {method}");
        return Ok(serde_json::json!({
            "__serviceError": true,
            "error": format!("Method not allowed: {}", method)
        }));
    }

    let bridge = state.bridge.clone();
    // A service that never started (missing binary) is "unavailable"; one that
    // died mid-session gets a single restart attempt inside call().
    if bridge.start_error().is_some() && !bridge.is_running() && bridge.restarted() {
        return Ok(serde_json::json!({
            "__serviceUnavailable": true,
            "error": bridge.start_error().unwrap_or_default()
        }));
    }

    match bridge.call(&method, params).await {
        Ok(result) => Ok(result),
        Err(e) => Ok(serde_json::json!({
            "__serviceError": true,
            "error": e.message,
            // JSON-RPC code (e.g. -23 not applicable, -403 not elevated); null for transport errors
            "code": e.code
        })),
    }
}

async fn refresh_admin(bridge: &ServiceBridge) -> Option<bool> {
    if let Some(v) = bridge.admin() {
        return Some(v);
    }
    if !bridge.is_running() {
        return None;
    }
    match bridge
        .call("system.elevationStatus", serde_json::json!({}))
        .await
    {
        Ok(v) => {
            let elevated = v.get("isElevated").and_then(|b| b.as_bool()).unwrap_or(false);
            bridge.set_admin(elevated);
            Some(elevated)
        }
        Err(_) => None,
    }
}

#[tauri::command]
async fn service_status(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let bridge = state.bridge.clone();
    let is_admin = refresh_admin(&bridge).await;
    Ok(serde_json::json!({
        "running": bridge.is_running(),
        "mode": bridge.mode(),
        // null = unknown (service not running yet / elevation query failed)
        "isAdmin": is_admin,
        "platform": std::env::consts::OS,
        "startError": bridge.start_error(),
        "restarted": bridge.restarted(),
    }))
}

/// Explicit user "Retry" after a failed start.
#[tauri::command]
async fn service_restart(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let bridge = state.bridge.clone();
    if !bridge.is_running() {
        bridge.shutdown();
        if let Err(e) = bridge.start(&state.resource_dir) {
            return Ok(serde_json::json!({ "ok": false, "error": e }));
        }
    }
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
async fn save_log(app: tauri::AppHandle, content: String) -> Result<serde_json::Value, String> {
    // SECURITY: Cap log size to prevent a compromised renderer from filling
    // the user's disk.
    const MAX_LOG_SIZE: usize = 10 * 1024 * 1024; // 10 MB
    if content.len() > MAX_LOG_SIZE {
        return Ok(serde_json::json!({
            "ok": false,
            "error": format!("Log content exceeds maximum size of {} bytes", MAX_LOG_SIZE)
        }));
    }

    let call_count = LOG_CALLS.fetch_add(1, Ordering::Relaxed);
    if call_count >= MAX_LOG_CALLS_PER_SESSION {
        return Ok(serde_json::json!({
            "ok": false,
            "error": format!("Log call limit reached ({} per session)", MAX_LOG_CALLS_PER_SESSION)
        }));
    }

    // Known-folder lookup: follows OneDrive folder redirection.
    let dir = app
        .path()
        .desktop_dir()
        .ok()
        .filter(|d| d.is_dir())
        .or_else(|| app.path().document_dir().ok().filter(|d| d.is_dir()))
        .or_else(|| app.path().home_dir().ok());
    let Some(dir) = dir else {
        return Ok(serde_json::json!({ "ok": false, "error": "Cannot find the Desktop folder" }));
    };

    let filename = format!("ouden-os-log-{}.txt", unix_timestamp());
    let path = dir.join(&filename);

    match std::fs::write(&path, encode_log(&content)) {
        Ok(_) => Ok(serde_json::json!({ "ok": true, "path": path.to_string_lossy() })),
        Err(e) => Ok(serde_json::json!({
            "ok": false,
            "error": format!("{} ({})", e, path.display())
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

#[tauri::command]
fn set_busy(state: tauri::State<'_, AppState>, busy: bool) {
    state.busy.store(busy, Ordering::SeqCst);
}

/// Relaunch this executable through UAC ("runas") and exit on success. If the
/// user dismisses the UAC prompt, Start-Process fails and we stay open.
#[tauri::command]
async fn relaunch_as_admin(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe = exe.to_string_lossy().replace('\'', "''");
        let script = format!(
            "$ErrorActionPreference='Stop'; Start-Process -FilePath '{exe}' -Verb RunAs"
        );
        let status = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x08000000)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("cancelled".into());
        }
        app.exit(0);
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Only supported on Windows".into())
    }
}

#[tauri::command]
async fn export_package(
    app: tauri::AppHandle,
    state: apbx::ExportPackageRequest,
) -> Result<serde_json::Value, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| PathBuf::from("."));

    let playbook_root = match service_bridge::find_playbook_dir(&resource_dir) {
        Some(p) => p,
        None => {
            return serde_json::to_value(apbx::ExportResult::err("Playbook directory not found"))
                .map_err(|e| e.to_string())
        }
    };

    let wizard_json_path = playbook_root.join("wizard.json");
    let wizard_metadata: serde_json::Value = if wizard_json_path.exists() {
        let content = std::fs::read_to_string(&wizard_json_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())?
    } else {
        serde_json::json!({ "title": "Ouden OS Package", "packageId": "ouden-os" })
    };

    let version = wizard_metadata
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or(env!("CARGO_PKG_VERSION"));
    let commit = wizard_metadata
        .get("commit")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let default_name = if state.execution_journal.is_some() {
        format!("ouden-os-executed-package-{version}-{commit}.apbx")
    } else {
        format!("ouden-os-user-package-{version}-{commit}.apbx")
    };

    use tauri_plugin_dialog::DialogExt;
    let mut dialog = app
        .dialog()
        .file()
        .set_title("Save Ouden OS Package")
        .set_file_name(&default_name)
        .add_filter("Ouden OS Package", &["apbx", "zip"]);
    if let Ok(downloads) = app.path().download_dir() {
        dialog = dialog.set_directory(downloads);
    }

    let output_path = match dialog.blocking_save_file().and_then(|p| p.into_path().ok()) {
        Some(p) => p,
        None => {
            return serde_json::to_value(apbx::ExportResult::cancelled()).map_err(|e| e.to_string())
        }
    };

    match apbx::create_bundle(
        &output_path,
        &playbook_root,
        &wizard_metadata,
        &state,
        version,
        commit,
    ) {
        Ok(result) => serde_json::to_value(result).map_err(|e| e.to_string()),
        Err(e) => serde_json::to_value(apbx::ExportResult::err(e)).map_err(|e| e.to_string()),
    }
}

fn unix_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now}")
}

/// Shrink the window to the monitor's work area (taskbar excluded) so the
/// bottom action bar is never off-screen on small / high-DPI laptops.
fn clamp_to_work_area(win: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = win.current_monitor() else { return };
    let area = monitor.work_area();
    let Ok(outer) = win.outer_size() else { return };
    let width = outer.width.min(area.size.width);
    let height = outer.height.min(area.size.height);
    if width != outer.width || height != outer.height {
        let _ = win.set_size(tauri::PhysicalSize::new(width, height));
        let _ = win.center();
    }
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let bridge = Arc::new(ServiceBridge::new());
    let busy = Arc::new(AtomicBool::new(false));

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            service_call,
            service_status,
            service_restart,
            save_log,
            open_external,
            export_package,
            set_busy,
            relaunch_as_admin,
        ])
        .setup({
            let bridge = bridge.clone();
            let busy = busy.clone();
            move |app| {
                let resource_dir = app
                    .path()
                    .resource_dir()
                    .unwrap_or_else(|_| PathBuf::from("."));
                elog!("[Tauri] resource_dir = {}", resource_dir.display());

                app.manage(AppState {
                    bridge: bridge.clone(),
                    busy: busy.clone(),
                    resource_dir: resource_dir.clone(),
                });

                // Start the service synchronously so the very first renderer
                // call never races the spawn. The start error (if any) is kept
                // in the bridge and returned by service_status.
                match bridge.start(&resource_dir) {
                    Ok(()) => {
                        let b = bridge.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = refresh_admin(&b).await;
                        });
                    }
                    Err(e) => elog!("[Tauri] CRITICAL: Failed to start service: {e}"),
                }

                if let Some(win) = app.get_webview_window("main") {
                    clamp_to_work_area(&win);
                    let w = win.clone();
                    let busy = busy.clone();
                    win.on_window_event(move |event| match event {
                        tauri::WindowEvent::Focused(_) => {
                            let _ = w.show();
                        }
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            if busy.load(Ordering::SeqCst) {
                                api.prevent_close();
                                let _ = w.emit("close-blocked", ());
                            }
                        }
                        _ => {}
                    });
                    let w2 = win.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(150));
                        let _ = w2.show();
                    });
                }
                Ok(())
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(move |_handle, event| {
        if let tauri::RunEvent::Exit = event {
            // Stop the elevated service with the UI so it never lingers.
            bridge.shutdown();
        }
    });
}
