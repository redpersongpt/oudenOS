// ─── System Assessor ────────────────────────────────────────────────────────
// Collects system information via PowerShell/CIM probes and native registry
// reads. Every probe is isolated: a failing probe yields `{ "error": … }` for
// that section and never fails the whole assessment.
//
// On non-Windows: returns realistic simulated data for development.

#[cfg(windows)]
use crate::powershell;
use serde_json::Value;

/// Run a full system assessment.
/// Keys: windows, windowsBuild, appx, startup, services, telemetryTasks,
/// workSignals, vm, hardware, formFactor, storage, healthChecks, assessedAt,
/// overallScore.
pub fn assess_system() -> anyhow::Result<Value> {
    tracing::info!("Starting full system assessment");

    #[cfg(windows)]
    let mut result = assess_windows();

    #[cfg(not(windows))]
    let mut result = assess_simulated();

    if let Some(obj) = result.as_object_mut() {
        obj.insert(
            "windowsBuild".to_string(),
            serde_json::to_value(crate::facts::detect_windows_build()).unwrap_or(Value::Null),
        );
        obj.insert(
            "detectedBuild".to_string(),
            serde_json::json!(crate::facts::effective_windows_build(None)),
        );
    }
    // Hardware health advisories (read-only, isolated probes).
    let health = crate::health::run_health_checks(&result);
    if let Some(obj) = result.as_object_mut() {
        obj.insert("healthChecks".to_string(), health);
    }
    // Cache facts for build/hardware gating.
    crate::facts::set_facts(crate::facts::facts_from_assessment(&result));
    Ok(result)
}

// ─── Windows assessment ─────────────────────────────────────────────────────

