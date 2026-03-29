// ─── Visual Personalization Engine ──────────────────────────────────────────
// Applies safe, reversible visual customizations to Windows.
// All changes are registry/API-based — no system file patching.
// Every change is captured in a rollback snapshot BEFORE application.

use crate::db::Database;
use crate::rollback;
#[cfg(windows)]
use crate::powershell;
use serde_json::Value;

#[cfg(windows)]
const REDCORE_ACCENT_BGR: u32 = 0x004B25E8;
#[cfg(windows)]
const REDCORE_DWM_ACCENT: u32 = 0xC44B25E8;

/// Returns a JSON description of what personalization will be applied
/// for the given device profile.
pub fn get_personalization_options(profile: &str) -> Value {
    tracing::info!(profile = profile, "Querying personalization options");

    match profile {
        "gaming_desktop" => serde_json::json!({
            "darkMode": true,
            "brandAccent": true,
            "wallpaper": false,
            "taskbarCleanup": true,
            "explorerCleanup": true,
            "transparency": true,
            "profileVariant": "gaming_desktop"
        }),
        "work_pc" => serde_json::json!({
            "darkMode": true,
            "brandAccent": true,
            "wallpaper": false,
            "taskbarCleanup": false,
            "explorerCleanup": false,
            "transparency": true,
            "profileVariant": "work_pc"
        }),
        "low_spec_system" => serde_json::json!({
            "darkMode": true,
            "brandAccent": true,
            "wallpaper": false,
            "taskbarCleanup": true,
            "explorerCleanup": true,
            "transparency": false,
            "profileVariant": "low_spec_system"
        }),
        "vm_cautious" => serde_json::json!({
            "darkMode": true,
            "brandAccent": true,
            "wallpaper": false,
            "taskbarCleanup": false,
            "explorerCleanup": false,
            "transparency": false,
            "profileVariant": "vm_cautious"
        }),
        _ => serde_json::json!({
            "darkMode": true,
            "brandAccent": true,
            "wallpaper": false,
            "taskbarCleanup": true,
            "explorerCleanup": true,
            "transparency": true,
            "profileVariant": profile
        }),
    }
}

