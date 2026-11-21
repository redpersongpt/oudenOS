// ─── Visual Personalization Engine ──────────────────────────────────────────
// Applies safe, reversible visual customizations to Windows.
// All registry changes use the native registry layer; the snapshot contains
// exactly the values that will be written (with their original types) and is
// taken BEFORE any change. Every feature reports a real error string.

use crate::db::Database;
#[cfg(windows)]
use crate::powershell;
use crate::registry::{self, Hive, RegValue};
use crate::rollback;
use serde_json::Value;

/// Pure black — matches the Ouden monochrome theme.
const OUDENOS_ACCENT_BGR: u32 = 0x0000_0000;

const PERSONALIZE: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize";
const ACCENT: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent";
const DWM: &str = "SOFTWARE\\Microsoft\\Windows\\DWM";
const ADVANCED: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced";
const EXPLORER: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer";
const SEARCH: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search";
const DESKTOP: &str = "Control Panel\\Desktop";
const COLORS: &str = "Control Panel\\Colors";
/// Supported policy that hides the Widgets button. `TaskbarDa` itself is
/// protected by the UCPD driver on Windows 11 24H2 and is no longer written.
const DSH_POLICY: &str = "SOFTWARE\\Policies\\Microsoft\\Dsh";

/// Returns a JSON description of what personalization will be applied
/// for the given device profile.
pub fn get_personalization_options(profile: &str) -> Value {
    tracing::info!(profile = profile, "Querying personalization options");
    serde_json::json!({
        "darkMode": true,
        "brandAccent": false,
        "wallpaper": true,
        "taskbarCleanup": false,
        "explorerCleanup": false,
        "transparency": false,
        "profileVariant": profile
    })
}

/// One registry value a feature writes.
#[derive(Debug, Clone)]
pub(crate) struct Write {
    hive: Hive,
    path: &'static str,
    name: &'static str,
    value: RegValue,
}

fn w(hive: Hive, path: &'static str, name: &'static str, value: RegValue) -> Write {
    Write { hive, path, name, value }
}

/// A personalization feature: the registry values it writes, and whether it
/// additionally runs the wallpaper generator.
#[derive(Debug, Clone)]
pub(crate) struct Feature {
    pub key: &'static str,
    pub action_id: &'static str,
    writes: Vec<Write>,
    wallpaper: bool,
}

/// Resolve the features to apply from profile defaults + caller overrides.
pub(crate) fn plan_features(profile: &str, options: &Value) -> Vec<Feature> {
    let defaults = get_personalization_options(profile);
    let flag = |key: &str| -> bool {
        options
            .get(key)
            .and_then(Value::as_bool)
            .unwrap_or_else(|| defaults[key].as_bool().unwrap_or(false))
    };
    let mut taskbar_cleanup = flag("taskbarCleanup");
    let mut explorer_cleanup = flag("explorerCleanup");
    if profile == "work_pc" {
        taskbar_cleanup = false;
        explorer_cleanup = false;
    }
    // Transparency: an explicit caller value is always honoured (true writes
    // 1, false writes 0 — the questionnaire's "disable transparency" answer);
    // low-spec profiles always disable it.
    let transparency: Option<bool> = if profile == "low_spec_system" || profile == "low_spec" {
        Some(false)
    } else {
        options.get("transparency").and_then(Value::as_bool)
    };

    let mut features = Vec::new();
    if flag("darkMode") {
        features.push(Feature {
            key: "darkMode",
            action_id: "personalize.darkMode",
            writes: vec![
                w(Hive::Hkcu, PERSONALIZE, "AppsUseLightTheme", RegValue::dword(0)),
                w(Hive::Hkcu, PERSONALIZE, "SystemUsesLightTheme", RegValue::dword(0)),
            ],
            wallpaper: false,
        });
    }
    if flag("brandAccent") {
        features.push(Feature {
            key: "brandAccent",
            action_id: "personalize.accentColor",
            writes: vec![
                w(Hive::Hkcu, ACCENT, "AccentColorMenu", RegValue::dword(OUDENOS_ACCENT_BGR)),
                w(Hive::Hkcu, ACCENT, "StartColorMenu", RegValue::dword(OUDENOS_ACCENT_BGR)),
                w(Hive::Hkcu, PERSONALIZE, "ColorPrevalence", RegValue::dword(0)),
                w(Hive::Hkcu, DWM, "ColorPrevalence", RegValue::dword(0)),
            ],
            wallpaper: false,
        });
    }
    if flag("wallpaper") {
        features.push(Feature {
            key: "wallpaper",
            action_id: "personalize.wallpaper",
            writes: vec![
                w(Hive::Hkcu, DESKTOP, "WallpaperStyle", RegValue::string("10")),
                w(Hive::Hkcu, DESKTOP, "TileWallpaper", RegValue::string("0")),
                w(Hive::Hkcu, COLORS, "Background", RegValue::string("0 0 0")),
            ],
            wallpaper: true,
        });
    }
    if let Some(enable) = transparency {
        features.push(Feature {
            key: "transparency",
            action_id: "personalize.transparency",
            writes: vec![w(Hive::Hkcu, PERSONALIZE, "EnableTransparency", RegValue::dword(u32::from(enable)))],
            wallpaper: false,
        });
    }
    if taskbar_cleanup {
        features.push(Feature {
            key: "taskbarCleanup",
            action_id: "personalize.taskbarCleanup",
            writes: vec![
                w(Hive::Hkcu, ADVANCED, "ShowTaskViewButton", RegValue::dword(0)),
                w(Hive::Hkcu, SEARCH, "SearchboxTaskbarMode", RegValue::dword(1)),
                w(Hive::Hkcu, ADVANCED, "TaskbarMn", RegValue::dword(0)),
                w(Hive::Hklm, DSH_POLICY, "AllowNewsAndInterests", RegValue::dword(0)),
            ],
            wallpaper: false,
        });
    }
    if explorer_cleanup {
        features.push(Feature {
            key: "explorerCleanup",
            action_id: "personalize.explorerCleanup",
            writes: vec![
                w(Hive::Hkcu, ADVANCED, "HideFileExt", RegValue::dword(0)),
                w(Hive::Hkcu, ADVANCED, "Hidden", RegValue::dword(1)),
                w(Hive::Hkcu, EXPLORER, "ShowRecent", RegValue::dword(0)),
                w(Hive::Hkcu, EXPLORER, "ShowFrequent", RegValue::dword(0)),
            ],
            wallpaper: false,
        });
    }
    features
}