#[cfg(windows)]
fn assess_windows() -> Value {
    let windows = run_ps_json(
        "windows_info",
        "$os = Get-CimInstance Win32_OperatingSystem; \
         $os | Select Caption, BuildNumber, Version, OSArchitecture | ConvertTo-Json -Compress",
    );

    let appx = run_ps_json(
        "appx_packages",
        "@{ count = @(Get-AppxPackage -AllUsers -ErrorAction Stop).Count } | ConvertTo-Json -Compress",
    );

    let startup = run_ps_json(
        "startup_items",
        "@{ count = @(Get-CimInstance Win32_StartupCommand).Count } | ConvertTo-Json -Compress",
    );

    let services = run_ps_json(
        "services",
        "$all = @(Get-Service); @{ total = $all.Count; running = @($all | Where-Object { [string]$_.Status -eq 'Running' }).Count } | ConvertTo-Json -Compress",
    );

    // State is emitted as its enum NAME (ConvertTo-Json would write the number).
    let telemetry_tasks = run_ps_json(
        "telemetry_tasks",
        "@(Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Application Experience\\*',\
         '\\Microsoft\\Windows\\Customer Experience Improvement Program\\*' -ErrorAction SilentlyContinue \
         | Select-Object TaskName, @{ n = 'State'; e = { [string]$_.State } }) | ConvertTo-Json -Compress",
    );

    let work_signals = run_ps_json(
        "work_signals",
        "$spooler = [string](Get-Service Spooler -ErrorAction SilentlyContinue).Status; \
         $rdp = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server' \
                 -Name fDenyTSConnections -ErrorAction SilentlyContinue).fDenyTSConnections; \
         $domain = (Get-CimInstance Win32_ComputerSystem).PartOfDomain; \
         $smb = [string](Get-Service LanmanServer -ErrorAction SilentlyContinue).Status; \
         $gp = [string](Get-Service gpsvc -ErrorAction SilentlyContinue).Status; \
         @{ printSpooler = $spooler; rdpDenied = $rdp; domainJoined = [bool]$domain; \
            smbServer = $smb; groupPolicyClient = $gp } | ConvertTo-Json -Compress",
    );

    let vm = run_ps_json(
        "vm_detection",
        "$board = (Get-CimInstance Win32_BaseBoard).Manufacturer; \
         $cs = Get-CimInstance Win32_ComputerSystem; \
         $biosVendor = (Get-CimInstance Win32_BIOS).Manufacturer; \
         $opts = [Text.RegularExpressions.RegexOptions]'IgnoreCase, CultureInvariant'; \
         $vmPatterns = 'Virtual|VMware|VirtualBox|Hyper-V|QEMU|KVM|Parallels|Xen|Bhyve|Apple Virtualization|innotek'; \
         $mfgPatterns = '^(VMware|innotek GmbH|Parallels|QEMU|Xen|Amazon EC2|Google)'; \
         $isVM = [regex]::IsMatch([string]$cs.Model, $vmPatterns, $opts) -or [regex]::IsMatch([string]$cs.Manufacturer, $mfgPatterns, $opts) \
                 -or [regex]::IsMatch([string]$cs.Model, 'Standard PC', $opts) -or [regex]::IsMatch([string]$biosVendor, $vmPatterns, $opts); \
         @{ manufacturer = [string]$board; model = [string]$cs.Model; systemMfg = [string]$cs.Manufacturer; \
            biosVendor = [string]$biosVendor; isVM = [bool]$isVM } | ConvertTo-Json -Compress",
    );

    let hardware = run_ps_json(
        "hardware",
        "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name, NumberOfCores, NumberOfLogicalProcessors, Manufacturer; \
         $mem = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB); \
         $gpu = @(Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, PNPDeviceID); \
         @{ cpu = $cpu; ramGb = $mem; gpu = $gpu } | ConvertTo-Json -Depth 4 -Compress",
    );

    let form_factor_raw = run_ps_json(
        "form_factor",
        "$e = Get-CimInstance Win32_SystemEnclosure -ErrorAction SilentlyContinue; \
         $b = @(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue).Count; \
         @{ chassisTypes = @($e | ForEach-Object { $_.ChassisTypes } | ForEach-Object { [int]$_ }); batteryCount = $b } | ConvertTo-Json -Compress",
    );
    let form_factor = classify_form_factor(&form_factor_raw);

    let storage_raw = run_ps_json(
        "storage",
        "@(Get-PhysicalDisk -ErrorAction Stop | Select-Object @{ n = 'MediaType'; e = { [string]$_.MediaType } }, \
           @{ n = 'SpindleSpeed'; e = { [int64]$_.SpindleSpeed } }, @{ n = 'BusType'; e = { [string]$_.BusType } }) | ConvertTo-Json -Compress",
    );
    let storage = classify_storage(&storage_raw);

    let now = chrono::Utc::now().to_rfc3339();
    let score = calculate_score(&appx, &services, &startup, &telemetry_tasks);

    serde_json::json!({
        "windows": windows,
        "appx": appx,
        "startup": startup,
        "services": services,
        "telemetryTasks": telemetry_tasks,
        "workSignals": work_signals,
        "vm": vm,
        "hardware": hardware,
        "formFactor": form_factor,
        "storage": storage,
        "assessedAt": now,
        "overallScore": score,
    })
}

/// Run one probe; any failure (spawn, timeout, non-zero exit, bad JSON) is
/// contained in an `{ "error": … }` object for that section.
#[cfg(windows)]
fn run_ps_json(label: &str, script: &str) -> Value {
    tracing::info!("Assessing: {}", label);
    match powershell::execute_with_timeout(script, std::time::Duration::from_secs(30)) {
        Err(e) => serde_json::json!({ "error": e.to_string() }),
        Ok(result) if !result.success => {
            tracing::warn!("Assessment '{}' probe failed: {}", label, result.stderr.trim());
            serde_json::json!({ "error": result.stderr.trim() })
        }
        Ok(result) => {
            let trimmed = result.stdout.trim();
            if trimmed.is_empty() {
                return Value::Null;
            }
            serde_json::from_str(trimmed).unwrap_or_else(|e| {
                tracing::warn!("Failed to parse {} JSON: {}", label, e);
                serde_json::json!({ "error": format!("Failed to parse {} output as JSON: {}", label, e) })
            })
        }
    }
}

