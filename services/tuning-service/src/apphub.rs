// ─── App Hub Installer ──────────────────────────────────────────────────────
// Downloads and runs app installers with silent flags.
// Every install is audit-logged with snapshot receipt in SQLite.

use crate::db::Database;

/// A catalog entry the service knows how to install.
#[derive(Debug)]
pub struct AppEntry {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub description: &'static str,
    pub download_url: &'static str,
    pub silent_args: Option<&'static str>,
}

/// Hardcoded core catalog (source of truth lives in shared-schema TS,
/// but the Rust service needs the URLs to actually download).
pub fn get_catalog() -> Vec<AppEntry> {
    vec![
        AppEntry { id: "brave", name: "Brave", category: "browsers", description: "Privacy-focused Chromium browser with built-in ad blocking", download_url: "https://laptop-updates.brave.com/latest/winx64", silent_args: Some("--silent --system-level") },
        AppEntry { id: "7zip", name: "7-Zip", category: "utilities", description: "Open-source file archiver with high compression ratio", download_url: "https://www.7-zip.org/a/7z2408-x64.exe", silent_args: Some("/S") },
        AppEntry { id: "notepadpp", name: "Notepad++", category: "utilities", description: "Free source code editor with syntax highlighting", download_url: "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7.6/npp.8.7.6.Installer.x64.exe", silent_args: Some("/S") },
        AppEntry { id: "everything", name: "Everything", category: "utilities", description: "Instant file search engine for Windows", download_url: "https://www.voidtools.com/Everything-1.4.1.1026.x64-Setup.exe", silent_args: Some("/S") },
        AppEntry { id: "vlc", name: "VLC", category: "streaming_media", description: "Free cross-platform multimedia player", download_url: "https://get.videolan.org/vlc/last/win64/vlc-3.0.21-win64.exe", silent_args: Some("/S /L=1033") },
    ]
}

/// Download an installer to a temp path and run it with silent flags.
/// Returns a JSON outcome with audit receipt.
pub fn install_app(db: &Database, app_id: &str) -> anyhow::Result<serde_json::Value> {
    let catalog = get_catalog();
    let app = catalog.iter().find(|a| a.id == app_id)
        .ok_or_else(|| anyhow::anyhow!("Unknown app: {}", app_id))?;

    let now = chrono::Utc::now().to_rfc3339();
    let install_id = uuid::Uuid::new_v4().to_string();

    tracing::info!(app_id, app_name = app.name, "Starting app install");

    // Phase 1: Download
    let download_result = download_installer(app.download_url, app_id);
    let installer_path = match download_result {
        Ok(path) => path,
        Err(e) => {
            let outcome = serde_json::json!({
                "installId": install_id,
                "appId": app_id,
                "appName": app.name,
                "success": false,
                "error": format!("Download failed: {}", e),
                "startedAt": now,
                "completedAt": chrono::Utc::now().to_rfc3339(),
            });
            audit_install(db, &install_id, app_id, "failed", &format!("Download failed: {}", e));
            return Ok(outcome);
        }
    };

    // Phase 2: Execute with silent args
    let exec_result = run_installer(&installer_path, app.silent_args);

    // Phase 3: Cleanup installer
    let _ = std::fs::remove_file(&installer_path);

    let (success, error) = match exec_result {
        Ok(exit_code) => {
            if exit_code == 0 {
                (true, None)
            } else {
                (false, Some(format!("Installer exited with code {}", exit_code)))
            }
        }
        Err(e) => (false, Some(format!("Installer execution failed: {}", e))),
    };

    let status = if success { "success" } else { "failed" };
    audit_install(db, &install_id, app_id, status, error.as_deref().unwrap_or("OK"));

    Ok(serde_json::json!({
        "installId": install_id,
        "appId": app_id,
        "appName": app.name,
        "success": success,
        "error": error,
        "startedAt": now,
        "completedAt": chrono::Utc::now().to_rfc3339(),
    }))
}

fn audit_install(db: &Database, install_id: &str, app_id: &str, status: &str, detail: &str) {
    let audit_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let _ = db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, action_id, severity)
         VALUES (?1, ?2, 'apphub', ?3, ?4, ?5, ?6)",
        rusqlite::params![
            audit_id, now,
            format!("app_install_{}", status),
            format!("Install {} (id={}): {}", app_id, install_id, detail),
            app_id,
            if status == "success" { "info" } else { "error" },
        ],
    );
}

#[cfg(windows)]
fn download_installer(url: &str, app_id: &str) -> anyhow::Result<String> {
    let temp_dir = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
    let dest = format!("{}\\redcore-install-{}.exe", temp_dir, app_id);

    tracing::info!(url, dest = %dest, "Downloading installer");

    // Escape URL and dest path for safe PS single-quote interpolation
    let escaped_url = crate::powershell::escape_ps_string(url);
    let escaped_dest = crate::powershell::escape_ps_string(&dest);

    // Use PowerShell Invoke-WebRequest for download (no external deps needed)
    let script = format!(
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; \
         Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing",
        escaped_url, escaped_dest,
    );
    let result = crate::powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Download failed: {}", result.stderr.trim());
    }

    Ok(dest)
}

#[cfg(windows)]
fn run_installer(path: &str, silent_args: Option<&str>) -> anyhow::Result<i32> {
    tracing::info!(path, ?silent_args, "Running installer");

    let mut cmd = std::process::Command::new(path);
    if let Some(args) = silent_args {
        for arg in args.split_whitespace() {
            cmd.arg(arg);
        }
    }

    let output = cmd.output()?;
    let code = output.status.code().unwrap_or(-1);
    tracing::info!(path, exit_code = code, "Installer completed");
    Ok(code)
}

#[cfg(not(windows))]
fn download_installer(_url: &str, app_id: &str) -> anyhow::Result<String> {
    tracing::info!(app_id, "[simulated] Would download installer");
    Ok(format!("/tmp/redcore-install-{}.exe", app_id))
}

#[cfg(not(windows))]
fn run_installer(_path: &str, _silent_args: Option<&str>) -> anyhow::Result<i32> {
    tracing::info!("[simulated] Would run installer");
    Ok(0)
}
