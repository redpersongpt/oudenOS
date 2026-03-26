// ---- Hardware Scanner --------------------------------------------------------
// Collects comprehensive hardware and OS information via PowerShell/WMI queries.
// Produces a DeviceProfile JSON value.
//
// On Windows: runs real CIM/WMI queries via powershell.exe and parses JSON.
// On non-Windows: returns realistic sample data for development.

use serde::{Deserialize, Serialize};

use crate::powershell;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanProgress {
    pub phase: String,
    pub percent: u8,
    pub detail: String,
}

/// Run a full hardware scan.
/// Emits progress events via the callback.
pub async fn scan_full<F>(on_progress: F) -> anyhow::Result<serde_json::Value>
where
    F: Fn(ScanProgress) + Send,
{
    on_progress(ScanProgress {
        phase: "cpu".into(),
        percent: 0,
        detail: "Detecting CPU...".into(),
    });
    let cpu = scan_cpu()?;

    on_progress(ScanProgress {
        phase: "gpu".into(),
        percent: 10,
        detail: "Detecting GPU...".into(),
    });
    let gpu = scan_gpu()?;

    on_progress(ScanProgress {
        phase: "memory".into(),
        percent: 20,
        detail: "Scanning memory...".into(),
    });
    let memory = scan_memory()?;

    on_progress(ScanProgress {
        phase: "storage".into(),
        percent: 35,
        detail: "Scanning storage...".into(),
    });
    let storage = scan_storage()?;

    on_progress(ScanProgress {
        phase: "network".into(),
        percent: 45,
        detail: "Scanning network...".into(),
    });
    let network = scan_network()?;

    on_progress(ScanProgress {
        phase: "windows".into(),
        percent: 55,
        detail: "Reading Windows info...".into(),
    });
    let windows = scan_windows()?;

    on_progress(ScanProgress {
        phase: "security".into(),
        percent: 65,
        detail: "Checking security state...".into(),
    });
    let security = scan_security()?;

    on_progress(ScanProgress {
        phase: "mitigations".into(),
        percent: 72,
        detail: "Analyzing CPU mitigations...".into(),
    });
    let mitigations = scan_mitigations()?;

    on_progress(ScanProgress {
        phase: "motherboard".into(),
        percent: 78,
        detail: "Reading motherboard...".into(),
    });
    let motherboard = scan_motherboard()?;

    on_progress(ScanProgress {
        phase: "monitors".into(),
        percent: 84,
        detail: "Detecting monitors...".into(),
    });
    let monitors = scan_monitors()?;

    on_progress(ScanProgress {
        phase: "audio".into(),
        percent: 89,
        detail: "Detecting audio devices...".into(),
    });
    let audio = scan_audio()?;

    on_progress(ScanProgress {
        phase: "thermal".into(),
        percent: 88,
        detail: "Reading thermal sensors...".into(),
    });
    let thermal = scan_thermal()?;

    on_progress(ScanProgress {
        phase: "power".into(),
        percent: 90,
        detail: "Reading power configuration...".into(),
    });
    let power = scan_power()?;

    on_progress(ScanProgress {
        phase: "cpu_power_config".into(),
        percent: 92,
        detail: "Reading CPU power settings...".into(),
    });
    let cpu_power_config = scan_cpu_power_config()?;

    on_progress(ScanProgress {
        phase: "scheduler".into(),
        percent: 94,
        detail: "Reading scheduler configuration...".into(),
    });
    let scheduler_config = scan_scheduler_config()?;

    on_progress(ScanProgress {
        phase: "services".into(),
        percent: 95,
        detail: "Checking service states...".into(),
    });
    let service_states = scan_service_states()?;

    on_progress(ScanProgress {
        phase: "filesystem".into(),
        percent: 96,
        detail: "Reading filesystem configuration...".into(),
    });
    let filesystem_config = scan_filesystem_config()?;

    on_progress(ScanProgress {
        phase: "mem_mgmt".into(),
        percent: 97,
        detail: "Reading memory management settings...".into(),
    });
    let mem_mgmt_config = scan_mem_mgmt_config()?;

    on_progress(ScanProgress {
        phase: "complete".into(),
        percent: 100,
        detail: "Scan complete".into(),
    });

    let profile = serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "scannedAt": chrono::Utc::now().to_rfc3339(),
        "deviceClass": detect_device_class(),
        "hostname": hostname(),
        "cpu": cpu,
        "gpus": [gpu],
        "memory": memory,
        "storage": storage,
        "monitors": monitors,
        "motherboard": motherboard,
        "networkAdapters": network,
        "audioDevices": audio,
        "power": power,
        "security": security,
        "mitigations": mitigations,
        "thermal": thermal,
        "windows": windows,
        "cpuPowerConfig": cpu_power_config,
        "schedulerConfig": scheduler_config,
        "serviceStates": service_states,
        "filesystemConfig": filesystem_config,
        "memMgmtConfig": mem_mgmt_config,
    });

    Ok(profile)
}

// ---- Helper: run PS and parse JSON ------------------------------------------

#[cfg(windows)]
fn ps_json(script: &str) -> anyhow::Result<serde_json::Value> {
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!(
            "PowerShell query failed (exit {}): {}",
            result.exit_code,
            result.stderr.trim()
        );
    }
    let stdout = result.stdout.trim();
    if stdout.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    let val: serde_json::Value = serde_json::from_str(stdout).map_err(|e| {
        anyhow::anyhow!(
            "Failed to parse PS JSON output: {} -- raw: {}",
            e,
            &stdout[..stdout.len().min(500)]
        )
    })?;
    Ok(val)
}