/// Apply visual personalization for the given profile.
pub fn apply_personalization(db: &Database, profile: &str, options: &Value) -> anyhow::Result<Value> {
    tracing::info!(profile = profile, "Applying visual personalization");
    let features = plan_features(profile, options);

    // ── Phase 1: snapshot exactly what will be written ─────────────────
    let mut previous_values = Vec::new();
    for feature in &features {
        for write in &feature.writes {
            let current = registry::read_value(write.hive, write.path, write.name).map_err(|e| {
                anyhow::anyhow!("Could not snapshot {}\\{}\\{} ({}); nothing was changed", write.hive.as_str(), write.path, write.name, e)
            })?;
            let created_key = if current.is_none() {
                registry::first_missing_key(write.hive, write.path).unwrap_or(None)
            } else {
                None
            };
            previous_values.push(rollback::PreviousValue {
                change_type: "registry".to_string(),
                path: format!("{}\\{}", write.hive.as_str(), write.path),
                value_name: write.name.to_string(),
                previous_value: current.as_ref().map(RegValue::to_json),
                action_id: feature.action_id.to_string(),
                previous_kind: current.as_ref().map(|v| v.kind.as_str()),
                created_key,
            });
        }
        if feature.wallpaper {
            let current = registry::read_value(Hive::Hkcu, DESKTOP, "Wallpaper").map_err(|e| {
                anyhow::anyhow!("Could not snapshot the current wallpaper ({}); nothing was changed", e)
            })?;
            previous_values.push(rollback::PreviousValue {
                change_type: "registry".to_string(),
                path: format!("HKCU\\{}", DESKTOP),
                value_name: "Wallpaper".to_string(),
                previous_value: current.as_ref().map(RegValue::to_json),
                action_id: feature.action_id.to_string(),
                previous_kind: current.as_ref().map(|v| v.kind.as_str()),
                created_key: None,
            });
        }
    }

    let snapshot_id = rollback::create_snapshot(
        db,
        "personalization",
        &format!("Pre-personalization snapshot for profile '{}'", profile),
        &previous_values,
    )?;

    // ── Phase 2: apply ─────────────────────────────────────────────────
    let mut results: Vec<Value> = Vec::new();
    let mut succeeded = 0u32;
    let mut failed = 0u32;
    let mut needs_refresh = false;

    let mut skipped_items = 0u32;
    for feature in &features {
        match apply_feature(feature) {
            Ok(skipped) => {
                // A feature with protected (skipped) items is still not a
                // failure; the skipped items are reported individually.
                succeeded += 1;
                skipped_items += skipped.len() as u32;
                needs_refresh |= !feature.wallpaper;
                let status = feature_status(feature, &skipped);
                let mut entry = serde_json::json!({ "feature": feature.key, "status": status });
                if !skipped.is_empty() {
                    entry["items"] = Value::Array(skipped);
                }
                results.push(entry);
            }
            Err(e) => {
                tracing::error!(feature = feature.key, error = %e, "Personalization feature failed");
                failed += 1;
                results.push(serde_json::json!({ "feature": feature.key, "status": "failed", "error": e.to_string() }));
            }
        }
    }
    if needs_refresh {
        broadcast_setting_change();
    }

    let status = if failed == 0 {
        "success"
    } else if succeeded == 0 {
        "failed"
    } else {
        "partial"
    };
    let first_error = results
        .iter()
        .find_map(|r| r.get("error").and_then(Value::as_str).map(|e| format!("{}: {}", r["feature"].as_str().unwrap_or("?"), e)));

    let now = chrono::Utc::now().to_rfc3339();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, 'personalizer', 'personalization_applied', ?3, ?4)",
        rusqlite::params![
            uuid::Uuid::new_v4().to_string(),
            now,
            format!(
                "Profile '{}': {} succeeded, {} failed, status={}{}",
                profile,
                succeeded,
                failed,
                status,
                first_error.as_deref().map(|e| format!(" · {}", e)).unwrap_or_default()
            ),
            if status == "success" { "info" } else { "error" },
        ],
    )?;

    Ok(serde_json::json!({
        "snapshotId": snapshot_id,
        "profile": profile,
        "status": status,
        "succeeded": succeeded,
        "failed": failed,
        "skipped": skipped_items,
        "error": first_error,
        "results": results,
    }))
}

