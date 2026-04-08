// ─── Machine Classifier ─────────────────────────────────────────────────────
// Classifies a system into one of five profiles based on assessment signals.
// Profiles: gaming_desktop, office_laptop, work_pc, vm_cautious, low_spec_system.

use serde_json::Value;

/// Classify a machine based on assessment data.
/// Returns: { primary, confidence, scores, signals, workIndicators, preservationFlags }
pub fn classify(assessment: &Value) -> anyhow::Result<Value> {
    tracing::info!("Classifying machine from assessment data");

    let work_signals = assessment
        .get("workSignals")
        .cloned()
        .unwrap_or(Value::Null);
    let vm_data = assessment.get("vm").cloned().unwrap_or(Value::Null);
    let hw = assessment.get("hardware").cloned().unwrap_or(Value::Null);

    // ── Extract signals ────────────────────────────────────────────────────

    let domain_joined = work_signals
        .get("domainJoined")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let print_spooler_running = work_signals
        .get("printSpooler")
        .and_then(|v| v.as_str())
        .map(|s| s == "Running")
        .unwrap_or(false);

    let rdp_denied = work_signals
        .get("rdpDenied")
        .and_then(|v| v.as_i64())
        .unwrap_or(1);
    let rdp_enabled = rdp_denied == 0;

    let gp_running = work_signals
        .get("groupPolicyClient")
        .and_then(|v| v.as_str())
        .map(|s| s == "Running")
        .unwrap_or(false);

    let is_vm = vm_data
        .get("isVM")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let ram_gb = hw.get("ramGb").and_then(|v| v.as_u64()).unwrap_or(8) as u32;

    let cpu_cores = hw
        .get("cpu")
        .and_then(|c| c.get("NumberOfCores"))
        .and_then(|v| v.as_u64())
        .unwrap_or(4) as u32;

    let cpu_logical = hw
        .get("cpu")
        .and_then(|c| c.get("NumberOfLogicalProcessors"))
        .and_then(|v| v.as_u64())
        .unwrap_or(4) as u32;

    // Detect discrete GPU (adapter RAM > 2 GB suggests discrete)
    let has_discrete_gpu = hw
        .get("gpu")
        .and_then(|g| {
            if g.is_array() {
                g.as_array().map(|arr| {
                    arr.iter().any(|gpu| {
                        gpu.get("AdapterRAM")
                            .and_then(|r| r.as_u64())
                            .map(|r| r > 2_000_000_000)
                            .unwrap_or(false)
                    })
                })
            } else {
                // Single GPU object
                Some(
                    g.get("AdapterRAM")
                        .and_then(|r| r.as_u64())
                        .map(|r| r > 2_000_000_000)
                        .unwrap_or(false),
                )
            }
        })
        .unwrap_or(false);

    // Detect laptop form factor heuristic: model name contains "laptop"/"notebook",
    // or battery present (simulated by checking model string patterns)
    let model = vm_data.get("model").and_then(|v| v.as_str()).unwrap_or("");
    let is_laptop = model.to_lowercase().contains("laptop")
        || model.to_lowercase().contains("notebook")
        || model.to_lowercase().contains("surface");

    // ── Score each profile ─────────────────────────────────────────────────

    let mut scores = ProfileScores::default();

    // work_pc: domainJoined OR printSpooler=Running OR rdpEnabled OR gpRunning
    if domain_joined {
        scores.work_pc += 40.0;
    }
    if print_spooler_running {
        scores.work_pc += 15.0;
    }
    if rdp_enabled {
        scores.work_pc += 20.0;
    }
    if gp_running {
        scores.work_pc += 15.0;
    }
    // Baseline: any machine with some signals gets partial credit
    if scores.work_pc > 0.0 {
        scores.work_pc += 10.0;
    }

    // vm_cautious: isVM is the primary signal
    if is_vm {
        scores.vm_cautious += 90.0;
    }

    // low_spec_system: ramGb <= 8 AND cores <= 4
    if ram_gb <= 8 && cpu_cores <= 4 {
        scores.low_spec += 80.0;
    } else if ram_gb <= 8 {
        scores.low_spec += 40.0;
    } else if cpu_cores <= 4 {
        scores.low_spec += 30.0;
    }

    // gaming_desktop: desktop + ramGb >= 16 + discrete GPU
    if !is_laptop && !is_vm && ram_gb >= 16 && has_discrete_gpu {
        scores.gaming_desktop += 70.0;
    }
    if has_discrete_gpu {
        scores.gaming_desktop += 15.0;
    }
    if ram_gb >= 32 {
        scores.gaming_desktop += 10.0;
    }
    if cpu_logical >= 12 {
        scores.gaming_desktop += 5.0;
    }

    // office_laptop: laptop form factor, moderate specs
    if is_laptop {
        scores.office_laptop += 50.0;
    }
    if !has_discrete_gpu && !is_vm {
        scores.office_laptop += 15.0;
    }
    if ram_gb >= 8 && ram_gb <= 16 {
        scores.office_laptop += 10.0;
    }

    // Normalize so they sum to useful values
    let max_score = scores
        .all()
        .iter()
        .copied()
        .fold(0.0_f64, f64::max)
        .max(1.0);

    let normalized = scores.normalized(max_score);

    // Pick primary
    let (primary, confidence) = normalized.primary();

    // Work indicators for preservation decisions
    let work_indicators = serde_json::json!({
        "domainJoined": domain_joined,
        "printSpoolerRunning": print_spooler_running,
        "rdpEnabled": rdp_enabled,
        "groupPolicyRunning": gp_running,
    });

    // Preservation flags: what must NOT be touched for this profile
    let preservation_flags = compute_preservation_flags(&primary, &work_indicators);

    let signals = serde_json::json!({
        "isVM": is_vm,
        "isLaptop": is_laptop,
        "hasDiscreteGpu": has_discrete_gpu,
        "ramGb": ram_gb,
        "cpuCores": cpu_cores,
        "cpuLogicalProcessors": cpu_logical,
    });

    tracing::info!(
        primary = primary,
        confidence = confidence,
        "Classification complete"
    );

    Ok(serde_json::json!({
        "primary": primary,
        "confidence": confidence,
        "scores": {
            "gaming_desktop": normalized.gaming_desktop,
            "office_laptop": normalized.office_laptop,
            "work_pc": normalized.work_pc,
            "vm_cautious": normalized.vm_cautious,
            "low_spec_system": normalized.low_spec,
        },
        "signals": signals,
        "workIndicators": work_indicators,
        "preservationFlags": preservation_flags,
    }))
}

