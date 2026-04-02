
use crate::db::Database;
#[cfg(windows)]
use crate::powershell;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    pub scope: String,
    pub created_at: String,
    pub description: String,
    pub previous_values: Vec<PreviousValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviousValue {
    pub change_type: String, // "registry", "service", "task", "appx"
    pub path: String,
    pub value_name: String,
    pub previous_value: Option<serde_json::Value>,
    pub action_id: String,
}

pub fn create_snapshot(
    db: &Database,
    scope: &str,
    description: &str,
    previous_values: &[PreviousValue],
) -> anyhow::Result<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let data = serde_json::to_string(&Snapshot {
        id: id.clone(),
        scope: scope.to_string(),
        created_at: now.clone(),
        description: description.to_string(),
        previous_values: previous_values.to_vec(),
    })?;

    db.conn().execute(
        "INSERT INTO rollback_snapshots (id, scope, created_at, data)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, scope, now, data],
    )?;

    let audit_id = uuid::Uuid::new_v4().to_string();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, 'rollback', 'snapshot_created', ?3, 'info')",
        rusqlite::params![audit_id, now, description],
    )?;

    tracing::info!(
        snapshot_id = id.as_str(),
        scope = scope,
        values_count = previous_values.len(),
        "Rollback snapshot created"
    );

    Ok(id)
}

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

#[derive(Debug, Serialize)]
struct RestoreDetail {
    #[serde(rename = "type")]
    change_type: String,
    path: String,
    #[serde(rename = "valueName")]
    value_name: String,
    status: String, // "restored" | "failed" | "note"
    error: Option<String>,
}