/// Apply one feature. A value-level access denial (e.g. the UCPD driver
/// protecting TaskbarDa / the Dsh policy / Search values — the key opens fine,
/// the value write is refused) is NOT a failure: that item is reported as
/// skipped (`access_denied_protected`), nothing was changed for it, it is not
/// verified, and the remaining values of the feature still apply.
/// Returns the skipped items.
pub(crate) fn apply_feature(feature: &Feature) -> anyhow::Result<Vec<Value>> {
    let mut skipped = Vec::new();
    for write in &feature.writes {
        match registry::write_value(write.hive, write.path, write.name, &write.value) {
            Ok(_) => {}
            Err(e) if e.is_access_denied() => {
                tracing::warn!(feature = feature.key, value = write.name, "Value write denied by Windows — skipped");
                skipped.push(serde_json::json!({
                    "path": format!("{}\\{}", write.hive.as_str(), write.path),
                    "valueName": write.name,
                    "status": "skipped",
                    "reason": "access_denied_protected",
                    "note": "Windows protects this value (e.g. the UCPD driver); nothing was changed for it.",
                }));
                continue;
            }
            Err(e) => anyhow::bail!("{}", e),
        }
        match registry::read_value(write.hive, write.path, write.name)? {
            Some(read) if read == write.value => {}
            other => anyhow::bail!(
                "Verification failed for {}\\{}\\{}: expected {:?}, got {:?}",
                write.hive.as_str(),
                write.path,
                write.name,
                write.value.to_json(),
                other.map(|v| v.to_json())
            ),
        }
    }
    if feature.wallpaper {
        apply_wallpaper()?;
    }
    Ok(skipped)
}

/// Feature-level status from its skipped items.
pub(crate) fn feature_status(feature: &Feature, skipped: &[Value]) -> &'static str {
    if skipped.is_empty() {
        "success"
    } else if skipped.len() >= feature.writes.len() && !feature.wallpaper {
        "skipped"
    } else {
        "partial"
    }
}

/// Revert a personalization by restoring its rollback snapshot, then make
/// the restored wallpaper/theme visible without a re-login.
pub fn revert_personalization(db: &Database, snapshot_id: &str) -> anyhow::Result<Value> {
    tracing::info!(snapshot_id = snapshot_id, "Reverting personalization via snapshot");
    let result = rollback::restore_snapshot(db, snapshot_id)?;
    refresh_wallpaper_from_registry();
    broadcast_setting_change();
    Ok(result)
}

// ─── Windows implementations ────────────────────────────────────────────────

