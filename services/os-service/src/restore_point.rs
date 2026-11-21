// ─── Windows System Restore Point ────────────────────────────────────────────
// Creates a Windows System Restore Point as an EXTRA safety layer alongside
// oudenOS's own snapshot/rollback ledger (the primary recovery mechanism).
//
//  * System Protection is never silently enabled: if it is off, the result is
//    `unavailable` and the user decides.
//  * Windows' 24-hour creation throttle is reported as `skipped`, never as
//    `created` (Checkpoint-Computer only emits a warning in that case).
//  * The description is fixed server-side; nothing from the client is
//    interpolated into the command line.

use serde_json::{json, Value};

/// Fixed restore point description (client-supplied text is ignored).
pub const RESTORE_POINT_DESCRIPTION: &str = "oudenOS pre-optimization restore point";

/// Best-effort detection of whether Windows System Restore is available/enabled.
/// Returns `{ available: bool, state: string, message: string }`.
#[cfg(windows)]
pub fn availability() -> Value {
    use crate::registry::{read_value, Hive};
    let policy = read_value(
        Hive::Hklm,
        "SOFTWARE\\Policies\\Microsoft\\Windows NT\\SystemRestore",
        "DisableConfig",
    )
    .ok()
    .flatten()
    .and_then(|v| v.as_u64());
    let policy_sr = read_value(
        Hive::Hklm,
        "SOFTWARE\\Policies\\Microsoft\\Windows NT\\SystemRestore",
        "DisableSR",
    )
    .ok()
    .flatten()
    .and_then(|v| v.as_u64());
    let interval = read_value(
        Hive::Hklm,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore",
        "RPSessionInterval",
    )
    .ok()
    .flatten()
    .and_then(|v| v.as_u64());
    let product_type = read_value(
        Hive::Hklm,
        "SYSTEM\\CurrentControlSet\\Control\\ProductOptions",
        "ProductType",
    )
    .ok()
    .flatten()
    .and_then(|v| v.as_str().map(str::to_string));
    classify_availability_for_sku(product_type.as_deref(), policy, policy_sr, interval)
}

#[cfg(not(windows))]
pub fn availability() -> Value {
    json!({
        "available": false,
        "state": "unsupported",
        "message": "Windows System Restore is only available on Windows.",
    })
}

/// Availability including the SKU: System Restore exists only on client
/// Windows (ProductOptions\ProductType "WinNT"). "ServerNT" / "LanmanNT"
/// (Server, domain controller) report `unavailable` without trying
/// Checkpoint-Computer. An unreadable product type is treated as client.
pub(crate) fn classify_availability_for_sku(
    product_type: Option<&str>,
    disable_config: Option<u64>,
    disable_sr: Option<u64>,
    interval: Option<u64>,
) -> Value {
    if let Some(pt) = product_type {
        if pt.eq_ignore_ascii_case("ServerNT") || pt.eq_ignore_ascii_case("LanmanNT") {
            return json!({
                "available": false,
                "state": "unsupported_sku",
                "message": "Windows Server editions do not include System Restore. oudenOS rollback snapshots still apply.",
                "productType": pt,
            });
        }
    }
    classify_availability(disable_config, disable_sr, interval)
}

pub(crate) fn classify_availability(disable_config: Option<u64>, disable_sr: Option<u64>, interval: Option<u64>) -> Value {
    let (available, state, message) = if disable_config == Some(1) || disable_sr == Some(1) {
        (false, "disabled", "System Restore is disabled by policy on this PC.")
    } else if interval == Some(0) {
        (
            false,
            "off",
            "System Protection is turned off for the system drive. oudenOS will not turn it on by itself; its own rollback snapshots still apply.",
        )
    } else {
        (true, "available", "System Restore appears to be available.")
    };
    json!({ "available": available, "state": state, "message": message })
}

#[cfg(windows)]
const CREATE_SCRIPT: &str = "\
    $w = $null; \
    try { \
        Checkpoint-Computer -Description '__OUDENOS_RP_DESC__' -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop -WarningAction SilentlyContinue -WarningVariable w; \
        if ($w -and $w.Count -gt 0) { Write-Output ('SKIPPED: ' + ($w | Select-Object -First 1)) } else { Write-Output 'CREATED' } \
    } catch { \
        Write-Output ('FAILED: ' + $_.Exception.HResult + ': ' + $_.Exception.Message) \
    }";

