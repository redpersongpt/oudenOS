// ─── Machine Facts ──────────────────────────────────────────────────────────
// Windows build detection and hardware facts used for build/hardware gating.
// The service never trusts a client-supplied build: it reads
// CurrentBuildNumber + UBR from the registry itself.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Mutex, OnceLock};

// ─── Windows build ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WindowsBuild {
    pub build: u32,
    pub ubr: u32,
    pub display_version: Option<String>,
    pub edition_id: Option<String>,
    pub product_name: Option<String>,
}

/// Detect the running Windows build (cached). `None` on non-Windows hosts or
/// if the registry cannot be read.
pub fn detect_windows_build() -> Option<WindowsBuild> {
    static BUILD: OnceLock<Option<WindowsBuild>> = OnceLock::new();
    BUILD.get_or_init(detect_windows_build_uncached).clone()
}

#[cfg(windows)]
fn detect_windows_build_uncached() -> Option<WindowsBuild> {
    use crate::registry::{read_value, Hive};
    let path = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
    let read_str = |name: &str| -> Option<String> {
        read_value(Hive::Hklm, path, name)
            .ok()
            .flatten()
            .and_then(|v| v.as_str().map(str::to_string))
    };
    let build = read_str("CurrentBuildNumber")?.trim().parse::<u32>().ok()?;
    let ubr = read_value(Hive::Hklm, path, "UBR")
        .ok()
        .flatten()
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    Some(WindowsBuild {
        build,
        ubr,
        display_version: read_str("DisplayVersion"),
        edition_id: read_str("EditionID"),
        product_name: read_str("ProductName"),
    })
}

#[cfg(not(windows))]
fn detect_windows_build_uncached() -> Option<WindowsBuild> {
    None
}

/// Build used for all gating decisions. On Windows the detected build always
/// wins over whatever the client sent; if detection fails we fall back to the
/// client value, then to the lowest supported build (19041) so that
/// build-gated actions stay excluded rather than guessed in.
pub fn effective_windows_build(client_value: Option<u32>) -> u32 {
    if let Some(detected) = detect_windows_build() {
        if let Some(client) = client_value {
            if client != detected.build {
                tracing::warn!(
                    client = client,
                    detected = detected.build,
                    "Client-supplied Windows build differs from detected build — using detected"
                );
            }
        }
        return detected.build;
    }
    if cfg!(windows) {
        client_value.unwrap_or(19041)
    } else {
        // Simulated (non-Windows) demo builds: honour the client value.
        client_value.unwrap_or(22631)
    }
}

// ─── Action extras (optional playbook fields) ───────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActionRequires {
    #[serde(default)]
    pub gpu_vendor: Option<String>,
    #[serde(default)]
    pub cpu_vendor: Option<String>,
    #[serde(default)]
    pub chassis: Option<String>,
    #[serde(default)]
    pub no_hdd: Option<bool>,
}

/// Optional per-action fields that live beside the core `PlaybookAction`
/// schema (parsed by the loader from the raw YAML).
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActionExtras {
    #[serde(default)]
    pub max_windows_build: Option<u32>,
    #[serde(default)]
    pub requires: Option<ActionRequires>,
}

impl ActionExtras {
    pub fn is_empty(&self) -> bool {
        self.max_windows_build.is_none() && self.requires.is_none()
    }
}

// ─── Hardware facts ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HardwareFacts {
    /// Lower-case vendors of the display adapters ("nvidia" | "amd" | "intel").
    pub gpu_vendors: Option<Vec<String>>,
    /// "amd" | "intel"
    pub cpu_vendor: Option<String>,
    /// "desktop" | "laptop"
    pub chassis: Option<String>,
    /// Whether any rotational disk is present.
    pub has_hdd: Option<bool>,
    pub source: String,
}

fn facts_cell() -> &'static Mutex<Option<HardwareFacts>> {
    static FACTS: OnceLock<Mutex<Option<HardwareFacts>>> = OnceLock::new();
    FACTS.get_or_init(|| Mutex::new(None))
}

