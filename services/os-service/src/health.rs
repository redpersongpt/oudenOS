// ─── Hardware Health Checks (detect & guide) ────────────────────────────────
// Read-only detection of the things that usually matter more for frame rate
// and frame-time consistency than registry tweaks: PCIe link, memory
// profile/channels, VBS, refresh rate, power plan, firmware age, chipset
// drivers, temperatures and SMT. ZERO system changes.
//
// Every probe is isolated (a failing probe yields status "unknown", never an
// assessment failure), locale-independent (numbers / invariant dates / enum
// values, never localized text) and fast (one CIM script, one nvidia-smi call,
// native registry and display APIs).
//
// Result: [{ id, status: "ok" | "attention" | "unknown", title, detail, evidence }]
// The text never promises FPS; it always says to benchmark before/after with
// frame-time capture (PresentMon or CapFrameX — not bundled or downloaded).

use serde_json::{json, Value};

pub const BENCHMARK_NOTE: &str = "Benchmark before and after on your own system (capture frame times with PresentMon or CapFrameX).";

fn check(id: &str, status: &str, title: &str, detail: String, evidence: Value) -> Value {
    json!({ "id": id, "status": status, "title": title, "detail": detail, "evidence": evidence })
}

fn unknown(id: &str, title: &str, detail: &str, evidence: Value) -> Value {
    check(id, "unknown", title, detail.to_string(), evidence)
}

// ─── 1. GPU PCIe link ───────────────────────────────────────────────────────

pub const GPU_PCIE_TITLE: &str = "GPU PCIe link";

/// Parse `nvidia-smi --query-gpu=pcie.link.gen.current,pcie.link.gen.max,
/// pcie.link.width.current,pcie.link.width.max,temperature.gpu,name
/// --format=csv,noheader,nounits` (first GPU line).
pub fn parse_nvidia_smi(line: &str) -> Option<Value> {
    let parts: Vec<&str> = line.lines().next()?.split(',').map(str::trim).collect();
    if parts.len() < 4 {
        return None;
    }
    let num = |s: &str| s.parse::<f64>().ok();
    Some(json!({
        "genCurrent": num(parts[0]),
        "genMax": num(parts[1]),
        "widthCurrent": num(parts[2]),
        "widthMax": num(parts[3]),
        "temperatureC": parts.get(4).and_then(|s| num(s)),
        "name": parts.get(5).map(|s| s.to_string()),
    }))
}

pub fn classify_gpu_pcie(probe: Option<&Value>) -> Value {
    let Some(p) = probe else {
        return unknown(
            "gpu-pcie-link",
            GPU_PCIE_TITLE,
            "No NVIDIA GPU tool (nvidia-smi) found. For other GPUs check the link in GPU-Z (Bus Interface) or the vendor control panel.",
            Value::Null,
        );
    };
    let (gc, gm, wc, wm) = (
        p["genCurrent"].as_f64(),
        p["genMax"].as_f64(),
        p["widthCurrent"].as_f64(),
        p["widthMax"].as_f64(),
    );
    let (Some(gc), Some(gm), Some(wc), Some(wm)) = (gc, gm, wc, wm) else {
        return unknown("gpu-pcie-link", GPU_PCIE_TITLE, "nvidia-smi did not report the PCIe link.", p.clone());
    };
    let link = format!("PCIe Gen {} x{} (maximum Gen {} x{})", gc, wc, gm, wm);
    if wc < 8.0 || gc < gm {
        check(
            "gpu-pcie-link",
            "attention",
            GPU_PCIE_TITLE,
            format!(
                "The GPU link is running at {}. GPUs lower the link generation at idle to save power, so re-check while a game is running; if it stays low, check the slot used and M.2/PCIe lane sharing in the motherboard manual. {}",
                link, BENCHMARK_NOTE
            ),
            p.clone(),
        )
    } else {
        check(
            "gpu-pcie-link",
            "ok",
            GPU_PCIE_TITLE,
            format!(
                "The GPU link is running at {}. A x8 link is normal for many cards that are x8 by design.",
                link
            ),
            p.clone(),
        )
    }
}