// ─── Internal types ─────────────────────────────────────────────────────────

#[derive(Default)]
struct ProfileScores {
    gaming_desktop: f64,
    office_laptop: f64,
    work_pc: f64,
    vm_cautious: f64,
    low_spec: f64,
}

impl ProfileScores {
    fn all(&self) -> [f64; 5] {
        [
            self.gaming_desktop,
            self.office_laptop,
            self.work_pc,
            self.vm_cautious,
            self.low_spec,
        ]
    }

    fn normalized(&self, max: f64) -> ProfileScores {
        ProfileScores {
            gaming_desktop: self.gaming_desktop / max,
            office_laptop: self.office_laptop / max,
            work_pc: self.work_pc / max,
            vm_cautious: self.vm_cautious / max,
            low_spec: self.low_spec / max,
        }
    }

    fn primary(&self) -> (String, f64) {
        let pairs = [
            ("gaming_desktop", self.gaming_desktop),
            ("office_laptop", self.office_laptop),
            ("work_pc", self.work_pc),
            ("vm_cautious", self.vm_cautious),
            ("low_spec_system", self.low_spec),
        ];
        let (name, score) = pairs
            .iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            // SAFETY: `pairs` is a non-empty fixed-size array of 5 elements
            .expect("ProfileScores::primary called on non-empty array");
        (name.to_string(), *score)
    }
}

fn compute_preservation_flags(profile: &str, work_indicators: &Value) -> Value {
    let mut flags = serde_json::json!({
        "preserveOneDrive": false,
        "preserveAppxPackages": false,
        "preservePrintSpooler": false,
        "preserveRdp": false,
        "preserveGroupPolicy": false,
    });

    match profile {
        "work_pc" => {
            flags["preserveOneDrive"] = Value::Bool(true);
            flags["preservePrintSpooler"] = Value::Bool(true);
            flags["preserveGroupPolicy"] = Value::Bool(true);
            if work_indicators
                .get("rdpEnabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
            {
                flags["preserveRdp"] = Value::Bool(true);
            }
        }
        "office_laptop" => {
            // Office laptops likely print and may use OneDrive
            flags["preserveOneDrive"] = Value::Bool(true);
            flags["preservePrintSpooler"] = Value::Bool(true);
            flags["preserveGroupPolicy"] = Value::Bool(true);
        }
        "workstation" => {
            // Pro workstations: printing, Group Policy, RDP likely
            flags["preservePrintSpooler"] = Value::Bool(true);
            flags["preserveGroupPolicy"] = Value::Bool(true);
            flags["preserveRdp"] = Value::Bool(true);
        }
        "vm_cautious" => {
            // VMs: keep AppX (store apps may be the point), keep Group Policy
            flags["preserveAppxPackages"] = Value::Bool(true);
            flags["preserveGroupPolicy"] = Value::Bool(true);
        }
        // gaming_desktop, gaming_laptop, low_spec_system, budget_desktop:
        // No preservation — these are personal machines, nuke everything the user allows
        _ => {}
    }

    flags
}