/// Current facts: the last assessment's facts if available, otherwise a cheap
/// native probe (cached).
pub fn current_facts() -> HardwareFacts {
    let mut guard = facts_cell().lock().unwrap_or_else(|e| e.into_inner());
    if let Some(facts) = guard.as_ref() {
        return facts.clone();
    }
    let probed = probe_native();
    *guard = Some(probed.clone());
    probed
}

/// Replace the cached facts (called after `assess.full`).
pub fn set_facts(facts: HardwareFacts) {
    let mut guard = facts_cell().lock().unwrap_or_else(|e| e.into_inner());
    *guard = Some(facts);
}

pub fn vendor_from_text(text: &str) -> Option<&'static str> {
    let lower = text.to_ascii_lowercase();
    if lower.contains("ven_10de") || lower.contains("nvidia") {
        Some("nvidia")
    } else if lower.contains("ven_1002")
        || lower.contains("ven_1022")
        || lower.contains("amd")
        || lower.contains("radeon")
        || lower.contains("advanced micro devices")
    {
        Some("amd")
    } else if lower.contains("ven_8086") || lower.contains("intel") {
        Some("intel")
    } else {
        None
    }
}

pub fn cpu_vendor_from_text(text: &str) -> Option<&'static str> {
    let lower = text.to_ascii_lowercase();
    if lower.contains("authenticamd") || lower.contains("amd") {
        Some("amd")
    } else if lower.contains("genuineintel") || lower.contains("intel") {
        Some("intel")
    } else {
        None
    }
}

/// Derive facts from an `assess.full` result.
pub fn facts_from_assessment(assessment: &Value) -> HardwareFacts {
    let mut facts = probe_native();
    let hw = assessment.get("hardware").cloned().unwrap_or(Value::Null);
    let gpu_names: Vec<String> = match hw.get("gpu") {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(|g| g.get("Name").and_then(Value::as_str).map(str::to_string))
            .collect(),
        Some(obj @ Value::Object(_)) => obj
            .get("Name")
            .and_then(Value::as_str)
            .map(|s| vec![s.to_string()])
            .unwrap_or_default(),
        _ => Vec::new(),
    };
    let mut vendors: Vec<String> = gpu_names
        .iter()
        .filter_map(|n| vendor_from_text(n).map(str::to_string))
        .collect();
    vendors.sort();
    vendors.dedup();
    if !vendors.is_empty() {
        facts.gpu_vendors = Some(vendors);
    }
    let cpu_name = match hw.get("cpu") {
        Some(Value::Array(items)) => items
            .first()
            .and_then(|c| c.get("Name"))
            .and_then(Value::as_str)
            .map(str::to_string),
        Some(cpu) => cpu.get("Name").and_then(Value::as_str).map(str::to_string),
        None => None,
    };
    if let Some(vendor) = cpu_name.as_deref().and_then(cpu_vendor_from_text) {
        facts.cpu_vendor = Some(vendor.to_string());
    }
    if let Some(chassis) = assessment
        .get("formFactor")
        .and_then(|f| f.get("chassis"))
        .and_then(Value::as_str)
    {
        if chassis == "desktop" || chassis == "laptop" {
            facts.chassis = Some(chassis.to_string());
        }
    }
    if let Some(has_hdd) = assessment
        .get("storage")
        .and_then(|s| s.get("hasHdd"))
        .and_then(Value::as_bool)
    {
        facts.has_hdd = Some(has_hdd);
    }
    facts.source = "assessment".to_string();
    facts
}