/// Normalize a WMI JSON result: if it is an array, return all items;
/// if it is a single object, wrap it in a vec; otherwise return empty.
#[cfg(windows)]
fn normalize_array(val: &serde_json::Value) -> Vec<&serde_json::Value> {
    if val.is_array() {
        val.as_array()
            .map(|a| a.iter().collect())
            .unwrap_or_default()
    } else if val.is_object() {
        vec![val]
    } else {
        vec![]
    }
}

/// Extract the first element from a possibly-array WMI result.
#[cfg(windows)]
fn first_object(val: serde_json::Value) -> serde_json::Value {
    if val.is_array() {
        val.as_array()
            .and_then(|a| a.first())
            .cloned()
            .unwrap_or(serde_json::Value::Null)
    } else {
        val
    }
}

// ---- CPU --------------------------------------------------------------------

#[cfg(windows)]
fn scan_cpu() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning CPU via Win32_Processor");
    let script = concat!(
        "Get-CimInstance Win32_Processor | Select-Object ",
        "Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors,",
        "MaxClockSpeed,L2CacheSize,L3CacheSize ",
        "| ConvertTo-Json -Compress"
    );
    let raw = ps_json(script)?;
    let obj = first_object(raw);

    let name = obj.get("Name").and_then(|v| v.as_str());
    let manufacturer = obj
        .get("Manufacturer")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let vendor = if manufacturer.contains("Intel") {
        "Intel"
    } else if manufacturer.contains("AMD") || manufacturer.contains("Advanced Micro") {
        "AMD"
    } else {
        manufacturer
    };
    let physical_cores = obj
        .get("NumberOfCores")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let logical_cores = obj
        .get("NumberOfLogicalProcessors")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let max_clock = obj
        .get("MaxClockSpeed")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let l2 = obj.get("L2CacheSize").and_then(|v| v.as_u64());
    let l3 = obj.get("L3CacheSize").and_then(|v| v.as_u64());
    let smt = logical_cores > physical_cores;

    Ok(serde_json::json!({
        "vendor": vendor,
        "brand": name,
        "physicalCores": physical_cores,
        "logicalCores": logical_cores,
        "smtEnabled": smt,
        "baseClockMhz": max_clock,
        "maxBoostMhz": null,
        "cacheL1Kb": null,
        "cacheL2Kb": l2,
        "cacheL3Kb": l3,
        "numaNodes": 1,
        "features": []
    }))
}

#[cfg(not(windows))]
fn scan_cpu() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning CPU (dev sample)");
    Ok(serde_json::json!({
        "vendor": "AMD",
        "brand": "AMD Ryzen 7 7800X3D 8-Core Processor",
        "physicalCores": 8,
        "logicalCores": 16,
        "smtEnabled": true,
        "baseClockMhz": 4200,
        "maxBoostMhz": 5000,
        "cacheL1Kb": null,
        "cacheL2Kb": 8192,
        "cacheL3Kb": 102400,
        "numaNodes": 1,
        "features": ["SSE4.2", "AVX2"]
    }))
}

// ---- GPU --------------------------------------------------------------------

#[cfg(windows)]
fn scan_gpu() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning GPU via Win32_VideoController");
    let script = concat!(
        "Get-CimInstance Win32_VideoController | Select-Object ",
        "Name,DriverVersion,DriverDate,AdapterRAM,PNPDeviceID ",
        "| ConvertTo-Json -Compress"
    );
    let raw = ps_json(script)?;

    // Prefer discrete GPU (largest VRAM) when multiple GPUs are present
    let obj = if raw.is_array() {
        raw.as_array()
            .and_then(|arr| {
                arr.iter()
                    .max_by_key(|g| {
                        g.get("AdapterRAM").and_then(|v| v.as_u64()).unwrap_or(0)
                    })
                    .cloned()
            })
            .unwrap_or(serde_json::Value::Null)
    } else {
        raw
    };

    let name = obj.get("Name").and_then(|v| v.as_str());
    let driver_version = obj.get("DriverVersion").and_then(|v| v.as_str());
    let driver_date = obj.get("DriverDate").and_then(|v| v.as_str());
    let adapter_ram = obj.get("AdapterRAM").and_then(|v| v.as_u64()).unwrap_or(0);
    let vram_mb = if adapter_ram > 0 {
        Some(adapter_ram / (1024 * 1024))
    } else {
        None
    };
    let pnp_id = obj
        .get("PNPDeviceID")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let name_str = name.unwrap_or("");

    let vendor = if pnp_id.contains("VEN_10DE") || name_str.contains("NVIDIA") || name_str.contains("GeForce")
    {
        "NVIDIA"
    } else if pnp_id.contains("VEN_1002") || name_str.contains("AMD") || name_str.contains("Radeon") {
        "AMD"
    } else if pnp_id.contains("VEN_8086") || name_str.contains("Intel") {
        "Intel"
    } else {
        "Unknown"
    };

    Ok(serde_json::json!({
        "vendor": vendor,
        "name": name,
        "driverVersion": driver_version,
        "driverDate": driver_date,
        "vramMb": vram_mb,
        "resizableBar": false,
        "currentClockMhz": null,
        "maxClockMhz": null,
        "tdpWatts": null,
        "pcieLanes": null,
        "pcieGeneration": null
    }))
}

#[cfg(not(windows))]
fn scan_gpu() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning GPU (dev sample)");
    Ok(serde_json::json!({
        "vendor": "NVIDIA",
        "name": "NVIDIA GeForce RTX 4070",
        "driverVersion": "551.86",
        "driverDate": "2024-11-20",
        "vramMb": 12288,
        "resizableBar": true,
        "currentClockMhz": null,
        "maxClockMhz": 2475,
        "tdpWatts": 200,
        "pcieLanes": 16,
        "pcieGeneration": 4
    }))
}

