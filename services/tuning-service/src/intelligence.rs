// ---- Machine Intelligence Engine ------------------------------------------------
// Classifies devices into archetypes, scores tuning action relevance per
// archetype, and generates personalized recommendation profiles.
//
// This module sits between the scanner (raw hardware data) and the planner
// (action definitions + hardware gates).  It adds a semantic layer:
// "what kind of machine is this, and which tweaks matter most?"

use anyhow::Result;
use serde_json::{json, Value};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARCHETYPES: &[&str] = &[
    "gaming_desktop",
    "budget_desktop",
    "highend_workstation",
    "office_laptop",
    "gaming_laptop",
    "low_spec_system",
    "vm_cautious",
];

/// Category names matching the action `"category"` field in planner.rs.
const CATEGORIES: &[&str] = &[
    "cpu",
    "gpu",
    "memory",
    "storage",
    "network",
    "power",
    "audio",
    "display",
    "privacy",
    "startup",
    "services",
    "security",
    "scheduler",
    "gaming",
];

/// Archetype-category affinity matrix.
/// Rows: archetypes (same order as ARCHETYPES).
/// Columns: categories (same order as CATEGORIES).
#[rustfmt::skip]
const AFFINITY: [[f64; 14]; 7] = [
    // cpu   gpu   mem   stor  net   pow   aud   disp  priv  start svc   sec   sched game
    [0.90, 0.95, 0.70, 0.60, 0.50, 0.85, 0.40, 0.70, 0.50, 0.70, 0.70, 0.30, 0.85, 0.90], // gaming_desktop
    [0.50, 0.30, 0.60, 0.70, 0.40, 0.60, 0.30, 0.50, 0.70, 0.85, 0.80, 0.50, 0.50, 0.30], // budget_desktop
    [0.85, 0.70, 0.90, 0.80, 0.60, 0.75, 0.30, 0.40, 0.60, 0.60, 0.50, 0.40, 0.80, 0.20], // highend_workstation
    [0.30, 0.20, 0.40, 0.50, 0.30, 0.40, 0.30, 0.40, 0.90, 0.85, 0.70, 0.60, 0.30, 0.10], // office_laptop
    [0.70, 0.80, 0.60, 0.50, 0.40, 0.50, 0.40, 0.60, 0.50, 0.65, 0.60, 0.30, 0.70, 0.80], // gaming_laptop
    [0.30, 0.10, 0.50, 0.60, 0.30, 0.40, 0.20, 0.30, 0.80, 0.90, 0.85, 0.50, 0.30, 0.10], // low_spec_system
    [0.10, 0.05, 0.20, 0.30, 0.20, 0.10, 0.10, 0.20, 0.70, 0.60, 0.50, 0.30, 0.10, 0.05], // vm_cautious
];

// ---------------------------------------------------------------------------
// Signal extraction helpers
// ---------------------------------------------------------------------------

struct DeviceSignals {
    device_class: String,
    is_laptop: bool,
    is_vm: bool,

    cpu_vendor: String,
    cpu_brand: String,
    physical_cores: u64,
    logical_cores: u64,

    ram_mb: u64,
    ram_gb: u64,

    gpu_vendor: String,
    gpu_name: String,
    gpu_vram_mb: u64,
    has_discrete_gpu: bool,

    has_nvme: bool,
    has_hdd: bool,

    max_refresh: u64,
    has_high_refresh: bool,

    power_source: String,
    on_battery: bool,
}