pub fn restore_snapshot(
    db: &Database,
    snapshot_id: &str,
) -> anyhow::Result<serde_json::Value> {
    tracing::info!(snapshot_id = snapshot_id, "Beginning snapshot restoration");

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
            "task" => restore_task(prev),
            "bcd" => restore_bcd(prev),
            "power" => restore_power(prev),
            "appx" => {
                tracing::info!(
                    package = prev.path.as_str(),
                    "AppX package was removed; reinstall from Microsoft Store if needed"
                );
                details.push(RestoreDetail {
                    change_type: "appx".to_string(),
                    path: prev.path.clone(),
                    value_name: String::new(),
                    status: "note".to_string(),
                    error: Some(
                        "AppX packages must be reinstalled from Microsoft Store".to_string(),
                    ),
                });
                succeeded += 1;
                continue;
            }
            other => {
                tracing::warn!(change_type = other, "Unknown change type, skipping");
                Err(anyhow::anyhow!("Unknown change type: {}", other))
            }
        };

        match result {
            Ok(()) => {
                succeeded += 1;
                details.push(RestoreDetail {
                    change_type: prev.change_type.clone(),
                    path: prev.path.clone(),
                    value_name: prev.value_name.clone(),
                    status: "restored".to_string(),
                    error: None,
                });
            }
            Err(e) => {
                tracing::error!(
                    change_type = prev.change_type.as_str(),
                    path = prev.path.as_str(),
                    error = %e,
                    "Restore failed"
                );
                failed += 1;
                details.push(RestoreDetail {
                    change_type: prev.change_type.clone(),
                    path: prev.path.clone(),
                    value_name: prev.value_name.clone(),
                    status: "failed".to_string(),
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

    let now = chrono::Utc::now().to_rfc3339();
    let audit_id = uuid::Uuid::new_v4().to_string();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, 'rollback', 'snapshot_restored', ?3, ?4)",
        rusqlite::params![
            audit_id,
            now,
            format!(
                "Restored snapshot '{}': {} succeeded, {} failed, status={}",
                snapshot.description, succeeded, failed, status
            ),
            if status == "failed" { "error" } else { "info" },
        ],
    )?;

    Ok(serde_json::json!({
        "snapshotId": snapshot_id,
        "status": status,
        "actionsRolledBack": succeeded,
        "actionsFailed": failed,
        "details": serde_json::to_value(&details)?,
    }))
}

#[cfg(windows)]
fn restore_registry(prev: &PreviousValue) -> anyhow::Result<()> {
    let escaped_path = powershell::escape_ps_string(&prev.path);
    let escaped_name = powershell::escape_ps_string(&prev.value_name);

    match &prev.previous_value {
        Some(value) => {
            let (value_str, value_type) = match value {
                serde_json::Value::Number(n) => (n.to_string(), "DWord"),
                serde_json::Value::Bool(flag) => (((if *flag { 1 } else { 0 }).to_string()), "DWord"),
                serde_json::Value::String(s) => (format!("'{}'", powershell::escape_ps_string(s)), "String"),
                other => (
                    format!("'{}'", powershell::escape_ps_string(&other.to_string())),
                    "String",
                ),
            };
            let script = format!(
                "Set-ItemProperty -Path 'Registry::{}' -Name '{}' -Value {} -Type {} -Force",
                escaped_path, escaped_name, value_str, value_type,
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
            let script = format!(
                "Remove-ItemProperty -Path 'Registry::{}' -Name '{}' -Force -ErrorAction SilentlyContinue",
                escaped_path, escaped_name,
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

    let safe_path = powershell::validate_safe_arg(&prev.path, "service name")?;
    let safe_start_type = powershell::validate_safe_arg(start_type, "start type")?;
    let escaped_path = powershell::escape_ps_string(safe_path);

    let script = format!(
        "Set-Service -Name '{}' -StartupType {} -ErrorAction Stop",
        escaped_path, safe_start_type,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "Failed to restore service {} to {}: {}",
            prev.path, start_type, result.stderr.trim()
        );
    }

    if !start_type.eq_ignore_ascii_case("Disabled") {
        let start_script = format!(
            "Start-Service -Name '{}' -ErrorAction SilentlyContinue",
            escaped_path,
        );
        powershell::execute(&start_script)?;
    }

    Ok(())
}

#[cfg(windows)]
fn restore_task(prev: &PreviousValue) -> anyhow::Result<()> {
    let escaped_name = powershell::escape_ps_string(&prev.value_name);
    let escaped_path = powershell::escape_ps_string(&prev.path);

    let script = format!(
        "Enable-ScheduledTask -TaskName '{}' -TaskPath '{}' -ErrorAction Stop",
        escaped_name, escaped_path,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "Failed to re-enable task '{}' at '{}': {}",
            prev.value_name, prev.path, result.stderr.trim()
        );
    }
    Ok(())
}

#[cfg(windows)]
fn restore_bcd(prev: &PreviousValue) -> anyhow::Result<()> {
    let element = powershell::validate_safe_arg(&prev.value_name, "BCD element")?;
    let value = prev
        .previous_value
        .as_ref()
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if value.is_empty() {
        let script = format!("bcdedit /deletevalue {{current}} {}", element);
        let result = powershell::execute(&script)?;
        if !result.success {
            anyhow::bail!("Failed to delete BCD element '{}': {}", element, result.stderr.trim());
        }
    } else {
        let safe_value = powershell::validate_safe_arg(value, "BCD value")?;
        let script = format!("bcdedit /set {{current}} {} {}", element, safe_value);
        let result = powershell::execute(&script)?;
        if !result.success {
            anyhow::bail!("Failed to restore BCD element '{}' to '{}': {}", element, value, result.stderr.trim());
        }
    }
    Ok(())
}

#[cfg(windows)]
fn restore_power(prev: &PreviousValue) -> anyhow::Result<()> {
    let setting_path = &prev.path;
    let value = prev
        .previous_value
        .as_ref()
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !value.is_empty() && !setting_path.is_empty() {
        powershell::validate_safe_arg(value, "power setting value")?;
        let parts: Vec<&str> = setting_path.split('/').collect();
        if parts.len() == 2 {
            powershell::validate_safe_arg(parts[0], "power subgroup GUID")?;
            powershell::validate_safe_arg(parts[1], "power setting GUID")?;
            let script = format!(
                "powercfg /setacvalueindex scheme_current {} {} {}",
                parts[0], parts[1], value
            );
            let result = powershell::execute(&script)?;
            if !result.success {
                anyhow::bail!("Failed to restore power setting '{}': {}", setting_path, result.stderr.trim());
            }
        } else {
            anyhow::bail!("Invalid power setting path format: {}", setting_path);
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn restore_bcd(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(element = prev.value_name.as_str(), "[simulated] Would restore BCD element");
    Ok(())
}

#[cfg(not(windows))]
fn restore_power(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(setting = prev.path.as_str(), "[simulated] Would restore power setting");
    Ok(())
}

#[cfg(not(windows))]
fn restore_registry(prev: &PreviousValue) -> anyhow::Result<()> {
    match &prev.previous_value {
        Some(value) => {
            tracing::info!(
                path = prev.path.as_str(),
                value_name = prev.value_name.as_str(),
                ?value,
                "[simulated] Would restore registry value"
            );
        }
        None => {
            tracing::info!(
                path = prev.path.as_str(),
                value_name = prev.value_name.as_str(),
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
        service = prev.path.as_str(),
        start_type = start_type,
        "[simulated] Would restore service start type"
    );
    Ok(())
}

#[cfg(not(windows))]
fn restore_task(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(
        task_name = prev.value_name.as_str(),
        task_path = prev.path.as_str(),
        "[simulated] Would re-enable scheduled task"
    );
    Ok(())
}