// ---- Memory -----------------------------------------------------------------

#[cfg(windows)]
fn scan_memory() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning memory via Win32_PhysicalMemory");
    let dimm_script = concat!(
        "Get-CimInstance Win32_PhysicalMemory | Select-Object ",
        "Capacity,Speed,SMBIOSMemoryType ",
        "| ConvertTo-Json -Compress"
    );
    let slot_script = concat!(
        "Get-CimInstance Win32_PhysicalMemoryArray | Select-Object ",
        "MemoryDevices ",
        "| ConvertTo-Json -Compress"
    );

    let dimm_raw = ps_json(dimm_script)?;
    let slot_raw = ps_json(slot_script)?;

    let dimms = normalize_array(&dimm_raw);

    let dimm_count = dimms.len() as u64;
    let total_bytes: u64 = dimms
        .iter()
        .filter_map(|d| d.get("Capacity").and_then(|v| v.as_u64()))
        .sum();
    let total_mb = if total_bytes > 0 {
        total_bytes / (1024 * 1024)
    } else {
        0
    };
    let speed: Option<u64> = dimms
        .first()
        .and_then(|d| d.get("Speed").and_then(|v| v.as_u64()));

    // Detect DDR type from SMBIOSMemoryType
    // 20 = DDR, 21 = DDR2, 24 = DDR3, 26 = DDR4, 34 = DDR4 (alt), 36 = DDR5
    let smbios_type = dimms
        .first()
        .and_then(|d| d.get("SMBIOSMemoryType").and_then(|v| v.as_u64()))
        .unwrap_or(0);
    let mem_type = match smbios_type {
        20 => "DDR",
        21 => "DDR2",
        24 => "DDR3",
        26 | 34 => "DDR4",
        36 => "DDR5",
        _ => {
            tracing::warn!("Unknown SMBIOSMemoryType: {}", smbios_type);
            "Unknown"
        }
    };

    // Slot count
    let slot_obj = first_object(slot_raw);
    let slot_count = slot_obj
        .get("MemoryDevices")
        .and_then(|v| v.as_u64());

    // Estimate channel count from populated DIMMs
    let channels = if dimm_count >= 4 {
        2
    } else if dimm_count >= 2 {
        2
    } else {
        1
    };

    Ok(serde_json::json!({
        "totalMb": total_mb,
        "speedMhz": speed,
        "channels": channels,
        "dimmSlots": slot_count,
        "dimmPopulated": dimm_count,
        "type": mem_type,
        "xmpExpoEnabled": false,
        "timings": null
    }))
}

#[cfg(not(windows))]
fn scan_memory() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning memory (dev sample)");
    Ok(serde_json::json!({
        "totalMb": 32768,
        "speedMhz": 6000,
        "channels": 2,
        "dimmSlots": 4,
        "dimmPopulated": 2,
        "type": "DDR5",
        "xmpExpoEnabled": true,
        "timings": null
    }))
}

// ---- Storage ----------------------------------------------------------------

#[cfg(windows)]
fn scan_storage() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning storage via Win32_DiskDrive and Win32_LogicalDisk");
    let disk_script = concat!(
        "Get-CimInstance Win32_DiskDrive | Select-Object ",
        "Model,Size,MediaType,InterfaceType ",
        "| ConvertTo-Json -Compress"
    );
    let logical_script = concat!(
        "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object ",
        "DeviceID,Size,FreeSpace ",
        "| ConvertTo-Json -Compress"
    );

    let disk_raw = ps_json(disk_script)?;
    let logical_raw = ps_json(logical_script)?;

    let disks = normalize_array(&disk_raw);
    let logical_disks = normalize_array(&logical_raw);

    let mut results = Vec::new();
    for disk in &disks {
        let model = disk.get("Model").and_then(|v| v.as_str());
        let size_bytes = disk.get("Size").and_then(|v| v.as_u64()).unwrap_or(0);
        let size_gb = if size_bytes > 0 {
            Some(size_bytes / (1024 * 1024 * 1024))
        } else {
            None
        };
        let media_type = disk
            .get("MediaType")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let interface_type = disk
            .get("InterfaceType")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let model_str = model.unwrap_or("");

        let is_ssd = media_type.contains("SSD")
            || media_type.contains("Solid")
            || interface_type.contains("NVMe")
            || model_str.to_lowercase().contains("nvme")
            || model_str.to_lowercase().contains("ssd");

        results.push(serde_json::json!({
            "model": model,
            "sizeGb": size_gb,
            "type": if is_ssd { "SSD" } else { "HDD" },
            "interface": interface_type,
            "isSystemDrive": results.is_empty(),
            "freeSpaceGb": null,
        }));
    }

    // Attach free space from logical disks to first entry for C:
    if let Some(first) = results.first_mut() {
        if let Some(c_drive) = logical_disks.iter().find(|ld| {
            ld.get("DeviceID")
                .and_then(|v| v.as_str())
                .map(|s| s.starts_with('C'))
                .unwrap_or(false)
        }) {
            let free = c_drive
                .get("FreeSpace")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            if free > 0 {
                first["freeSpaceGb"] = serde_json::json!(free / (1024 * 1024 * 1024));
            }
        }
    }

    Ok(results)
}

