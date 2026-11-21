// ─── Rollback Engine ────────────────────────────────────────────────────────
// Creates snapshots before tuning actions and restores them on demand.
// Snapshots include: registry values (with their original type), service
// start type + running state, scheduled-task state, BCD elements, power
// settings and file renames. Registry and service restores use native APIs.

use crate::db::Database;
#[cfg(windows)]
use crate::powershell;
use crate::registry::{self, RegKind, RegValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: String,
    pub scope: String,
    pub created_at: String,
    pub description: String,
    pub previous_values: Vec<PreviousValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PreviousValue {
    pub change_type: String, // "registry", "service", "task", "appx", "bcd", "power", "file_rename"
    pub path: String,
    pub value_name: String,
    /// `None` = the value / item did not exist before the change.
    pub previous_value: Option<Value>,
    pub action_id: String,
    /// Registry only: original value kind ("String", "DWord", …). Missing in
    /// snapshots written by versions <= 1.0.5 (restore then falls back to the
    /// playbook's valueType for that target).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_kind: Option<String>,
    /// Registry only: topmost key the apply had to create. Rollback deletes
    /// it (and the keys below it) again, but only while they are empty.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_key: Option<String>,
}

/// Create a snapshot of current values before applying a set of changes.
/// The snapshot row and its audit entry are written in one transaction.
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

    let tx = db.conn().unchecked_transaction()?;
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
    tx.commit()?;

    tracing::info!(
        snapshot_id = id.as_str(),
        scope = scope,
        values_count = previous_values.len(),
        "Rollback snapshot created"
    );

    Ok(id)
}

/// List all available snapshots, newest first.
pub fn list_snapshots(db: &Database) -> anyhow::Result<Vec<Snapshot>> {
    let mut stmt = db
        .conn()
        .prepare("SELECT data FROM rollback_snapshots ORDER BY created_at DESC")?;

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
    status: String, // "restored" | "failed" | "note"
    error: Option<String>,
}

/// Restore a snapshot by re-applying all previous values captured at snapshot time.
pub fn restore_snapshot(db: &Database, snapshot_id: &str) -> anyhow::Result<Value> {
    restore_snapshot_entries(db, snapshot_id, None)
}