#[cfg(windows)]
fn broadcast_setting_change() {
    use windows::core::w;
    use windows::Win32::Foundation::{LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{SendMessageTimeoutW, HWND_BROADCAST, SMTO_ABORTIFHUNG, WM_SETTINGCHANGE};
    for area in [w!("ImmersiveColorSet"), w!("WindowsThemeElement")] {
        unsafe {
            let _ = SendMessageTimeoutW(
                HWND_BROADCAST,
                WM_SETTINGCHANGE,
                WPARAM(0),
                LPARAM(area.as_ptr() as isize),
                SMTO_ABORTIFHUNG,
                2000,
                None,
            );
        }
    }
}

#[cfg(not(windows))]
fn broadcast_setting_change() {}

#[cfg(windows)]
fn refresh_wallpaper_from_registry() {
    // Re-apply whatever the registry now says (after a restore).
    let script = "Add-Type -TypeDefinition @'\nusing System; using System.Runtime.InteropServices;\npublic class OudenWallRefresh { [DllImport(\"user32.dll\", CharSet = CharSet.Unicode)] public static extern int SystemParametersInfo(int a, int b, string c, int d); }\n'@; \
        $p = (Get-ItemProperty 'HKCU:\\Control Panel\\Desktop' -Name Wallpaper -ErrorAction SilentlyContinue).Wallpaper; \
        if ($null -eq $p) { $p = '' }; \
        [OudenWallRefresh]::SystemParametersInfo(0x0014, 0, $p, 0x01 -bor 0x02) | Out-Null";
    if let Err(e) = powershell::execute(script) {
        tracing::warn!(error = %e, "Wallpaper refresh after revert failed");
    }
}

#[cfg(not(windows))]
fn refresh_wallpaper_from_registry() {}

#[cfg(windows)]
fn apply_wallpaper() -> anyhow::Result<()> {
    // Generate wallpaper at runtime using GDI+ — resolution-matched with
    // Ouden logo (open ring arc) and pixel starfield on black background.
    // Style/tile/background registry values are written natively beforehand.
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$w = $screen.Width; $h = $screen.Height

$wallDir = Join-Path $env:LOCALAPPDATA 'OudenOS'
if (!(Test-Path -LiteralPath $wallDir)) { New-Item -ItemType Directory -Path $wallDir | Out-Null }
$wallPath = Join-Path $wallDir 'wallpaper.bmp'

$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Black)

$rand = New-Object System.Random(42)
$starCount = [math]::Min([math]::Floor($w * $h / 5000), 1200)
for ($i = 0; $i -lt $starCount; $i++) {
    $sx = $rand.Next(0, $w); $sy = $rand.Next(0, $h)
    $opacity = [int](40 + $rand.Next(0, 100))
    $size = if ($rand.NextDouble() -gt 0.85) { 2 } else { 1 }
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($opacity, 255, 255, 255))
    $g.FillRectangle($brush, $sx, $sy, $size, $size)
    $brush.Dispose()
}

$cx = $w / 2; $cy = $h / 2
$logoSize = [math]::Min($w, $h) * 0.12
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 255, 255, 255), [float]($logoSize * 0.06))
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$rect = New-Object System.Drawing.RectangleF(($cx - $logoSize), ($cy - $logoSize), ($logoSize * 2), ($logoSize * 2))
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawArc($pen, $rect, -50, 320)
$pen.Dispose()

$dotAngle = [math]::PI * (-50) / 180
$dotX = $cx + $logoSize * [math]::Cos($dotAngle)
$dotY = $cy + $logoSize * [math]::Sin($dotAngle)
$dotR = $logoSize * 0.05
$dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 255, 255, 255))
$g.FillEllipse($dotBrush, [float]($dotX - $dotR), [float]($dotY - $dotR), [float]($dotR * 2), [float]($dotR * 2))
$dotBrush.Dispose()
$g.Dispose()