#[cfg(not(windows))]
fn scan_storage() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning storage (dev sample)");
    Ok(vec![
        serde_json::json!({
            "model": "Samsung 990 PRO 2TB",
            "sizeGb": 1863,
            "type": "SSD",
            "interface": "NVMe",
            "isSystemDrive": true,
            "freeSpaceGb": 824
        }),
        serde_json::json!({
            "model": "WD Black SN850X 1TB",
            "sizeGb": 931,
            "type": "SSD",
            "interface": "NVMe",
            "isSystemDrive": false,
            "freeSpaceGb": 412
        }),
    ])
}

// ---- Network ----------------------------------------------------------------

#[cfg(windows)]
fn scan_network() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning network via Win32_NetworkAdapterConfiguration");
    let script = concat!(
        "Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' ",
        "| Select-Object Description,MACAddress,ServiceName ",
        "| ConvertTo-Json -Compress"
    );
    let raw = ps_json(script)?;
    let adapters = normalize_array(&raw);

    let mut results = Vec::new();
    for adapter in &adapters {
        let desc = adapter.get("Description").and_then(|v| v.as_str());
        let mac = adapter.get("MACAddress").and_then(|v| v.as_str());
        let service = adapter.get("ServiceName").and_then(|v| v.as_str());
        let desc_lower = desc.unwrap_or("").to_lowercase();

        results.push(serde_json::json!({
            "name": desc,
            "macAddress": mac,
            "driver": service,
            "type": if desc_lower.contains("wi-fi") || desc_lower.contains("wireless") {
                "wireless"
            } else {
                "ethernet"
            }
        }));
    }

    Ok(results)
}

#[cfg(not(windows))]
fn scan_network() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning network (dev sample)");
    Ok(vec![serde_json::json!({
        "name": "Intel I225-V 2.5GbE",
        "macAddress": "A8:B1:D4:12:34:56",
        "driver": "e2f",
        "type": "ethernet"
    })])
}

// ---- Windows Info -----------------------------------------------------------

#[cfg(windows)]
fn scan_windows() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning Windows info via registry");
    let script = r#"
        $nt = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' -ErrorAction SilentlyContinue
        @{
            ProductName = $nt.ProductName
            CurrentBuild = $nt.CurrentBuild
            UBR = $nt.UBR
            DisplayVersion = $nt.DisplayVersion
            EditionID = $nt.EditionID
            InstallDate = $nt.InstallDate
        } | ConvertTo-Json -Compress
    "#;

    let raw = ps_json(script)?;

    let product_name = raw.get("ProductName").and_then(|v| v.as_str());
    let build_str = raw
        .get("CurrentBuild")
        .and_then(|v| v.as_str())
        .unwrap_or("0");
    let build: u32 = build_str.parse().unwrap_or(0);
    let ubr = raw.get("UBR").and_then(|v| v.as_u64());
    let display_version = raw.get("DisplayVersion").and_then(|v| v.as_str());
    let edition = raw.get("EditionID").and_then(|v| v.as_str());
    let install_date_raw = raw.get("InstallDate").and_then(|v| v.as_u64());

    let install_date = install_date_raw
        .and_then(|ts| chrono::DateTime::from_timestamp(ts as i64, 0))
        .map(|dt| serde_json::Value::String(dt.to_rfc3339()));

    let is_win11 = build >= 22000;
    let win_version = if is_win11 { "11" } else { "10" };
    let is_server = product_name
        .unwrap_or("")
        .to_lowercase()
        .contains("server");

    Ok(serde_json::json!({
        "version": win_version,
        "build": build,
        "ubr": ubr,
        "edition": edition,
        "displayVersion": display_version,
        "productName": product_name,
        "fullVersion": format!("10.0.{}", build),
        "architecture": "64-bit",
        "installDate": install_date,
        "isServer": is_server,
        "features": {}
    }))
}

#[cfg(not(windows))]
fn scan_windows() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning Windows info (dev sample)");
    Ok(serde_json::json!({
        "version": "11",
        "build": 22631,
        "ubr": 4037,
        "edition": "Professional",
        "displayVersion": "23H2",
        "productName": "Windows 11 Pro",
        "fullVersion": "10.0.22631",
        "architecture": "64-bit",
        "installDate": "2024-01-15T10:30:00Z",
        "isServer": false,
        "features": {}
    }))
}

// ---- Motherboard ------------------------------------------------------------

#[cfg(windows)]
fn scan_motherboard() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning motherboard via Win32_BaseBoard + Win32_BIOS");
    let board_script = concat!(
        "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer,Product ",
        "| ConvertTo-Json -Compress"
    );
    let bios_script = concat!(
        "Get-CimInstance Win32_BIOS | Select-Object SMBIOSBIOSVersion,ReleaseDate ",
        "| ConvertTo-Json -Compress"
    );

    let board_raw = ps_json(board_script)?;
    let bios_raw = ps_json(bios_script)?;

    let board = first_object(board_raw);
    let bios = first_object(bios_raw);

    let manufacturer = board.get("Manufacturer").and_then(|v| v.as_str());
    let product = board.get("Product").and_then(|v| v.as_str());
    let bios_version = bios.get("SMBIOSBIOSVersion").and_then(|v| v.as_str());
    let bios_date = bios.get("ReleaseDate").and_then(|v| v.as_str());

    Ok(serde_json::json!({
        "manufacturer": manufacturer,
        "product": product,
        "biosVersion": bios_version,
        "biosDate": bios_date,
        "chipset": null
    }))
}

#[cfg(not(windows))]
fn scan_motherboard() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning motherboard (dev sample)");
    Ok(serde_json::json!({
        "manufacturer": "ASUS",
        "product": "ROG STRIX B650E-E GAMING WIFI",
        "biosVersion": "1802",
        "biosDate": "2024-08-12",
        "chipset": null
    }))
}