/// Restore a snapshot; when `only` is given, just those entry indices (the
/// executor passes the changes it actually applied, so values it never
/// touched — e.g. a UCPD-denied write — are not "restored").
pub fn restore_snapshot_entries(
    db: &Database,
    snapshot_id: &str,
    only: Option<&[usize]>,
) -> anyhow::Result<Value> {
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

    // Restore in reverse order of application.
    for (index, prev) in snapshot.previous_values.iter().enumerate().rev() {
        if let Some(only) = only {
            if !only.contains(&index) {
                continue;
            }
        }
        let result = match prev.change_type.as_str() {
            "registry" => restore_registry(prev),
            "service" => restore_service(prev),
            "task" => restore_task(prev),
            "bcd" => restore_bcd(prev),
            "power" => restore_power(prev),
            "file_rename" => restore_file_rename(prev),
            "appx" => {
                tracing::info!(
                    package = prev.path.as_str(),
                    "AppX package was removed; it cannot be reinstalled automatically"
                );
                details.push(RestoreDetail {
                    change_type: "appx".to_string(),
                    path: prev.path.clone(),
                    value_name: String::new(),
                    status: "note".to_string(),
                    error: Some(
                        "AppX packages cannot be reinstalled automatically (reinstall from Microsoft Store or winget where available)".to_string(),
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

    let status = restore_status(succeeded, failed);

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
            if status == "success" { "info" } else { "error" },
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

pub(crate) fn restore_status(succeeded: u32, failed: u32) -> &'static str {
    if failed == 0 {
        "success"
    } else if succeeded == 0 {
        "failed"
    } else {
        "partial"
    }
}

// ─── Registry ───────────────────────────────────────────────────────────────

/// Resolve the kind to restore a registry value with.
pub(crate) fn restore_kind(prev: &PreviousValue, value: &Value) -> RegKind {
    if let Some(kind) = prev.previous_kind.as_deref().and_then(|k| RegKind::parse(k).ok()) {
        return kind;
    }
    // Legacy snapshot (<= 1.0.5): use the playbook's declared valueType for this
    // target — that is the type the apply wrote, and for the shipped playbooks
    // the type the value had (e.g. REG_SZ "10" for WallpaperStyle).
    if let Some(kind) = crate::catalog::legacy_value_type(&prev.action_id, &prev.path, &prev.value_name)
        .and_then(|k| RegKind::parse(&k).ok())
    {
        return kind;
    }
    match value {
        Value::Number(_) | Value::Bool(_) => RegKind::DWord,
        Value::Array(items) if items.iter().all(Value::is_string) => RegKind::MultiString,
        Value::Array(_) => RegKind::Binary,
        _ => RegKind::String,
    }
}

fn restore_registry(prev: &PreviousValue) -> anyhow::Result<()> {
    let (hive, path) = registry::split_full_path(&prev.path)?;
    registry::validate_value_name(&prev.value_name)?;
    match &prev.previous_value {
        Some(value) => {
            let kind = restore_kind(prev, value);
            let typed = match (kind, value) {
                // Legacy boolean snapshots.
                (RegKind::DWord, Value::Bool(flag)) => RegValue::dword(u32::from(*flag)),
                _ => RegValue::from_json(kind, value)?,
            };
            registry::write_value(hive, &path, &prev.value_name, &typed)?;
        }
        None => {
            registry::delete_value(hive, &path, &prev.value_name)?;
            if let Some(created) = &prev.created_key {
                registry::prune_created_keys(hive, &path, created)?;
            }
        }
    }
    Ok(())
}

// ─── Services ───────────────────────────────────────────────────────────────

fn restore_service(prev: &PreviousValue) -> anyhow::Result<()> {
    let name = prev.path.as_str();
    if name.chars().any(|c| c.is_control()) || name.is_empty() {
        anyhow::bail!("Invalid service name in snapshot");
    }
    let (start_type, delayed, was_running) = match &prev.previous_value {
        Some(Value::Object(obj)) => (
            obj.get("startType").and_then(Value::as_str).unwrap_or("").to_string(),
            obj.get("delayedAutoStart").and_then(Value::as_bool).unwrap_or(false),
            obj.get("running").and_then(Value::as_bool),
        ),
        // Legacy snapshot: only the start type is known.
        Some(Value::String(s)) => (s.clone(), false, None),
        // Unknown previous state (service was missing or unreadable): there
        // is nothing safe to restore.
        _ => {
            tracing::info!(service = name, "No previous service state recorded — nothing to restore");
            return Ok(());
        }
    };
    let Some(normalized) = crate::services::normalize_start_type(&start_type) else {
        anyhow::bail!("Unknown previous start type '{}' for {}", start_type, name);
    };
    match crate::services::set_start_type(name, normalized, delayed) {
        Ok(()) => {}
        Err(crate::services::SvcError::NotFound) => return Ok(()),
        Err(e) => anyhow::bail!("Failed to restore service {} to {}: {}", name, normalized, e),
    }
    if was_running == Some(true) {
        if let Err(e) = crate::services::start(name) {
            tracing::warn!(service = name, error = %e, "Service restored but could not be started");
        }
    }
    Ok(())
}

// ─── Scheduled tasks ────────────────────────────────────────────────────────

/// What the restore must do for a task snapshot entry.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum TaskRestore {
    Enable,
    Disable,
    Nothing,
}

pub(crate) fn task_restore_plan(previous: Option<&Value>) -> TaskRestore {
    match previous {
        Some(Value::Object(obj)) => {
            let state = obj.get("state").and_then(Value::as_str).unwrap_or("");
            let applied = obj.get("applied").and_then(Value::as_str).unwrap_or("disable");
            match (applied, state) {
                (_, "Missing") => TaskRestore::Nothing,
                ("disable", "Disabled") => TaskRestore::Nothing,
                ("disable", _) => TaskRestore::Enable,
                ("enable", "Disabled") => TaskRestore::Disable,
                _ => TaskRestore::Nothing,
            }
        }
        // Legacy snapshots always stored "Ready" and the old restore always
        // re-enabled; keep that behaviour for them.
        Some(Value::String(state)) if state == "Disabled" || state == "Missing" => TaskRestore::Nothing,
        Some(Value::String(_)) => TaskRestore::Enable,
        _ => TaskRestore::Nothing,
    }
}

#[cfg(windows)]
fn restore_task(prev: &PreviousValue) -> anyhow::Result<()> {
    let verb = match task_restore_plan(prev.previous_value.as_ref()) {
        TaskRestore::Nothing => return Ok(()),
        TaskRestore::Enable => "Enable-ScheduledTask",
        TaskRestore::Disable => "Disable-ScheduledTask",
    };
    let script = format!(
        "$t = Get-ScheduledTask -TaskName {name} -TaskPath {path} -ErrorAction SilentlyContinue; \
         if (-not $t) {{ Write-Output 'SKIPPED: task not found'; exit 0 }}; \
         {verb} -TaskName {name} -TaskPath {path} | Out-Null",
        name = powershell::ps_quote(&prev.value_name)?,
        path = powershell::ps_quote(&prev.path)?,
        verb = verb,
    );
    let result = powershell::execute_mutation(&script)?;
    if !result.success {
        anyhow::bail!(
            "Failed to restore task '{}' at '{}': {}",
            prev.value_name,
            prev.path,
            result.stderr.trim()
        );
    }
    Ok(())
}

#[cfg(not(windows))]
fn restore_task(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(
        task_name = prev.value_name.as_str(),
        plan = ?task_restore_plan(prev.previous_value.as_ref()),
        "[simulated] Would restore scheduled task"
    );
    Ok(())
}

// ─── BCD ────────────────────────────────────────────────────────────────────

#[cfg(windows)]
fn restore_bcd(prev: &PreviousValue) -> anyhow::Result<()> {
    let element = powershell::validate_safe_arg(&prev.value_name, "BCD element")?;
    let value = prev
        .previous_value
        .as_ref()
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let args: Vec<String> = if value.is_empty() {
        vec!["/deletevalue".into(), "{current}".into(), element.into()]
    } else {
        let safe_value = powershell::validate_safe_arg(value, "BCD value")?;
        vec!["/set".into(), "{current}".into(), element.into(), safe_value.into()]
    };
    let result = crate::executor::run_native("bcdedit.exe", &args)?;
    if !result.success && !value.is_empty() {
        anyhow::bail!("Failed to restore BCD element '{}': {}", element, result.stdout.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn restore_bcd(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(element = prev.value_name.as_str(), "[simulated] Would restore BCD element");
    Ok(())
}

// ─── Power ──────────────────────────────────────────────────────────────────

/// AC setting index recorded in a power snapshot (new `{ac}` object, plain
/// number, or legacy string).
pub(crate) fn power_ac_value(previous: Option<&Value>) -> Option<u64> {
    match previous? {
        Value::Object(obj) => obj.get("ac").and_then(Value::as_u64),
        Value::Number(n) => n.as_u64(),
        Value::String(s) => s.trim().parse::<u64>().ok(),
        _ => None,
    }
}

#[cfg(windows)]
fn restore_power(prev: &PreviousValue) -> anyhow::Result<()> {
    let Some(value) = power_ac_value(prev.previous_value.as_ref()) else {
        return Ok(());
    };
    let (sub, setting) = crate::executor::split_power_path(&prev.path)
        .ok_or_else(|| anyhow::anyhow!("Invalid power setting path format: {}", prev.path))?;
    let value = value.to_string();
    let result = crate::executor::run_native(
        "powercfg.exe",
        &["/setacvalueindex".to_string(), "SCHEME_CURRENT".into(), sub, setting, value],
    )?;
    if !result.success {
        anyhow::bail!("Failed to restore AC power setting '{}': {}", prev.path, result.stdout.trim());
    }
    let _ = crate::executor::run_native("powercfg.exe", &["/setactive".to_string(), "SCHEME_CURRENT".into()]);
    Ok(())
}

#[cfg(not(windows))]
fn restore_power(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(setting = prev.path.as_str(), "[simulated] Would restore power setting");
    Ok(())
}

// ─── File renames ───────────────────────────────────────────────────────────

#[cfg(windows)]
fn restore_file_rename(prev: &PreviousValue) -> anyhow::Result<()> {
    let source = &prev.path;
    let target = &prev.value_name;
    let previous = prev.previous_value.clone().unwrap_or_default();
    let source_existed = previous
        .get("sourceExisted")
        .and_then(|value| value.as_bool())
        .unwrap_or(true);
    let target_existed = previous
        .get("targetExisted")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let requires_trusted_installer = previous
        .get("requiresTrustedInstaller")
        .and_then(|value| value.as_bool())
        .unwrap_or(false);

    if !source_existed {
        return Ok(());
    }
    if target_existed {
        anyhow::bail!(
            "Cannot automatically restore file rename {} -> {} because target already existed before apply",
            source,
            target
        );
    }

    let script = format!(
        "if (-not (Test-Path -LiteralPath {t})) {{ Write-Output 'SKIPPED: rollback source not found'; exit 0 }}; \
         if (Test-Path -LiteralPath {s}) {{ Write-Output 'SKIPPED: original file already restored'; exit 0 }}; \
         Move-Item -LiteralPath {t} -Destination {s} -Force; \
         Write-Output 'OK: file rename restored'",
        t = powershell::ps_quote(target)?,
        s = powershell::ps_quote(source)?,
    );

    let result = powershell::execute_with_privilege(&script, requires_trusted_installer)?;
    if !result.success {
        anyhow::bail!(
            "Failed to restore file rename {} <- {}: {}",
            source,
            target,
            result.stderr.trim()
        );
    }
    Ok(())
}

#[cfg(not(windows))]
fn restore_file_rename(prev: &PreviousValue) -> anyhow::Result<()> {
    tracing::info!(
        source = prev.path.as_str(),
        target = prev.value_name.as_str(),
        "[simulated] Would restore file rename"
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn restore_status_reflects_failures() {
        assert_eq!(restore_status(3, 0), "success");
        assert_eq!(restore_status(0, 1), "failed");
        assert_eq!(restore_status(2, 1), "partial");
    }

    #[test]
    fn restore_kind_uses_recorded_kind_even_for_numeric_strings() {
        let prev = PreviousValue {
            change_type: "registry".into(),
            path: "HKCU\\Control Panel\\Desktop".into(),
            value_name: "WallpaperStyle".into(),
            previous_value: Some(serde_json::json!("10")),
            action_id: "x".into(),
            previous_kind: Some("String".into()),
            created_key: None,
        };
        assert_eq!(restore_kind(&prev, prev.previous_value.as_ref().unwrap()), RegKind::String);
        let legacy_numeric = PreviousValue {
            previous_kind: None,
            previous_value: Some(serde_json::json!(10)),
            action_id: "unknown.action".into(),
            ..prev.clone()
        };
        assert_eq!(
            restore_kind(&legacy_numeric, legacy_numeric.previous_value.as_ref().unwrap()),
            RegKind::DWord
        );
    }

    #[test]
    fn task_restore_only_reenables_what_was_enabled() {
        let was_ready = serde_json::json!({ "state": "Ready", "applied": "disable" });
        let was_disabled = serde_json::json!({ "state": "Disabled", "applied": "disable" });
        let was_missing = serde_json::json!({ "state": "Missing", "applied": "disable" });
        assert_eq!(task_restore_plan(Some(&was_ready)), TaskRestore::Enable);
        assert_eq!(task_restore_plan(Some(&was_disabled)), TaskRestore::Nothing);
        assert_eq!(task_restore_plan(Some(&was_missing)), TaskRestore::Nothing);
        let enabled_by_apply = serde_json::json!({ "state": "Disabled", "applied": "enable" });
        assert_eq!(task_restore_plan(Some(&enabled_by_apply)), TaskRestore::Disable);
        assert_eq!(task_restore_plan(Some(&serde_json::json!("Ready"))), TaskRestore::Enable);
        assert_eq!(task_restore_plan(None), TaskRestore::Nothing);
    }

    #[test]
    fn power_snapshot_formats_are_all_understood() {
        assert_eq!(power_ac_value(Some(&serde_json::json!({ "ac": 5 }))), Some(5));
        assert_eq!(power_ac_value(Some(&serde_json::json!(7))), Some(7));
        assert_eq!(power_ac_value(Some(&serde_json::json!("9"))), Some(9));
        assert_eq!(power_ac_value(None), None);
    }

    #[test]
    fn old_snapshots_without_new_fields_still_deserialize() {
        let legacy = r#"{"id":"s","scope":"action:x","createdAt":"t","description":"d","previousValues":[{"changeType":"registry","path":"HKCU\\Software\\X","valueName":"V","previousValue":1,"actionId":"x"}]}"#;
        let snap: Snapshot = serde_json::from_str(legacy).unwrap();
        assert_eq!(snap.previous_values[0].previous_kind, None);
        assert_eq!(snap.previous_values[0].created_key, None);
    }
}
