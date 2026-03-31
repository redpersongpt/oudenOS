// ─── Action Executor ────────────────────────────────────────────────────────
// Applies tuning actions with full backup, validation, and audit logging.
// All system changes go through the PowerShell bridge for auditability.
// A rollback snapshot is always created BEFORE any changes are applied.

use crate::db::Database;
#[cfg(windows)]
use crate::powershell;
use crate::rollback;
use serde_json::Value;

/// Execute a tuning action, creating a rollback snapshot first, then applying
/// all changes described in `action_data`.
pub fn execute_action(
    db: &Database,
    action_id: &str,
    action_data: &Value,
    audit_context: Option<&str>,
) -> anyhow::Result<Value> {
    tracing::info!(action_id = action_id, "Executing action");

    let action_type = action_data["actionType"]
        .as_str()
        .unwrap_or("unknown");

    // ── Phase 1: Collect previous values for rollback ───────────────────

    let mut previous_values: Vec<rollback::PreviousValue> = Vec::new();

    // Registry changes
    let registry_changes = resolve_registry_changes(action_data)?;

    for change in &registry_changes {
        let hive = change["hive"].as_str().unwrap_or("HKLM");
        let path = change["path"].as_str().unwrap_or("");
        let value_name = change["valueName"].as_str().unwrap_or("");

        let prev = read_registry_value(hive, path, value_name);
        previous_values.push(rollback::PreviousValue {
            change_type: "registry".to_string(),
            path: format!("{}\\{}", hive, path),
            value_name: value_name.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    // Service changes
    let service_changes = action_data
        .get("serviceChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for change in &service_changes {
        let svc_name = change["name"].as_str().unwrap_or("");
        let prev = read_service_start_type(svc_name);
        previous_values.push(rollback::PreviousValue {
            change_type: "service".to_string(),
            path: svc_name.to_string(),
            value_name: "StartupType".to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    // Task changes: store task state for rollback (re-enable)
    let tasks = action_data
        .get("tasks")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for task in &tasks {
        let task_name = task["name"].as_str().unwrap_or("");
        let task_path = task["path"].as_str().unwrap_or("");
        previous_values.push(rollback::PreviousValue {
            change_type: "task".to_string(),
            path: task_path.to_string(),
            value_name: task_name.to_string(),
            previous_value: Some(Value::String("Ready".to_string())),
            action_id: action_id.to_string(),
        });
    }

    // AppX packages: store package names for rollback note
    let packages = action_data
        .get("packages")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for pkg in &packages {
        let pkg_name = pkg.as_str().unwrap_or("");
        previous_values.push(rollback::PreviousValue {
            change_type: "appx".to_string(),
            path: pkg_name.to_string(),
            value_name: "".to_string(),
            previous_value: Some(Value::String("installed".to_string())),
            action_id: action_id.to_string(),
        });
    }

    // BCD changes: store element for rollback
    let bcd_changes_pre = action_data
        .get("bcdChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for change in &bcd_changes_pre {
        let element = change["element"].as_str().unwrap_or("");
        let prev = read_bcd_value(element);
        previous_values.push(rollback::PreviousValue {
            change_type: "bcd".to_string(),
            path: "bcd".to_string(),
            value_name: element.to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    // Power changes: store setting path for rollback
    let power_changes_pre = action_data
        .get("powerChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for change in &power_changes_pre {
        let setting_path = change["settingPath"].as_str().unwrap_or("");
        let prev = read_power_value(setting_path);
        previous_values.push(rollback::PreviousValue {
            change_type: "power".to_string(),
            path: setting_path.to_string(),
            value_name: "value".to_string(),
            previous_value: prev,
            action_id: action_id.to_string(),
        });
    }

    // ── Phase 2: Create rollback snapshot BEFORE making changes ─────────

    let snapshot_id = rollback::create_snapshot(
        db,
        &format!("action:{}", action_id),
        &format!("Pre-execution snapshot for action '{}'", action_id),
        &previous_values,
    )?;

    tracing::info!(
        action_id = action_id,
        snapshot_id = snapshot_id.as_str(),
        "Rollback snapshot created"
    );

    // ── Phase 3: Apply changes ──────────────────────────────────────────

    let mut results: Vec<Value> = Vec::new();
    let mut succeeded = 0u32;
    let mut failed = 0u32;

    // Apply AppX removals
    for pkg in &packages {
        let pkg_name = pkg.as_str().unwrap_or("");
        match remove_appx_package(pkg_name) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "appx_remove",
                    "package": pkg_name,
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(package = pkg_name, error = %e, "AppX removal failed");
                results.push(serde_json::json!({
                    "type": "appx_remove",
                    "package": pkg_name,
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
    }

    // Apply task disables
    for task in &tasks {
        let task_name = task["name"].as_str().unwrap_or("");
        let task_path = task["path"].as_str().unwrap_or("");
        match disable_scheduled_task(task_name, task_path) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "task_disable",
                    "taskName": task_name,
                    "taskPath": task_path,
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(task = task_name, error = %e, "Task disable failed");
                results.push(serde_json::json!({
                    "type": "task_disable",
                    "taskName": task_name,
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
    }

    // Apply registry changes
    for change in &registry_changes {
        let hive = change["hive"].as_str().unwrap_or("HKLM");
        let path = change["path"].as_str().unwrap_or("");
        let value_name = change["valueName"].as_str().unwrap_or("");
        let value = &change["value"];
        let value_type = change["valueType"].as_str().unwrap_or("DWord");

        match apply_registry_change(hive, path, value_name, value, value_type) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "registry",
                    "path": format!("{}\\{}", hive, path),
                    "valueName": value_name,
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(
                    path = format!("{}\\{}", hive, path).as_str(),
                    value_name = value_name,
                    error = %e,
                    "Registry change failed"
                );
                results.push(serde_json::json!({
                    "type": "registry",
                    "path": format!("{}\\{}", hive, path),
                    "valueName": value_name,
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
    }

    // Apply service changes
    for change in &service_changes {
        let svc_name = change["name"].as_str().unwrap_or("");
        let startup_type = change["startupType"].as_str().unwrap_or("Disabled");

        match apply_service_change(svc_name, startup_type) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "service",
                    "service": svc_name,
                    "startupType": startup_type,
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(service = svc_name, error = %e, "Service change failed");
                results.push(serde_json::json!({
                    "type": "service",
                    "service": svc_name,
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
    }

    // Apply BCD changes
    let bcd_changes = action_data
        .get("bcdChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for change in &bcd_changes {
        let element = change["element"].as_str().unwrap_or("");
        let new_value = change["newValue"].as_str().unwrap_or("");

        match apply_bcd_change(element, new_value) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "bcd",
                    "element": element,
                    "newValue": new_value,
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(element = element, error = %e, "BCD change failed");
                results.push(serde_json::json!({
                    "type": "bcd",
                    "element": element,
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
    }

    // Apply power setting changes
    let power_changes = action_data
        .get("powerChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for change in &power_changes {
        let setting_path = change["settingPath"].as_str().unwrap_or("");
        let new_value = change["newValue"].as_str().unwrap_or("");

        match apply_power_change(setting_path, new_value) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "power",
                    "settingPath": setting_path,
                    "newValue": new_value,
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(setting = setting_path, error = %e, "Power change failed");
                results.push(serde_json::json!({
                    "type": "power",
                    "settingPath": setting_path,
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
    }

    // Apply PowerShell commands (audited, structured — never user-input-derived)
    let ps_commands = action_data
        .get("powerShellCommands")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    for cmd in &ps_commands {
        let script = cmd.as_str().unwrap_or("");
        if script.is_empty() {
            continue;
        }
        match execute_ps_command(script) {
            Ok(()) => {
                succeeded += 1;
                results.push(serde_json::json!({
                    "type": "powershell",
                    "command": &script[..script.len().min(80)],
                    "status": "success",
                }));
            }
            Err(e) => {
                failed += 1;
                tracing::error!(error = %e, "PowerShell command failed");
                results.push(serde_json::json!({
                    "type": "powershell",
                    "command": &script[..script.len().min(80)],
                    "status": "failed",
                    "error": e.to_string(),
                }));
            }
        }
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
         VALUES (?1, ?2, 'executor', 'action_executed', ?3, ?4)",
        rusqlite::params![
            audit_id,
            now,
            format!(
                "Action '{}' (type={}): {} succeeded, {} failed, status={}",
                action_id, action_type, succeeded, failed, status
            ) + &audit_context
                .map(|detail| format!(" · {}", detail))
                .unwrap_or_default(),
            if status == "failed" { "error" } else { "info" },
        ],
    )?;

    // Store outcome
    let outcome_id = uuid::Uuid::new_v4().to_string();
    let outcome_data = serde_json::json!({
        "actionId": action_id,
        "actionType": action_type,
        "snapshotId": snapshot_id,
        "rollbackSnapshotId": snapshot_id,
        "status": status,
        "succeeded": succeeded,
        "failed": failed,
        "results": results,
    });
    db.conn().execute(
        "INSERT INTO action_outcomes (id, action_id, status, applied_at, data)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            outcome_id,
            action_id,
            status,
            now,
            serde_json::to_string(&outcome_data)?,
        ],
    )?;

    tracing::info!(
        action_id = action_id,
        status = status,
        succeeded = succeeded,
        failed = failed,
        "Action execution complete"
    );

    Ok(outcome_data)
}

// ─── Windows implementations ────────────────────────────────────────────────

#[cfg(windows)]
fn remove_appx_package(package_name: &str) -> anyhow::Result<()> {
    let script = format!(
        "Get-AppxPackage -AllUsers -Name '{}' | Remove-AppxPackage -AllUsers",
        powershell::escape_ps_string(package_name),
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Remove-AppxPackage failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(windows)]
fn disable_scheduled_task(task_name: &str, task_path: &str) -> anyhow::Result<()> {
    let script = format!(
        "Disable-ScheduledTask -TaskName '{}' -TaskPath '{}' -ErrorAction Stop",
        powershell::escape_ps_string(task_name),
        powershell::escape_ps_string(task_path),
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Disable-ScheduledTask failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(windows)]
fn apply_registry_change(
    hive: &str,
    path: &str,
    value_name: &str,
    value: &Value,
    value_type: &str,
) -> anyhow::Result<()> {
    let escaped_path = powershell::escape_ps_string(path);
    let value_str = match value {
        Value::Number(n) => n.to_string(),
        Value::String(s) => format!("'{}'", powershell::escape_ps_string(s)),
        other => other.to_string(),
    };
    // Handle empty value_name (default value) — use '(Default)' for Set-ItemProperty
    let ps_name = if value_name.is_empty() {
        "(Default)".to_string()
    } else {
        powershell::escape_ps_string(value_name)
    };
    let script = format!(
        "New-Item -Path 'Registry::{}\\{}' -Force | Out-Null; \
         Set-ItemProperty -Path 'Registry::{}\\{}' -Name '{}' -Value {} -Type {} -Force",
        hive, escaped_path, hive, escaped_path, ps_name, value_str, value_type,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "Registry write failed for {}\\{}\\{}: {}",
            hive, path, value_name, result.stderr.trim()
        );
    }
    Ok(())
}

#[cfg(windows)]
fn apply_service_change(service_name: &str, startup_type: &str) -> anyhow::Result<()> {
    // Validate inputs before interpolation
    powershell::validate_safe_arg(service_name, "service name")?;
    powershell::validate_safe_arg(startup_type, "startup type")?;
    let escaped_name = powershell::escape_ps_string(service_name);

    let script = format!(
        "Set-Service -Name '{}' -StartupType {} -ErrorAction Stop; \
         if ('{}' -eq 'Disabled') {{ Stop-Service -Name '{}' -Force -ErrorAction SilentlyContinue }}",
        escaped_name, startup_type, startup_type, escaped_name,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!(
            "Service change failed for {}: {}",
            service_name, result.stderr.trim()
        );
    }
    Ok(())
}

fn resolve_registry_changes(action_data: &Value) -> anyhow::Result<Vec<Value>> {
    let registry_changes = action_data
        .get("registryChanges")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut resolved: Vec<Value> = Vec::new();
    for change in &registry_changes {
        resolved.extend(resolve_registry_change(change)?);
    }
    Ok(resolved)
}

#[cfg(windows)]
fn resolve_registry_change(change: &Value) -> anyhow::Result<Vec<Value>> {
    let path = change
        .get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !path.contains('<') {
        return Ok(vec![change.clone()]);
    }

    if path.contains("<Interface GUID>") {
        return expand_registry_template(
            change,
            "<Interface GUID>",
            &resolve_active_interface_guids()?,
        );
    }

    if path.contains("<Adapter Index>") {
        return expand_registry_template(
            change,
            "<Adapter Index>",
            &resolve_active_adapter_indices()?,
        );
    }

    if path.contains("<GPU Device ID>\\<Instance>") {
        return expand_registry_template(
            change,
            "<GPU Device ID>\\<Instance>",
            &resolve_display_pci_instances()?,
        );
    }

    if path.contains("<device>\\<instance>") {
        return expand_registry_template(
            change,
            "<device>\\<instance>",
            &resolve_scsi_disk_instances()?,
        );
    }

    anyhow::bail!("Unsupported registry placeholder path: {}", path)
}

#[cfg(not(windows))]
fn resolve_registry_change(change: &Value) -> anyhow::Result<Vec<Value>> {
    Ok(vec![change.clone()])
}

fn replace_registry_change_path(change: &Value, new_path: String) -> Value {
    let mut resolved = change.clone();
    if let Some(obj) = resolved.as_object_mut() {
        obj.insert("path".to_string(), serde_json::json!(new_path));
    }
    resolved
}

#[cfg(windows)]
fn expand_registry_template(
    change: &Value,
    token: &str,
    replacements: &[String],
) -> anyhow::Result<Vec<Value>> {
    let path = change
        .get("path")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if replacements.is_empty() {
        anyhow::bail!("No runtime targets resolved for placeholder {}", token);
    }

    Ok(replacements
        .iter()
        .map(|replacement| replace_registry_change_path(change, path.replace(token, replacement)))
        .collect())
}

fn parse_nonempty_lines(stdout: &str) -> Vec<String> {
    stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

#[cfg(windows)]
fn resolve_active_interface_guids() -> anyhow::Result<Vec<String>> {
    let script = "\
        Get-NetAdapter | Where-Object { \
            $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true -and $_.InterfaceDescription -notmatch 'Virtual|Hyper-V|VPN|Loopback' \
        } | Select-Object -ExpandProperty InterfaceGuid | ForEach-Object { \
            $guid = [string]$_; \
            if ($guid -and -not $guid.StartsWith('{')) { '{' + $guid.Trim('{}') + '}' } else { $guid } \
        }";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve active NIC GUIDs: {}", result.stderr.trim());
    }
    let guids = parse_nonempty_lines(&result.stdout);
    if guids.is_empty() {
        anyhow::bail!("No active physical NIC GUIDs found");
    }
    Ok(guids)
}

#[cfg(windows)]
fn resolve_active_adapter_indices() -> anyhow::Result<Vec<String>> {
    let script = "\
        $wanted = Get-NetAdapter | Where-Object { \
            $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true -and $_.InterfaceDescription -notmatch 'Virtual|Hyper-V|VPN|Loopback' \
        } | Select-Object -ExpandProperty InterfaceGuid | ForEach-Object { ([string]$_).Trim('{}') }; \
        $classRoot = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}'; \
        foreach ($key in Get-ChildItem $classRoot -ErrorAction SilentlyContinue) { \
            $props = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue; \
            $instance = [string]$props.NetCfgInstanceId; \
            if ($instance -and ($wanted -contains $instance.Trim('{}'))) { $key.PSChildName } \
        }";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve active adapter indices: {}", result.stderr.trim());
    }
    let indices = parse_nonempty_lines(&result.stdout);
    if indices.is_empty() {
        anyhow::bail!("No active adapter registry indices found");
    }
    Ok(indices)
}

#[cfg(windows)]
fn resolve_display_pci_instances() -> anyhow::Result<Vec<String>> {
    let script = "\
        Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty PNPDeviceID | \
        Where-Object { $_ -like 'PCI\\\\*' } | ForEach-Object { $_.Substring(4) }";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve display PCI instances: {}", result.stderr.trim());
    }
    let instances = parse_nonempty_lines(&result.stdout);
    if instances.is_empty() {
        anyhow::bail!("No physical display PCI instances found");
    }
    Ok(instances)
}

#[cfg(windows)]
fn resolve_scsi_disk_instances() -> anyhow::Result<Vec<String>> {
    let script = "\
        Get-CimInstance Win32_DiskDrive | Select-Object -ExpandProperty PNPDeviceID | \
        Where-Object { $_ -like 'SCSI\\\\*' } | ForEach-Object { $_.Substring(5) }";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve SCSI disk instances: {}", result.stderr.trim());
    }
    let instances = parse_nonempty_lines(&result.stdout);
    if instances.is_empty() {
        anyhow::bail!("No SCSI-backed disk instances found");
    }
    Ok(instances)
}

#[cfg(windows)]
fn read_registry_value(hive: &str, path: &str, value_name: &str) -> Option<Value> {
    let escaped_path = powershell::escape_ps_string(path);
    let ps_name = if value_name.is_empty() {
        "(Default)".to_string()
    } else {
        powershell::escape_ps_string(value_name)
    };
    let script = format!(
        "try {{ \
            $val = Get-ItemProperty -Path 'Registry::{}\\{}' -Name '{}' -ErrorAction Stop; \
            $raw = $val.'{}'; \
            if ($null -eq $raw) {{ '__REDCORE_NULL__' }} \
            elseif ($raw -is [string] -and $raw.Length -eq 0) {{ '__REDCORE_EMPTY_STRING__' }} \
            else {{ $raw }} \
         }} catch {{ '__REDCORE_MISSING__' }}",
        hive, escaped_path, ps_name, ps_name,
    );
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() || trimmed == "__REDCORE_MISSING__" {
                None
            } else if trimmed == "__REDCORE_NULL__" || trimmed == "__REDCORE_EMPTY_STRING__" {
                Some(Value::String(String::new()))
            } else if let Ok(n) = trimmed.parse::<i64>() {
                Some(Value::Number(n.into()))
            } else {
                Some(Value::String(trimmed.to_string()))
            }
        }
        _ => None,
    }
}

#[cfg(windows)]
fn read_service_start_type(service_name: &str) -> Option<Value> {
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
                Some(Value::String(trimmed.to_string()))
            }
        }
        _ => None,
    }
}

/// Public read-back for verification IPC. Allows callers to confirm a registry value.
#[cfg(windows)]
pub fn read_registry_value_public(hive: &str, path: &str, value_name: &str) -> Option<Value> {
    read_registry_value(hive, path, value_name)
}

#[cfg(not(windows))]
pub fn read_registry_value_public(hive: &str, path: &str, value_name: &str) -> Option<Value> {
    read_registry_value(hive, path, value_name)
}

// ─── BCD and Power read functions ─────────────────────────────────────────

#[cfg(windows)]
fn read_bcd_value(element: &str) -> Option<Value> {
    if element.is_empty() {
        return None;
    }
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
                Some(Value::String(value.to_string()))
            }
        }
        _ => None,
    }
}

#[cfg(not(windows))]
fn read_bcd_value(_element: &str) -> Option<Value> {
    None
}

#[cfg(windows)]
fn read_power_value(setting_path: &str) -> Option<Value> {
    let parts: Vec<&str> = setting_path.split('/').collect();
    if parts.len() != 2 {
        return None;
    }
    if powershell::validate_safe_arg(parts[0], "power subgroup").is_err()
        || powershell::validate_safe_arg(parts[1], "power setting").is_err()
    {
        return None;
    }
    let script = format!("powercfg /query SCHEME_CURRENT {} {}", parts[0], parts[1]);
    match powershell::execute(&script) {
        Ok(result) if result.success => {
            for line in result.stdout.lines() {
                let line = line.trim();
                if line.starts_with("Current AC Power Setting Index:") {
                    if let Some(hex_val) = line.split(':').nth(1) {
                        let hex_val = hex_val.trim().trim_start_matches("0x");
                        if let Ok(n) = u64::from_str_radix(hex_val, 16) {
                            return Some(serde_json::json!(n));
                        }
                    }
                }
            }
            None
        }
        _ => None,
    }
}

#[cfg(not(windows))]
fn read_power_value(_setting_path: &str) -> Option<Value> {
    None
}

// ─── Non-Windows simulation ─────────────────────────────────────────────────

#[cfg(not(windows))]
fn remove_appx_package(package_name: &str) -> anyhow::Result<()> {
    tracing::info!(
        package = package_name,
        "[simulated] Would remove AppX package"
    );
    Ok(())
}

#[cfg(not(windows))]
fn disable_scheduled_task(task_name: &str, task_path: &str) -> anyhow::Result<()> {
    tracing::info!(
        task = task_name,
        path = task_path,
        "[simulated] Would disable scheduled task"
    );
    Ok(())
}

#[cfg(not(windows))]
fn apply_registry_change(
    hive: &str,
    path: &str,
    value_name: &str,
    value: &Value,
    _value_type: &str,
) -> anyhow::Result<()> {
    tracing::info!(
        path = format!("{}\\{}", hive, path).as_str(),
        value_name = value_name,
        ?value,
        "[simulated] Would apply registry change"
    );
    Ok(())
}

#[cfg(not(windows))]
fn apply_service_change(service_name: &str, startup_type: &str) -> anyhow::Result<()> {
    tracing::info!(
        service = service_name,
        startup_type = startup_type,
        "[simulated] Would change service startup type"
    );
    Ok(())
}

// ─── BCD changes ────────────────────────────────────────────────────────────

#[cfg(windows)]
fn apply_bcd_change(element: &str, new_value: &str) -> anyhow::Result<()> {
    powershell::validate_safe_arg(element, "BCD element")?;
    powershell::validate_safe_arg(new_value, "BCD value")?;
    let script = format!("bcdedit /set {{current}} {} {}", element, new_value);
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("bcdedit failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn apply_bcd_change(_element: &str, _new_value: &str) -> anyhow::Result<()> {
    tracing::info!("[simulated] BCD change");
    Ok(())
}

// ─── Power setting changes ──────────────────────────────────────────────────

#[cfg(windows)]
fn apply_power_change(setting_path: &str, new_value: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = setting_path.split('/').collect();
    if parts.len() != 2 {
        anyhow::bail!("Invalid power setting path: {}", setting_path);
    }
    // Validate GUIDs and value before interpolation
    powershell::validate_safe_arg(parts[0], "power subgroup")?;
    powershell::validate_safe_arg(parts[1], "power setting")?;
    powershell::validate_safe_arg(new_value, "power value")?;
    let script = format!(
        "powercfg /setacvalueindex SCHEME_CURRENT {} {} {}; powercfg /setactive SCHEME_CURRENT",
        parts[0], parts[1], new_value,
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("powercfg failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn apply_power_change(_setting_path: &str, _new_value: &str) -> anyhow::Result<()> {
    tracing::info!("[simulated] Power change");
    Ok(())
}

// ─── PowerShell command execution ───────────────────────────────────────────
// NOTE: These scripts come from action definitions (YAML playbooks), NOT from
// user input. They are trusted, audited commands embedded in the playbook data.
// Do not pass user-controlled strings through this path.

#[cfg(windows)]
fn execute_ps_command(script: &str) -> anyhow::Result<()> {
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("PS command failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn execute_ps_command(_script: &str) -> anyhow::Result<()> {
    tracing::info!("[simulated] PS command");
    Ok(())
}

// ─── Non-Windows fallbacks ──────────────────────────────────────────────────

#[cfg(not(windows))]
fn read_registry_value(_hive: &str, _path: &str, _value_name: &str) -> Option<Value> {
    Some(serde_json::json!(1))
}

#[cfg(not(windows))]
fn read_service_start_type(_service_name: &str) -> Option<Value> {
    Some(Value::String("Automatic".to_string()))
}