// ---- Security ---------------------------------------------------------------

#[cfg(windows)]
fn scan_security() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning security state");

    // Secure Boot -- Confirm-SecureBootUEFI may fail on non-UEFI or without admin
    let sb_script = r#"
        try {
            $sb = Confirm-SecureBootUEFI
            @{ secureBoot = $sb } | ConvertTo-Json -Compress
        } catch {
            @{ secureBoot = $null } | ConvertTo-Json -Compress
        }
    "#;
    let sb_raw = ps_json(sb_script).unwrap_or(serde_json::Value::Null);
    let secure_boot = sb_raw
        .get("secureBoot")
        .and_then(|v| v.as_bool());

    // TPM
    let tpm_script = r#"
        try {
            $tpm = Get-CimInstance -Namespace 'root\cimv2\Security\MicrosoftTpm' -ClassName Win32_Tpm -ErrorAction Stop
            @{ tpmVersion = $tpm.SpecVersion.Split(',')[0].Trim() } | ConvertTo-Json -Compress
        } catch {
            @{ tpmVersion = $null } | ConvertTo-Json -Compress
        }
    "#;
    let tpm_raw = ps_json(tpm_script).unwrap_or(serde_json::Value::Null);
    let tpm_version = tpm_raw
        .get("tpmVersion")
        .and_then(|v| v.as_str())
        .map(|s| serde_json::Value::String(s.to_string()))
        .unwrap_or(serde_json::Value::Null);

    // VBS / HVCI via registry
    let vbs_script = r#"
        $vbs = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard' -ErrorAction SilentlyContinue
        @{
            vbsEnabled = if ($vbs.EnableVirtualizationBasedSecurity -eq 1) { $true } else { $false }
            hvciEnabled = if ($vbs.HypervisorEnforcedCodeIntegrity -eq 1) { $true } else { $false }
        } | ConvertTo-Json -Compress
    "#;
    let vbs_raw = ps_json(vbs_script).unwrap_or(serde_json::Value::Null);
    let vbs_enabled = vbs_raw
        .get("vbsEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let hvci_enabled = vbs_raw
        .get("hvciEnabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Ok(serde_json::json!({
        "secureBoot": secure_boot,
        "tpmVersion": tpm_version,
        "bitlockerEnabled": null,
        "vbsEnabled": vbs_enabled,
        "hvciEnabled": hvci_enabled,
        "memoryIntegrity": hvci_enabled,
        "virtualizationEnabled": vbs_enabled
    }))
}

#[cfg(not(windows))]
fn scan_security() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning security (dev sample)");
    Ok(serde_json::json!({
        "secureBoot": true,
        "tpmVersion": "2.0",
        "bitlockerEnabled": false,
        "vbsEnabled": false,
        "hvciEnabled": false,
        "memoryIntegrity": false,
        "virtualizationEnabled": true
    }))
}

// ---- Speculative Execution Mitigations --------------------------------------

#[cfg(windows)]
fn scan_mitigations() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning speculative execution mitigations");

    let script = r#"
        $mm = Get-ItemProperty -Path 'Registry::HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -ErrorAction SilentlyContinue
        $result = @{
            featureSettingsOverride = $mm.FeatureSettingsOverride
            featureSettingsOverrideMask = $mm.FeatureSettingsOverrideMask
        }
        # Try to get speculation control settings (module may not be installed)
        try {
            $spec = Get-SpeculationControlSettings 2>$null
            if ($spec) {
                $result.btiHardwarePresent = $spec.BTIHardwarePresent
                $result.btiWindowsSupportPresent = $spec.BTIWindowsSupportPresent
                $result.btiWindowsSupportEnabled = $spec.BTIWindowsSupportEnabled
                $result.kvaEnabled = $spec.KVAShadowWindowsSupportEnabled
                $result.ssbdAvailable = $spec.SSBDWindowsSupportPresent
                $result.ssbdEnabled = $spec.SSBDWindowsSupportEnabled
            }
        } catch {}
        $result | ConvertTo-Json -Compress
    "#;

    let raw = ps_json(script).unwrap_or(serde_json::Value::Null);

    let feature_override = raw.get("featureSettingsOverride").cloned()
        .unwrap_or(serde_json::Value::Null);
    let feature_override_mask = raw.get("featureSettingsOverrideMask").cloned()
        .unwrap_or(serde_json::Value::Null);
    let bti_hw = raw.get("btiHardwarePresent").cloned()
        .unwrap_or(serde_json::Value::Null);
    let bti_enabled = raw.get("btiWindowsSupportEnabled").cloned()
        .unwrap_or(serde_json::Value::Null);
    let kva_enabled = raw.get("kvaEnabled").cloned()
        .unwrap_or(serde_json::Value::Null);
    let ssbd_available = raw.get("ssbdAvailable").cloned()
        .unwrap_or(serde_json::Value::Null);
    let ssbd_enabled = raw.get("ssbdEnabled").cloned()
        .unwrap_or(serde_json::Value::Null);

    // Determine mitigation status based on FeatureSettingsOverride registry value
    let mitigation_status = match feature_override.as_u64() {
        None => "default",          // null / not set => default mitigations active
        Some(0) => "default",
        Some(8) => "partially-reduced",  // SSBD only
        Some(3) => "fully-reduced",      // all software mitigations disabled
        _ => "unknown",
    };

    Ok(serde_json::json!({
        "featureSettingsOverride": feature_override,
        "featureSettingsOverrideMask": feature_override_mask,
        "btiHardwarePresent": bti_hw,
        "btiWindowsSupportEnabled": bti_enabled,
        "kvaEnabled": kva_enabled,
        "ssbdAvailable": ssbd_available,
        "ssbdEnabled": ssbd_enabled,
        "mitigationStatus": mitigation_status
    }))
}