// ─── 2. RAM profile / channels ──────────────────────────────────────────────

pub const RAM_TITLE: &str = "Memory speed and channels";

/// `modules`: Win32_PhysicalMemory rows (Capacity, Speed, ConfiguredClockSpeed,
/// BankLabel, DeviceLocator).
pub fn classify_ram(modules: Option<&Value>) -> Value {
    let rows: Vec<&Value> = match modules {
        Some(Value::Array(items)) => items.iter().collect(),
        Some(obj @ Value::Object(o)) if !o.contains_key("error") => vec![obj],
        _ => Vec::new(),
    };
    if rows.is_empty() {
        return unknown("ram-profile", RAM_TITLE, "Memory module information is not available.", modules.cloned().unwrap_or(Value::Null));
    }
    let speed = rows.iter().filter_map(|m| m["Speed"].as_u64()).max();
    let configured = rows.iter().filter_map(|m| m["ConfiguredClockSpeed"].as_u64()).min();
    let total_gb: u64 = rows.iter().filter_map(|m| m["Capacity"].as_u64()).sum::<u64>() / (1024 * 1024 * 1024);
    let channel_of = |m: &Value| -> Option<String> {
        let label = format!("{} {}", m["BankLabel"].as_str().unwrap_or(""), m["DeviceLocator"].as_str().unwrap_or(""));
        let upper = label.to_ascii_uppercase();
        upper.find("CHANNEL").map(|i| upper[i + 7..].trim().chars().next().unwrap_or('?').to_string())
    };
    let channels: std::collections::BTreeSet<String> = rows.iter().filter_map(|m| channel_of(m)).collect();
    let single_channel = rows.len() == 1 || (channels.len() == 1 && rows.iter().all(|m| channel_of(m).is_some()));
    let evidence = json!({
        "modules": rows.len(),
        "totalGb": total_gb,
        "ratedSpeed": speed,
        "configuredSpeed": configured,
        "channels": channels.iter().cloned().collect::<Vec<_>>(),
    });
    let summary = format!(
        "{} module(s), {} GB, configured {} MT/s (module rated {} MT/s).",
        rows.len(),
        total_gb,
        configured.map(|v| v.to_string()).unwrap_or_else(|| "?".into()),
        speed.map(|v| v.to_string()).unwrap_or_else(|| "?".into())
    );
    if single_channel {
        return check(
            "ram-profile",
            "attention",
            RAM_TITLE,
            format!(
                "{} The memory appears to run in single-channel mode; two matched modules in the slots the motherboard manual recommends usually give dual-channel bandwidth. {}",
                summary, BENCHMARK_NOTE
            ),
            evidence,
        );
    }
    if let (Some(s), Some(c)) = (speed, configured) {
        if c < s {
            return check(
                "ram-profile",
                "attention",
                RAM_TITLE,
                format!(
                    "{} The memory runs below the speed the modules report; if the kit is rated for an XMP/EXPO profile, it can be enabled in the BIOS (test stability afterwards). {}",
                    summary, BENCHMARK_NOTE
                ),
                evidence,
            );
        }
    }
    check(
        "ram-profile",
        "ok",
        RAM_TITLE,
        format!("{} Memory runs in multi-channel mode at or above the module-reported speed.", summary),
        evidence,
    )
}

// ─── 3. VBS / hypervisor ────────────────────────────────────────────────────

pub const VBS_TITLE: &str = "Virtualization-based security (VBS)";

