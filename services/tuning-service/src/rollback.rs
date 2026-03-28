// ─── Rollback Engine ────────────────────────────────────────────────────────
// Creates snapshots before tuning actions and restores them on demand.
// Snapshots include: registry values, service states, power plan settings.
// Restoration uses the PowerShell bridge for all system mutations.

use crate::db::Database;
#[cfg(windows)]
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    pub tuning_plan_id: Option<String>,
    pub scope: String,
    pub created_at: String,
    pub description: String,
    pub previous_values: Vec<PreviousValue>,
    #[serde(default)]
    pub action_ids: Vec<String>,
    #[serde(default)]
    pub registry_export_paths: Vec<String>,
    pub restore_point_id: Option<String>,
    #[serde(default)]
    pub metadata: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviousValue {
    pub change_type: String, // "registry", "service", "power", "bcd"
    pub path: String,
    pub value_name: String,
    pub previous_value: Option<serde_json::Value>,
    pub action_id: String,
}

/// Create a snapshot of current values before applying a set of changes.
pub fn create_snapshot(
    db: &Database,
    plan_id: Option<&str>,
    scope: &str,
    description: &str,
    previous_values: &[PreviousValue],
) -> anyhow::Result<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    // Collect unique action IDs from previous values
    let action_ids: Vec<String> = previous_values
        .iter()
        .map(|pv| pv.action_id.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let data = serde_json::to_string(&Snapshot {
        id: id.clone(),
        tuning_plan_id: plan_id.map(String::from),
        scope: scope.to_string(),
        created_at: now.clone(),
        description: description.to_string(),
        previous_values: previous_values.to_vec(),
        action_ids,
        registry_export_paths: vec![],
        restore_point_id: None,
        metadata: std::collections::HashMap::new(),
    })?;

    db.conn().execute(
        "INSERT INTO rollback_snapshots (id, plan_id, scope, created_at, description, data)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, plan_id, scope, now, description, data],
    )?;

    // Also log to audit
    let audit_id = uuid::Uuid::new_v4().to_string();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, plan_id, snapshot_id, severity)
         VALUES (?1, ?2, 'rollback', 'snapshot_created', ?3, ?4, ?5, 'info')",
        rusqlite::params![audit_id, now, description, plan_id, id],
    )?;

    Ok(id)
}

/// List all available snapshots, newest first.
pub fn list_snapshots(db: &Database) -> anyhow::Result<Vec<Snapshot>> {
    let mut stmt = db.conn().prepare(
        "SELECT data FROM rollback_snapshots ORDER BY created_at DESC",
    )?;

    let snapshots = stmt
        .query_map([], |row| {
            let data: String = row.get(0)?;
            serde_json::from_str::<Snapshot>(&data)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(e.into()))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(snapshots)
}

/// Detail of a single restore operation within a snapshot restoration.
#[derive(Debug, Serialize)]
struct RestoreDetail {
    #[serde(rename = "type")]
    change_type: String,
    path: String,
    #[serde(rename = "valueName")]
    value_name: String,
    status: String, // "restored" | "failed"
    verified: bool,
    error: Option<String>,
}

/// Restore a snapshot by re-applying all previous values captured at snapshot time.
/// Returns a JSON summary of the restoration outcome.
pub fn restore_snapshot(
    db: &Database,
    snapshot_id: &str,
) -> anyhow::Result<serde_json::Value> {
    tracing::info!(snapshot_id, "Beginning snapshot restoration");

    let data: String = db.conn().query_row(
        "SELECT data FROM rollback_snapshots WHERE id = ?1",
        [snapshot_id],
        |row| row.get(0),
    )?;

    let snapshot: Snapshot = serde_json::from_str(&data)?;

    let mut details: Vec<RestoreDetail> = Vec::new();
    let mut succeeded = 0u32;
    let mut failed = 0u32;

    for prev in &snapshot.previous_values {
        let result = match prev.change_type.as_str() {
            "registry" => restore_registry(prev),
            "service" => restore_service(prev),
            "power" => restore_power(prev),
            "bcd" => restore_bcd(prev),
            other => {
                tracing::warn!(change_type = other, "Unknown change type, skipping");
                Err(anyhow::anyhow!("Unknown change type: {}", other))
            }
        };

        match result {
            Ok(()) => {
                // Post-restore verification: re-read and compare to expected previous value
                let verified = verify_restored_value(prev);
                if !verified {
                    tracing::warn!(
                        change_type = prev.change_type,
                        path = prev.path,
                        value_name = prev.value_name,
                        expected = ?prev.previous_value,
                        "Post-restore verification mismatch"
                    );
                }
                tracing::info!(
                    change_type = prev.change_type,
                    path = prev.path,
                    value_name = prev.value_name,
                    verified,
                    "Restore succeeded"
                );
                succeeded += 1;
                details.push(RestoreDetail {
                    change_type: prev.change_type.clone(),
                    path: prev.path.clone(),
                    value_name: prev.value_name.clone(),
                    status: "restored".to_string(),
                    verified,
                    error: None,
                });
            }
            Err(e) => {
                tracing::error!(
                    change_type = prev.change_type,
                    path = prev.path,
                    error = %e,
                    "Restore failed"
                );
                failed += 1;
                details.push(RestoreDetail {
                    change_type: prev.change_type.clone(),
                    path: prev.path.clone(),
                    value_name: prev.value_name.clone(),
                    status: "failed".to_string(),
                    verified: false,
                    error: Some(e.to_string()),
                });
            }
        }
    }

    let status = if failed == 0 {
        "success"
    } else if succeeded == 0 {
        "failed"
    } else {
        "partial"
    };

    // Log restoration to audit trail
    let now = chrono::Utc::now().to_rfc3339();
    let audit_id = uuid::Uuid::new_v4().to_string();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, snapshot_id, severity)
         VALUES (?1, ?2, 'rollback', 'snapshot_restored', ?3, ?4, ?5)",
        rusqlite::params![
            audit_id,
            now,
            format!(
                "Restored snapshot '{}': {} succeeded, {} failed, status={}",
                snapshot.description, succeeded, failed, status
            ),
            snapshot_id,
            if status == "failed" { "error" } else { "info" },
        ],
    )?;

    let verifications_passed = details.iter().filter(|d| d.verified).count() as u32;

    Ok(serde_json::json!({
        "snapshotId": snapshot_id,
        "status": status,
        "actionsRolledBack": succeeded,
        "actionsFailed": failed,
        "verificationsPassed": verifications_passed,
        "details": serde_json::to_value(&details)?,
    }))
}