#[cfg(not(windows))]
fn scan_mitigations() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning mitigations (dev sample)");
    Ok(serde_json::json!({
        "featureSettingsOverride": null,
        "featureSettingsOverrideMask": null,
        "btiHardwarePresent": null,
        "btiWindowsSupportEnabled": null,
        "kvaEnabled": null,
        "ssbdAvailable": null,
        "ssbdEnabled": null,
        "mitigationStatus": "default"
    }))
}

// ---- Power ------------------------------------------------------------------

#[cfg(windows)]
fn scan_power() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning power configuration via powercfg");
    let script = r#"
        $raw = powercfg /getactivescheme
        if ($raw -match 'Power Scheme GUID:\s+(\S+)\s+\((.+)\)') {
            @{ guid = $Matches[1]; name = $Matches[2] } | ConvertTo-Json -Compress
        } else {
            @{ guid = $null; name = $null } | ConvertTo-Json -Compress
        }
    "#;
    let raw = ps_json(script)?;

    let guid = raw.get("guid").and_then(|v| v.as_str());
    let name = raw.get("name").and_then(|v| v.as_str());

    // Check battery presence
    let battery_script = r#"
        $batt = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
        if ($batt) {
            @{ hasBattery = $true; percent = $batt.EstimatedChargeRemaining } | ConvertTo-Json -Compress
        } else {
            @{ hasBattery = $false; percent = $null } | ConvertTo-Json -Compress
        }
    "#;
    let batt_raw = ps_json(battery_script).unwrap_or(serde_json::Value::Null);
    let has_battery = batt_raw
        .get("hasBattery")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let battery_pct = batt_raw.get("percent").and_then(|v| v.as_u64());

    Ok(serde_json::json!({
        "source": if has_battery { "battery" } else { "ac" },
        "activePlan": name,
        "activePlanGuid": guid,
        "batteryPercent": battery_pct,
        "batteryHealthPercent": null
    }))
}

#[cfg(not(windows))]
fn scan_power() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning power (dev sample)");
    Ok(serde_json::json!({
        "source": "ac",
        "activePlan": "Balanced",
        "activePlanGuid": "381b4222-f694-41f0-9685-ff5bb260df2e",
        "batteryPercent": null,
        "batteryHealthPercent": null
    }))
}

// ---- Thermal ----------------------------------------------------------------

fn scan_thermal() -> anyhow::Result<serde_json::Value> {
    // Thermal monitoring requires vendor-specific WMI providers (HWiNFO, AIDA64)
    // or undocumented MSAcpi_ThermalZoneTemperature which is unreliable.
    // Return nulls; the UI should advise installing a monitoring companion.
    tracing::info!("Thermal scan: returning nulls (requires HWiNFO integration)");
    Ok(serde_json::json!({
        "cpuTempC": null,
        "gpuTempC": null,
        "cpuThrottling": null,
        "gpuThrottling": null,
        "fanRpm": null
    }))
}

// ---- Monitors ---------------------------------------------------------------

#[cfg(windows)]
fn scan_monitors() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning monitors via Win32_DesktopMonitor");
    let script = concat!(
        "Get-CimInstance Win32_DesktopMonitor | Select-Object ",
        "Name,ScreenWidth,ScreenHeight ",
        "| ConvertTo-Json -Compress"
    );

    let raw = match ps_json(script) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Monitor scan failed: {}", e);
            return Ok(vec![]);
        }
    };

    let monitors = normalize_array(&raw);

    let mut results = Vec::new();
    for m in &monitors {
        let name = m.get("Name").and_then(|v| v.as_str());
        let width = m.get("ScreenWidth").and_then(|v| v.as_u64());
        let height = m.get("ScreenHeight").and_then(|v| v.as_u64());

        results.push(serde_json::json!({
            "name": name,
            "resolutionX": width,
            "resolutionY": height,
            "refreshRateHz": null,
            "hdrCapable": null
        }));
    }

    Ok(results)
}

#[cfg(not(windows))]
fn scan_monitors() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning monitors (dev sample)");
    Ok(vec![serde_json::json!({
        "name": "ASUS ROG Swift PG27AQN",
        "resolutionX": 2560,
        "resolutionY": 1440,
        "refreshRateHz": 360,
        "hdrCapable": true
    })])
}

// ---- Audio ------------------------------------------------------------------

#[cfg(windows)]
fn scan_audio() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning audio via Win32_SoundDevice");
    let script = concat!(
        "Get-CimInstance Win32_SoundDevice | Select-Object ",
        "Name,Manufacturer ",
        "| ConvertTo-Json -Compress"
    );

    let raw = match ps_json(script) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Audio scan failed: {}", e);
            return Ok(vec![]);
        }
    };

    let devices = normalize_array(&raw);

    let mut results = Vec::new();
    for d in &devices {
        let name = d.get("Name").and_then(|v| v.as_str());
        let manufacturer = d.get("Manufacturer").and_then(|v| v.as_str());

        results.push(serde_json::json!({
            "name": name,
            "manufacturer": manufacturer,
            "status": "active"
        }));
    }

    Ok(results)
}

#[cfg(not(windows))]
fn scan_audio() -> anyhow::Result<Vec<serde_json::Value>> {
    tracing::info!("Scanning audio (dev sample)");
    Ok(vec![serde_json::json!({
        "name": "Realtek High Definition Audio",
        "manufacturer": "Realtek",
        "status": "active"
    })])
}