pub fn classify_vbs(device_guard: Option<&Value>, hypervisor_present: Option<bool>) -> Value {
    let Some(dg) = device_guard.filter(|d| d.get("error").is_none()) else {
        return unknown("vbs-hypervisor", VBS_TITLE, "VBS status could not be read (Win32_DeviceGuard).", device_guard.cloned().unwrap_or(Value::Null));
    };
    let status = dg["vbsStatus"].as_u64();
    let running: Vec<u64> = dg["servicesRunning"].as_array().map(|a| a.iter().filter_map(Value::as_u64).collect()).unwrap_or_default();
    let names: Vec<&str> = running
        .iter()
        .filter_map(|s| match s {
            1 => Some("Credential Guard"),
            2 => Some("Memory Integrity (HVCI)"),
            3 => Some("System Guard Secure Launch"),
            4 => Some("SMM Firmware Measurement"),
            _ => None,
        })
        .collect();
    let evidence = json!({ "vbsStatus": status, "servicesRunning": running, "hypervisorPresent": hypervisor_present });
    match status {
        Some(2) => check(
            "vbs-hypervisor",
            "attention",
            VBS_TITLE,
            format!(
                "VBS is running{}. It protects against kernel-level attacks and can cost measurable CPU time in CPU-bound games. Some anti-cheat systems (e.g. FACEIT, Riot Vanguard) may require these protections. oudenOS does not change this here; it is a deliberate trade-off. {}",
                if names.is_empty() { String::new() } else { format!(" (kept on by: {})", names.join(", ")) },
                BENCHMARK_NOTE
            ),
            evidence,
        ),
        Some(0) | Some(1) => check(
            "vbs-hypervisor",
            "ok",
            VBS_TITLE,
            "VBS is not running.".to_string(),
            evidence,
        ),
        _ => unknown("vbs-hypervisor", VBS_TITLE, "VBS status is not reported on this system.", evidence),
    }
}

// ─── 4. Refresh rate ────────────────────────────────────────────────────────

pub const REFRESH_TITLE: &str = "Display refresh rate";

pub fn classify_refresh(probe: Option<&Value>) -> Value {
    let Some(p) = probe else {
        return unknown("refresh-rate", REFRESH_TITLE, "The display mode could not be read.", Value::Null);
    };
    let (Some(cur), Some(max)) = (p["currentHz"].as_u64(), p["maxHzAtResolution"].as_u64()) else {
        return unknown("refresh-rate", REFRESH_TITLE, "The display mode could not be read.", p.clone());
    };
    if cur < max {
        check(
            "refresh-rate",
            "attention",
            REFRESH_TITLE,
            format!(
                "The primary display runs at {} Hz but supports {} Hz at the current resolution. Select the higher rate in Settings > System > Display > Advanced display (and check the cable/port supports it).",
                cur, max
            ),
            p.clone(),
        )
    } else {
        check("refresh-rate", "ok", REFRESH_TITLE, format!("The primary display runs at its highest refresh rate ({} Hz) for the current resolution.", cur), p.clone())
    }
}

// ─── 5. Power plan ──────────────────────────────────────────────────────────

pub const POWER_TITLE: &str = "Power plan";

pub fn power_scheme_name(guid: &str) -> &'static str {
    match guid.trim().trim_matches(|c| c == '{' || c == '}').to_ascii_lowercase().as_str() {
        "381b4222-f694-41f0-9685-ff5bb260df2e" => "Balanced",
        "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c" => "High performance",
        "a1841308-3541-4fab-bc81-f71556f20b4a" => "Power saver",
        "e9a42b02-d5df-448d-aa00-03f14749eb61" => "Ultimate Performance",
        _ => "Custom",
    }
}

pub fn classify_power_plan(active_guid: Option<&str>, friendly_name: Option<&str>, cpu_name: Option<&str>) -> Value {
    let Some(guid) = active_guid else {
        return unknown("power-plan", POWER_TITLE, "The active power plan could not be read.", Value::Null);
    };
    let known = power_scheme_name(guid);
    // Custom plans: use the stored friendly name ("@dll,-id,Fallback" or plain).
    let custom = friendly_name
        .map(|n| n.rsplit(',').next().unwrap_or(n).trim().to_string())
        .filter(|n| !n.is_empty());
    let name: String = if known == "Custom" { custom.unwrap_or_else(|| "Custom".into()) } else { known.to_string() };
    let name = name.as_str();
    let cpu = cpu_name.unwrap_or("").trim().to_string();
    let x3d = cpu.to_ascii_uppercase().contains("X3D") && cpu.to_ascii_uppercase().contains("AMD");
    let evidence = json!({ "activeScheme": guid, "name": name, "cpu": cpu });
    if x3d && (name == "High performance" || name == "Ultimate Performance") {
        return check(
            "power-plan",
            "attention",
            POWER_TITLE,
            format!(
                "Active plan: {}. On AMD X3D processors the Balanced plan (with the AMD chipset driver's core-parking logic) is often equal or better for games than High/Ultimate Performance — benchmark both rather than assuming. {}",
                name, BENCHMARK_NOTE
            ),
            evidence,
        );
    }
    let mut detail = format!("Active plan: {}.", name);
    if x3d {
        detail.push_str(" On AMD X3D processors Balanced is often equal or better than High/Ultimate Performance; benchmark before switching.");
    }
    check("power-plan", "ok", POWER_TITLE, detail, evidence)
}