/// Apply visual personalization for the given profile.
/// Creates a rollback snapshot BEFORE any changes, then applies each change.
/// `options` can override which personalization features to apply.
pub fn apply_personalization(
    db: &Database,
    profile: &str,
    options: &Value,
) -> anyhow::Result<Value> {
    tracing::info!(profile = profile, "Applying visual personalization");

    let opts = get_personalization_options(profile);

    // Merge caller overrides on top of profile defaults
    let dark_mode = options
        .get("darkMode")
        .and_then(|v| v.as_bool())
        .unwrap_or_else(|| opts["darkMode"].as_bool().unwrap_or(true));
    let brand_accent = options
        .get("brandAccent")
        .and_then(|v| v.as_bool())
        .unwrap_or_else(|| opts["brandAccent"].as_bool().unwrap_or(true));
    let wallpaper = options
        .get("wallpaper")
        .and_then(|v| v.as_bool())
        .unwrap_or_else(|| opts["wallpaper"].as_bool().unwrap_or(false));
    let mut taskbar_cleanup = options
        .get("taskbarCleanup")
        .and_then(|v| v.as_bool())
        .unwrap_or_else(|| opts["taskbarCleanup"].as_bool().unwrap_or(false));
    let mut explorer_cleanup = options
        .get("explorerCleanup")
        .and_then(|v| v.as_bool())
        .unwrap_or_else(|| opts["explorerCleanup"].as_bool().unwrap_or(false));
    let mut transparency = options
        .get("transparency")
        .and_then(|v| v.as_bool())
        .unwrap_or_else(|| opts["transparency"].as_bool().unwrap_or(true));

    if profile == "work_pc" {
        taskbar_cleanup = false;
        explorer_cleanup = false;
    }
    if profile == "low_spec_system" || profile == "low_spec" {
        transparency = false;
    }

    // ── Phase 1: Collect current values for rollback ────────────────────

    let mut previous_values: Vec<rollback::PreviousValue> = Vec::new();

    // Dark mode values
    if dark_mode {
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "AppsUseLightTheme",
            "personalize.darkMode",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "SystemUsesLightTheme",
            "personalize.darkMode",
        );
    }

    // Accent color values
    if brand_accent {
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
            "AccentColorMenu",
            "personalize.accentColor",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
            "StartColorMenu",
            "personalize.accentColor",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "ColorPrevalence",
            "personalize.accentColor",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\DWM",
            "ColorizationColor",
            "personalize.accentColor",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\DWM",
            "ColorizationAfterglow",
            "personalize.accentColor",
        );
    }

    // Wallpaper values
    if wallpaper {
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "Control Panel\\Desktop",
            "Wallpaper",
            "personalize.wallpaper",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "Control Panel\\Desktop",
            "WallpaperStyle",
            "personalize.wallpaper",
        );
    }

    // Transparency
    if transparency {
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
            "EnableTransparency",
            "personalize.transparency",
        );
    }

    // Taskbar cleanup
    if taskbar_cleanup {
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
            "ShowTaskViewButton",
            "personalize.taskbarCleanup",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search",
            "SearchboxTaskbarMode",
            "personalize.taskbarCleanup",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
            "TaskbarDa",
            "personalize.taskbarCleanup",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
            "TaskbarMn",
            "personalize.taskbarCleanup",
        );
    }

    // Explorer cleanup
    if explorer_cleanup {
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
            "HideFileExt",
            "personalize.explorerCleanup",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
            "Hidden",
            "personalize.explorerCleanup",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer",
            "ShowRecent",
            "personalize.explorerCleanup",
        );
        collect_registry_prev(
            &mut previous_values,
            "HKCU",
            "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer",
            "ShowFrequent",
            "personalize.explorerCleanup",
        );
    }

    // ── Phase 2: Create rollback snapshot BEFORE making changes ─────────

    let snapshot_id = rollback::create_snapshot(
        db,
        "personalization",
        &format!("Pre-personalization snapshot for profile '{}'", profile),
        &previous_values,
    )?;

    tracing::info!(
        snapshot_id = snapshot_id.as_str(),
        profile = profile,
        "Personalization rollback snapshot created"
    );

    // ── Phase 3: Apply changes ──────────────────────────────────────────

    let mut results: Vec<Value> = Vec::new();
    let mut succeeded = 0u32;
    let mut failed = 0u32;

    // Dark mode
    if dark_mode {
        apply_and_record(
            "darkMode",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_dark_mode(),
        );
    }

    // Accent color
    if brand_accent {
        apply_and_record(
            "brandAccent",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_accent_color(),
        );
    }

    // Wallpaper
    if wallpaper {
        apply_and_record(
            "wallpaper",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_wallpaper(),
        );
    }

    // Transparency
    if transparency {
        apply_and_record(
            "transparency",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_transparency(true),
        );
    } else if profile == "low_spec_system" {
        // Explicitly disable transparency for low-spec to save GPU
        apply_and_record(
            "transparency",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_transparency(false),
        );
    }

    // Taskbar cleanup
    if taskbar_cleanup {
        apply_and_record(
            "taskbarCleanup",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_taskbar_cleanup(),
        );
    }

    // Explorer cleanup
    if explorer_cleanup {
        apply_and_record(
            "explorerCleanup",
            &mut results,
            &mut succeeded,
            &mut failed,
            apply_explorer_cleanup(),
        );
    }

    if dark_mode || brand_accent || taskbar_cleanup || explorer_cleanup || wallpaper || transparency {
        apply_and_record(
            "shellRefresh",
            &mut results,
            &mut succeeded,
            &mut failed,
            refresh_shell_ui(),
        );
    }

    // ── Phase 4: Audit log ──────────────────────────────────────────────

    let status = if failed == 0 {
        "success"
    } else if succeeded == 0 {
        "failed"
    } else {
        "partial"
    };

    let now = chrono::Utc::now().to_rfc3339();
    let audit_id = uuid::Uuid::new_v4().to_string();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, 'personalizer', 'personalization_applied', ?3, ?4)",
        rusqlite::params![
            audit_id,
            now,
            format!(
                "Profile '{}': {} succeeded, {} failed, status={}",
                profile, succeeded, failed, status
            ),
            if status == "failed" { "error" } else { "info" },
        ],
    )?;

    tracing::info!(
        profile = profile,
        snapshot_id = snapshot_id.as_str(),
        status = status,
        succeeded = succeeded,
        failed = failed,
        "Personalization complete"
    );

    Ok(serde_json::json!({
        "snapshotId": snapshot_id,
        "profile": profile,
        "status": status,
        "succeeded": succeeded,
        "failed": failed,
        "results": results,
    }))
}