// ---- CPU Power Configuration ------------------------------------------------

#[cfg(windows)]
fn scan_cpu_power_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning CPU power config via powercfg registry");
    let script = r#"
        try {
            $schemeRaw = powercfg /getactivescheme 2>&1
            $activeGuid = if ($schemeRaw -match 'Power Scheme GUID:\s+(\S+)') { $Matches[1] } else { $null }
            if (-not $activeGuid) {
                @{ activeSchemeGuid = $null } | ConvertTo-Json -Compress
                return
            }
            $base = "HKLM:\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes\$activeGuid\54533251-82be-4824-96c1-47b60b740d00"
            function gpwr($g) {
                $k = Get-ItemProperty "$base\$g" -ErrorAction SilentlyContinue
                if ($k) { @{ ac = $k.ACSettingIndex; dc = $k.DCSettingIndex } }
                else { @{ ac = $null; dc = $null } }
            }
            @{
                activeSchemeGuid = $activeGuid
                coreParking  = gpwr '0cc5b647-c1df-4637-891a-dec35c318583'
                boostMode    = gpwr 'be337238-0d82-4146-a960-4f3749d470c7'
                idleDisable  = gpwr '5d76a2ca-e8c0-402f-a133-2158492d58ad'
                procMaxPct   = gpwr 'bc5038f7-23e0-4960-96da-33abaf5935ec'
                procMinPct   = gpwr '893dee8e-2bef-41e0-89c6-b55d0929964c'
            } | ConvertTo-Json -Compress -Depth 5
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    "#;
    let raw = ps_json(script).unwrap_or(serde_json::Value::Null);
    Ok(raw)
}

#[cfg(not(windows))]
fn scan_cpu_power_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning CPU power config (dev sample)");
    Ok(serde_json::json!({
        "activeSchemeGuid": "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
        "coreParking":  { "ac": 0,   "dc": 0   },
        "boostMode":    { "ac": 2,   "dc": 1   },
        "idleDisable":  { "ac": 0,   "dc": 0   },
        "procMaxPct":   { "ac": 100, "dc": 100 },
        "procMinPct":   { "ac": 0,   "dc": 0   }
    }))
}

// ---- Scheduler Configuration ------------------------------------------------

#[cfg(windows)]
fn scan_scheduler_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning scheduler config: Win32PrioritySeparation + ReservedCpuSets");
    let script = r#"
        $pc = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -ErrorAction SilentlyContinue
        $kn = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel' -ErrorAction SilentlyContinue
        $rcs = $null
        if ($kn -and $null -ne $kn.ReservedCpuSets) {
            try { $rcs = [Convert]::ToBase64String([byte[]]$kn.ReservedCpuSets) } catch {}
        }
        @{
            win32PrioritySeparation = if ($pc) { $pc.Win32PrioritySeparation } else { $null }
            reservedCpuSetsB64      = $rcs
            globalTimerResolution   = if ($kn) { $kn.GlobalTimerResolutionRequests } else { $null }
        } | ConvertTo-Json -Compress
    "#;
    let raw = ps_json(script).unwrap_or(serde_json::Value::Null);
    Ok(raw)
}

#[cfg(not(windows))]
fn scan_scheduler_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning scheduler config (dev sample)");
    Ok(serde_json::json!({
        "win32PrioritySeparation": 38,
        "reservedCpuSetsB64": null,
        "globalTimerResolution": null
    }))
}

// ---- Service States ---------------------------------------------------------

#[cfg(windows)]
fn scan_service_states() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning SysMain and WSearch service states");
    let script = r#"
        $sysmain = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\SysMain' -ErrorAction SilentlyContinue).Start
        $wsearch = (Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\WSearch' -ErrorAction SilentlyContinue).Start
        @{
            sysMainStart = $sysmain
            wsearchStart = $wsearch
        } | ConvertTo-Json -Compress
    "#;
    let raw = ps_json(script).unwrap_or(serde_json::Value::Null);

    let sysmain_start = raw.get("sysMainStart").and_then(|v| v.as_u64());
    let wsearch_start = raw.get("wsearchStart").and_then(|v| v.as_u64());

    let start_to_state = |v: Option<u64>| -> &'static str {
        match v {
            Some(2) => "auto",
            Some(3) => "manual",
            Some(4) => "disabled",
            _ => "unknown",
        }
    };

    Ok(serde_json::json!({
        "sysMain": {
            "startValue": sysmain_start,
            "state": start_to_state(sysmain_start)
        },
        "wSearch": {
            "startValue": wsearch_start,
            "state": start_to_state(wsearch_start)
        }
    }))
}

#[cfg(not(windows))]
fn scan_service_states() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning service states (dev sample)");
    Ok(serde_json::json!({
        "sysMain": { "startValue": 2, "state": "auto" },
        "wSearch": { "startValue": 2, "state": "auto" }
    }))
}

// ---- Filesystem Configuration -----------------------------------------------