// ─── 6. BIOS age ────────────────────────────────────────────────────────────

pub const BIOS_TITLE: &str = "BIOS / UEFI firmware age";

/// `release_date`: "yyyy-MM-dd"; `today`: same format (injected for tests).
pub fn classify_bios(bios: Option<&Value>, today: chrono::NaiveDate) -> Value {
    let Some(b) = bios.filter(|b| b.get("error").is_none()) else {
        return unknown("bios-age", BIOS_TITLE, "Firmware information is not available.", bios.cloned().unwrap_or(Value::Null));
    };
    let Some(date) = b["releaseDate"].as_str().and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()) else {
        return unknown("bios-age", BIOS_TITLE, "The firmware release date is not reported.", b.clone());
    };
    let age_days = (today - date).num_days();
    let evidence = json!({ "releaseDate": b["releaseDate"], "version": b["version"], "manufacturer": b["manufacturer"], "ageDays": age_days });
    if age_days > 365 {
        check(
            "bios-age",
            "attention",
            BIOS_TITLE,
            format!(
                "The firmware is dated {} (about {} months old). Newer firmware often carries stability and security fixes. Update only to a stable (non-beta) release from the board vendor, and if BitLocker is enabled, back up the BitLocker recovery key first.",
                date,
                age_days / 30
            ),
            evidence,
        )
    } else {
        check("bios-age", "ok", BIOS_TITLE, format!("The firmware is dated {} (less than a year old).", date), evidence)
    }
}

// ─── 7. Chipset driver ──────────────────────────────────────────────────────

pub const CHIPSET_TITLE: &str = "Chipset driver";

pub fn classify_chipset(entries: Option<&Value>, cpu_vendor: Option<&str>) -> Value {
    let rows: Vec<&Value> = match entries {
        Some(Value::Array(items)) => items.iter().collect(),
        Some(obj @ Value::Object(o)) if !o.contains_key("error") => vec![obj],
        _ => Vec::new(),
    };
    let vendor = cpu_vendor.unwrap_or("");
    let wanted = match vendor {
        "amd" => "amd",
        "intel" => "intel",
        _ => "",
    };
    let matching: Vec<&Value> = rows
        .iter()
        .copied()
        .filter(|r| {
            let text = format!("{} {}", r["DisplayName"].as_str().unwrap_or(""), r["Publisher"].as_str().unwrap_or("")).to_ascii_lowercase();
            wanted.is_empty() || text.contains(wanted)
        })
        .collect();
    let evidence = json!({ "cpuVendor": cpu_vendor, "packages": matching });
    if entries.is_none() || entries.is_some_and(|e| e.get("error").is_some()) {
        return unknown("chipset-driver", CHIPSET_TITLE, "Installed driver packages could not be read.", evidence);
    }
    if let Some(first) = matching.first() {
        check(
            "chipset-driver",
            "ok",
            CHIPSET_TITLE,
            format!(
                "Installed: {} {}{}. Vendor chipset packages are updated with platform fixes from time to time; check the vendor site occasionally.",
                first["DisplayName"].as_str().unwrap_or("chipset software"),
                first["DisplayVersion"].as_str().unwrap_or(""),
                first["InstallDate"].as_str().map(|d| format!(" (installed {})", d)).unwrap_or_default()
            ),
            evidence,
        )
    } else {
        unknown(
            "chipset-driver",
            CHIPSET_TITLE,
            "No vendor chipset software package was found (Windows may be using its built-in drivers). For AMD X3D processors the AMD chipset package provides the gaming core-parking driver.",
            evidence,
        )
    }
}

