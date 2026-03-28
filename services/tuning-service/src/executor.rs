// ─── Action Executor ────────────────────────────────────────────────────────
// Applies tuning actions with full backup, validation, and audit logging.
// All system changes go through the PowerShell bridge for auditability.
// A rollback snapshot is always created BEFORE any changes are applied.

use crate::db::Database;
use crate::journal;
#[cfg(windows)]
use crate::powershell;
use crate::rollback::{self, PreviousValue};

/// Outcome of applying a single change within an action.
#[derive(Debug, serde::Serialize)]
struct ChangeResult {
    #[serde(rename = "type")]
    change_type: String,
    path: String,
    #[serde(rename = "valueName")]
    value_name: String,
    #[serde(rename = "previousValue")]
    previous_value: Option<serde_json::Value>,
    #[serde(rename = "newValue")]
    new_value: serde_json::Value,
    verified: bool,
}

/// Execute a tuning action, creating a rollback snapshot first, then applying
/// all changes described in `action_data`.
///
/// `expert_mode_enabled` — when `false`, actions flagged `expertOnly: true` are
/// rejected before any changes are made.
pub fn execute_action(
    db: &Database,
    action_id: &str,
    action_data: &serde_json::Value,
    expert_mode_enabled: bool,
) -> anyhow::Result<serde_json::Value> {
    tracing::info!(action_id, "Executing action");

    // ── Expert-mode gate ────────────────────────────────────────────────────
    let expert_only = action_data
        .get("expertOnly")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if expert_only && !expert_mode_enabled {
        anyhow::bail!(
            "Action '{}' requires Expert Mode to be enabled. \
             Enable Expert Mode in Settings before applying this action.",
            action_id
        );
    }

    let registry_changes = action_data
        .get("registryChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let service_changes = action_data
        .get("serviceChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let power_changes = action_data
        .get("powerChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let bcd_changes = action_data
        .get("bcdChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // powercfgChanges: [{ "subcommand": "setactive", "value": "SCHEME_MIN" }]
    let powercfg_changes = action_data
        .get("powercfgChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // fsutilChanges: [{ "behavior": "disable8dot3", "volumePath": "C:", "value": "1" }]
    let fsutil_changes = action_data
        .get("fsutilChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // hibernateChanges: [{ "enabled": false }]
    let hibernate_changes = action_data
        .get("hibernateChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    // mmagentChanges: [{ "setting": "DisablePagingExecutive", "value": 1 }]
    let mmagent_changes = action_data
        .get("mmagentChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let requires_reboot = action_data
        .get("requiresReboot")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    // ── Phase 1: Collect all previous values BEFORE making any changes ──────

    let mut previous_values: Vec<PreviousValue> = Vec::new();

    for change in &registry_changes {
        let hive = change["hive"].as_str().unwrap_or("HKLM");
        let path = change["path"].as_str().unwrap_or("");
        let value_name = change["valueName"].as_str().unwrap_or("");

        let prev = read_registry_value(hive, path, value_name);
        tracing::debug!(hive, path, value_name, ?prev, "Captured registry previous value");

        previous_values.push(PreviousValue {
            change_type: "registry".to_string(),
            path: format!("{}\\{}", hive, path),
            value_name: value_name.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for change in &service_changes {
        let service_name = change["serviceName"].as_str().unwrap_or("");

        let prev = read_service_start_type(service_name);
        tracing::debug!(service_name, ?prev, "Captured service previous start type");

        previous_values.push(PreviousValue {
            change_type: "service".to_string(),
            path: service_name.to_string(),
            value_name: "StartType".to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for change in &power_changes {
        let setting_path = change["settingPath"].as_str().unwrap_or("");

        let prev = read_power_setting(setting_path);
        tracing::debug!(setting_path, ?prev, "Captured power previous value");

        previous_values.push(PreviousValue {
            change_type: "power".to_string(),
            path: setting_path.to_string(),
            value_name: "value".to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for change in &bcd_changes {
        let element = change["element"].as_str().unwrap_or("");

        let prev = read_bcd_value(element);
        tracing::debug!(element, ?prev, "Captured BCD previous value");

        previous_values.push(PreviousValue {
            change_type: "bcd".to_string(),
            path: "bcd".to_string(),
            value_name: element.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for change in &powercfg_changes {
        let subcommand = change["subcommand"].as_str().unwrap_or("");
        let value = change["value"].as_str().unwrap_or("");

        let prev = read_powercfg_previous(subcommand, value);
        tracing::debug!(subcommand, value, ?prev, "Captured powercfg previous state");

        previous_values.push(PreviousValue {
            change_type: "powercfg".to_string(),
            path: subcommand.to_string(),
            value_name: value.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for change in &fsutil_changes {
        let behavior = change["behavior"].as_str().unwrap_or("");
        let volume_path = change["volumePath"].as_str().unwrap_or("");

        let prev = read_fsutil_behavior(behavior, volume_path);
        tracing::debug!(behavior, volume_path, ?prev, "Captured fsutil previous value");

        previous_values.push(PreviousValue {
            change_type: "fsutil".to_string(),
            path: format!("{}:{}", behavior, volume_path),
            value_name: behavior.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for _change in &hibernate_changes {
        let prev = read_hibernate_state();
        tracing::debug!(?prev, "Captured hibernate previous state");

        previous_values.push(PreviousValue {
            change_type: "hibernate".to_string(),
            path: "hibernate".to_string(),
            value_name: "enabled".to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    for change in &mmagent_changes {
        let setting = change["setting"].as_str().unwrap_or("");

        let prev = read_mmagent_setting(setting);
        tracing::debug!(setting, ?prev, "Captured mmagent previous value");

        previous_values.push(PreviousValue {
            change_type: "mmagent".to_string(),
            path: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management"
                .to_string(),
            value_name: setting.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    // ── Phase 2: Create rollback snapshot ───────────────────────────────────

    let plan_id = action_data.get("planId").and_then(|v| v.as_str());
    let snapshot_id = rollback::create_snapshot(
        db,
        plan_id,
        "action",
        &format!("Pre-action snapshot for {}", action_id),
        &previous_values,
    )?;
    tracing::info!(snapshot_id, action_id, "Rollback snapshot created");

    // ── Phase 3: Apply all changes ──────────────────────────────────────────

    let mut results: Vec<ChangeResult> = Vec::new();
    let mut any_failed = false;

    // Registry changes
    for (i, change) in registry_changes.iter().enumerate() {
        let hive = change["hive"].as_str().unwrap_or("HKLM");
        let path = change["path"].as_str().unwrap_or("");
        let value_name = change["valueName"].as_str().unwrap_or("");
        let value_type = change["valueType"].as_str().unwrap_or("DWord");
        let new_value = &change["newValue"];

        let prev = &previous_values[i];

        match apply_registry_change(hive, path, value_name, value_type, new_value) {
            Ok(verified) => {
                tracing::info!(hive, path, value_name, verified, "Registry change applied");
                results.push(ChangeResult {
                    change_type: "registry".to_string(),
                    path: format!("{}\\{}", hive, path),
                    value_name: value_name.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: new_value.clone(),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(hive, path, value_name, error = %e, "Registry change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "registry".to_string(),
                    path: format!("{}\\{}", hive, path),
                    value_name: value_name.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: new_value.clone(),
                    verified: false,
                });
            }
        }
    }

    // Service changes — apply_service_action() validates existence and verifies post-apply
    let svc_offset = registry_changes.len();
    for (i, change) in service_changes.iter().enumerate() {
        let service_name = change["serviceName"].as_str().unwrap_or("");
        let new_start_type = change["newStartType"].as_str().unwrap_or("Disabled");

        let prev = &previous_values[svc_offset + i];

        match apply_service_action(service_name, new_start_type) {
            Ok(verified) => {
                tracing::info!(service_name, new_start_type, verified, "Service change applied");
                results.push(ChangeResult {
                    change_type: "service".to_string(),
                    path: service_name.to_string(),
                    value_name: "StartType".to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(new_start_type.to_string()),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(service_name, error = %e, "Service change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "service".to_string(),
                    path: service_name.to_string(),
                    value_name: "StartType".to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(new_start_type.to_string()),
                    verified: false,
                });
            }
        }
    }

    // Power changes
    let pwr_offset = svc_offset + service_changes.len();
    for (i, change) in power_changes.iter().enumerate() {
        let setting_path = change["settingPath"].as_str().unwrap_or("");
        let new_value = &change["newValue"];

        let prev = &previous_values[pwr_offset + i];

        match apply_power_change(setting_path, new_value) {
            Ok(()) => {
                tracing::info!(setting_path, "Power change applied");
                results.push(ChangeResult {
                    change_type: "power".to_string(),
                    path: setting_path.to_string(),
                    value_name: "value".to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: new_value.clone(),
                    verified: true,
                });
            }
            Err(e) => {
                tracing::error!(setting_path, error = %e, "Power change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "power".to_string(),
                    path: setting_path.to_string(),
                    value_name: "value".to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: new_value.clone(),
                    verified: false,
                });
            }
        }
    }

    // BCD changes
    let bcd_offset = pwr_offset + power_changes.len();
    for (i, change) in bcd_changes.iter().enumerate() {
        let element = change["element"].as_str().unwrap_or("");
        let new_value = change["newValue"].as_str().unwrap_or("");

        let prev = &previous_values[bcd_offset + i];

        match apply_bcdedit_action(element, new_value) {
            Ok(verified) => {
                tracing::info!(element, new_value, verified, "BCD change applied");
                results.push(ChangeResult {
                    change_type: "bcd".to_string(),
                    path: "bcd".to_string(),
                    value_name: element.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(new_value.to_string()),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(element, error = %e, "BCD change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "bcd".to_string(),
                    path: "bcd".to_string(),
                    value_name: element.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(new_value.to_string()),
                    verified: false,
                });
            }
        }
    }

    // Powercfg changes
    let powercfg_offset = bcd_offset + bcd_changes.len();
    for (i, change) in powercfg_changes.iter().enumerate() {
        let subcommand = change["subcommand"].as_str().unwrap_or("");
        let value = change["value"].as_str().unwrap_or("");

        let prev = &previous_values[powercfg_offset + i];

        match apply_powercfg_action(subcommand, value) {
            Ok(verified) => {
                tracing::info!(subcommand, value, verified, "Powercfg change applied");
                results.push(ChangeResult {
                    change_type: "powercfg".to_string(),
                    path: subcommand.to_string(),
                    value_name: value.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(value.to_string()),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(subcommand, value, error = %e, "Powercfg change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "powercfg".to_string(),
                    path: subcommand.to_string(),
                    value_name: value.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(value.to_string()),
                    verified: false,
                });
            }
        }
    }

    // Fsutil changes
    let fsutil_offset = powercfg_offset + powercfg_changes.len();
    for (i, change) in fsutil_changes.iter().enumerate() {
        let behavior = change["behavior"].as_str().unwrap_or("");
        let volume_path = change["volumePath"].as_str().unwrap_or("");
        let new_value = change["value"].as_str().unwrap_or("1");

        let prev = &previous_values[fsutil_offset + i];

        match apply_fsutil_action(behavior, volume_path, new_value) {
            Ok(verified) => {
                tracing::info!(behavior, volume_path, new_value, verified, "Fsutil change applied");
                results.push(ChangeResult {
                    change_type: "fsutil".to_string(),
                    path: format!("{}:{}", behavior, volume_path),
                    value_name: behavior.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(new_value.to_string()),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(behavior, volume_path, error = %e, "Fsutil change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "fsutil".to_string(),
                    path: format!("{}:{}", behavior, volume_path),
                    value_name: behavior.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::String(new_value.to_string()),
                    verified: false,
                });
            }
        }
    }

    // Hibernate changes
    let hibernate_offset = fsutil_offset + fsutil_changes.len();
    for (i, change) in hibernate_changes.iter().enumerate() {
        let enabled = change["enabled"].as_bool().unwrap_or(false);

        let prev = &previous_values[hibernate_offset + i];

        match apply_hibernate_action(enabled) {
            Ok(verified) => {
                tracing::info!(enabled, verified, "Hibernate change applied");
                results.push(ChangeResult {
                    change_type: "hibernate".to_string(),
                    path: "hibernate".to_string(),
                    value_name: "enabled".to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::Bool(enabled),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(enabled, error = %e, "Hibernate change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "hibernate".to_string(),
                    path: "hibernate".to_string(),
                    value_name: "enabled".to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: serde_json::Value::Bool(enabled),
                    verified: false,
                });
            }
        }
    }

    // Mmagent changes
    let mmagent_offset = hibernate_offset + hibernate_changes.len();
    for (i, change) in mmagent_changes.iter().enumerate() {
        let setting = change["setting"].as_str().unwrap_or("");
        let new_value = &change["value"];

        let prev = &previous_values[mmagent_offset + i];

        match apply_mmagent_action(setting, new_value) {
            Ok(verified) => {
                tracing::info!(setting, verified, "Mmagent change applied");
                results.push(ChangeResult {
                    change_type: "mmagent".to_string(),
                    path: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management"
                        .to_string(),
                    value_name: setting.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: new_value.clone(),
                    verified,
                });
            }
            Err(e) => {
                tracing::error!(setting, error = %e, "Mmagent change failed");
                any_failed = true;
                results.push(ChangeResult {
                    change_type: "mmagent".to_string(),
                    path: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management"
                        .to_string(),
                    value_name: setting.to_string(),
                    previous_value: prev.previous_value.clone(),
                    new_value: new_value.clone(),
                    verified: false,
                });
            }
        }
    }

    // ── Phase 4: Determine overall status ───────────────────────────────────

    let all_verified = results.iter().all(|r| r.verified);
    let status = if results.is_empty() {
        "success"
    } else if all_verified {
        "success"
    } else if any_failed && !all_verified {
        if results.iter().any(|r| r.verified) {
            "partial"
        } else {
            "failed"
        }
    } else {
        "partial"
    };

    let now = chrono::Utc::now().to_rfc3339();

    // ── Phase 4b: Create journal entry if reboot required ───────────────────

    let mut journal_entry_id: Option<String> = None;
    if requires_reboot && status != "failed" && !results.is_empty() {
        match journal::create_entry(
            db,
            plan_id.unwrap_or("standalone"),
            "apply",
            "reboot_action",
            0,
            Some(action_id),
            &format!("Reboot required for {}", action_id),
        ) {
            Ok(entry_id) => {
                if let Err(e) = journal::update_status(db, &entry_id, "awaiting_reboot", None) {
                    tracing::warn!("Failed to update journal entry status: {}", e);
                } else {
                    tracing::info!(entry_id, action_id, "Journal entry created: awaiting_reboot");
                }
                journal_entry_id = Some(entry_id);
            }
            Err(e) => {
                tracing::warn!("Failed to create journal entry for reboot action: {}", e);
            }
        }
    }

    let outcome = serde_json::json!({
        "actionId": action_id,
        "status": status,
        "appliedAt": now,
        "changesApplied": serde_json::to_value(&results)?,
        "snapshotId": snapshot_id,
        "validationPassed": all_verified,
        "rebootRequired": requires_reboot,
        "journalEntryId": journal_entry_id,
        "error": null,
    });

    // ── Phase 5: Audit log ──────────────────────────────────────────────────

    let audit_id = uuid::Uuid::new_v4().to_string();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, action_id, snapshot_id, severity)
         VALUES (?1, ?2, 'tuning', 'action_applied', ?3, ?4, ?5, ?6)",
        rusqlite::params![
            audit_id,
            now,
            format!(
                "Applied action {}: {} changes, status={}",
                action_id,
                results.len(),
                status
            ),
            action_id,
            snapshot_id,
            if status == "failed" { "error" } else { "info" },
        ],
    )?;

    // Store outcome in action_outcomes table
    let outcome_id = uuid::Uuid::new_v4().to_string();
    if let Some(plan_id) = plan_id {
        db.conn().execute(
            "INSERT INTO action_outcomes (id, plan_id, action_id, status, applied_at, data)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                outcome_id,
                plan_id,
                action_id,
                status,
                now,
                serde_json::to_string(&outcome)?,
            ],
        )?;
    }

    Ok(outcome)
}

// ─── Platform-specific implementations ──────────────────────────────────────

#[cfg(windows)]
fn read_registry_value(hive: &str, path: &str, value_name: &str) -> Option<serde_json::Value> {
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
            if trimmed.is_empty() || trimmed == "" {
                None
            } else if let Ok(n) = trimmed.parse::<i64>() {
                Some(serde_json::Value::Number(n.into()))
            } else {
                Some(serde_json::Value::String(trimmed.to_string()))
            }
        }
        _ => None,
    }
}

#[cfg(windows)]
fn apply_registry_change(
    hive: &str,
    path: &str,
    value_name: &str,
    value_type: &str,
    new_value: &serde_json::Value,
) -> anyhow::Result<bool> {
    let escaped_path = powershell::escape_ps_string(path);
    let escaped_name = powershell::escape_ps_string(value_name);
    let reg_path = format!("Registry::{}\\{}", hive, escaped_path);
    let value_str = match new_value {
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => format!("'{}'", powershell::escape_ps_string(s)),
        other => other.to_string(),
    };

    // Create key path if needed
    let create_script = format!(
        "New-Item -Path '{}' -Force | Out-Null",
        reg_path,
    );
    powershell::execute(&create_script)?;

    // Map registry type names to PowerShell RegistryValueKind names
    let ps_type = match value_type {
        "REG_DWORD" => "DWord",
        "REG_QWORD" => "QWord",
        "REG_SZ" => "String",
        "REG_BINARY" => "Binary",
        "REG_MULTI_SZ" => "MultiString",
        "REG_EXPAND_SZ" => "ExpandString",
        _ => "DWord", // default for tuning actions
    };

    // Write the new value
    let set_script = format!(
        "Set-ItemProperty -Path '{}' -Name '{}' -Value {} -Type {} -Force",
        reg_path, escaped_name, value_str, ps_type,
    );
    let set_result = powershell::execute(&set_script)?;
    if !set_result.success {
        anyhow::bail!(
            "Failed to set registry value {}\\{}: {}",
            reg_path, value_name, set_result.stderr.trim()
        );
    }

    // Verify by reading back — use reg.exe for reliable output format.
    // PowerShell Get-ItemProperty has inconsistent stdout for DWORD values.
    // reg query outputs: "    ValueName    REG_DWORD    0x0" which is easy to parse.
    let hive_short = if reg_path.contains("HKEY_LOCAL_MACHINE") { "HKLM" }
        else if reg_path.contains("HKEY_CURRENT_USER") { "HKCU" }
        else { hive };
    let reg_query_path = format!("{}\\{}", hive_short, path);

    let verify_script = format!(
        "reg query \"{}\" /v \"{}\" 2>$null",
        reg_query_path, value_name,
    );
    let verify_result = powershell::execute(&verify_script)?;
    let output = verify_result.stdout.trim().to_string();

    // Parse reg.exe output: find the line with the value name
    // Format: "    ValueName    REG_DWORD    0x00000000"
    let verified = if let Some(line) = output.lines().find(|l| l.contains(value_name)) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        // parts = [ValueName, REG_DWORD, 0x00000000] or [ValueName, REG_SZ, value]
        if parts.len() >= 3 {
            let reg_val = parts[parts.len() - 1]; // last token is the value
            match new_value.as_i64().or_else(|| new_value.as_u64().map(|u| u as i64)) {
                Some(expected_num) => {
                    // Parse hex value from reg.exe (0x prefix)
                    let actual = if let Some(hex) = reg_val.strip_prefix("0x") {
                        u32::from_str_radix(hex, 16).ok().map(|v| v as i64)
                    } else {
                        reg_val.parse::<i64>().ok()
                    };
                    match actual {
                        Some(actual_num) => {
                            let ok = actual_num == expected_num
                                || (actual_num as u32) == (expected_num as u32);
                            if !ok {
                                tracing::warn!(path = reg_query_path, value_name,
                                    expected = expected_num, actual = actual_num,
                                    "Registry verification mismatch");
                            }
                            ok
                        }
                        None => {
                            tracing::warn!(path = reg_query_path, value_name,
                                raw = reg_val, "Could not parse reg value");
                            false
                        }
                    }
                }
                None => {
                    let expected_str = new_value.as_str().unwrap_or("");
                    reg_val == expected_str
                }
            }
        } else {
            tracing::warn!(path = reg_query_path, value_name, raw = output,
                "Unexpected reg query output format");
            false
        }
    } else {
        tracing::warn!(path = reg_query_path, value_name, raw = output,
            "Value not found in reg query output");
        false
    };

    Ok(verified)
}

#[cfg(windows)]
fn read_service_start_type(service_name: &str) -> Option<serde_json::Value> {
    let script = format!(
        "(Get-Service -Name '{}' -ErrorAction SilentlyContinue).StartType",
        powershell::escape_ps_string(service_name),
    );
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(serde_json::Value::String(trimmed.to_string()))
            }
        }
        _ => None,
    }
}

/// Apply a service start-type change with pre-execution validation and
/// post-execution verification. Returns `Ok(verified)`.
#[cfg(windows)]
fn apply_service_action(service_name: &str, new_start_type: &str) -> anyhow::Result<bool> {
    // Validate inputs before interpolation
    powershell::validate_safe_arg(service_name, "service name")?;
    powershell::validate_safe_arg(new_start_type, "start type")?;
    let escaped_name = powershell::escape_ps_string(service_name);

    // Pre-execution validation: ensure service exists before writing
    let exists_script = format!(
        "if (Get-Service -Name '{}' -ErrorAction SilentlyContinue) {{ 'true' }} else {{ 'false' }}",
        escaped_name,
    );
    let exists_result = powershell::execute(&exists_script)?;
    if !exists_result.stdout.trim().eq_ignore_ascii_case("true") {
        anyhow::bail!("Service '{}' not found — cannot apply start-type change", service_name);
    }

    // Apply: set the new startup type
    let set_script = format!(
        "Set-Service -Name '{}' -StartupType {} -ErrorAction Stop",
        escaped_name, new_start_type,
    );
    let set_result = powershell::execute(&set_script)?;
    if !set_result.success {
        anyhow::bail!(
            "Failed to set service {} to {}: {}",
            service_name, new_start_type, set_result.stderr.trim()
        );
    }

    // If disabling, also stop the service
    if new_start_type.eq_ignore_ascii_case("Disabled") {
        let stop_script = format!(
            "Stop-Service -Name '{}' -Force -ErrorAction SilentlyContinue",
            escaped_name,
        );
        powershell::execute(&stop_script)?;
    }

    // Post-execution verification: re-read start type
    let current = read_service_start_type(service_name);
    let verified = current
        .as_ref()
        .and_then(|v| v.as_str())
        .map(|s| s.eq_ignore_ascii_case(new_start_type))
        .unwrap_or(false);

    if !verified {
        tracing::warn!(
            service_name, new_start_type, current = ?current,
            "Service start-type verification mismatch after apply"
        );
    }

    Ok(verified)
}

#[cfg(windows)]
fn read_power_setting(setting_path: &str) -> Option<serde_json::Value> {
    let (subgroup, setting) = parse_power_guids(setting_path)?;
    if powershell::validate_safe_arg(&subgroup, "power subgroup").is_err()
        || powershell::validate_safe_arg(&setting, "power setting").is_err()
    {
        return None;
    }
    let script = format!("powercfg /query SCHEME_CURRENT {} {}", subgroup, setting);
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            // Parse the output to find "Current AC Power Setting Index: 0x..."
            for line in result.stdout.lines() {
                let line = line.trim();
                if line.starts_with("Current AC Power Setting Index:") {
                    let hex_val = line.split(':').nth(1)?.trim();
                    if let Ok(n) = u64::from_str_radix(hex_val.trim_start_matches("0x"), 16) {
                        return Some(serde_json::json!(n));
                    }
                }
            }
            None
        }
        _ => None,
    }
}

#[cfg(windows)]
fn apply_power_change(
    setting_path: &str,
    new_value: &serde_json::Value,
) -> anyhow::Result<()> {
    let (subgroup, setting) = parse_power_guids(setting_path)
        .ok_or_else(|| anyhow::anyhow!("Invalid power setting path: {}", setting_path))?;

    let value_str = match new_value {
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    };

    // Validate GUIDs and value before interpolation
    powershell::validate_safe_arg(&subgroup, "power subgroup")?;
    powershell::validate_safe_arg(&setting, "power setting")?;
    powershell::validate_safe_arg(&value_str, "power value")?;

    // Set AC value
    let set_script = format!(
        "powercfg /setacvalueindex SCHEME_CURRENT {} {} {}",
        subgroup, setting, value_str,
    );
    let set_result = powershell::execute(&set_script)?;
    if !set_result.success {
        anyhow::bail!(
            "Failed to set power setting {}: {}",
            setting_path, set_result.stderr.trim()
        );
    }

    // Apply the scheme
    let apply_result = powershell::execute("powercfg /setactive SCHEME_CURRENT")?;
    if !apply_result.success {
        tracing::warn!("powercfg /setactive returned non-zero: {}", apply_result.stderr.trim());
    }

    Ok(())
}

/// Parse a setting path like "subgroup_guid/setting_guid" into its two parts.
fn parse_power_guids(setting_path: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = setting_path.split('/').collect();
    if parts.len() == 2 {
        Some((parts[0].to_string(), parts[1].to_string()))
    } else {
        None
    }
}

// ─── BCD (Boot Configuration Data) ──────────────────────────────────────────

#[cfg(windows)]
fn read_bcd_value(element: &str) -> Option<serde_json::Value> {
    if powershell::validate_safe_arg(element, "BCD element").is_err() {
        return None;
    }
    let script = format!(
        "bcdedit /enum {{current}} 2>$null | Select-String -Pattern '{}' | ForEach-Object {{ $_.Line }}",
        powershell::escape_ps_string(element),
    );
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                None // element not set — this is valid (means default/deleted)
            } else {
                // Parse "element    value" format
                let value = trimmed.split_whitespace().last().unwrap_or(trimmed);
                Some(serde_json::Value::String(value.to_string()))
            }
        }
        _ => None,
    }
}

/// Apply a BCD change with post-execution verification.
#[cfg(windows)]
fn apply_bcdedit_action(element: &str, new_value: &str) -> anyhow::Result<bool> {
    // Pre-execution validation: element must not be empty
    if element.is_empty() {
        anyhow::bail!("BCD element name must not be empty");
    }

    // Validate inputs before interpolation
    powershell::validate_safe_arg(element, "BCD element")?;
    powershell::validate_safe_arg(new_value, "BCD value")?;

    // bcdedit /set {current} <element> <value>
    let script = format!(
        "bcdedit /set {{current}} {} {}",
        element, new_value,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "bcdedit /set {} {} failed: {}",
            element, new_value, result.stderr.trim()
        );
    }

    // Post-execution verification: read back and compare
    let verify_script = format!(
        "bcdedit /enum {{current}} 2>$null | Select-String -Pattern '{}' | ForEach-Object {{ $_.Line }}",
        powershell::escape_ps_string(element),
    );
    let verify_result = powershell::execute(&verify_script)?;
    let output = verify_result.stdout.trim().to_string();

    let verified = if output.is_empty() {
        false
    } else {
        let actual = output.split_whitespace().last().unwrap_or("");
        actual.eq_ignore_ascii_case(new_value)
    };

    if !verified {
        tracing::warn!(element, new_value, actual = output, "BCD verification mismatch");
    }

    Ok(verified)
}

// ─── Powercfg (non-GUID subcommands) ─────────────────────────────────────────
//
// Handles powercfgChanges where each entry is:
//   { "subcommand": "setactive"|"change", "value": "<scheme_or_setting>" }
//
// For "setactive": value is a power scheme alias (SCHEME_MIN, SCHEME_MAX, SCHEME_BALANCED)
//   or a GUID.  Previous value is captured via `powercfg /getactivescheme`.
//
// For "change": value encodes "<setting> <n>" where setting is a powercfg /change
//   alias such as "monitor-timeout-ac 0".  Previous value is captured as a raw
//   string blob from `powercfg /query`.

#[cfg(windows)]
fn read_powercfg_previous(subcommand: &str, _value: &str) -> Option<serde_json::Value> {
    match subcommand {
        "setactive" => {
            // Capture the currently active scheme GUID so we can restore it.
            let script = "powercfg /getactivescheme 2>$null";
            match powershell::execute(script) {
                Ok(result) if result.success => {
                    // Output: "Power Scheme GUID: 381b4222-f694-... (Balanced)"
                    let line = result.stdout.trim();
                    if let Some(rest) = line.split(':').nth(1) {
                        let guid = rest.trim().split_whitespace().next().unwrap_or("").to_string();
                        if !guid.is_empty() {
                            return Some(serde_json::Value::String(guid));
                        }
                    }
                    None
                }
                _ => None,
            }
        }
        _ => {
            // For other subcommands we capture a full powercfg /query blob.
            match powershell::execute("powercfg /query SCHEME_CURRENT 2>$null") {
                Ok(result) if result.success => {
                    Some(serde_json::Value::String(result.stdout.trim().to_string()))
                }
                _ => None,
            }
        }
    }
}

/// Apply a powercfg subcommand with pre-execution validation and
/// post-execution verification.
#[cfg(windows)]
fn apply_powercfg_action(subcommand: &str, value: &str) -> anyhow::Result<bool> {
    // Pre-execution validation: allowlist subcommands to prevent injection
    const ALLOWED: &[&str] = &[
        "setactive",
        "change",
        "setacvalueindex",
        "setdcvalueindex",
    ];
    if !ALLOWED.contains(&subcommand) {
        anyhow::bail!(
            "powercfg subcommand '{}' is not in the allowed list",
            subcommand
        );
    }

    // Validate value before interpolation
    powershell::validate_safe_arg(value, "powercfg value")?;

    let script = format!("powercfg /{} {} 2>&1", subcommand, value);
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "powercfg /{} {} failed: {}",
            subcommand, value, result.stderr.trim()
        );
    }

    // Post-execution verification
    let verified = match subcommand {
        "setactive" => {
            // Verify active scheme now matches the requested value
            let verify_script = "powercfg /getactivescheme 2>$null";
            match powershell::execute(verify_script) {
                Ok(r) => {
                    let out = r.stdout.to_ascii_lowercase();
                    let needle = value.to_ascii_lowercase();
                    out.contains(&needle)
                }
                _ => false,
            }
        }
        _ => {
            // For other subcommands, trust the exit code
            result.success
        }
    };

    if !verified {
        tracing::warn!(subcommand, value, "Powercfg post-apply verification failed");
    }

    Ok(verified)
}

// ─── Fsutil behavior ─────────────────────────────────────────────────────────
//
// Handles fsutilChanges where each entry is:
//   { "behavior": "<name>", "volumePath": "<optional>", "value": "<0|1>" }

/// Allowlist of fsutil behavior names permitted by the executor.
const FSUTIL_BEHAVIOR_ALLOWLIST: &[&str] = &[
    "disable8dot3",
    "disablelastaccess",
    "encryptpagingfile",
    "memoryusage",
    "mftzone",
    "quotanotify",
];

#[cfg(windows)]
fn read_fsutil_behavior(behavior: &str, volume_path: &str) -> Option<serde_json::Value> {
    // Validate inputs — return None if they contain dangerous characters
    if powershell::validate_safe_arg(behavior, "fsutil behavior").is_err() {
        return None;
    }
    if !volume_path.is_empty() && powershell::validate_safe_arg(volume_path, "volume path").is_err() {
        return None;
    }
    let script = if volume_path.is_empty() {
        format!("fsutil behavior query {} 2>$null", behavior)
    } else {
        format!("fsutil behavior query {} {} 2>$null", behavior, volume_path)
    };

    match powershell::execute(&script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                return None;
            }
            // "NtfsDisable8dot3NameCreation = 0"  →  0
            // "The 8dot3 name creation state for C: is enabled (0)"  →  0
            if let Some(after_eq) = trimmed.split('=').nth(1) {
                if let Ok(n) = after_eq.trim().parse::<i64>() {
                    return Some(serde_json::json!(n));
                }
            }
            if let Some(inner) = trimmed.split('(').nth(1).and_then(|s| s.split(')').next()) {
                if let Ok(n) = inner.trim().parse::<i64>() {
                    return Some(serde_json::json!(n));
                }
            }
            Some(serde_json::Value::String(trimmed.to_string()))
        }
        _ => None,
    }
}

/// Apply a fsutil behavior change with pre-execution validation and
/// post-execution verification.
#[cfg(windows)]
fn apply_fsutil_action(behavior: &str, volume_path: &str, value: &str) -> anyhow::Result<bool> {
    // Pre-execution validation
    if !FSUTIL_BEHAVIOR_ALLOWLIST.contains(&behavior) {
        anyhow::bail!(
            "fsutil behavior '{}' is not in the allowed list",
            behavior
        );
    }

    // Validate inputs before interpolation
    powershell::validate_safe_arg(value, "fsutil value")?;
    if !volume_path.is_empty() {
        powershell::validate_safe_arg(volume_path, "volume path")?;
    }

    let script = if volume_path.is_empty() {
        format!("fsutil behavior set {} {} 2>&1", behavior, value)
    } else {
        format!("fsutil behavior set {} {} {} 2>&1", behavior, volume_path, value)
    };

    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "fsutil behavior set {} failed: {}",
            behavior, result.stderr.trim()
        );
    }

    // Post-execution verification
    let current = read_fsutil_behavior(behavior, volume_path);
    let verified = match (current.as_ref(), value.parse::<i64>().ok()) {
        (Some(cur), Some(expected)) => cur.as_i64() == Some(expected),
        _ => {
            tracing::warn!(behavior, value, "Could not numerically verify fsutil behavior");
            false
        }
    };

    if !verified {
        tracing::warn!(behavior, volume_path, value, current = ?current,
            "Fsutil post-apply verification mismatch");
    }

    Ok(verified)
}

// ─── Hibernate ───────────────────────────────────────────────────────────────
//
// Handles hibernateChanges where each entry is:
//   { "enabled": false }

#[cfg(windows)]
fn read_hibernate_state() -> Option<serde_json::Value> {
    // HibernateEnabled DWORD under HKLM\SYSTEM\CurrentControlSet\Control\Power
    let script =
        "Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power' \
         -Name 'HibernateEnabled' -ErrorAction SilentlyContinue \
         | Select-Object -ExpandProperty HibernateEnabled";
    match powershell::execute(script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                None
            } else if let Ok(n) = trimmed.parse::<i64>() {
                Some(serde_json::Value::Bool(n != 0))
            } else {
                None
            }
        }
        _ => None,
    }
}

/// Enable or disable Windows hibernation with pre-execution validation and
/// post-execution verification.
#[cfg(windows)]
fn apply_hibernate_action(enabled: bool) -> anyhow::Result<bool> {
    // Pre-execution validation: powercfg must be accessible
    let check = powershell::execute("powercfg /? 2>$null")?;
    if !check.success {
        anyhow::bail!("powercfg is not accessible on this system");
    }

    let cmd = if enabled {
        "powercfg /h on"
    } else {
        "powercfg /h off"
    };

    let result = powershell::execute(cmd)?;
    if !result.success {
        anyhow::bail!(
            "powercfg /h {} failed: {}",
            if enabled { "on" } else { "off" },
            result.stderr.trim()
        );
    }

    // Post-execution verification
    let current = read_hibernate_state();
    let verified = current
        .as_ref()
        .and_then(|v| v.as_bool())
        .map(|b| b == enabled)
        .unwrap_or(false);

    if !verified {
        tracing::warn!(
            enabled,
            current = ?current,
            "Hibernate post-apply verification mismatch"
        );
    }

    Ok(verified)
}

// ─── Memory Management Agent ─────────────────────────────────────────────────
//
// Handles mmagentChanges where each entry is:
//   { "setting": "<name>", "value": <number> }
//
// All writes target:
//   HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management

const MMAGENT_REG_PATH: &str =
    "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management";

/// Allowlist of Memory Management registry values the executor may write.
const MMAGENT_SETTING_ALLOWLIST: &[&str] = &[
    "DisablePagingExecutive",
    "LargeSystemCache",
    "NonPagedPoolQuota",
    "NonPagedPoolSize",
    "PagedPoolQuota",
    "PagedPoolSize",
    "SecondLevelDataCache",
    "ClearPageFileAtShutdown",
    "PoolUsageMaximum",
    "SessionPoolSize",
    "SessionViewSize",
    "IoPageLockLimit",
    "SystemPages",
];

#[cfg(windows)]
fn read_mmagent_setting(setting: &str) -> Option<serde_json::Value> {
    let script = format!(
        "$val = Get-ItemProperty -Path 'Registry::{}' -Name '{}' -ErrorAction SilentlyContinue; \
         if ($val) {{ $val.'{}' }} else {{ $null }}",
        MMAGENT_REG_PATH, setting, setting,
    );
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                None
            } else if let Ok(n) = trimmed.parse::<i64>() {
                Some(serde_json::Value::Number(n.into()))
            } else {
                Some(serde_json::Value::String(trimmed.to_string()))
            }
        }
        _ => None,
    }
}

/// Apply a Memory Management registry setting with pre-execution validation and
/// post-execution verification.
#[cfg(windows)]
fn apply_mmagent_action(setting: &str, new_value: &serde_json::Value) -> anyhow::Result<bool> {
    // Pre-execution validation
    if !MMAGENT_SETTING_ALLOWLIST.contains(&setting) {
        anyhow::bail!(
            "Memory Management setting '{}' is not in the allowed list",
            setting
        );
    }

    let value_str = match new_value {
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => format!("'{}'", s),
        other => other.to_string(),
    };

    let script = format!(
        "Set-ItemProperty -Path 'Registry::{}' -Name '{}' -Value {} -Type DWord -Force",
        MMAGENT_REG_PATH, setting, value_str,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "Failed to set Memory Management setting {}: {}",
            setting, result.stderr.trim()
        );
    }

    // Post-execution verification
    let current = read_mmagent_setting(setting);
    let verified = match (current.as_ref(), new_value) {
        (Some(cur), expected) => cur == expected,
        _ => false,
    };

    if !verified {
        tracing::warn!(setting, expected = ?new_value, current = ?current,
            "Mmagent post-apply verification mismatch");
    }

    Ok(verified)
}

// ─── Non-Windows simulation ─────────────────────────────────────────────────

#[cfg(not(windows))]
fn read_registry_value(hive: &str, path: &str, value_name: &str) -> Option<serde_json::Value> {
    tracing::info!(hive, path, value_name, "[simulated] Would read registry value");
    Some(serde_json::json!(0))
}

#[cfg(not(windows))]
fn apply_registry_change(
    hive: &str,
    path: &str,
    value_name: &str,
    value_type: &str,
    new_value: &serde_json::Value,
) -> anyhow::Result<bool> {
    tracing::info!(hive, path, value_name, value_type, ?new_value,
        "[simulated] Would apply registry change");
    Ok(true)
}

#[cfg(not(windows))]
fn read_service_start_type(service_name: &str) -> Option<serde_json::Value> {
    tracing::info!(service_name, "[simulated] Would read service start type");
    Some(serde_json::Value::String("Automatic".to_string()))
}

#[cfg(not(windows))]
fn apply_service_action(service_name: &str, new_start_type: &str) -> anyhow::Result<bool> {
    tracing::info!(service_name, new_start_type,
        "[simulated] Would apply service change");
    Ok(true)
}

#[cfg(not(windows))]
fn read_power_setting(setting_path: &str) -> Option<serde_json::Value> {
    tracing::info!(setting_path, "[simulated] Would read power setting");
    Some(serde_json::json!(0))
}

#[cfg(not(windows))]
fn apply_power_change(
    setting_path: &str,
    new_value: &serde_json::Value,
) -> anyhow::Result<()> {
    tracing::info!(setting_path, ?new_value, "[simulated] Would apply power change");
    Ok(())
}

#[cfg(not(windows))]
fn read_bcd_value(element: &str) -> Option<serde_json::Value> {
    tracing::info!(element, "[simulated] Would read BCD value");
    None
}

#[cfg(not(windows))]
fn apply_bcdedit_action(element: &str, new_value: &str) -> anyhow::Result<bool> {
    tracing::info!(element, new_value, "[simulated] Would apply BCD change");
    Ok(true)
}

#[cfg(not(windows))]
fn read_powercfg_previous(_subcommand: &str, _value: &str) -> Option<serde_json::Value> {
    tracing::info!("[simulated] Would read powercfg previous state");
    Some(serde_json::Value::String("381b4222-f694-11d1-a065-00401553af51".to_string()))
}

#[cfg(not(windows))]
fn apply_powercfg_action(subcommand: &str, value: &str) -> anyhow::Result<bool> {
    tracing::info!(subcommand, value, "[simulated] Would apply powercfg change");
    Ok(true)
}

#[cfg(not(windows))]
fn read_fsutil_behavior(behavior: &str, volume_path: &str) -> Option<serde_json::Value> {
    tracing::info!(behavior, volume_path, "[simulated] Would read fsutil behavior");
    Some(serde_json::json!(0))
}

#[cfg(not(windows))]
fn apply_fsutil_action(behavior: &str, volume_path: &str, value: &str) -> anyhow::Result<bool> {
    tracing::info!(behavior, volume_path, value, "[simulated] Would apply fsutil change");
    Ok(true)
}

#[cfg(not(windows))]
fn read_hibernate_state() -> Option<serde_json::Value> {
    tracing::info!("[simulated] Would read hibernate state");
    Some(serde_json::Value::Bool(true))
}

#[cfg(not(windows))]
fn apply_hibernate_action(enabled: bool) -> anyhow::Result<bool> {
    tracing::info!(enabled, "[simulated] Would apply hibernate change");
    Ok(true)
}

#[cfg(not(windows))]
fn read_mmagent_setting(setting: &str) -> Option<serde_json::Value> {
    tracing::info!(setting, "[simulated] Would read mmagent setting");
    Some(serde_json::json!(0))
}

#[cfg(not(windows))]
fn apply_mmagent_action(setting: &str, new_value: &serde_json::Value) -> anyhow::Result<bool> {
    tracing::info!(setting, ?new_value, "[simulated] Would apply mmagent change");
    Ok(true)
}