/// Revert a personalization by restoring its rollback snapshot.
pub fn revert_personalization(
    db: &Database,
    snapshot_id: &str,
) -> anyhow::Result<Value> {
    tracing::info!(
        snapshot_id = snapshot_id,
        "Reverting personalization via snapshot"
    );
    rollback::restore_snapshot(db, snapshot_id)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn collect_registry_prev(
    previous_values: &mut Vec<rollback::PreviousValue>,
    hive: &str,
    path: &str,
    value_name: &str,
    action_id: &str,
) {
    let prev = read_registry_value(hive, path, value_name);
    previous_values.push(rollback::PreviousValue {
        change_type: "registry".to_string(),
        path: format!("{}\\{}", hive, path),
        value_name: value_name.to_string(),
        previous_value: prev,
        action_id: action_id.to_string(),
    });
}

fn apply_and_record(
    feature: &str,
    results: &mut Vec<Value>,
    succeeded: &mut u32,
    failed: &mut u32,
    result: anyhow::Result<()>,
) {
    match result {
        Ok(()) => {
            *succeeded += 1;
            results.push(serde_json::json!({
                "feature": feature,
                "status": "success",
            }));
        }
        Err(e) => {
            tracing::error!(feature = feature, error = %e, "Personalization feature failed");
            *failed += 1;
            results.push(serde_json::json!({
                "feature": feature,
                "status": "failed",
                "error": e.to_string(),
            }));
        }
    }
}

// ─── Windows implementations ────────────────────────────────────────────────

#[cfg(windows)]
fn apply_dark_mode() -> anyhow::Result<()> {
    let script = "\
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' \
            -Name AppsUseLightTheme -Value 0 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' \
            -Name SystemUsesLightTheme -Value 0 -Type DWord -Force";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Dark mode apply failed: {}", result.stderr.trim());
    }
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
        "AppsUseLightTheme",
        0,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
        "SystemUsesLightTheme",
        0,
    )?;
    tracing::info!("Dark mode enabled");
    Ok(())
}

#[cfg(windows)]
fn apply_accent_color() -> anyhow::Result<()> {
    let script = format!(
        "\
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent' \
            -Name AccentColorMenu -Value {} -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent' \
            -Name StartColorMenu -Value {} -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' \
            -Name ColorPrevalence -Value 1 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\DWM' \
            -Name ColorizationColor -Value {} -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\DWM' \
            -Name ColorizationAfterglow -Value {} -Type DWord -Force",
        REDCORE_ACCENT_BGR,
        REDCORE_ACCENT_BGR,
        REDCORE_DWM_ACCENT,
        REDCORE_DWM_ACCENT,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Accent color apply failed: {}", result.stderr.trim());
    }
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
        "AccentColorMenu",
        REDCORE_ACCENT_BGR as i64,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent",
        "StartColorMenu",
        REDCORE_ACCENT_BGR as i64,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
        "ColorPrevalence",
        1,
    )?;
    tracing::info!("Accent color set to redcore brand red");
    Ok(())
}

#[cfg(windows)]
fn apply_wallpaper() -> anyhow::Result<()> {
    // Use a solid-color branded wallpaper path. The actual wallpaper file
    // is bundled with the installer at a known location.
    let wallpaper_path = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| "C:\\ProgramData".to_string());
    let wallpaper_path = format!("{}\\redcore-os\\assets\\wallpaper.png", wallpaper_path);
    if !std::path::Path::new(&wallpaper_path).exists() {
        anyhow::bail!(
            "Wallpaper asset not found at '{}' — packaging/runtime did not provide a wallpaper file.",
            wallpaper_path
        );
    }
    let wallpaper_path_ps = powershell::escape_ps_string(&wallpaper_path);

    let script = format!(
        "$wallpaper = '{}'; \
         Set-ItemProperty 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -Value $wallpaper -Force; \
         Set-ItemProperty 'HKCU:\\Control Panel\\Desktop' -Name WallpaperStyle -Value '10' -Force; \
         Add-Type -TypeDefinition @'\n\
using System;\n\
using System.Runtime.InteropServices;\n\
public static class RedcoreWallpaper {{\n\
    [DllImport(\"user32.dll\", CharSet = CharSet.Unicode, SetLastError = true)]\n\
    public static extern bool SystemParametersInfo(int uiAction, int uiParam, string pvParam, int fWinIni);\n\
}}\n\
'@; \
         if (-not [RedcoreWallpaper]::SystemParametersInfo(20, 0, $wallpaper, 3)) {{ \
            throw 'SystemParametersInfo failed to refresh the wallpaper.'; \
         }}",
        wallpaper_path_ps,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Wallpaper apply failed: {}", result.stderr.trim());
    }
    verify_registry_string(
        "HKCU",
        "Control Panel\\Desktop",
        "Wallpaper",
        wallpaper_path.as_str(),
    )?;
    tracing::info!(path = wallpaper_path.as_str(), "Wallpaper set");
    Ok(())
}