// ─── 8. Thermals ────────────────────────────────────────────────────────────

pub const THERMALS_TITLE: &str = "Temperatures";

pub fn classify_thermals(gpu_probe: Option<&Value>) -> Value {
    let temp = gpu_probe.and_then(|p| p["temperatureC"].as_f64());
    match temp {
        Some(t) if t >= 85.0 => check(
            "thermals",
            "attention",
            THERMALS_TITLE,
            format!(
                "The GPU reports {:.0} °C. Sustained temperatures this high can lower boost clocks; check case airflow, fan curves and dust. CPU temperature needs a monitoring tool (e.g. HWiNFO) — oudenOS does not install drivers to read it.",
                t
            ),
            json!({ "gpuTemperatureC": t }),
        ),
        Some(t) => check(
            "thermals",
            "ok",
            THERMALS_TITLE,
            format!(
                "The GPU currently reports {:.0} °C (a single reading; check under load). CPU temperature needs a monitoring tool (e.g. HWiNFO) — oudenOS does not install drivers to read it.",
                t
            ),
            json!({ "gpuTemperatureC": t }),
        ),
        None => unknown(
            "thermals",
            THERMALS_TITLE,
            "No reliable temperature source is available without third-party drivers. Use a monitoring tool (e.g. HWiNFO) while gaming to check for throttling.",
            Value::Null,
        ),
    }
}

// ─── 9. SMT state ───────────────────────────────────────────────────────────

pub const SMT_TITLE: &str = "SMT / Hyper-Threading";

pub fn classify_smt(cores: Option<u64>, logical: Option<u64>) -> Value {
    let (Some(c), Some(l)) = (cores, logical) else {
        return unknown("smt-state", SMT_TITLE, "Core counts are not available.", Value::Null);
    };
    let enabled = l > c;
    check(
        "smt-state",
        "ok",
        SMT_TITLE,
        if enabled {
            format!("SMT is on ({} cores / {} threads). Keep it on for workstation and multitasking use; on some X3D systems turning it off can improve frame-time consistency in specific games — {}", c, l, BENCHMARK_NOTE.to_lowercase())
        } else {
            format!("SMT is off ({} cores / {} threads). This can help frame-time consistency in some games on X3D systems; turn it back on in the BIOS for workstation or heavily multithreaded work.", c, l)
        },
        json!({ "cores": c, "logicalProcessors": l, "smtEnabled": enabled }),
    )
}

// ─── Probing (Windows) ──────────────────────────────────────────────────────

#[cfg(windows)]
const CIM_PROBE: &str = "\
$out = @{}; \
try { $out.memory = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction Stop | Select-Object @{n='Capacity';e={[uint64]$_.Capacity}}, @{n='Speed';e={[int]$_.Speed}}, @{n='ConfiguredClockSpeed';e={[int]$_.ConfiguredClockSpeed}}, @{n='BankLabel';e={[string]$_.BankLabel}}, @{n='DeviceLocator';e={[string]$_.DeviceLocator}}) } catch { $out.memory = @{ error = $_.Exception.Message } }; \
try { $dg = Get-CimInstance -Namespace 'root\\Microsoft\\Windows\\DeviceGuard' -ClassName Win32_DeviceGuard -ErrorAction Stop; $out.deviceGuard = @{ vbsStatus = [int]$dg.VirtualizationBasedSecurityStatus; servicesRunning = @($dg.SecurityServicesRunning | ForEach-Object { [int]$_ }); servicesConfigured = @($dg.SecurityServicesConfigured | ForEach-Object { [int]$_ }) } } catch { $out.deviceGuard = @{ error = $_.Exception.Message } }; \
try { $out.hypervisorPresent = [bool](Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).HypervisorPresent } catch { }; \
try { $b = Get-CimInstance Win32_BIOS -ErrorAction Stop; $out.bios = @{ releaseDate = $b.ReleaseDate.ToString('yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture); version = [string]$b.SMBIOSBIOSVersion; manufacturer = [string]$b.Manufacturer } } catch { $out.bios = @{ error = $_.Exception.Message } }; \
try { $keys = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'; \
      $out.chipset = @(Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { [regex]::IsMatch([string]$_.DisplayName, 'chipset', [Text.RegularExpressions.RegexOptions]'IgnoreCase, CultureInvariant') } | Select-Object @{n='DisplayName';e={[string]$_.DisplayName}}, @{n='DisplayVersion';e={[string]$_.DisplayVersion}}, @{n='InstallDate';e={[string]$_.InstallDate}}, @{n='Publisher';e={[string]$_.Publisher}}) } catch { $out.chipset = @{ error = $_.Exception.Message } }; \
$out | ConvertTo-Json -Depth 5 -Compress";