#[cfg(windows)]
fn probe_native() -> HardwareFacts {
    use crate::registry::{read_value, Hive};
    let cpu_vendor = read_value(
        Hive::Hklm,
        "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
        "VendorIdentifier",
    )
    .ok()
    .flatten()
    .and_then(|v| v.as_str().and_then(cpu_vendor_from_text).map(str::to_string));

    let mut vendors = Vec::new();
    let class = "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}";
    for index in 0..16 {
        let key = format!("{}\\{:04}", class, index);
        for name in ["MatchingDeviceId", "ProviderName", "DriverDesc"] {
            if let Some(vendor) = read_value(Hive::Hklm, &key, name)
                .ok()
                .flatten()
                .and_then(|v| v.as_str().and_then(vendor_from_text))
            {
                vendors.push(vendor.to_string());
                break;
            }
        }
    }
    vendors.sort();
    vendors.dedup();

    let chassis = unsafe {
        use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
        let mut status = SYSTEM_POWER_STATUS::default();
        if GetSystemPowerStatus(&mut status).is_ok() {
            match status.BatteryFlag {
                128 => Some("desktop".to_string()),
                255 => None,
                _ => Some("laptop".to_string()),
            }
        } else {
            None
        }
    };

    HardwareFacts {
        gpu_vendors: if vendors.is_empty() { None } else { Some(vendors) },
        cpu_vendor,
        chassis,
        has_hdd: None,
        source: "native-probe".to_string(),
    }
}

#[cfg(not(windows))]
fn probe_native() -> HardwareFacts {
    HardwareFacts {
        source: "unknown".to_string(),
        ..HardwareFacts::default()
    }
}

/// Check an action's hardware requirements. `Err(reason)` when unmet; unknown
/// facts are treated as unmet (safe) and the reason says so.
pub fn check_requires(requires: &ActionRequires, facts: &HardwareFacts) -> Result<(), String> {
    if let Some(wanted) = requires.gpu_vendor.as_deref().map(str::to_ascii_lowercase) {
        match &facts.gpu_vendors {
            Some(vendors) if vendors.iter().any(|v| *v == wanted) => {}
            Some(vendors) => {
                return Err(format!(
                    "hardware not applicable: requires a {} GPU (detected: {})",
                    wanted,
                    vendors.join(", ")
                ))
            }
            None => {
                return Err(format!(
                    "hardware not applicable: requires a {} GPU (GPU vendor unknown)",
                    wanted
                ))
            }
        }
    }
    if let Some(wanted) = requires.cpu_vendor.as_deref().map(str::to_ascii_lowercase) {
        match facts.cpu_vendor.as_deref() {
            Some(v) if v == wanted => {}
            Some(v) => {
                return Err(format!(
                    "hardware not applicable: requires an {} CPU (detected: {})",
                    wanted, v
                ))
            }
            None => {
                return Err(format!(
                    "hardware not applicable: requires an {} CPU (CPU vendor unknown)",
                    wanted
                ))
            }
        }
    }
    if let Some(wanted) = requires.chassis.as_deref().map(str::to_ascii_lowercase) {
        match facts.chassis.as_deref() {
            Some(v) if v == wanted => {}
            Some(v) => {
                return Err(format!(
                    "hardware not applicable: requires a {} (detected: {})",
                    wanted, v
                ))
            }
            None => {
                return Err(format!(
                    "hardware not applicable: requires a {} (form factor unknown)",
                    wanted
                ))
            }
        }
    }
    if requires.no_hdd == Some(true) {
        match facts.has_hdd {
            Some(false) => {}
            Some(true) => {
                return Err("hardware not applicable: a rotational hard disk is present".to_string())
            }
            None => {
                return Err(
                    "hardware not applicable: requires no HDD (disk media type unknown)".to_string(),
                )
            }
        }
    }
    Ok(())
}