#[cfg(windows)]
fn scan_filesystem_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning filesystem config: NTFS flags, TRIM, disk media types");
    let script = r#"
        $fs = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -ErrorAction SilentlyContinue
        $lastAccessDisabled = if ($fs -and $null -ne $fs.NtfsDisableLastAccessUpdate) {
            ($fs.NtfsDisableLastAccessUpdate -band 1) -eq 1
        } else { $false }
        $dot3Disabled = if ($fs -and $null -ne $fs.NtfsDisable8dot3NameCreation) {
            $fs.NtfsDisable8dot3NameCreation -eq 1
        } else { $false }

        $trimOut = & fsutil behavior query DisableDeleteNotify 2>&1
        $trimEnabled = ($trimOut -join '') -notmatch 'DisableDeleteNotify\s*=\s*1'

        $disks = Get-PhysicalDisk -ErrorAction SilentlyContinue
        $hasHdd = ($disks | Where-Object { $_.MediaType -eq 'HDD' }).Count -gt 0
        $hasSsd = ($disks | Where-Object { $_.MediaType -eq 'SSD' -or $_.MediaType -eq 'NVMe' }).Count -gt 0
        $mediaTypes = if ($disks) { @($disks | Select-Object -ExpandProperty MediaType -Unique) } else { @() }

        @{
            ntfsLastAccessDisabled = $lastAccessDisabled
            ntfs8dot3Disabled      = $dot3Disabled
            trimEnabled            = [bool]$trimEnabled
            hasHdd                 = $hasHdd
            hasSsd                 = $hasSsd
            diskMediaTypes         = $mediaTypes
        } | ConvertTo-Json -Compress
    "#;
    let raw = ps_json(script).unwrap_or(serde_json::Value::Null);
    Ok(raw)
}

#[cfg(not(windows))]
fn scan_filesystem_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning filesystem config (dev sample)");
    Ok(serde_json::json!({
        "ntfsLastAccessDisabled": false,
        "ntfs8dot3Disabled": false,
        "trimEnabled": true,
        "hasHdd": false,
        "hasSsd": true,
        "diskMediaTypes": ["NVMe", "SSD"]
    }))
}

// ---- Memory Management Configuration ----------------------------------------

#[cfg(windows)]
fn scan_mem_mgmt_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning memory management config: FTH, MMAgent, maintenance, pagefile");
    let script = r#"
        $fthReg = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\FTH' -ErrorAction SilentlyContinue
        $fthEnabled = if ($fthReg -and $null -ne $fthReg.Enabled) { $fthReg.Enabled -eq 1 } else { $true }

        $maintReg = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance' -ErrorAction SilentlyContinue
        $maintenanceDisabled = if ($maintReg -and $null -ne $maintReg.MaintenanceDisabled) { $maintReg.MaintenanceDisabled -eq 1 } else { $false }

        $mm = $null
        try { $mm = Get-MMAgent -ErrorAction Stop } catch {}
        $memCompression    = if ($mm) { $mm.MemoryCompression } else { $null }
        $appLaunchPrefetch = if ($mm) { $mm.ApplicationLaunchPrefetching } else { $null }
        $appPreLaunch      = if ($mm) { $mm.ApplicationPreLaunch } else { $null }
        $pageCombining     = if ($mm) { $mm.PageCombining } else { $null }

        $pfSettings = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue
        $pfPaths = if ($pfSettings) { @($pfSettings | Select-Object -ExpandProperty Name) } else { @() }
        $pfAutoManaged = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).AutomaticManagedPagefile

        @{
            fthEnabled           = $fthEnabled
            maintenanceDisabled  = $maintenanceDisabled
            memoryCompression    = $memCompression
            appLaunchPrefetching = $appLaunchPrefetch
            appPreLaunch         = $appPreLaunch
            pageCombining        = $pageCombining
            pagefilePaths        = $pfPaths
            pagefileAutoManaged  = $pfAutoManaged
        } | ConvertTo-Json -Compress
    "#;
    let raw = ps_json(script).unwrap_or(serde_json::Value::Null);
    Ok(raw)
}

#[cfg(not(windows))]
fn scan_mem_mgmt_config() -> anyhow::Result<serde_json::Value> {
    tracing::info!("Scanning memory management config (dev sample)");
    Ok(serde_json::json!({
        "fthEnabled": true,
        "maintenanceDisabled": false,
        "memoryCompression": true,
        "appLaunchPrefetching": true,
        "appPreLaunch": true,
        "pageCombining": false,
        "pagefilePaths": ["C:\\pagefile.sys"],
        "pagefileAutoManaged": true
    }))
}

// ---- Device Class Detection -------------------------------------------------

#[cfg(windows)]
fn detect_device_class() -> &'static str {
    tracing::info!("Detecting device class via Win32_SystemEnclosure");
    let script = "(Get-CimInstance Win32_SystemEnclosure).ChassisTypes | ConvertTo-Json -Compress";

    let raw = match ps_json(script) {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("Device class detection failed: {}", e);
            return "desktop";
        }
    };

    let chassis_types: Vec<u64> = if raw.is_array() {
        raw.as_array()
            .map(|a| a.iter().filter_map(|v| v.as_u64()).collect())
            .unwrap_or_default()
    } else if let Some(n) = raw.as_u64() {
        vec![n]
    } else {
        vec![]
    };

    // https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-systemenclosure
    for ct in &chassis_types {
        match ct {
            8 | 9 | 10 | 14 | 31 | 32 => return "laptop",
            3 | 4 | 5 | 6 | 7 | 15 | 16 => return "desktop",
            17 | 23 => return "server",
            30 => return "tablet",
            _ => {}
        }
    }

    "desktop"
}

#[cfg(not(windows))]
fn detect_device_class() -> &'static str {
    "desktop"
}

// ---- Hostname ---------------------------------------------------------------

fn hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| gethostname().unwrap_or_else(|| "Unknown".to_string()))
}

fn gethostname() -> Option<String> {
    #[cfg(unix)]
    {
        std::process::Command::new("hostname")
            .output()
            .ok()
            .and_then(|o| {
                if o.status.success() {
                    Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
                } else {
                    None
                }
            })
    }
    #[cfg(not(unix))]
    {
        None
    }
}