#[cfg(windows)]
fn probe_cim() -> Value {
    match crate::powershell::execute_with_timeout(CIM_PROBE, std::time::Duration::from_secs(20)) {
        Ok(r) if r.success => serde_json::from_str(r.stdout.trim()).unwrap_or(Value::Null),
        _ => Value::Null,
    }
}

#[cfg(windows)]
fn probe_nvidia_smi() -> Option<Value> {
    let root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
    let exe = std::path::Path::new(&root).join("System32").join("nvidia-smi.exe");
    if !exe.exists() {
        return None;
    }
    let args = vec![
        "--query-gpu=pcie.link.gen.current,pcie.link.gen.max,pcie.link.width.current,pcie.link.width.max,temperature.gpu,name".to_string(),
        "--format=csv,noheader,nounits".to_string(),
    ];
    let mut cmd = std::process::Command::new(exe);
    cmd.args(&args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    let result = crate::powershell::run_with_timeout(cmd, std::time::Duration::from_secs(10), "nvidia-smi").ok()?;
    if !result.success {
        return None;
    }
    parse_nvidia_smi(result.stdout.trim())
}

#[cfg(windows)]
fn probe_refresh() -> Option<Value> {
    use windows::core::PCWSTR;
    use windows::Win32::Graphics::Gdi::{EnumDisplaySettingsW, DEVMODEW, ENUM_CURRENT_SETTINGS, ENUM_DISPLAY_SETTINGS_MODE};
    unsafe {
        let mut current = DEVMODEW {
            dmSize: std::mem::size_of::<DEVMODEW>() as u16,
            ..Default::default()
        };
        if !EnumDisplaySettingsW(PCWSTR::null(), ENUM_CURRENT_SETTINGS, &mut current).as_bool() {
            return None;
        }
        let (w, h) = (current.dmPelsWidth, current.dmPelsHeight);
        let mut max_hz = current.dmDisplayFrequency;
        let mut index = 0u32;
        loop {
            let mut mode = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..Default::default()
            };
            if !EnumDisplaySettingsW(PCWSTR::null(), ENUM_DISPLAY_SETTINGS_MODE(index), &mut mode).as_bool() {
                break;
            }
            if mode.dmPelsWidth == w && mode.dmPelsHeight == h && mode.dmDisplayFrequency > max_hz {
                max_hz = mode.dmDisplayFrequency;
            }
            index += 1;
            if index > 4096 {
                break;
            }
        }
        Some(json!({ "width": w, "height": h, "currentHz": current.dmDisplayFrequency, "maxHzAtResolution": max_hz }))
    }
}

#[cfg(windows)]
fn probe_active_scheme() -> Option<(String, Option<String>)> {
    let root = "SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes";
    let guid = crate::registry::read_value(crate::registry::Hive::Hklm, root, "ActivePowerScheme")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(str::to_string))?;
    let friendly = crate::registry::read_value(crate::registry::Hive::Hklm, &format!("{}\\{}", root, guid), "FriendlyName")
        .ok()
        .flatten()
        .and_then(|v| v.as_str().map(str::to_string));
    Some((guid, friendly))
}