/// Apply-time gate for an execution JSON definition (playbook, guide or
/// embedded catalog): build window + hardware requirements.
pub fn gate_execution_json(action: &Value, build: u32, facts: &HardwareFacts) -> Result<(), String> {
    if let Some(min) = action.get("minWindowsBuild").and_then(Value::as_u64) {
        if (build as u64) < min {
            return Err(format!("Requires Windows build {} or later", min));
        }
    }
    if let Some(max) = action.get("maxWindowsBuild").and_then(Value::as_u64) {
        if (build as u64) > max {
            return Err(format!("Not applicable after Windows build {}", max));
        }
    }
    if let Some(requires) = action.get("requires").filter(|v| !v.is_null()) {
        let parsed: ActionRequires = serde_json::from_value(requires.clone())
            .map_err(|e| format!("Invalid hardware requirements: {}", e))?;
        check_requires(&parsed, facts)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn facts(gpu: Option<&[&str]>, cpu: Option<&str>, chassis: Option<&str>, hdd: Option<bool>) -> HardwareFacts {
        HardwareFacts {
            gpu_vendors: gpu.map(|v| v.iter().map(|s| s.to_string()).collect()),
            cpu_vendor: cpu.map(str::to_string),
            chassis: chassis.map(str::to_string),
            has_hdd: hdd,
            source: "test".into(),
        }
    }

    #[test]
    fn requirements_match_synthetic_facts() {
        let this_pc = facts(Some(&["nvidia"]), Some("amd"), Some("desktop"), Some(false));
        let nvidia = ActionRequires {
            gpu_vendor: Some("nvidia".into()),
            ..Default::default()
        };
        assert!(check_requires(&nvidia, &this_pc).is_ok());
        let amd_gpu = ActionRequires {
            gpu_vendor: Some("amd".into()),
            ..Default::default()
        };
        assert!(check_requires(&amd_gpu, &this_pc).unwrap_err().contains("hardware not applicable"));
        let intel_cpu = ActionRequires {
            cpu_vendor: Some("intel".into()),
            ..Default::default()
        };
        assert!(check_requires(&intel_cpu, &this_pc).is_err());
        let laptop = ActionRequires {
            chassis: Some("laptop".into()),
            ..Default::default()
        };
        assert!(check_requires(&laptop, &this_pc).is_err());
        let no_hdd = ActionRequires {
            no_hdd: Some(true),
            ..Default::default()
        };
        assert!(check_requires(&no_hdd, &this_pc).is_ok());
    }

    #[test]
    fn unknown_facts_are_unmet_and_say_so() {
        let unknown = facts(None, None, None, None);
        let req = ActionRequires {
            gpu_vendor: Some("nvidia".into()),
            ..Default::default()
        };
        assert!(check_requires(&req, &unknown).unwrap_err().contains("unknown"));
        let hdd = ActionRequires {
            no_hdd: Some(true),
            ..Default::default()
        };
        assert!(check_requires(&hdd, &unknown).unwrap_err().contains("unknown"));
    }

    #[test]
    fn execution_gate_honours_build_window() {
        let f = facts(None, None, None, None);
        let action = serde_json::json!({ "minWindowsBuild": 22000, "maxWindowsBuild": 22631 });
        assert!(gate_execution_json(&action, 19045, &f).is_err());
        assert!(gate_execution_json(&action, 22631, &f).is_ok());
        assert!(gate_execution_json(&action, 26100, &f).is_err());
    }

    #[test]
    fn facts_from_this_machines_assessment_shape() {
        let assessment = serde_json::json!({
            "hardware": {
                "cpu": { "Name": "AMD Ryzen 7 9800X3D 8-Core Processor           " },
                "gpu": { "Name": "NVIDIA GeForce RTX 5060 Ti", "AdapterRAM": 4293918720u64 }
            },
            "formFactor": { "chassis": "desktop" },
            "storage": { "hasHdd": false }
        });
        let f = facts_from_assessment(&assessment);
        assert_eq!(f.gpu_vendors, Some(vec!["nvidia".to_string()]));
        assert_eq!(f.cpu_vendor.as_deref(), Some("amd"));
        assert_eq!(f.chassis.as_deref(), Some("desktop"));
        assert_eq!(f.has_hdd, Some(false));
    }
}