/// Chassis classification from SMBIOS chassis types (+ battery fallback).
pub(crate) fn classify_form_factor(raw: &Value) -> Value {
    const PORTABLE: &[i64] = &[8, 9, 10, 11, 12, 14, 18, 21, 30, 31, 32];
    const DESKTOP: &[i64] = &[3, 4, 5, 6, 7, 13, 15, 16, 17, 23, 24, 35, 36];
    let types: Vec<i64> = match raw.get("chassisTypes") {
        Some(Value::Array(items)) => items.iter().filter_map(Value::as_i64).collect(),
        Some(Value::Number(n)) => n.as_i64().into_iter().collect(),
        _ => Vec::new(),
    };
    let battery = raw.get("batteryCount").and_then(Value::as_i64);
    let chassis = if types.iter().any(|t| PORTABLE.contains(t)) {
        "laptop"
    } else if types.iter().any(|t| DESKTOP.contains(t)) {
        "desktop"
    } else if battery.is_some_and(|b| b > 0) {
        "laptop"
    } else if battery == Some(0) {
        "desktop"
    } else {
        "unknown"
    };
    serde_json::json!({ "chassis": chassis, "chassisTypes": types, "batteryCount": battery })
}

/// HDD presence from Get-PhysicalDisk (MediaType name or spindle speed).
pub(crate) fn classify_storage(raw: &Value) -> Value {
    let disks: Vec<&Value> = match raw {
        Value::Array(items) => items.iter().collect(),
        Value::Object(obj) if !obj.contains_key("error") => vec![raw],
        _ => Vec::new(),
    };
    if disks.is_empty() {
        return serde_json::json!({ "hasHdd": null, "disks": raw });
    }
    let has_hdd = disks.iter().any(|d| {
        d.get("MediaType").and_then(Value::as_str).is_some_and(|m| m.eq_ignore_ascii_case("HDD"))
            || d.get("SpindleSpeed")
                .and_then(Value::as_i64)
                .is_some_and(|s| s > 0 && s < u32::MAX as i64)
    });
    serde_json::json!({ "hasHdd": has_hdd, "disks": disks })
}

// ─── Non-Windows simulation ─────────────────────────────────────────────────

#[cfg(not(windows))]
fn assess_simulated() -> Value {
    tracing::info!("[simulated] Returning simulated assessment data");

    let now = chrono::Utc::now().to_rfc3339();

    let vm_data = if std::env::var("OUDENOS_SIMULATE_VM").is_ok() {
        serde_json::json!({
            "manufacturer": "QEMU",
            "model": "Simulated Virtual Machine",
            "systemMfg": "QEMU",
            "biosVendor": "QEMU",
            "isVM": true
        })
    } else {
        serde_json::json!({
            "manufacturer": "ASUSTeK COMPUTER INC.",
            "model": "ROG STRIX B550-F GAMING",
            "systemMfg": "ASUSTeK COMPUTER INC.",
            "biosVendor": "American Megatrends Inc.",
            "isVM": false
        })
    };

    serde_json::json!({
        "windows": {
            "Caption": "Microsoft Windows 11 Pro",
            "BuildNumber": "22631",
            "Version": "10.0.22631",
            "OSArchitecture": "64-bit"
        },
        "appx": { "count": 42 },
        "startup": { "count": 3 },
        "services": { "total": 287, "running": 112 },
        "telemetryTasks": [
            { "TaskName": "Microsoft Compatibility Appraiser", "State": "Ready" },
            { "TaskName": "ProgramDataUpdater", "State": "Ready" },
            { "TaskName": "Consolidator", "State": "Ready" },
            { "TaskName": "UsbCeip", "State": "Ready" },
            { "TaskName": "KernelCeipTask", "State": "Ready" }
        ],
        "workSignals": {
            "printSpooler": "Running",
            "rdpDenied": 1,
            "domainJoined": false,
            "smbServer": "Running",
            "groupPolicyClient": "Running"
        },
        "vm": vm_data,
        "hardware": {
            "cpu": {
                "Name": "AMD Ryzen 7 5800X 8-Core Processor",
                "NumberOfCores": 8,
                "NumberOfLogicalProcessors": 16
            },
            "ramGb": 32,
            "gpu": [
                { "Name": "NVIDIA GeForce RTX 3070", "AdapterRAM": 8589934592_u64 }
            ]
        },
        "formFactor": { "chassis": "desktop", "chassisTypes": [3], "batteryCount": 0 },
        "storage": { "hasHdd": false, "disks": [] },
        "assessedAt": now,
        "overallScore": 62,
    })
}

