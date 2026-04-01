// ─── System Assessor ────────────────────────────────────────────────────────
// Collects comprehensive system information via PowerShell/WMI queries.
// Produces an assessment JSON value for classification and transformation.
//
// On Windows: runs real CIM/WMI queries via powershell.exe and parses JSON.
// On non-Windows: returns realistic simulated data for development.

#[cfg(windows)]
use crate::powershell;

/// Run a full system assessment.
/// Returns a JSON object with keys: windows, appx, startup, services,
/// telemetryTasks, workSignals, vm, hardware, assessedAt, overallScore.
pub async fn assess_system() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Starting full system assessment");

    #[cfg(windows)]
    let result = assess_windows().await;

    #[cfg(not(windows))]
    let result = assess_simulated().await;

    result
}

// ─── Windows assessment ─────────────────────────────────────────────────────

#[cfg(windows)]
async fn assess_windows() -> anyhow::Result<serde_json::Value> {
    let windows = run_ps_json(
        "windows_info",
        "$os = Get-CimInstance Win32_OperatingSystem; \
         $os | Select Caption, BuildNumber, Version, OSArchitecture | ConvertTo-Json",
    )?;

    let appx = run_ps_json(
        "appx_packages",
        "@{ count = (Get-AppxPackage -AllUsers).Count } | ConvertTo-Json -Compress",
    )?;

    let startup = run_ps_json(
        "startup_items",
        "@{ count = (Get-CimInstance Win32_StartupCommand).Count } | ConvertTo-Json -Compress",
    )?;

    let services = run_ps_json(
        "services",
        "@{ total = (Get-Service).Count; running = (Get-Service | Where Status -eq Running).Count } | ConvertTo-Json",
    )?;

    let telemetry_tasks = run_ps_json(
        "telemetry_tasks",
        "Get-ScheduledTask -TaskPath '\\Microsoft\\Windows\\Application Experience\\*',\
         '\\Microsoft\\Windows\\Customer Experience Improvement Program\\*' \
         | Select TaskName, State | ConvertTo-Json",
    )?;

    let work_signals = run_ps_json(
        "work_signals",
        "$spooler = (Get-Service Spooler -ErrorAction SilentlyContinue).Status; \
         $rdp = (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server' \
                 -Name fDenyTSConnections -ErrorAction SilentlyContinue).fDenyTSConnections; \
         $domain = (Get-CimInstance Win32_ComputerSystem).PartOfDomain; \
         $smb = (Get-Service LanmanServer -ErrorAction SilentlyContinue).Status; \
         $gp = (Get-Service gpsvc -ErrorAction SilentlyContinue).Status; \
         @{ printSpooler = \"$spooler\"; rdpDenied = $rdp; domainJoined = $domain; \
            smbServer = \"$smb\"; groupPolicyClient = \"$gp\" } | ConvertTo-Json",
    )?;

    let vm = run_ps_json(
        "vm_detection",
        "$board = (Get-CimInstance Win32_BaseBoard).Manufacturer; \
         $model = (Get-CimInstance Win32_ComputerSystem).Model; \
         $manufacturer = (Get-CimInstance Win32_ComputerSystem).Manufacturer; \
         $biosVendor = (Get-CimInstance Win32_BIOS).Manufacturer; \
         $vmPatterns = 'Virtual|VMware|VirtualBox|Hyper-V|QEMU|KVM|Parallels|Xen|Bhyve|UTM|Apple Virtualization|innotek'; \
         $mfgPatterns = 'Microsoft Corporation|VMware|innotek GmbH|Parallels|QEMU|Xen|Amazon EC2|Google'; \
         $isVM = ($model -match $vmPatterns) -or ($manufacturer -match $mfgPatterns) -or ($model -match 'Standard PC') -or ($biosVendor -match $vmPatterns); \
         @{ manufacturer = \"$board\"; model = \"$model\"; systemMfg = \"$manufacturer\"; \
            biosVendor = \"$biosVendor\"; isVM = [bool]$isVM } | ConvertTo-Json",
    )?;

    let hardware = run_ps_json(
        "hardware",
        "$cpu = Get-CimInstance Win32_Processor | Select Name, NumberOfCores, NumberOfLogicalProcessors; \
         $mem = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB); \
         $gpu = Get-CimInstance Win32_VideoController | Select Name, AdapterRAM; \
         @{ cpu = $cpu; ramGb = $mem; gpu = $gpu } | ConvertTo-Json",
    )?;

    let now = chrono::Utc::now().to_rfc3339();
    let score = calculate_score(&appx, &services, &startup, &telemetry_tasks);

    Ok(serde_json::json!({
        "windows": windows,
        "appx": appx,
        "startup": startup,
        "services": services,
        "telemetryTasks": telemetry_tasks,
        "workSignals": work_signals,
        "vm": vm,
        "hardware": hardware,
        "assessedAt": now,
        "overallScore": score,
    }))
}