/// Return a diff view of a snapshot showing before/after values for each change.
pub fn get_diff(
    db: &Database,
    snapshot_id: &str,
) -> anyhow::Result<serde_json::Value> {
    let data: String = db.conn().query_row(
        "SELECT data FROM rollback_snapshots WHERE id = ?1",
        [snapshot_id],
        |row| row.get(0),
    )?;

    let snapshot: Snapshot = serde_json::from_str(&data)?;

    // Build ConfigDiffEntry-compatible objects matching the TS schema
    let changes: Vec<serde_json::Value> = snapshot
        .previous_values
        .iter()
        .map(|pv| {
            // Read the current live value for comparison
            let current_value = match pv.change_type.as_str() {
                "registry" => read_current_registry(&pv.path, &pv.value_name),
                "service" => read_current_service(&pv.path),
                "power" => read_current_power(&pv.path),
                "bcd" => read_current_bcd(&pv.value_name),
                _ => None,
            };

            let change_type = if pv.previous_value.is_none() {
                "added"
            } else if current_value.is_none() {
                "removed"
            } else {
                "modified"
            };

            serde_json::json!({
                "path": pv.path,
                "valueName": pv.value_name,
                "beforeValue": pv.previous_value,
                "afterValue": current_value,
                "changeType": change_type,
                "actionId": pv.action_id,
                "actionName": pv.action_id, // action name = action ID for now
            })
        })
        .collect();

    // Return ConfigDiff shape matching the TS interface
    Ok(serde_json::json!({
        "snapshotId": snapshot_id,
        "generatedAt": chrono::Utc::now().to_rfc3339(),
        "changes": changes,
    }))
}

// ─── Windows restore implementations ───────────────────────────────────────

#[cfg(windows)]
fn restore_registry(prev: &PreviousValue) -> anyhow::Result<()> {
    let safe_path = powershell::escape_ps_string(&prev.path);
    let safe_name = powershell::escape_ps_string(&prev.value_name);

    match &prev.previous_value {
        Some(value) => {
            // Value existed before -- restore it
            let value_str = match value {
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::String(s) => format!("'{}'", powershell::escape_ps_string(s)),
                other => other.to_string(),
            };
            let script = format!(
                "Set-ItemProperty -Path 'Registry::{}' -Name '{}' -Value {} -Type DWord -Force",
                safe_path, safe_name, value_str,
            );
            let result = powershell::execute(&script)?;
            if !result.success {
                anyhow::bail!(
                    "Failed to restore registry {}\\{}: {}",
                    prev.path, prev.value_name, result.stderr.trim()
                );
            }
        }
        None => {
            // Value did not exist before -- remove it
            let script = format!(
                "Remove-ItemProperty -Path 'Registry::{}' -Name '{}' -Force -ErrorAction SilentlyContinue",
                safe_path, safe_name,
            );
            let result = powershell::execute(&script)?;
            if !result.success {
                tracing::warn!(
                    "Remove-ItemProperty returned non-zero for {}\\{}: {}",
                    prev.path, prev.value_name, result.stderr.trim()
                );
            }
        }
    }
    Ok(())
}