/// Run all checks. `assessment` supplies CPU name/cores already collected.
pub fn run_health_checks(assessment: &Value) -> Value {
    let cpu = assessment.get("hardware").and_then(|h| h.get("cpu")).cloned().unwrap_or(Value::Null);
    let cpu = if let Value::Array(items) = &cpu { items.first().cloned().unwrap_or(Value::Null) } else { cpu };
    let cpu_name = cpu.get("Name").and_then(Value::as_str).map(str::to_string);
    let cpu_vendor = cpu_name.as_deref().and_then(crate::facts::cpu_vendor_from_text);
    let cores = cpu.get("NumberOfCores").and_then(Value::as_u64);
    let logical = cpu.get("NumberOfLogicalProcessors").and_then(Value::as_u64);

    #[cfg(windows)]
    {
        let cim = probe_cim();
        let gpu = probe_nvidia_smi();
        let refresh = probe_refresh();
        let scheme = probe_active_scheme();
        let today = chrono::Local::now().date_naive();
        Value::Array(vec![
            classify_gpu_pcie(gpu.as_ref()),
            classify_ram(cim.get("memory")),
            classify_vbs(cim.get("deviceGuard"), cim.get("hypervisorPresent").and_then(Value::as_bool)),
            classify_refresh(refresh.as_ref()),
            classify_power_plan(scheme.as_ref().map(|s| s.0.as_str()), scheme.as_ref().and_then(|s| s.1.as_deref()), cpu_name.as_deref()),
            classify_bios(cim.get("bios"), today),
            classify_chipset(cim.get("chipset"), cpu_vendor),
            classify_thermals(gpu.as_ref()),
            classify_smt(cores, logical),
        ])
    }
    #[cfg(not(windows))]
    {
        let _ = cpu_vendor;
        Value::Array(vec![
            classify_gpu_pcie(None),
            classify_ram(None),
            classify_vbs(None, None),
            classify_refresh(None),
            classify_power_plan(None, None, cpu_name.as_deref()),
            classify_bios(None, chrono::Local::now().date_naive()),
            classify_chipset(None, None),
            classify_thermals(None),
            classify_smt(cores, logical),
        ])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn this_machine_gpu_link_x8_is_ok() {
        let p = parse_nvidia_smi("4, 4, 8, 16, 48.27, NVIDIA GeForce RTX 5060 Ti").unwrap();
        let r = classify_gpu_pcie(Some(&p));
        assert_eq!(r["status"], "ok", "{r}");
        assert_eq!(classify_thermals(Some(&p))["status"], "ok");
    }

    #[test]
    fn narrow_or_downgraded_link_needs_attention() {
        let x4 = parse_nvidia_smi("4, 4, 4, 16, 50, GPU").unwrap();
        assert_eq!(classify_gpu_pcie(Some(&x4))["status"], "attention");
        let gen3 = parse_nvidia_smi("3, 4, 16, 16, 50, GPU").unwrap();
        let r = classify_gpu_pcie(Some(&gen3));
        assert_eq!(r["status"], "attention");
        assert!(r["detail"].as_str().unwrap().contains("motherboard manual"));
        assert_eq!(classify_gpu_pcie(None)["status"], "unknown");
        assert_eq!(classify_thermals(None)["status"], "unknown");
    }

    #[test]
    fn this_machine_dual_channel_6000_is_ok() {
        let mem = json!([
            { "Capacity": 17179869184u64, "Speed": 5600, "ConfiguredClockSpeed": 6000, "BankLabel": "P0 CHANNEL A", "DeviceLocator": "DIMM 1" },
            { "Capacity": 17179869184u64, "Speed": 5600, "ConfiguredClockSpeed": 6000, "BankLabel": "P0 CHANNEL B", "DeviceLocator": "DIMM 1" }
        ]);
        let r = classify_ram(Some(&mem));
        assert_eq!(r["status"], "ok", "{r}");
        assert_eq!(r["evidence"]["totalGb"], 32);
    }

    #[test]
    fn single_channel_or_underclocked_ram_needs_attention() {
        let single = json!([{ "Capacity": 17179869184u64, "Speed": 5600, "ConfiguredClockSpeed": 5600, "BankLabel": "P0 CHANNEL A", "DeviceLocator": "DIMM 1" }]);
        assert_eq!(classify_ram(Some(&single))["status"], "attention");
        let slow = json!([
            { "Capacity": 8589934592u64, "Speed": 3600, "ConfiguredClockSpeed": 2133, "BankLabel": "BANK 0", "DeviceLocator": "ChannelA-DIMM0" },
            { "Capacity": 8589934592u64, "Speed": 3600, "ConfiguredClockSpeed": 2133, "BankLabel": "BANK 2", "DeviceLocator": "ChannelB-DIMM0" }
        ]);
        assert_eq!(classify_ram(Some(&slow))["status"], "attention");
        assert_eq!(classify_ram(Some(&json!({ "error": "x" })))["status"], "unknown");
    }

    #[test]
    fn vbs_running_names_the_service_and_never_fixes() {
        let r = classify_vbs(Some(&json!({ "vbsStatus": 2, "servicesRunning": [2] })), Some(true));
        assert_eq!(r["status"], "attention");
        let d = r["detail"].as_str().unwrap();
        assert!(d.contains("HVCI") && d.contains("anti-cheat"));
        assert_eq!(classify_vbs(Some(&json!({ "vbsStatus": 0, "servicesRunning": [] })), Some(false))["status"], "ok");
        assert_eq!(classify_vbs(None, None)["status"], "unknown");
    }

    #[test]
    fn refresh_below_max_needs_attention() {
        assert_eq!(classify_refresh(Some(&json!({ "currentHz": 60, "maxHzAtResolution": 165 })))["status"], "attention");
        assert_eq!(classify_refresh(Some(&json!({ "currentHz": 165, "maxHzAtResolution": 165 })))["status"], "ok");
        assert_eq!(classify_refresh(None)["status"], "unknown");
    }

    #[test]
    fn x3d_on_high_performance_suggests_benchmarking_balanced() {
        let cpu = "AMD Ryzen 7 9800X3D 8-Core Processor";
        let r = classify_power_plan(Some("8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"), None, Some(cpu));
        assert_eq!(r["status"], "attention");
        assert!(r["detail"].as_str().unwrap().contains("benchmark"));
        assert_eq!(classify_power_plan(Some("381b4222-f694-41f0-9685-ff5bb260df2e"), None, Some(cpu))["status"], "ok");
        assert_eq!(classify_power_plan(None, None, Some(cpu))["status"], "unknown");
    }

    #[test]
    fn old_bios_needs_attention() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 11, 21).unwrap();
        let old = json!({ "releaseDate": "2024-05-10", "version": "1.0" });
        let r = classify_bios(Some(&old), today);
        assert_eq!(r["status"], "attention");
        assert!(r["detail"].as_str().unwrap().contains("BitLocker"));
        assert_eq!(classify_bios(Some(&json!({ "releaseDate": "2026-06-01" })), today)["status"], "ok");
        assert_eq!(classify_bios(Some(&json!({ "error": "x" })), today)["status"], "unknown");
    }

    #[test]
    fn chipset_presence_is_informational() {
        let pkgs = json!([{ "DisplayName": "AMD Chipset Software", "DisplayVersion": "7.06.02.123", "InstallDate": "20260601", "Publisher": "Advanced Micro Devices, Inc." }]);
        assert_eq!(classify_chipset(Some(&pkgs), Some("amd"))["status"], "ok");
        assert_eq!(classify_chipset(Some(&json!([])), Some("amd"))["status"], "unknown");
        assert_eq!(classify_chipset(None, Some("amd"))["status"], "unknown");
    }

    #[test]
    fn this_machine_smt_off_is_informational() {
        let r = classify_smt(Some(8), Some(8));
        assert_eq!(r["status"], "ok");
        assert_eq!(r["evidence"]["smtEnabled"], false);
        assert_eq!(classify_smt(Some(8), Some(16))["evidence"]["smtEnabled"], true);
    }

    #[test]
    fn health_checks_never_fail_the_assessment() {
        let started = std::time::Instant::now();
        let checks = run_health_checks(&json!({}));
        println!("health checks ({} ms): {}", started.elapsed().as_millis(), serde_json::to_string_pretty(&checks).unwrap());
        let arr = checks.as_array().unwrap();
        assert_eq!(arr.len(), 9);
        for c in arr {
            assert!(matches!(c["status"].as_str(), Some("ok" | "attention" | "unknown")), "{c}");
        }
    }
}