#[cfg(windows)]
fn run_ps_json(label: &str, script: &str) -> anyhow::Result<serde_json::Value> {
    tracing::info!("Assessing: {}", label);
    let result = powershell::execute(script)?;
    if !result.success {
        tracing::warn!(
            "Assessment '{}' PS command returned non-zero: {}",
            label,
            result.stderr.trim()
        );
        return Ok(serde_json::json!({ "error": result.stderr.trim() }));
    }
    let trimmed = result.stdout.trim();
    if trimmed.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(trimmed).map_err(|e| {
        tracing::warn!("Failed to parse {} JSON: {}", label, e);
        anyhow::anyhow!("Failed to parse {} output as JSON: {}", label, e)
    })
}

// ─── Non-Windows simulation ─────────────────────────────────────────────────

#[cfg(not(windows))]
async fn assess_simulated() -> anyhow::Result<serde_json::Value> {
    tracing::info!("[simulated] Returning simulated assessment data");

    let now = chrono::Utc::now().to_rfc3339();

    let vm_data = if std::env::var("REDCORE_SIMULATE_VM").is_ok() {
        tracing::info!("[simulated] REDCORE_SIMULATE_VM set — reporting as virtual machine");
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

    Ok(serde_json::json!({
        "windows": {
            "Caption": "Microsoft Windows 11 Pro",
            "BuildNumber": "22631",
            "Version": "10.0.22631",
            "OSArchitecture": "64-bit"
        },
        "appx": {
            "count": 42,
            "packages": [
                { "Name": "Microsoft.BingNews", "PackageFullName": "Microsoft.BingNews_4.55.62231.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.BingWeather", "PackageFullName": "Microsoft.BingWeather_4.53.51343.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.MicrosoftSolitaireCollection", "PackageFullName": "Microsoft.MicrosoftSolitaireCollection_4.18.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.People", "PackageFullName": "Microsoft.People_10.0.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.WindowsMaps", "PackageFullName": "Microsoft.WindowsMaps_5.2_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.WindowsFeedbackHub", "PackageFullName": "Microsoft.WindowsFeedbackHub_1.2_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.GetHelp", "PackageFullName": "Microsoft.GetHelp_10.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.Getstarted", "PackageFullName": "Microsoft.Getstarted_10.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.Todos", "PackageFullName": "Microsoft.Todos_2.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.549981C3F5F10", "PackageFullName": "Microsoft.549981C3F5F10_4.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.MixedReality.Portal", "PackageFullName": "Microsoft.MixedReality.Portal_2.0_x64__8wekyb3d8bbwe" },
                { "Name": "MicrosoftWindows.Client.WebExperience", "PackageFullName": "MicrosoftWindows.Client.WebExperience_1.0_x64__cw5n1h2txyewy" },
                { "Name": "Microsoft.XboxApp", "PackageFullName": "Microsoft.XboxApp_48.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.XboxGamingOverlay", "PackageFullName": "Microsoft.XboxGamingOverlay_6.0_x64__8wekyb3d8bbwe" },
                { "Name": "Microsoft.Xbox.TCUI", "PackageFullName": "Microsoft.Xbox.TCUI_1.0_x64__8wekyb3d8bbwe" }
            ]
        },
        "startup": [
            { "Name": "OneDrive", "Command": "\"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe\" /background", "Location": "HKU" },
            { "Name": "SecurityHealth", "Command": "C:\\Windows\\System32\\SecurityHealthSystray.exe", "Location": "HKLM" },
            { "Name": "Discord", "Command": "C:\\Users\\User\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe", "Location": "HKU" }
        ],
        "services": {
            "total": 287,
            "running": 112
        },
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
        "assessedAt": now,
        "overallScore": 62,
    }))
}

// ─── Score calculation ──────────────────────────────────────────────────────

fn calculate_score(
    appx: &serde_json::Value,
    services: &serde_json::Value,
    startup: &serde_json::Value,
    telemetry_tasks: &serde_json::Value,
) -> u32 {
    let mut score: i32 = 100;

    // Penalty for bloat AppX packages (more than 30 = bloated)
    let appx_count = appx
        .get("count")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as i32;
    if appx_count > 30 {
        score -= ((appx_count - 30) * 2).min(20);
    }

    // Penalty for excessive running services (more than 80 is high)
    let running = services
        .get("running")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as i32;
    if running > 80 {
        score -= ((running - 80) / 5).min(15);
    }

    // Penalty for startup items (more than 5 is cluttered)
    let startup_count = if startup.is_array() {
        startup.as_array().map(|a| a.len()).unwrap_or(0) as i32
    } else {
        0
    };
    if startup_count > 5 {
        score -= ((startup_count - 5) * 3).min(15);
    }

    // Penalty for active telemetry tasks
    let telemetry_count = if telemetry_tasks.is_array() {
        telemetry_tasks
            .as_array()
            .map(|a| {
                a.iter()
                    .filter(|t| {
                        t.get("State")
                            .and_then(|s| s.as_str())
                            .map(|s| s == "Ready" || s == "Running")
                            .unwrap_or(false)
                    })
                    .count()
            })
            .unwrap_or(0) as i32
    } else {
        0
    };
    score -= (telemetry_count * 3).min(15);

    score.clamp(0, 100) as u32
}