#[cfg(windows)]
fn apply_transparency(enable: bool) -> anyhow::Result<()> {
    let value = if enable { 1 } else { 0 };
    let script = format!(
        "Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize' \
            -Name EnableTransparency -Value {} -Type DWord -Force",
        value,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Transparency apply failed: {}", result.stderr.trim());
    }
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
        "EnableTransparency",
        value.into(),
    )?;
    tracing::info!(enable = enable, "Transparency setting applied");
    Ok(())
}

#[cfg(windows)]
fn apply_taskbar_cleanup() -> anyhow::Result<()> {
    let script = "\
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' \
            -Name ShowTaskViewButton -Value 0 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' \
            -Name SearchboxTaskbarMode -Value 1 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' \
            -Name TaskbarDa -Value 0 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' \
            -Name TaskbarMn -Value 0 -Type DWord -Force";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Taskbar cleanup failed: {}", result.stderr.trim());
    }
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        "ShowTaskViewButton",
        0,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search",
        "SearchboxTaskbarMode",
        1,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        "TaskbarDa",
        0,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        "TaskbarMn",
        0,
    )?;
    tracing::info!("Taskbar cleanup applied");
    Ok(())
}

#[cfg(windows)]
fn apply_explorer_cleanup() -> anyhow::Result<()> {
    let script = "\
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' \
            -Name HideFileExt -Value 0 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' \
            -Name Hidden -Value 1 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer' \
            -Name ShowRecent -Value 0 -Type DWord -Force; \
        Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer' \
            -Name ShowFrequent -Value 0 -Type DWord -Force";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Explorer cleanup failed: {}", result.stderr.trim());
    }
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        "HideFileExt",
        0,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
        "Hidden",
        1,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer",
        "ShowRecent",
        0,
    )?;
    verify_registry_dword(
        "HKCU",
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer",
        "ShowFrequent",
        0,
    )?;
    tracing::info!("Explorer cleanup applied");
    Ok(())
}

#[cfg(windows)]
fn refresh_shell_ui() -> anyhow::Result<()> {
    let script = "\
        Add-Type -TypeDefinition @'\n\
using System;\n\
using System.Runtime.InteropServices;\n\
public static class RedcoreShellRefresh {\n\
    [DllImport(\"user32.dll\", SetLastError = true, CharSet = CharSet.Unicode)]\n\
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, int msg, UIntPtr wParam, string lParam, int fuFlags, int uTimeout, out UIntPtr lpdwResult);\n\
}\n\
'@; \
        $result = [UIntPtr]::Zero; \
        [void][RedcoreShellRefresh]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, 'ImmersiveColorSet', 2, 5000, [ref]$result); \
        [void][RedcoreShellRefresh]::SendMessageTimeout([IntPtr]0xffff, 0x001A, [UIntPtr]::Zero, 'WindowsThemeElement', 2, 5000, [ref]$result); \
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue; \
        Start-Sleep -Milliseconds 1200; \
        Start-Process explorer.exe";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Shell refresh failed: {}", result.stderr.trim());
    }
    tracing::info!("Windows shell refreshed");
    Ok(())
}

#[cfg(windows)]
fn verify_registry_dword(hive: &str, path: &str, value_name: &str, expected: i64) -> anyhow::Result<()> {
    match read_registry_value(hive, path, value_name) {
        Some(Value::Number(value)) if value.as_i64() == Some(expected) => Ok(()),
        Some(Value::String(value)) if value.parse::<i64>().ok() == Some(expected) => Ok(()),
        Some(other) => anyhow::bail!(
            "Verification failed for {}\\{}\\{}: expected {}, got {}",
            hive,
            path,
            value_name,
            expected,
            other
        ),
        None => anyhow::bail!(
            "Verification failed for {}\\{}\\{}: value missing",
            hive,
            path,
            value_name
        ),
    }
}