// ─── Score calculation ──────────────────────────────────────────────────────

/// ScheduledTask State as emitted (name) or, for older data, the numeric
/// enum value (3 = Ready, 4 = Running).
fn task_is_active(state: &Value) -> bool {
    match state {
        Value::String(s) => s == "Ready" || s == "Running",
        Value::Number(n) => matches!(n.as_i64(), Some(3) | Some(4)),
        _ => false,
    }
}

pub(crate) fn calculate_score(appx: &Value, services: &Value, startup: &Value, telemetry_tasks: &Value) -> u32 {
    let mut score: i32 = 100;

    let appx_count = appx.get("count").and_then(|v| v.as_u64()).unwrap_or(0) as i32;
    if appx_count > 30 {
        score -= ((appx_count - 30) * 2).min(20);
    }

    let running = services.get("running").and_then(|v| v.as_u64()).unwrap_or(0) as i32;
    if running > 80 {
        score -= ((running - 80) / 5).min(15);
    }

    let startup_count = if let Some(arr) = startup.as_array() {
        arr.len() as i32
    } else {
        startup.get("count").and_then(|v| v.as_i64()).unwrap_or(0) as i32
    };
    if startup_count > 5 {
        score -= ((startup_count - 5) * 3).min(15);
    }

    let tasks: Vec<&Value> = match telemetry_tasks {
        Value::Array(items) => items.iter().collect(),
        Value::Object(obj) if obj.contains_key("TaskName") => vec![telemetry_tasks],
        _ => Vec::new(),
    };
    let telemetry_count = tasks
        .iter()
        .filter(|t| t.get("State").is_some_and(task_is_active))
        .count() as i32;
    score -= (telemetry_count * 3).min(15);

    score.clamp(0, 100) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn telemetry_state_counts_names_and_legacy_numbers() {
        let names = serde_json::json!([{ "TaskName": "A", "State": "Ready" }, { "TaskName": "B", "State": "Disabled" }]);
        let numbers = serde_json::json!([{ "TaskName": "A", "State": 3 }, { "TaskName": "B", "State": 1 }]);
        let empty = serde_json::json!({});
        assert_eq!(calculate_score(&empty, &empty, &empty, &names), 97);
        assert_eq!(calculate_score(&empty, &empty, &empty, &numbers), 97);
    }

    #[test]
    fn form_factor_from_chassis_types_and_battery() {
        assert_eq!(classify_form_factor(&serde_json::json!({ "chassisTypes": [3], "batteryCount": 0 }))["chassis"], "desktop");
        assert_eq!(classify_form_factor(&serde_json::json!({ "chassisTypes": [10], "batteryCount": 1 }))["chassis"], "laptop");
        // Desktop with a UPS battery still counts as desktop.
        assert_eq!(classify_form_factor(&serde_json::json!({ "chassisTypes": [3], "batteryCount": 1 }))["chassis"], "desktop");
        assert_eq!(classify_form_factor(&serde_json::json!({ "chassisTypes": [2], "batteryCount": 1 }))["chassis"], "laptop");
        assert_eq!(classify_form_factor(&serde_json::json!({ "error": "x" }))["chassis"], "unknown");
    }

    #[test]
    fn storage_detects_hdd() {
        let nvme = serde_json::json!({ "MediaType": "SSD", "SpindleSpeed": 0, "BusType": "NVMe" });
        assert_eq!(classify_storage(&nvme)["hasHdd"], false);
        let mixed = serde_json::json!([nvme, { "MediaType": "HDD", "SpindleSpeed": 7200, "BusType": "SATA" }]);
        assert_eq!(classify_storage(&mixed)["hasHdd"], true);
        assert!(classify_storage(&serde_json::json!({ "error": "x" }))["hasHdd"].is_null());
    }
}
