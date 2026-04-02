
use serde_json::Value;
use std::path::Path;

/// Generate a transformation plan from a system classification.
///
/// Actions are sourced exclusively from the bundled YAML playbooks — there is
/// no embedded fallback copy.  Callers must supply the playbook directory.
pub fn generate_plan(
    classification: &Value,
    preset: &str,
    playbook_dir: &Path,
) -> anyhow::Result<Value> {
    let profile = classification
        .get("primary")
        .and_then(|v| v.as_str())
        .unwrap_or("gaming_desktop");

    let preservation = classification
        .get("preservationFlags")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    tracing::info!(
        profile = profile,
        preset = preset,
        "Generating transformation plan from YAML playbooks"
    );

    let playbook = crate::playbook::load_playbook(playbook_dir)?;
    let mut plan_actions: Vec<Value> = Vec::new();

    for phase in &playbook.phases {
        if phase.is_builtin {
            continue;
        }
        for action in &phase.actions {
            let action_id = action.id.as_str();
            let category = action.category.as_str();

            if is_blocked(action_id, profile, &preservation) {
                tracing::debug!(
                    action_id = action_id,
                    profile = profile,
                    "Action blocked by profile preservation flags"
                );
                continue;
            }

            let risk = action.risk.as_str();
            let include = match preset {
                "conservative" => risk == "safe" || risk == "low",
                "balanced" => risk == "safe" || risk == "low" || risk == "medium",
                "aggressive" => true,
                _ => risk == "safe" || risk == "low" || risk == "medium",
            };

            if include {
                plan_actions.push(serde_json::json!({
                    "id": action_id,
                    "category": category,
                    "name": action.name,
                    "description": action.description,
                    "risk": risk,
                    "blocked": false,
                    "blockedReason": null,
                }));
            }
        }
    }

    let plan_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    Ok(serde_json::json!({
        "id": plan_id,
        "createdAt": now,
        "profile": profile,
        "preset": preset,
        "actionCount": plan_actions.len(),
        "actions": plan_actions,
    }))
}

/// Return all actions from the YAML playbooks, optionally filtered by category.
pub fn get_actions(
    category: Option<&str>,
    playbook_dir: &Path,
) -> anyhow::Result<Vec<Value>> {
    let playbook = crate::playbook::load_playbook(playbook_dir)?;
    let mut result: Vec<Value> = Vec::new();

    for phase in &playbook.phases {
        if phase.is_builtin {
            continue;
        }
        for action in &phase.actions {
            if let Some(cat) = category {
                if action.category.as_str() != cat {
                    continue;
                }
            }
            result.push(crate::playbook::playbook_action_to_execution_json(action));
        }
    }

    Ok(result)
}