#[cfg(windows)]
fn verify_registry_string(hive: &str, path: &str, value_name: &str, expected: &str) -> anyhow::Result<()> {
    match read_registry_value(hive, path, value_name) {
        Some(Value::String(value)) if value.eq_ignore_ascii_case(expected) => Ok(()),
        Some(other) => anyhow::bail!(
            "Verification failed for {}\\{}\\{}: expected '{}', got {}",
            hive,
            path,
            value_name,
            expected,
            other
        ),
        None => anyhow::bail!(
            "Verification failed for {}\\{}\\{}: value missing",
            hive,
            path,
            value_name
        ),
    }
}

#[cfg(windows)]
fn read_registry_value(hive: &str, path: &str, value_name: &str) -> Option<Value> {
    let escaped_path = powershell::escape_ps_string(path);
    let escaped_name = powershell::escape_ps_string(value_name);
    let script = format!(
        "$val = Get-ItemProperty -Path 'Registry::{}\\{}' -Name '{}' -ErrorAction SilentlyContinue; \
         if ($val) {{ $val.'{}' }} else {{ $null }}",
        hive, escaped_path, escaped_name, escaped_name,
    );
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                None
            } else if let Ok(n) = trimmed.parse::<i64>() {
                Some(Value::Number(n.into()))
            } else {
                Some(Value::String(trimmed.to_string()))
            }
        }
        _ => None,
    }
}

// ─── Non-Windows simulation ─────────────────────────────────────────────────

#[cfg(not(windows))]
fn apply_dark_mode() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would enable dark mode (AppsUseLightTheme=0, SystemUsesLightTheme=0)");
    Ok(())
}

#[cfg(not(windows))]
fn apply_accent_color() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would set accent color to redcore brand red (#E8254B)");
    Ok(())
}

#[cfg(not(windows))]
fn apply_wallpaper() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would set branded wallpaper");
    Ok(())
}

#[cfg(not(windows))]
fn apply_transparency(enable: bool) -> anyhow::Result<()> {
    tracing::info!(enable = enable, "[simulated] Would set transparency");
    Ok(())
}

#[cfg(not(windows))]
fn apply_taskbar_cleanup() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would clean up taskbar (hide Task View, Widgets, Chat, reduce search)");
    Ok(())
}

#[cfg(not(windows))]
fn apply_explorer_cleanup() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would clean up Explorer (show extensions, hidden files, disable recents)");
    Ok(())
}

#[cfg(not(windows))]
fn refresh_shell_ui() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would refresh the Windows shell UI");
    Ok(())
}

#[cfg(not(windows))]
fn read_registry_value(_hive: &str, _path: &str, _value_name: &str) -> Option<Value> {
    Some(serde_json::json!(1))
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gaming_options_all_enabled() {
        let opts = get_personalization_options("gaming_desktop");
        assert_eq!(opts["darkMode"], true);
        assert_eq!(opts["wallpaper"], false);
        assert_eq!(opts["taskbarCleanup"], true);
        assert_eq!(opts["explorerCleanup"], true);
        assert_eq!(opts["transparency"], true);
        assert_eq!(opts["brandAccent"], true);
    }

    #[test]
    fn test_work_pc_no_cleanup() {
        let opts = get_personalization_options("work_pc");
        assert_eq!(opts["darkMode"], true);
        assert_eq!(opts["brandAccent"], true);
        assert_eq!(opts["wallpaper"], false);
        assert_eq!(opts["taskbarCleanup"], false);
        assert_eq!(opts["explorerCleanup"], false);
    }

    #[test]
    fn test_low_spec_no_transparency() {
        let opts = get_personalization_options("low_spec_system");
        assert_eq!(opts["transparency"], false);
        assert_eq!(opts["darkMode"], true);
        assert_eq!(opts["brandAccent"], true);
        assert_eq!(opts["wallpaper"], false);
    }

    #[test]
    fn test_vm_cautious_minimal() {
        let opts = get_personalization_options("vm_cautious");
        assert_eq!(opts["darkMode"], true);
        assert_eq!(opts["brandAccent"], true);
        assert_eq!(opts["wallpaper"], false);
        assert_eq!(opts["taskbarCleanup"], false);
        assert_eq!(opts["explorerCleanup"], false);
        assert_eq!(opts["transparency"], false);
    }
}
