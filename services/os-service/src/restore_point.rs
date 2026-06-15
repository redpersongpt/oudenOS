// ─── Windows System Restore Point ────────────────────────────────────────────
// Creates a Windows System Restore Point as an EXTRA safety layer alongside
// oudenOS's own snapshot/rollback ledger (which remains the primary recovery
// mechanism — see executor.rs / rollback.rs). All operations shell out to
// PowerShell and surface the real failure reason rather than pretending success.
//
// NOTE: this module is compile-unverified in the current environment (no cargo /
// non-Windows host). Validate with `cargo check` + a Windows run before relying
// on it. The UI/apply-flow wiring is intentionally left as a follow-up; the
// service exposes `system.restorePointStatus` and `system.createRestorePoint`.

use serde_json::{json, Value};

/// Best-effort detection of whether Windows System Restore is available/enabled.
/// Returns `{ available: bool, state: string, message: string }`.
#[cfg(windows)]
pub fn availability() -> Value {
    // System Restore can be disabled by policy (DisableConfig) or simply turned
    // off for the system drive. We treat it as available unless clearly disabled.
    let script = "\
        $disabled = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows NT\\SystemRestore' -Name DisableConfig -ErrorAction SilentlyContinue).DisableConfig; \
        $sr = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore' -ErrorAction SilentlyContinue; \
        if ($disabled -eq 1) { Write-Output 'DISABLED' } \
        elseif ($sr -ne $null -and $sr.RPSessionInterval -eq 0) { Write-Output 'OFF' } \
        else { Write-Output 'AVAILABLE' }";
    match crate::powershell::execute(script) {
        Ok(r) => {
            let out = r.stdout.trim().to_uppercase();
            let (available, state, message): (bool, &str, &str) = if out.contains("DISABLED") {
                (
                    false,
                    "disabled",
                    "System Restore is disabled by policy on this PC.",
                )
            } else if out.contains("OFF") {
                (
                    false,
                    "off",
                    "System protection appears to be turned off for the system drive.",
                )
            } else if out.contains("AVAILABLE") {
                (true, "available", "System Restore appears to be available.")
            } else {
                (
                    false,
                    "unknown",
                    "Could not determine the System Restore status.",
                )
            };
            json!({ "available": available, "state": state, "message": message })
        }
        Err(e) => json!({
            "available": false,
            "state": "unknown",
            "message": format!("Could not query System Restore status: {}", e),
        }),
    }
}

#[cfg(not(windows))]
pub fn availability() -> Value {
    json!({
        "available": false,
        "state": "unsupported",
        "message": "Windows System Restore is only available on Windows.",
    })
}

// PowerShell template for restore-point creation. A literal token is replaced
// (rather than using format!) so the script's own `{ }` blocks need no escaping.
#[cfg(windows)]
const CREATE_SCRIPT_TEMPLATE: &str = "\
    $ErrorActionPreference = 'Stop'; \
    try { Enable-ComputerRestore -Drive ($env:SystemDrive + '\\') -ErrorAction SilentlyContinue } catch {}; \
    try { \
        Checkpoint-Computer -Description '__OUDENOS_RP_DESC__' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop; \
        Write-Output 'CREATED' \
    } catch { \
        Write-Output ('FAILED: ' + $_.Exception.Message) \
    }";

/// Attempt to create a Windows System Restore Point.
/// Returns `{ status, description, message, error? }` where `status` is one of:
/// `created` | `skipped` (rate-limited — one already exists in the last 24h) |
/// `failed`. Never reports success when nothing was created.
#[cfg(windows)]
pub fn create(description: &str) -> Value {
    let desc = crate::powershell::escape_ps_string(description);
    let script = CREATE_SCRIPT_TEMPLATE.replace("__OUDENOS_RP_DESC__", &desc);

    match crate::powershell::execute(&script) {
        Ok(r) => {
            let out = r.stdout.trim();
            if out.contains("CREATED") {
                return json!({
                    "status": "created",
                    "description": description,
                    "message": "Windows restore point created.",
                });
            }
            let detail = out
                .lines()
                .find(|l| l.contains("FAILED"))
                .map(|l| l.trim_start_matches("FAILED:").trim().to_string())
                .filter(|s| !s.is_empty())
                .or_else(|| {
                    let e = r.stderr.trim();
                    if e.is_empty() {
                        None
                    } else {
                        Some(e.to_string())
                    }
                })
                .unwrap_or_else(|| "Windows did not report a reason.".to_string());
            // Windows limits restore points to one per ~1440 minutes; that is a
            // benign "already protected" case, not a failure.
            let lowered = detail.to_lowercase();
            let rate_limited = detail.contains("1440") || lowered.contains("already been created");
            json!({
                "status": if rate_limited { "skipped" } else { "failed" },
                "description": description,
                "message": if rate_limited {
                    "A restore point was already created recently (Windows allows one per 24h); the existing one will serve as the pre-optimization checkpoint."
                } else {
                    "Windows could not create a restore point."
                },
                "error": detail,
            })
        }
        Err(e) => json!({
            "status": "failed",
            "description": description,
            "message": "Could not run the restore-point command.",
            "error": e.to_string(),
        }),
    }
}

#[cfg(not(windows))]
pub fn create(description: &str) -> Value {
    json!({
        "status": "unavailable",
        "description": description,
        "message": "Windows System Restore is only available on Windows.",
    })
}