fn extract_signals(profile: &Value) -> DeviceSignals {
    let device_class = profile
        .get("deviceClass")
        .and_then(|v| v.as_str())
        .unwrap_or("desktop")
        .to_string();
    let is_laptop = matches!(device_class.as_str(), "laptop" | "tablet" | "notebook");

    // VM detection: explicit deviceClass or Hyper-V/Virtual indicators
    let is_vm = device_class == "vm"
        || profile
            .get("gpus")
            .and_then(|g| g.as_array())
            .map(|arr| {
                arr.iter().any(|g| {
                    let name = g
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_ascii_lowercase();
                    name.contains("hyper-v")
                        || name.contains("virtual")
                        || name.contains("vmware")
                        || name.contains("virtualbox")
                })
            })
            .unwrap_or(false)
        || profile
            .get("storage")
            .and_then(|s| s.as_array())
            .map(|arr| {
                arr.iter().any(|d| {
                    let model = d
                        .get("model")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_ascii_lowercase();
                    model.contains("virtual") || model.contains("vhdx")
                })
            })
            .unwrap_or(false);

    let cpu = profile.get("cpu");
    let cpu_vendor = cpu
        .and_then(|c| c.get("vendor"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();
    let cpu_brand = cpu
        .and_then(|c| c.get("brand"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown CPU")
        .to_string();
    let physical_cores = cpu
        .and_then(|c| c.get("physicalCores"))
        .and_then(|v| v.as_u64())
        .unwrap_or(4);
    let logical_cores = cpu
        .and_then(|c| c.get("logicalCores"))
        .and_then(|v| v.as_u64())
        .unwrap_or(4);

    let ram_mb = profile
        .get("memory")
        .and_then(|m| m.get("totalMb"))
        .and_then(|v| v.as_u64())
        .unwrap_or(8192);
    let ram_gb = ram_mb / 1024;

    let gpus = profile
        .get("gpus")
        .and_then(|g| g.as_array())
        .cloned()
        .unwrap_or_default();
    let first_gpu = gpus.first();

    let gpu_vendor = first_gpu
        .and_then(|g| g.get("vendor"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();
    let gpu_name = first_gpu
        .and_then(|g| g.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown GPU")
        .to_string();
    let gpu_vram_mb = first_gpu
        .and_then(|g| g.get("vramMb"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let has_discrete_gpu =
        gpu_vendor != "Intel" && gpu_vendor != "Unknown" && gpu_vram_mb >= 2048;

    let storage_arr = profile
        .get("storage")
        .and_then(|s| s.as_array())
        .cloned()
        .unwrap_or_default();
    let has_nvme = storage_arr.iter().any(|d| {
        d.get("type")
            .and_then(|v| v.as_str())
            .map(|t| t.eq_ignore_ascii_case("NVMe"))
            .unwrap_or(false)
    });
    let has_hdd = storage_arr.iter().any(|d| {
        d.get("type")
            .and_then(|v| v.as_str())
            .map(|t| t.eq_ignore_ascii_case("HDD"))
            .unwrap_or(false)
    });

    let monitors = profile
        .get("monitors")
        .and_then(|m| m.as_array())
        .cloned()
        .unwrap_or_default();
    let max_refresh = monitors
        .iter()
        .filter_map(|m| m.get("refreshRateHz").and_then(|v| v.as_u64()))
        .max()
        .unwrap_or(60);
    let has_high_refresh = max_refresh > 60;

    let power_source = profile
        .get("power")
        .and_then(|p| p.get("source"))
        .and_then(|v| v.as_str())
        .unwrap_or("ac")
        .to_string();
    let on_battery = power_source == "battery";

    DeviceSignals {
        device_class,
        is_laptop,
        is_vm,
        cpu_vendor,
        cpu_brand,
        physical_cores,
        logical_cores,
        ram_mb,
        ram_gb,
        gpu_vendor,
        gpu_name,
        gpu_vram_mb,
        has_discrete_gpu,
        has_nvme,
        has_hdd,
        max_refresh,
        has_high_refresh,
        power_source,
        on_battery,
    }
}

// ---------------------------------------------------------------------------
// 1. classify
// ---------------------------------------------------------------------------

/// Score the device against 7 archetypes using weighted heuristic signals.
///
/// Returns a JSON object with:
/// - `primary`: the top-scoring archetype
/// - `confidence`: how much the winner separates from the runner-up (0..0.95)
/// - `scores`: normalized archetype scores (winner = 1.0)
/// - `signals`: list of factors that contributed to scoring
/// - `classifiedAt`: ISO 8601 timestamp
/// - `deviceProfileId`: echoed from profile if present
pub fn classify(profile: &Value) -> Result<Value> {
    let s = extract_signals(profile);
    let mut signals: Vec<Value> = Vec::new();

    // -- scoring accumulators --
    let mut raw_scores = [0.0f64; 7];

    // Helper indices (must match ARCHETYPES order)
    const GAMING_DESKTOP: usize = 0;
    const BUDGET_DESKTOP: usize = 1;
    const HIGHEND_WORKSTATION: usize = 2;
    const OFFICE_LAPTOP: usize = 3;
    const GAMING_LAPTOP: usize = 4;
    const LOW_SPEC: usize = 5;
    const VM_CAUTIOUS: usize = 6;

    // ---- Form factor signals ------------------------------------------------

    if !s.is_laptop && !s.is_vm {
        raw_scores[GAMING_DESKTOP] += 0.2;
        raw_scores[BUDGET_DESKTOP] += 0.2;
        raw_scores[HIGHEND_WORKSTATION] += 0.2;
        signals.push(json!({
            "factor": "desktop_form_factor",
            "value": &s.device_class,
            "weight": 0.2,
            "favoredArchetype": "gaming_desktop"
        }));
    }

    if s.is_laptop {
        raw_scores[OFFICE_LAPTOP] += 0.2;
        raw_scores[GAMING_LAPTOP] += 0.2;
        raw_scores[GAMING_DESKTOP] -= 0.5;
        raw_scores[BUDGET_DESKTOP] -= 0.5;
        raw_scores[HIGHEND_WORKSTATION] -= 0.5;
        signals.push(json!({
            "factor": "laptop_form_factor",
            "value": &s.device_class,
            "weight": 0.2,
            "favoredArchetype": "office_laptop"
        }));
    }

    if s.is_vm {
        raw_scores[VM_CAUTIOUS] += 0.5;
        raw_scores[GAMING_DESKTOP] -= 0.5;
        raw_scores[BUDGET_DESKTOP] -= 0.3;
        raw_scores[HIGHEND_WORKSTATION] -= 0.5;
        raw_scores[GAMING_LAPTOP] -= 0.5;
        signals.push(json!({
            "factor": "virtual_machine",
            "value": &s.device_class,
            "weight": 0.5,
            "favoredArchetype": "vm_cautious"
        }));
    }

    // ---- GPU signals --------------------------------------------------------

    if s.has_discrete_gpu {
        let vram_gb = s.gpu_vram_mb / 1024;
        let vram_label = format!("{} ({} GB)", &s.gpu_name, vram_gb);

        // Tiered GPU scoring: weak dGPU (<=4GB) gets less gaming weight
        let gpu_gaming_weight = if vram_gb >= 8 { 0.3 } else if vram_gb >= 4 { 0.2 } else { 0.1 };
        raw_scores[GAMING_DESKTOP] += gpu_gaming_weight;
        raw_scores[GAMING_LAPTOP] += gpu_gaming_weight;
        raw_scores[HIGHEND_WORKSTATION] += 0.15;
        // Weak dGPU still favors budget over gaming
        if vram_gb < 4 {
            raw_scores[BUDGET_DESKTOP] += 0.1;
        }
        signals.push(json!({
            "factor": "discrete_gpu",
            "value": &vram_label,
            "weight": gpu_gaming_weight,
            "favoredArchetype": if gpu_gaming_weight >= 0.2 { "gaming_desktop" } else { "budget_desktop" }
        }));

        if vram_gb >= 8 {
            raw_scores[GAMING_DESKTOP] += 0.1;
            raw_scores[GAMING_LAPTOP] += 0.1;
            raw_scores[HIGHEND_WORKSTATION] += 0.15;
            signals.push(json!({
                "factor": "high_vram",
                "value": format!("{} MB", s.gpu_vram_mb),
                "weight": 0.1,
                "favoredArchetype": "gaming_desktop"
            }));
        }

        // Workstation GPU detection (Quadro, RTX A-series, FirePro, Radeon Pro)
        let gpu_lower = s.gpu_name.to_ascii_lowercase();
        if gpu_lower.contains("quadro")
            || gpu_lower.contains("rtx a")
            || gpu_lower.contains("firepro")
            || gpu_lower.contains("radeon pro")
        {
            raw_scores[HIGHEND_WORKSTATION] += 0.2;
            raw_scores[GAMING_DESKTOP] -= 0.1; // workstation GPU is not gaming
            signals.push(json!({
                "factor": "workstation_gpu",
                "value": &s.gpu_name,
                "weight": 0.2,
                "favoredArchetype": "highend_workstation"
            }));
        }
    } else {
        raw_scores[BUDGET_DESKTOP] += 0.15;
        raw_scores[OFFICE_LAPTOP] += 0.15;
        raw_scores[LOW_SPEC] += 0.05;
        raw_scores[GAMING_DESKTOP] -= 0.15; // no dGPU is anti-gaming
        raw_scores[GAMING_LAPTOP] -= 0.15;
        signals.push(json!({
            "factor": "integrated_gpu",
            "value": &s.gpu_name,
            "weight": 0.15,
            "favoredArchetype": "budget_desktop"
        }));
    }

    // ---- RAM signals --------------------------------------------------------

    if s.ram_gb >= 32 {
        // High RAM only pushes workstation if cores also suggest it
        let ws_ram_weight = if s.physical_cores >= 8 { 0.2 } else { 0.1 };
        raw_scores[HIGHEND_WORKSTATION] += ws_ram_weight;
        raw_scores[GAMING_DESKTOP] += 0.1; // 32GB is common in high-end gaming builds too
        signals.push(json!({
            "factor": "high_ram",
            "value": format!("{} GB", s.ram_gb),
            "weight": ws_ram_weight,
            "favoredArchetype": "highend_workstation"
        }));
    } else if s.ram_gb >= 16 {
        raw_scores[GAMING_DESKTOP] += 0.15;
        raw_scores[GAMING_LAPTOP] += 0.15;
        signals.push(json!({
            "factor": "adequate_ram",
            "value": format!("{} GB", s.ram_gb),
            "weight": 0.15,
            "favoredArchetype": "gaming_desktop"
        }));
    } else if s.ram_gb >= 8 {
        raw_scores[BUDGET_DESKTOP] += 0.1;
        raw_scores[OFFICE_LAPTOP] += 0.1;
        signals.push(json!({
            "factor": "moderate_ram",
            "value": format!("{} GB", s.ram_gb),
            "weight": 0.1,
            "favoredArchetype": "budget_desktop"
        }));
    }

    if s.ram_gb <= 8 {
        raw_scores[LOW_SPEC] += 0.2;
        signals.push(json!({
            "factor": "low_ram",
            "value": format!("{} GB", s.ram_gb),
            "weight": 0.2,
            "favoredArchetype": "low_spec_system"
        }));
    }

    // ---- CPU core count signals ---------------------------------------------

    if s.physical_cores >= 12 {
        raw_scores[HIGHEND_WORKSTATION] += 0.15;
        signals.push(json!({
            "factor": "high_core_count",
            "value": format!("{} physical cores", s.physical_cores),
            "weight": 0.15,
            "favoredArchetype": "highend_workstation"
        }));
    }

    if s.physical_cores <= 4 {
        raw_scores[LOW_SPEC] += 0.15;
        signals.push(json!({
            "factor": "low_core_count",
            "value": format!("{} physical cores", s.physical_cores),
            "weight": 0.15,
            "favoredArchetype": "low_spec_system"
        }));
    }

    // Workstation CPU brand detection (Xeon, Threadripper)
    let brand_lower = s.cpu_brand.to_ascii_lowercase();
    if brand_lower.contains("xeon") || brand_lower.contains("threadripper") {
        raw_scores[HIGHEND_WORKSTATION] += 0.15;
        signals.push(json!({
            "factor": "workstation_cpu",
            "value": &s.cpu_brand,
            "weight": 0.15,
            "favoredArchetype": "highend_workstation"
        }));
    }

    // ---- Display signals ----------------------------------------------------

    if s.has_high_refresh {
        raw_scores[GAMING_DESKTOP] += 0.15;
        raw_scores[GAMING_LAPTOP] += 0.15;
        signals.push(json!({
            "factor": "high_refresh_display",
            "value": format!("{} Hz", s.max_refresh),
            "weight": 0.15,
            "favoredArchetype": "gaming_desktop"
        }));
    }

    // ---- Storage signals ----------------------------------------------------

    if s.has_nvme {
        raw_scores[GAMING_DESKTOP] += 0.05;
        raw_scores[HIGHEND_WORKSTATION] += 0.05;
        signals.push(json!({
            "factor": "nvme_storage",
            "value": "NVMe SSD",
            "weight": 0.05,
            "favoredArchetype": "gaming_desktop"
        }));
    }

    if s.has_hdd {
        raw_scores[BUDGET_DESKTOP] += 0.05;
        raw_scores[LOW_SPEC] += 0.05;
        signals.push(json!({
            "factor": "hdd_present",
            "value": "HDD",
            "weight": 0.05,
            "favoredArchetype": "budget_desktop"
        }));
    }

    // ---- Power signals ------------------------------------------------------

    if s.on_battery {
        raw_scores[OFFICE_LAPTOP] += 0.1;
        raw_scores[GAMING_DESKTOP] -= 0.1;
        raw_scores[GAMING_LAPTOP] -= 0.05; // battery penalizes gaming laptop less than gaming desktop
        signals.push(json!({
            "factor": "on_battery",
            "value": "battery",
            "weight": 0.1,
            "favoredArchetype": "office_laptop"
        }));
    }

    // ---- Compound signals (cross-factor interactions) ------------------------

    // Laptop + dGPU: strong gaming laptop signal, weaken office laptop
    if s.is_laptop && s.has_discrete_gpu && s.gpu_vram_mb >= 4096 {
        raw_scores[GAMING_LAPTOP] += 0.2;
        raw_scores[OFFICE_LAPTOP] -= 0.15;
        signals.push(json!({
            "factor": "laptop_with_dgpu",
            "value": format!("{} on mobile", &s.gpu_name),
            "weight": 0.2,
            "favoredArchetype": "gaming_laptop"
        }));
    }

    // Discrete GPU but no high-refresh display: weaker gaming signal
    if s.has_discrete_gpu && !s.has_high_refresh && s.gpu_vram_mb >= 4096 {
        raw_scores[GAMING_DESKTOP] -= 0.05;
        raw_scores[GAMING_LAPTOP] -= 0.05;
        signals.push(json!({
            "factor": "dgpu_low_refresh",
            "value": format!("{} Hz display with discrete GPU", s.max_refresh),
            "weight": -0.05,
            "favoredArchetype": "budget_desktop"
        }));
    }

    // High core count + high RAM without workstation CPU: could be gaming, not workstation
    if s.physical_cores >= 12 && s.ram_gb >= 32
        && !brand_lower.contains("xeon") && !brand_lower.contains("threadripper")
    {
        raw_scores[GAMING_DESKTOP] += 0.1; // high-end gaming builds also have many cores + RAM
        signals.push(json!({
            "factor": "high_spec_consumer_cpu",
            "value": format!("{} with {} GB RAM", &s.cpu_brand, s.ram_gb),
            "weight": 0.1,
            "favoredArchetype": "gaming_desktop"
        }));
    }

    // ---- Normalize scores ---------------------------------------------------

    // Clamp negatives to zero
    for score in &mut raw_scores {
        if *score < 0.0 {
            *score = 0.0;
        }
    }

    let max_score = raw_scores
        .iter()
        .cloned()
        .fold(f64::NEG_INFINITY, f64::max);

    // Avoid division by zero if all scores are 0
    let max_score = if max_score <= 0.0 { 1.0 } else { max_score };

    let normalized: Vec<f64> = raw_scores.iter().map(|s| s / max_score).collect();

    // Find primary (highest) and second highest for confidence
    let mut sorted_indices: Vec<usize> = (0..ARCHETYPES.len()).collect();
    sorted_indices.sort_by(|a, b| normalized[*b].total_cmp(&normalized[*a]));

    let primary_idx = sorted_indices[0];
    let primary = ARCHETYPES[primary_idx];
    let top_score = normalized[primary_idx];
    let second_score = normalized[sorted_indices[1]];

    let confidence = if top_score > 0.0 {
        ((top_score - second_score) / top_score).min(0.95)
    } else {
        0.0
    };

    // Build scores object
    let mut scores_obj = serde_json::Map::new();
    for (i, archetype) in ARCHETYPES.iter().enumerate() {
        // Round to 2 decimal places
        let rounded = (normalized[i] * 100.0).round() / 100.0;
        scores_obj.insert(
            archetype.to_string(),
            json!(rounded),
        );
    }

    let profile_id = profile
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let now = chrono::Utc::now().to_rfc3339();

    tracing::info!(
        primary = primary,
        confidence = confidence,
        "Device classified as {}  (confidence {:.2})",
        primary,
        confidence
    );

    Ok(json!({
        "primary": primary,
        "confidence": (confidence * 100.0).round() / 100.0,
        "scores": scores_obj,
        "signals": signals,
        "classifiedAt": now,
        "deviceProfileId": profile_id
    }))
}

// ---------------------------------------------------------------------------
// 2. build_profile
// ---------------------------------------------------------------------------

/// Build an intelligent tuning profile combining classification, quick-win
/// recommendations, and archetype-specific warnings.
pub fn build_profile(profile: &Value, classification: &Value) -> Result<Value> {
    let primary = classification
        .get("primary")
        .and_then(|v| v.as_str())
        .unwrap_or("budget_desktop");

    tracing::info!(archetype = primary, "Building intelligent tuning profile");

    // Generate all recommendations
    let all_recs = recommend(profile, classification)?;

    // Top 5 quick wins: highest relevance that are not gated
    let quick_wins: Vec<Value> = all_recs
        .iter()
        .filter(|r| {
            r.get("confidence")
                .and_then(|v| v.as_str())
                .map(|c| c == "high" || c == "medium")
                .unwrap_or(false)
        })
        .take(5)
        .cloned()
        .collect();

    // Suggested preset per archetype
    let suggested_preset = match primary {
        "gaming_desktop" => "competitive_fps",
        "budget_desktop" => "clean_lean",
        "highend_workstation" => "creator_workstation",
        "office_laptop" => "laptop_balanced",
        "gaming_laptop" => "aaa_smoothness",
        "low_spec_system" => "conservative",
        "vm_cautious" => "privacy_focused",
        _ => "balanced",
    };

    // Warning notes per archetype
    let warnings: Vec<&str> = match primary {
        "gaming_desktop" => vec![
            "Aggressive tuning may increase power consumption",
            "Monitor thermal headroom during sustained load",
        ],
        "budget_desktop" => vec![
            "Focus is on decluttering and reducing overhead",
            "GPU-intensive tweaks may have minimal impact with integrated graphics",
        ],
        "highend_workstation" => vec![
            "Workstation-class hardware benefits most from scheduler and memory tuning",
            "Verify stability under sustained multi-threaded workloads after applying changes",
        ],
        "office_laptop" => vec![
            "Battery-unfriendly changes are excluded",
            "Thermal and noise considerations are prioritized",
        ],
        "gaming_laptop" => vec![
            "Thermal headroom is limited compared to desktop systems",
            "Some CPU power tweaks are excluded to protect battery health",
        ],
        "low_spec_system" => vec![
            "Focus is on resource recovery, not performance tuning",
            "Aggressive tweaks are blocked to protect system stability",
        ],
        "vm_cautious" => vec![
            "Many hardware-level tweaks have no effect in a virtual machine",
            "Registry changes may not persist across VM resets",
        ],
        _ => vec![],
    };

    Ok(json!({
        "classification": classification,
        "suggestedPreset": suggested_preset,
        "quickWins": quick_wins,
        "recommendations": all_recs,
        "warnings": warnings,
        "totalActions": all_recs.len(),
        "actionableCount": all_recs.iter().filter(|r| {
            r.get("relevance")
                .and_then(|v| v.as_f64())
                .map(|rel| rel >= 0.2)
                .unwrap_or(false)
        }).count(),
    }))
}

// ---------------------------------------------------------------------------
// 3. recommend
// ---------------------------------------------------------------------------

/// Score every tuning action for relevance to this device, using the
/// archetype-category affinity matrix and hardware gate results.
///
/// Returns a sorted vec of recommendation objects (highest relevance first).
pub fn recommend(profile: &Value, classification: &Value) -> Result<Vec<Value>> {
    let primary = classification
        .get("primary")
        .and_then(|v| v.as_str())
        .unwrap_or("budget_desktop");

    let archetype_idx = ARCHETYPES
        .iter()
        .position(|a| *a == primary)
        .unwrap_or(1); // default to budget_desktop

    let s = extract_signals(profile);

    let all_actions = crate::planner::get_actions(None);

    tracing::info!(
        archetype = primary,
        action_count = all_actions.len(),
        "Scoring actions for archetype"
    );

    let mut recommendations: Vec<Value> = all_actions
        .into_iter()
        .map(|action| {
            let action_id = action
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let category = action
                .get("category")
                .and_then(|v| v.as_str())
                .unwrap_or("services");
            let action_name = action
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown");

            // Check hardware gates via planner
            let gate_outcome = crate::planner::check_hardware_gates(action_id, profile);
            let is_gated = gate_outcome.gate_hit.is_some();
            let gate_reason = gate_outcome.gate_hit;

            // Look up category affinity
            let cat_idx = CATEGORIES
                .iter()
                .position(|c| *c == category)
                .unwrap_or(10); // default to "services"
            let base_relevance = AFFINITY[archetype_idx][cat_idx];

            // If gated, relevance is 0.0
            let relevance = if is_gated { 0.0 } else { base_relevance };

            // Determine confidence tier
            let confidence = if is_gated {
                "analyze_only"
            } else if relevance >= 0.7 {
                "high"
            } else if relevance >= 0.4 {
                "medium"
            } else if relevance >= 0.2 {
                "caution"
            } else {
                "analyze_only"
            };

            // Generate personalized reason
            let reason = generate_reason(action_id, category, primary, &s, is_gated);

            json!({
                "actionId": action_id,
                "actionName": action_name,
                "category": category,
                "relevance": (relevance * 100.0).round() / 100.0,
                "confidence": confidence,
                "reason": reason,
                "gated": is_gated,
                "gateReason": gate_reason,
            })
        })
        .collect();

    // Sort by relevance descending
    recommendations.sort_by(|a, b| {
        let ra = a.get("relevance").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let rb = b.get("relevance").and_then(|v| v.as_f64()).unwrap_or(0.0);
        rb.partial_cmp(&ra).unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(recommendations)
}

// ---------------------------------------------------------------------------
// Reason generation
// ---------------------------------------------------------------------------

fn generate_reason(
    action_id: &str,
    category: &str,
    archetype: &str,
    signals: &DeviceSignals,
    is_gated: bool,
) -> String {
    // Gated actions on VMs get a generic message
    if archetype == "vm_cautious" && is_gated {
        return "This hardware-level optimization has minimal effect in a virtual machine"
            .to_string();
    }

    if is_gated {
        return "This action is blocked by a hardware gate for your specific configuration"
            .to_string();
    }

    // Action-specific reasons using device data
    match action_id {
        "cpu.disable-dynamic-tick" => match archetype {
            "gaming_desktop" => format!(
                "Your {} benefits from fixed timer intervals to eliminate micro-stutter during gameplay",
                signals.cpu_brand
            ),
            "highend_workstation" => format!(
                "Fixed timer resolution improves scheduling consistency for your {}-core {}",
                signals.physical_cores, signals.cpu_brand
            ),
            _ => "Fixed timer intervals reduce jitter in latency-sensitive workloads".to_string(),
        },

        "privacy.disable-telemetry" => match archetype {
            "office_laptop" => "Reduces background network activity, improving battery endurance".to_string(),
            "low_spec_system" => format!(
                "Frees CPU and network resources on your {}-core system with {} GB RAM",
                signals.physical_cores, signals.ram_gb
            ),
            _ => "Disables background telemetry data collection to reduce system overhead".to_string(),
        },

        "gpu.nvidia-disable-dynamic-pstate" => {
            if signals.gpu_vendor == "NVIDIA" {
                format!(
                    "Keeps your {} locked at peak performance state, preventing GPU clock drops during gameplay",
                    signals.gpu_name
                )
            } else {
                "Locks NVIDIA GPU at maximum performance state".to_string()
            }
        }

        "services.disable-sysmain" => {
            if signals.has_nvme {
                "Your NVMe storage is fast enough that SysMain prefetching adds overhead without benefit".to_string()
            } else {
                "Disables Superfetch memory prefetching to reduce background disk activity".to_string()
            }
        }

        "cpu.reduce-parking-aggressiveness" => match archetype {
            "gaming_desktop" | "gaming_laptop" => format!(
                "Keeps all {} cores active to prevent frame drops from core wake-up latency",
                signals.physical_cores
            ),
            "highend_workstation" => format!(
                "Ensures all {} cores of your {} remain available for parallel workloads",
                signals.physical_cores, signals.cpu_brand
            ),
            _ => "Reduces core parking to keep more CPU cores active".to_string(),
        },

        "cpu.scheduler-quantum-gaming" => match archetype {
            "gaming_desktop" | "gaming_laptop" => {
                "Optimizes thread scheduling quantum for foreground application responsiveness"
                    .to_string()
            }
            _ => "Adjusts thread scheduling to favor interactive foreground tasks".to_string(),
        },

        _ => {
            // Generic category-based reason
            match category {
                "cpu" => format!(
                    "CPU optimization for your {} {} ({} cores)",
                    signals.cpu_vendor, signals.cpu_brand, signals.physical_cores
                ),
                "gpu" => format!(
                    "Graphics optimization for your {}",
                    signals.gpu_name
                ),
                "memory" => format!(
                    "Memory management optimization for {} GB RAM",
                    signals.ram_gb
                ),
                "storage" => {
                    if signals.has_nvme {
                        "Storage optimization tuned for NVMe performance".to_string()
                    } else if signals.has_hdd {
                        "Storage optimization to improve HDD responsiveness".to_string()
                    } else {
                        "Storage I/O optimization".to_string()
                    }
                }
                "privacy" => match archetype {
                    "office_laptop" => "Privacy improvement that also reduces battery-draining background activity".to_string(),
                    "low_spec_system" => "Reduces background overhead while improving privacy".to_string(),
                    _ => "Reduces tracking and background data collection".to_string(),
                },
                "startup" => match archetype {
                    "low_spec_system" | "budget_desktop" => "Reduces boot time and frees resources on startup".to_string(),
                    _ => "Streamlines startup for faster boot-to-desktop".to_string(),
                },
                "services" => match archetype {
                    "low_spec_system" => "Disables unnecessary background service to recover scarce resources".to_string(),
                    "budget_desktop" => "Reduces background services to free system overhead".to_string(),
                    _ => "Optimizes Windows service configuration".to_string(),
                },
                "power" => match archetype {
                    "gaming_desktop" => "Power plan optimization for maximum sustained performance".to_string(),
                    "office_laptop" => "Balanced power setting respecting battery endurance".to_string(),
                    _ => "Power management optimization".to_string(),
                },
                "display" => format!(
                    "Display optimization for your {} Hz monitor setup",
                    signals.max_refresh
                ),
                "gaming" => format!(
                    "Game-specific optimization for {} + {} configuration",
                    signals.cpu_brand, signals.gpu_name
                ),
                "security" => "Security setting adjustment with performance trade-off".to_string(),
                "audio" => "Audio subsystem optimization to reduce processing latency".to_string(),
                "network" => "Network stack optimization for lower latency".to_string(),
                "scheduler" => format!(
                    "Thread scheduler tuning for your {}-thread {} configuration",
                    signals.logical_cores, signals.cpu_brand
                ),
                _ => "System optimization".to_string(),
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn gaming_desktop_profile() -> Value {
        json!({
            "id": "test-gaming-desktop",
            "deviceClass": "desktop",
            "cpu": {
                "vendor": "AMD",
                "brand": "AMD Ryzen 9 7950X",
                "physicalCores": 16,
                "logicalCores": 32,
                "smtEnabled": true
            },
            "gpus": [{
                "vendor": "NVIDIA",
                "name": "NVIDIA GeForce RTX 4070",
                "vramMb": 12288
            }],
            "memory": { "totalMb": 16384 },
            "storage": [{ "type": "NVMe", "model": "Samsung 990 Pro" }],
            "power": { "source": "ac" },
            "monitors": [{ "refreshRateHz": 165 }],
            "windows": { "build": 22631, "edition": "Pro" },
            "security": {},
            "thermal": {}
        })
    }

    fn budget_desktop_profile() -> Value {
        json!({
            "id": "test-budget-desktop",
            "deviceClass": "desktop",
            "cpu": {
                "vendor": "Intel",
                "brand": "Intel Core i3-10100",
                "physicalCores": 4,
                "logicalCores": 8,
                "smtEnabled": true
            },
            "gpus": [{
                "vendor": "Intel",
                "name": "Intel UHD Graphics 630",
                "vramMb": 512
            }],
            "memory": { "totalMb": 8192 },
            "storage": [{ "type": "SSD", "model": "Kingston A400" }],
            "power": { "source": "ac" },
            "monitors": [{ "refreshRateHz": 60 }],
            "windows": { "build": 19045, "edition": "Home" },
            "security": {},
            "thermal": {}
        })
    }

    fn office_laptop_profile() -> Value {
        json!({
            "id": "test-office-laptop",
            "deviceClass": "laptop",
            "cpu": {
                "vendor": "Intel",
                "brand": "Intel Core i5-1235U",
                "physicalCores": 10,
                "logicalCores": 12,
                "smtEnabled": true
            },
            "gpus": [{
                "vendor": "Intel",
                "name": "Intel Iris Xe Graphics",
                "vramMb": 1024
            }],
            "memory": { "totalMb": 16384 },
            "storage": [{ "type": "NVMe", "model": "WD SN570" }],
            "power": { "source": "battery" },
            "monitors": [{ "refreshRateHz": 60 }],
            "windows": { "build": 22631, "edition": "Pro" },
            "security": {},
            "thermal": {}
        })
    }

    fn highend_workstation_profile() -> Value {
        json!({
            "id": "test-workstation",
            "deviceClass": "desktop",
            "cpu": {
                "vendor": "AMD",
                "brand": "AMD Ryzen Threadripper 7980X",
                "physicalCores": 64,
                "logicalCores": 128,
                "smtEnabled": true
            },
            "gpus": [{
                "vendor": "NVIDIA",
                "name": "NVIDIA RTX A6000",
                "vramMb": 49152
            }],
            "memory": { "totalMb": 65536 },
            "storage": [{ "type": "NVMe", "model": "Samsung 990 Pro" }],
            "power": { "source": "ac" },
            "monitors": [{ "refreshRateHz": 60 }],
            "windows": { "build": 22631, "edition": "Pro for Workstations" },
            "security": {},
            "thermal": {}
        })
    }

    fn vm_profile() -> Value {
        json!({
            "id": "test-vm",
            "deviceClass": "vm",
            "cpu": {
                "vendor": "Intel",
                "brand": "Intel Xeon E-2288G",
                "physicalCores": 4,
                "logicalCores": 8,
                "smtEnabled": true
            },
            "gpus": [{
                "vendor": "Microsoft",
                "name": "Microsoft Hyper-V Video",
                "vramMb": 256
            }],
            "memory": { "totalMb": 8192 },
            "storage": [{ "type": "SSD", "model": "Virtual Disk" }],
            "power": { "source": "ac" },
            "monitors": [{ "refreshRateHz": 60 }],
            "windows": { "build": 22631, "edition": "Pro" },
            "security": {},
            "thermal": {}
        })
    }

    fn low_spec_profile() -> Value {
        json!({
            "id": "test-low-spec",
            "deviceClass": "desktop",
            "cpu": {
                "vendor": "Intel",
                "brand": "Intel Celeron J4125",
                "physicalCores": 2,
                "logicalCores": 2,
                "smtEnabled": false
            },
            "gpus": [{
                "vendor": "Intel",
                "name": "Intel UHD Graphics 600",
                "vramMb": 256
            }],
            "memory": { "totalMb": 4096 },
            "storage": [{ "type": "HDD", "model": "Seagate Barracuda" }],
            "power": { "source": "ac" },
            "monitors": [{ "refreshRateHz": 60 }],
            "windows": { "build": 19045, "edition": "Home" },
            "security": {},
            "thermal": {}
        })
    }

    #[test]
    fn test_classify_gaming_desktop() {
        let profile = gaming_desktop_profile();
        let result = classify(&profile).unwrap();
        assert_eq!(
            result.get("primary").and_then(|v| v.as_str()).unwrap(),
            "gaming_desktop",
            "Desktop with RTX 4070 + 32GB + 165Hz should classify as gaming_desktop"
        );
        let confidence = result.get("confidence").and_then(|v| v.as_f64()).unwrap();
        assert!(
            confidence > 0.0,
            "Confidence should be positive, got {}",
            confidence
        );
    }

    #[test]
    fn test_classify_budget_desktop() {
        let profile = budget_desktop_profile();
        let result = classify(&profile).unwrap();
        assert_eq!(
            result.get("primary").and_then(|v| v.as_str()).unwrap(),
            "budget_desktop",
            "Desktop with Intel UHD + 8GB should classify as budget_desktop"
        );
    }

    #[test]
    fn test_classify_office_laptop() {
        let profile = office_laptop_profile();
        let result = classify(&profile).unwrap();
        assert_eq!(
            result.get("primary").and_then(|v| v.as_str()).unwrap(),
            "office_laptop",
            "Laptop with no discrete GPU + 16GB should classify as office_laptop"
        );
    }

    #[test]
    fn test_classify_highend_workstation() {
        let profile = highend_workstation_profile();
        let result = classify(&profile).unwrap();
        assert_eq!(
            result.get("primary").and_then(|v| v.as_str()).unwrap(),
            "highend_workstation",
            "Desktop with 64GB + Threadripper + RTX A6000 should classify as highend_workstation"
        );
    }

    #[test]
    fn test_classify_vm_cautious() {
        let profile = vm_profile();
        let result = classify(&profile).unwrap();
        assert_eq!(
            result.get("primary").and_then(|v| v.as_str()).unwrap(),
            "vm_cautious",
            "VM with Hyper-V Video + 8GB should classify as vm_cautious"
        );
    }

    #[test]
    fn test_classify_low_spec_system() {
        let profile = low_spec_profile();
        let result = classify(&profile).unwrap();
        assert_eq!(
            result.get("primary").and_then(|v| v.as_str()).unwrap(),
            "low_spec_system",
            "Desktop with 4GB + 2 cores should classify as low_spec_system"
        );
    }

    #[test]
    fn test_classify_output_structure() {
        let profile = gaming_desktop_profile();
        let result = classify(&profile).unwrap();

        // Must have all required fields
        assert!(result.get("primary").is_some());
        assert!(result.get("confidence").is_some());
        assert!(result.get("scores").is_some());
        assert!(result.get("signals").is_some());
        assert!(result.get("classifiedAt").is_some());
        assert!(result.get("deviceProfileId").is_some());

        // Scores must have all archetypes
        let scores = result.get("scores").unwrap().as_object().unwrap();
        for archetype in ARCHETYPES {
            assert!(
                scores.contains_key(*archetype),
                "Missing archetype score: {}",
                archetype
            );
        }

        // Primary score should be 1.0 (normalized)
        let primary = result.get("primary").and_then(|v| v.as_str()).unwrap();
        let primary_score = scores
            .get(primary)
            .and_then(|v| v.as_f64())
            .unwrap();
        assert!(
            (primary_score - 1.0).abs() < 0.01,
            "Primary archetype score should be 1.0, got {}",
            primary_score
        );

        // Confidence capped at 0.95
        let confidence = result.get("confidence").and_then(|v| v.as_f64()).unwrap();
        assert!(confidence <= 0.95, "Confidence must be <= 0.95");
    }

    #[test]
    fn test_recommend_returns_sorted_by_relevance() {
        let profile = gaming_desktop_profile();
        let classification = classify(&profile).unwrap();
        let recs = recommend(&profile, &classification).unwrap();

        assert!(!recs.is_empty(), "Recommendations should not be empty");

        // Verify descending relevance order
        let relevances: Vec<f64> = recs
            .iter()
            .filter_map(|r| r.get("relevance").and_then(|v| v.as_f64()))
            .collect();
        for window in relevances.windows(2) {
            assert!(
                window[0] >= window[1],
                "Recommendations must be sorted by relevance descending: {} >= {}",
                window[0],
                window[1]
            );
        }
    }

    #[test]
    fn test_recommend_gated_actions_have_zero_relevance() {
        let profile = vm_profile();
        let classification = classify(&profile).unwrap();
        let recs = recommend(&profile, &classification).unwrap();

        for rec in &recs {
            let gated = rec.get("gated").and_then(|v| v.as_bool()).unwrap_or(false);
            if gated {
                let relevance = rec.get("relevance").and_then(|v| v.as_f64()).unwrap_or(1.0);
                assert!(
                    relevance == 0.0,
                    "Gated action {:?} should have relevance 0.0, got {}",
                    rec.get("actionId"),
                    relevance
                );
                let confidence = rec.get("confidence").and_then(|v| v.as_str()).unwrap();
                assert_eq!(
                    confidence, "analyze_only",
                    "Gated action should have confidence 'analyze_only'"
                );
            }
        }
    }

    #[test]
    fn test_build_profile_structure() {
        let profile = gaming_desktop_profile();
        let classification = classify(&profile).unwrap();
        let result = build_profile(&profile, &classification).unwrap();

        assert!(result.get("classification").is_some());
        assert!(result.get("suggestedPreset").is_some());
        assert!(result.get("quickWins").is_some());
        assert!(result.get("recommendations").is_some());
        assert!(result.get("warnings").is_some());
        assert!(result.get("totalActions").is_some());
        assert!(result.get("actionableCount").is_some());

        let quick_wins = result.get("quickWins").unwrap().as_array().unwrap();
        assert!(
            quick_wins.len() <= 5,
            "Quick wins should be at most 5, got {}",
            quick_wins.len()
        );

        let preset = result
            .get("suggestedPreset")
            .and_then(|v| v.as_str())
            .unwrap();
        assert_eq!(
            preset, "competitive_fps",
            "gaming_desktop should suggest competitive_fps preset"
        );
    }

    #[test]
    fn test_vm_recommendations_mostly_low_relevance() {
        let profile = vm_profile();
        let classification = classify(&profile).unwrap();
        let recs = recommend(&profile, &classification).unwrap();

        // VM should have mostly low-relevance hardware tweaks
        let high_relevance_count = recs
            .iter()
            .filter(|r| {
                r.get("relevance")
                    .and_then(|v| v.as_f64())
                    .map(|rel| rel >= 0.7)
                    .unwrap_or(false)
            })
            .count();

        // Privacy is the only category at 0.7 for vm_cautious
        assert!(
            high_relevance_count <= 10,
            "VM should have few high-relevance actions, got {}",
            high_relevance_count
        );
    }
}