#[cfg(windows)]
fn restore_service(prev: &PreviousValue) -> anyhow::Result<()> {
    let start_type = prev
        .previous_value
        .as_ref()
        .and_then(|v| v.as_str())
        .unwrap_or("Manual");

    // Validate and escape inputs before interpolation
    let safe_path = powershell::validate_safe_arg(&prev.path, "service name")?;
    let safe_start_type = powershell::validate_safe_arg(start_type, "start type")?;

    // Restore the startup type
    let script = format!(
        "Set-Service -Name '{}' -StartupType {} -ErrorAction Stop",
        powershell::escape_ps_string(safe_path), safe_start_type,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "Failed to restore service {} to {}: {}",
            prev.path, start_type, result.stderr.trim()
        );
    }

    // If the previous type was not Disabled, try to start the service
    if !start_type.eq_ignore_ascii_case("Disabled") {
        let start_script = format!(
            "Start-Service -Name '{}' -ErrorAction SilentlyContinue",
            powershell::escape_ps_string(safe_path),
        );
        powershell::execute(&start_script)?;
    }

    Ok(())
}

#[cfg(windows)]
fn restore_power(prev: &PreviousValue) -> anyhow::Result<()> {
    let value = prev
        .previous_value
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("No previous power value for {}", prev.path))?;

    let value_str = match value {
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    };

    let (subgroup, setting) = parse_power_guids(&prev.path)
        .ok_or_else(|| anyhow::anyhow!("Invalid power setting path: {}", prev.path))?;

    // Validate GUIDs and value before interpolation
    powershell::validate_safe_arg(&subgroup, "power subgroup")?;
    powershell::validate_safe_arg(&setting, "power setting")?;
    powershell::validate_safe_arg(&value_str, "power value")?;

    let set_script = format!(
        "powercfg /setacvalueindex SCHEME_CURRENT {} {} {}",
        subgroup, setting, value_str,
    );
    let set_result = powershell::execute(&set_script)?;
    if !set_result.success {
        anyhow::bail!(
            "Failed to restore power setting {}: {}",
            prev.path, set_result.stderr.trim()
        );
    }

    let apply_result = powershell::execute("powercfg /setactive SCHEME_CURRENT")?;
    if !apply_result.success {
        tracing::warn!("powercfg /setactive failed: {}", apply_result.stderr.trim());
    }

    Ok(())
}