/// Classify the script output. Pure for testing.
pub(crate) fn classify_create_output(stdout: &str, stderr: &str) -> Value {
    let out = stdout.trim();
    if let Some(line) = out.lines().find(|l| l.trim_start().starts_with("CREATED")) {
        let _ = line;
        return json!({
            "status": "created",
            "description": RESTORE_POINT_DESCRIPTION,
            "message": "Windows restore point created.",
        });
    }
    if let Some(line) = out.lines().find(|l| l.trim_start().starts_with("SKIPPED")) {
        return json!({
            "status": "skipped",
            "reason": "throttled",
            "description": RESTORE_POINT_DESCRIPTION,
            "message": "A restore point was already created recently (Windows allows one per 24h); the existing one will serve as the pre-optimization checkpoint.",
            "error": line.trim_start().trim_start_matches("SKIPPED:").trim(),
        });
    }
    let detail = out
        .lines()
        .find(|l| l.contains("FAILED"))
        .map(|l| l.trim_start().trim_start_matches("FAILED:").trim().to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            let e = stderr.trim();
            (!e.is_empty()).then(|| e.to_string())
        })
        .unwrap_or_else(|| "Windows did not report a reason.".to_string());
    // 0x80042306 = VSS / System Restore disabled, -2147024809 etc.: surface verbatim.
    json!({
        "status": "failed",
        "description": RESTORE_POINT_DESCRIPTION,
        "message": "Windows could not create a restore point.",
        "error": detail,
    })
}

/// Attempt to create a Windows System Restore Point.
/// `status`: `created` | `skipped` (24h throttle) | `unavailable` (System
/// Protection off/disabled — not enabled automatically) | `failed`.
#[cfg(windows)]
pub fn create(_client_description: &str) -> Value {
    let avail = availability();
    if avail.get("available").and_then(Value::as_bool) == Some(false) {
        return json!({
            "status": "unavailable",
            "reason": avail.get("state"),
            "description": RESTORE_POINT_DESCRIPTION,
            "message": avail.get("message"),
        });
    }
    let script = CREATE_SCRIPT.replace("__OUDENOS_RP_DESC__", RESTORE_POINT_DESCRIPTION);
    match crate::powershell::execute_with_timeout(&script, crate::powershell::LONG_TIMEOUT) {
        Ok(r) => classify_create_output(&r.stdout, &r.stderr),
        Err(e) => json!({
            "status": "failed",
            "description": RESTORE_POINT_DESCRIPTION,
            "message": "Could not run the restore-point command.",
            "error": e.to_string(),
        }),
    }
}

#[cfg(not(windows))]
pub fn create(_client_description: &str) -> Value {
    json!({
        "status": "unavailable",
        "description": RESTORE_POINT_DESCRIPTION,
        "message": "Windows System Restore is only available on Windows.",
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn throttle_warning_is_skipped_not_created() {
        let r = classify_create_output(
            "SKIPPED: A new system restore point cannot be created because one has already been created within the past 1440 minutes.",
            "",
        );
        assert_eq!(r["status"], "skipped");
        assert_eq!(classify_create_output("CREATED", "")["status"], "created");
        assert_eq!(classify_create_output("FAILED: -2147023838: service disabled", "")["status"], "failed");
        assert_eq!(classify_create_output("", "boom")["error"], "boom");
    }

    #[test]
    fn disabled_protection_is_reported_not_enabled() {
        assert_eq!(classify_availability(Some(1), None, None)["state"], "disabled");
        assert_eq!(classify_availability(None, Some(1), None)["state"], "disabled");
        assert_eq!(classify_availability(None, None, Some(0))["state"], "off");
        assert_eq!(classify_availability(None, None, Some(1))["available"], true);
    }

    #[test]
    fn server_skus_are_unavailable_without_trying() {
        for pt in ["ServerNT", "LanmanNT", "servernt"] {
            let r = classify_availability_for_sku(Some(pt), None, None, Some(1));
            assert_eq!(r["available"], false, "{pt}");
            assert_eq!(r["state"], "unsupported_sku");
        }
        assert_eq!(classify_availability_for_sku(Some("WinNT"), None, None, Some(1))["available"], true);
        assert_eq!(classify_availability_for_sku(None, None, None, None)["available"], true);
        assert_eq!(classify_availability_for_sku(Some("WinNT"), Some(1), None, None)["state"], "disabled");
    }
}