fn is_blocked(action_id: &str, profile: &str, preservation: &Value) -> bool {
    match action_id {
        "tasks.disable-onedrive-tasks" => {
            profile == "work_pc"
                || preservation
                    .get("preserveOneDrive")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        }
        "appx.remove-your-phone" => {
            profile == "work_pc"
                || profile == "vm_cautious"
                || preservation
                    .get("preserveAppxPackages")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        }
        id if id.starts_with("appx.") => {
            profile == "vm_cautious"
                || preservation
                    .get("preserveAppxPackages")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        }
        "shell.reduce-search-box" => profile == "work_pc",
        "privacy.disable-location" => profile == "work_pc",
        "tasks.disable-update-orchestrator" => profile == "work_pc",

        "cpu.disable-dynamic-tick" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }
        "cpu.disable-core-parking" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }
        "cpu.aggressive-boost-mode" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }
        "cpu.min-processor-state-100" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }

        "power.high-performance-plan" => profile == "office_laptop",
        "power.disable-usb-selective-suspend" => profile == "office_laptop",
        "power.disable-pcie-link-state-pm" => profile == "office_laptop",

        "gpu.nvidia-disable-dynamic-pstate" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }
        "gpu.msi-mode" => profile == "vm_cautious",

        "services.disable-sysmain" => profile == "work_pc",
        "services.disable-print-spooler" => profile == "work_pc",
        "services.disable-remote-services" => profile == "work_pc",

        "security.reduce-ssbd-mitigation" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }

        "system.disable-windows-update" => profile == "work_pc",

        "startup.disable-gamebar-presence" => profile == "vm_cautious",

        "perf.mmcss-system-responsiveness" => profile == "work_pc",

        "perf.gpu-energy-driver-disable" => profile == "vm_cautious",

        "privacy.disable-smartscreen" => {
            profile == "work_pc" || profile == "vm_cautious"
        }

        "security.disable-defender-realtime" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }
        "security.disable-vbs" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }
        "security.full-defender-disable" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }

        "network.disable-ipv6" => profile == "work_pc",
        "network.disable-llmnr" => profile == "work_pc",
        "network.disable-netbios" => profile == "work_pc",

        "system.disable-update-auto-restart" => profile == "work_pc",
        "system.defer-feature-updates" => profile == "work_pc",

        "gpu.disable-nvidia-telemetry" => profile == "vm_cautious",

        "gpu.disable-amd-telemetry" => profile == "vm_cautious",

        "perf.disable-fullscreen-optimizations" => profile == "work_pc",

        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn playbook_dir() -> std::path::PathBuf {
        let dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("playbooks");
        dir
    }

    fn make_classification(profile: &str) -> Value {
        serde_json::json!({
            "primary": profile,
            "confidence": 0.9,
            "scores": {},
            "signals": {},
            "workIndicators": {},
            "preservationFlags": match profile {
                "work_pc" => serde_json::json!({
                    "preserveOneDrive": true,
                    "preserveAppxPackages": false,
                    "preservePrintSpooler": true,
                    "preserveRdp": false,
                    "preserveGroupPolicy": true,
                }),
                "vm_cautious" => serde_json::json!({
                    "preserveOneDrive": false,
                    "preserveAppxPackages": true,
                    "preservePrintSpooler": false,
                    "preserveRdp": false,
                    "preserveGroupPolicy": false,
                }),
                _ => serde_json::json!({
                    "preserveOneDrive": false,
                    "preserveAppxPackages": false,
                    "preservePrintSpooler": false,
                    "preserveRdp": false,
                    "preserveGroupPolicy": false,
                }),
            },
        })
    }

    #[test]
    fn test_plan_generation_conservative() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("gaming_desktop");
        let plan = generate_plan(&classification, "conservative", &dir).unwrap();

        let actions = plan["actions"].as_array().unwrap();
        for action in actions {
            let risk = action["risk"].as_str().unwrap();
            assert!(
                risk == "safe" || risk == "low",
                "Conservative plan should only contain safe/low-risk actions, found: {}",
                risk
            );
        }
        assert!(
            !actions.is_empty(),
            "Conservative plan should have at least one action"
        );
    }

    #[test]
    fn test_work_pc_blocks_onedrive() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("work_pc");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let has_onedrive = actions
            .iter()
            .any(|a| a["id"].as_str() == Some("tasks.disable-onedrive-tasks"));
        assert!(
            !has_onedrive,
            "work_pc profile must block tasks.disable-onedrive-tasks"
        );
    }

    #[test]
    fn test_vm_blocks_appx() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("vm_cautious");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let has_appx = actions
            .iter()
            .any(|a| {
                a["id"]
                    .as_str()
                    .map(|id| id.starts_with("appx."))
                    .unwrap_or(false)
            });
        assert!(
            !has_appx,
            "vm_cautious profile must block all appx removal actions"
        );
    }

    #[test]
    fn test_action_count_from_yaml() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let all = get_actions(None, &dir).unwrap();
        assert!(
            all.len() >= 50,
            "Expected at least 50 actions from YAML playbooks, got {}",
            all.len()
        );
    }

    #[test]
    fn test_work_pc_blocks_shell_search() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("work_pc");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let has_search = actions
            .iter()
            .any(|a| a["id"].as_str() == Some("shell.reduce-search-box"));
        assert!(
            !has_search,
            "work_pc profile must block shell.reduce-search-box"
        );
    }

    #[test]
    fn test_competitive_mode_allows_aggressive() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("gaming_desktop");
        let plan = generate_plan(&classification, "conservative", &dir).unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a["id"].as_str())
            .collect();

        assert!(
            action_ids.contains(&"cpu.win32-priority-separation"),
            "gaming_desktop conservative should include cpu.win32-priority-separation (risk: low)"
        );
        assert!(
            action_ids.contains(&"power.disable-fast-startup"),
            "gaming_desktop conservative should include power.disable-fast-startup (risk: safe)"
        );
        assert!(
            action_ids.contains(&"display.disable-pointer-acceleration"),
            "gaming_desktop conservative should include display.disable-pointer-acceleration (risk: safe)"
        );
    }

    #[test]
    fn test_office_laptop_blocks_cpu_power() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let mut classification = make_classification("gaming_desktop");
        classification["primary"] = serde_json::json!("office_laptop");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a["id"].as_str())
            .collect();

        assert!(
            !action_ids.contains(&"cpu.disable-core-parking"),
            "office_laptop must block cpu.disable-core-parking"
        );
        assert!(
            !action_ids.contains(&"power.high-performance-plan"),
            "office_laptop must block power.high-performance-plan"
        );
    }

    #[test]
    fn test_work_pc_blocks_atlas_derived() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("work_pc");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();
        let actions = plan["actions"].as_array().unwrap();
        let ids: Vec<&str> = actions.iter().filter_map(|a| a["id"].as_str()).collect();

        assert!(!ids.contains(&"perf.mmcss-system-responsiveness"), "MMCSS must be blocked on work_pc");
        assert!(!ids.contains(&"services.disable-print-spooler"), "Print spooler must be blocked on work_pc");
        assert!(!ids.contains(&"services.disable-remote-services"), "Remote services must be blocked on work_pc");
        assert!(!ids.contains(&"services.disable-sysmain"), "SysMain must be blocked on work_pc");
        assert!(!ids.contains(&"system.disable-windows-update"), "Windows Update must be blocked on work_pc");
        assert!(!ids.contains(&"security.reduce-ssbd-mitigation"), "SSBD must be blocked on work_pc");
    }

    #[test]
    fn test_vm_cautious_blocks_gpu_and_appx() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let classification = make_classification("vm_cautious");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();
        let actions = plan["actions"].as_array().unwrap();
        let ids: Vec<&str> = actions.iter().filter_map(|a| a["id"].as_str()).collect();

        assert!(!ids.contains(&"perf.gpu-energy-driver-disable"), "GPU energy driver must be blocked on vm_cautious");
        assert!(!ids.contains(&"gpu.msi-mode"), "GPU MSI mode must be blocked on vm_cautious");
        assert!(!ids.contains(&"startup.disable-gamebar-presence"), "GameBar presence must be blocked on vm_cautious");

        let appx_count = ids.iter().filter(|id| id.starts_with("appx.")).count();
        assert_eq!(appx_count, 0, "vm_cautious must block all AppX removal actions");

        assert!(ids.contains(&"privacy.disable-advertising-id"), "Privacy actions must be allowed on vm_cautious");
    }

    #[test]
    fn test_office_laptop_blocks_all_battery_draining() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let mut classification = make_classification("gaming_desktop");
        classification["primary"] = serde_json::json!("office_laptop");
        let plan = generate_plan(&classification, "aggressive", &dir).unwrap();
        let actions = plan["actions"].as_array().unwrap();
        let ids: Vec<&str> = actions.iter().filter_map(|a| a["id"].as_str()).collect();

        let must_block = [
            "cpu.disable-dynamic-tick",
            "cpu.disable-core-parking",
            "cpu.aggressive-boost-mode",
            "cpu.min-processor-state-100",
            "power.high-performance-plan",
            "power.disable-usb-selective-suspend",
            "power.disable-pcie-link-state-pm",
            "gpu.nvidia-disable-dynamic-pstate",
        ];
        for blocked in &must_block {
            assert!(!ids.contains(blocked), "office_laptop must block {}", blocked);
        }
    }

    #[test]
    fn test_atlas_derived_actions_have_registry_data() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let all = get_actions(None, &dir).unwrap();
        let atlas_ids = [
            "perf.mmcss-system-responsiveness",
            "perf.disable-service-host-split",
            "perf.gpu-energy-driver-disable",
            "perf.disable-paging-executive",
            "shell.disable-copilot",
            "shutdown.decrease-shutdown-time",
        ];
        for target_id in &atlas_ids {
            let action = all.iter().find(|a| a["id"].as_str() == Some(target_id));
            assert!(action.is_some(), "Atlas-derived action {} must exist in YAML playbooks", target_id);
            let action = action.unwrap();
            let reg = action["registryChanges"].as_array();
            assert!(
                reg.is_some() && !reg.unwrap().is_empty(),
                "Atlas-derived action {} must have registry changes",
                target_id
            );
        }
    }
}