$bmp.Save($wallPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp.Dispose()

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class OudenWallHelper {
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@

$ok = [OudenWallHelper]::SystemParametersInfo(0x0014, 0, $wallPath, 0x01 -bor 0x02)
if ($ok -eq 0) { throw ('SystemParametersInfo failed (Win32 error ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error() + ')') }
Write-Output "Wallpaper generated and applied: ${w}x${h}"
"#;
    let result = powershell::execute_mutation(script)?;
    if !result.success {
        anyhow::bail!("Wallpaper generation failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn apply_wallpaper() -> anyhow::Result<()> {
    tracing::info!("[simulated] Would set branded wallpaper");
    Ok(())
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn keys(features: &[Feature]) -> Vec<&'static str> {
        features.iter().map(|f| f.key).collect()
    }

    #[test]
    fn test_gaming_options_defaults() {
        let opts = get_personalization_options("gaming_desktop");
        assert_eq!(opts["darkMode"], true);
        assert_eq!(opts["wallpaper"], true);
        assert_eq!(opts["taskbarCleanup"], false);
        assert_eq!(opts["explorerCleanup"], false);
        assert_eq!(opts["transparency"], false);
        assert_eq!(opts["brandAccent"], false);
    }

    #[test]
    fn taskbar_cleanup_never_touches_ucpd_protected_taskbar_da() {
        let features = plan_features("gaming_desktop", &serde_json::json!({ "taskbarCleanup": true }));
        let taskbar = features.iter().find(|f| f.key == "taskbarCleanup").unwrap();
        assert!(taskbar.writes.iter().all(|w| w.name != "TaskbarDa"));
        assert!(taskbar
            .writes
            .iter()
            .any(|w| w.path == DSH_POLICY && w.name == "AllowNewsAndInterests"));
    }

    #[test]
    fn explicit_transparency_false_writes_zero() {
        let features = plan_features("gaming_desktop", &serde_json::json!({ "transparency": false }));
        let t = features.iter().find(|f| f.key == "transparency").expect("transparency feature");
        assert_eq!(t.writes[0].value, RegValue::dword(0));
        // Not mentioned by the caller → untouched.
        let none = plan_features("gaming_desktop", &serde_json::json!({}));
        assert!(!keys(&none).contains(&"transparency"));
        // Low-spec always disables.
        let low = plan_features("low_spec_system", &serde_json::json!({ "transparency": true }));
        assert_eq!(low.iter().find(|f| f.key == "transparency").unwrap().writes[0].value, RegValue::dword(0));
    }

    #[test]
    fn work_pc_never_gets_shell_cleanup() {
        let features = plan_features(
            "work_pc",
            &serde_json::json!({ "taskbarCleanup": true, "explorerCleanup": true }),
        );
        assert!(!keys(&features).contains(&"taskbarCleanup"));
        assert!(!keys(&features).contains(&"explorerCleanup"));
    }

    /// UCPD-style denial on the Dsh policy value: injected, never written to
    /// the real HKLM. The other taskbar values (scratch HKCU key) still apply,
    /// the denied item is reported as skipped and the feature does not fail.
    #[test]
    fn denied_dsh_policy_is_skipped_not_failed() {
        let scratch: &'static str =
            Box::leak(format!("Software\\OudenOSTest-ucpd-{}", uuid::Uuid::new_v4().simple()).into_boxed_str());
        registry::test_hooks::deny_write(Hive::Hklm, DSH_POLICY, "AllowNewsAndInterests");
        let feature = Feature {
            key: "taskbarCleanup",
            action_id: "personalize.taskbarCleanup",
            writes: vec![
                w(Hive::Hkcu, scratch, "ShowTaskViewButton", RegValue::dword(0)),
                w(Hive::Hklm, DSH_POLICY, "AllowNewsAndInterests", RegValue::dword(0)),
                w(Hive::Hkcu, scratch, "TaskbarMn", RegValue::dword(0)),
            ],
            wallpaper: false,
        };
        let result = apply_feature(&feature);
        registry::test_hooks::allow_write(Hive::Hklm, DSH_POLICY, "AllowNewsAndInterests");
        let skipped = result.expect("feature must not fail on a protected value");
        assert_eq!(skipped.len(), 1);
        assert_eq!(skipped[0]["reason"], "access_denied_protected");
        assert_eq!(skipped[0]["valueName"], "AllowNewsAndInterests");
        assert_eq!(feature_status(&feature, &skipped), "partial");
        // The values around it were written and verified.
        assert_eq!(registry::read_value(Hive::Hkcu, scratch, "ShowTaskViewButton").unwrap(), Some(RegValue::dword(0)));
        assert_eq!(registry::read_value(Hive::Hkcu, scratch, "TaskbarMn").unwrap(), Some(RegValue::dword(0)));
        for name in ["ShowTaskViewButton", "TaskbarMn"] {
            let _ = registry::delete_value(Hive::Hkcu, scratch, name);
        }
        let _ = registry::delete_key_if_empty(Hive::Hkcu, scratch);
    }

    #[test]
    fn accent_snapshot_covers_exactly_the_written_values() {
        let features = plan_features("gaming_desktop", &serde_json::json!({ "brandAccent": true }));
        let accent = features.iter().find(|f| f.key == "brandAccent").unwrap();
        let written: Vec<(&str, &str)> = accent.writes.iter().map(|w| (w.path, w.name)).collect();
        assert!(written.contains(&(DWM, "ColorPrevalence")));
        assert!(!written.iter().any(|(_, n)| *n == "ColorizationColor"));
    }
}