#[cfg(windows)]
fn read_current_registry(path: &str, value_name: &str) -> Option<serde_json::Value> {
    let escaped_path = powershell::escape_ps_string(path);
    let escaped_name = powershell::escape_ps_string(value_name);
    let script = format!(
        "$val = Get-ItemProperty -Path 'Registry::{}' -Name '{}' -ErrorAction SilentlyContinue; \
         if ($val) {{ $val.'{}' }} else {{ $null }}",
        escaped_path, escaped_name, escaped_name,
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

#[cfg(windows)]
fn read_current_service(service_name: &str) -> Option<serde_json::Value> {
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

#[cfg(windows)]
fn read_current_power(setting_path: &str) -> Option<serde_json::Value> {
    let (subgroup, setting) = parse_power_guids(setting_path)?;
    // Validate GUIDs — return None if they contain dangerous characters
    if powershell::validate_safe_arg(&subgroup, "power subgroup").is_err()
        || powershell::validate_safe_arg(&setting, "power setting").is_err()
    {
        return None;
    }
    let script = format!("powercfg /query SCHEME_CURRENT {} {}", subgroup, setting);
    match powershell::execute(&script) {
        Ok(result) if result.success => {
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

// ─── BCD restore ─────────────────────────────────────────────────────────────

#[cfg(windows)]
fn restore_bcd(prev: &PreviousValue) -> anyhow::Result<()> {
    let element = &prev.value_name;
    // Validate element name before interpolation
    powershell::validate_safe_arg(element, "BCD element")?;

    match &prev.previous_value {
        Some(value) => {
            let val_str = match value {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            powershell::validate_safe_arg(&val_str, "BCD value")?;
            // Restore: bcdedit /set {current} <element> <previous_value>
            let script = format!("bcdedit /set {{current}} {} {}", element, val_str);
            let result = powershell::execute(&script)?;
            if !result.success {
                anyhow::bail!(
                    "bcdedit /set {{current}} {} {} failed: {}",
                    element, val_str, result.stderr.trim()
                );
            }
        }
        None => {
            // Element did not exist before — delete it to restore original state
            let script = format!("bcdedit /deletevalue {{current}} {} 2>$null", element);
            let result = powershell::execute(&script)?;
            if !result.success {
                tracing::warn!(
                    "bcdedit /deletevalue {{current}} {} returned non-zero (may not have existed): {}",
                    element, result.stderr.trim()
                );
            }
        }
    }
    Ok(())
}

#[cfg(windows)]
fn read_current_bcd(element: &str) -> Option<serde_json::Value> {
    // Validate element before interpolation — return None if unsafe
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
                None
            } else {
                let value = trimmed.split_whitespace().last().unwrap_or(trimmed);
                Some(serde_json::Value::String(value.to_string()))
            }
        }
        _ => None,
    }
}

/// Re-read the live value after a restore and compare against what was expected.
/// Returns `true` if the live value matches `prev.previous_value`, or if the
/// change type is not queryable (treated as unverifiable = true to avoid false
/// negatives on types we cannot read back).
fn verify_restored_value(prev: &PreviousValue) -> bool {
    let live = match prev.change_type.as_str() {
        "registry" => read_current_registry(&prev.path, &prev.value_name),
        "service" => read_current_service(&prev.path),
        "power" => read_current_power(&prev.path),
        "bcd" => read_current_bcd(&prev.value_name),
        // For types we cannot read back (fsutil, hibernate, mmagent, powercfg),
        // we cannot verify — treat as unverifiable but not failed.
        _ => return true,
    };

    match (&live, &prev.previous_value) {
        (Some(got), Some(expected)) => got == expected,
        (None, None) => true,  // value was absent before and is absent now
        _ => false,
    }
}

// ─── Non-Windows simulation ─────────────────────────────────────────────────

#[cfg(not(windows))]
fn restore_registry(prev: &PreviousValue) -> anyhow::Result<()> {
    match &prev.previous_value {
        Some(value) => {
            tracing::info!(
                path = prev.path,
                value_name = prev.value_name,
                ?value,
                "[simulated] Would restore registry value"
            );
        }
        None => {
            tracing::info!(
                path = prev.path,
                value_name = prev.value_name,
                "[simulated] Would remove registry value (did not exist before)"
            );
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn restore_service(prev: &PreviousValue) -> anyhow::Result<()> {
    let start_type = prev
        .previous_value
        .as_ref()
        .and_then(|v| v.as_str())
        .unwrap_or("Manual");
    tracing::info!(
        service = prev.path,
        start_type,
        "[simulated] Would restore service start type"
    );
    Ok(())
}

#[cfg(not(windows))]
fn restore_power(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(
        path = prev.path,
        previous_value = ?prev.previous_value,
        "[simulated] Would restore power setting"
    );
    Ok(())
}

#[cfg(not(windows))]
fn restore_bcd(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(
        element = prev.value_name,
        previous_value = ?prev.previous_value,
        "[simulated] Would restore BCD element"
    );
    Ok(())
}

#[cfg(not(windows))]
fn read_current_bcd(_element: &str) -> Option<serde_json::Value> {
    Some(serde_json::Value::String("No".to_string()))
}

#[cfg(not(windows))]
fn read_current_registry(_path: &str, _value_name: &str) -> Option<serde_json::Value> {
    Some(serde_json::json!(1))
}

#[cfg(not(windows))]
fn read_current_service(_service_name: &str) -> Option<serde_json::Value> {
    Some(serde_json::Value::String("Disabled".to_string()))
}

#[cfg(not(windows))]
fn read_current_power(_setting_path: &str) -> Option<serde_json::Value> {
    Some(serde_json::json!(1))
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

/// Parse a setting path like "subgroup_guid/setting_guid" into its two parts.
fn parse_power_guids(setting_path: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = setting_path.split('/').collect();
    if parts.len() == 2 {
        Some((parts[0].to_string(), parts[1].to_string()))
    } else {
        None
    }
}
