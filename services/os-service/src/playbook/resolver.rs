use super::advisory::{
    advisory_action_to_playbook_action, guide_action_catalog, guide_phase_blueprints,
};
use super::translation::{
    source_catalog_ref, winutil_action_catalog, winutil_actions_for_phase, winutil_phase_blueprints,
};
use super::{
    ActionStatus, AdvisoryTrace, BlockedAction, ExecutionContractTrace, LoadedPhase,
    LoadedPlaybook, PlaybookAction, ResolutionPlanningTrace, ResolutionTrace, ResolvedAction,
    ResolvedPhase, ResolvedPlan, TranslationTrace,
};
use std::collections::HashSet;

fn find_loaded_phase<'a>(playbook: &'a LoadedPlaybook, phase_id: &str) -> Option<&'a LoadedPhase> {
    playbook.phases.iter().find(|phase| phase.id == phase_id)
}

pub(crate) fn resolve_action_status(
    action: &PlaybookAction,
    profile: &str,
    preset: &str,
    build: u32,
    blocked_set: &HashSet<&str>,
    optional_set: &HashSet<&str>,
    escalate_true: &HashSet<&str>,
    escalate_false: &HashSet<&str>,
) -> ResolvedAction {
    let is_wildcard_blocked = blocked_set.iter().any(|pattern| {
        pattern.ends_with(".*") && action.id.starts_with(&pattern[..pattern.len() - 2])
    });

    let (status, reason) = if is_wildcard_blocked
        || blocked_set.contains(action.id.as_str())
        || action.blocked_profiles.contains(&profile.to_string())
    {
        (
            ActionStatus::Blocked,
            Some(format!("Blocked for {} profile", profile)),
        )
    } else if let Some(min_build) = action.min_windows_build {
        if build < min_build {
            (
                ActionStatus::BuildGated,
                Some(format!("Requires Windows build {} or later", min_build)),
            )
        } else {
            determine_inclusion(action, optional_set)
        }
    } else {
        determine_inclusion(action, optional_set)
    };

    // Profile per-action override. A profile may demote a default-on action to
    // optional, or escalate an otherwise-optional action into the plan. Crucial
    // safety boundary: escalation can NEVER promote an expert-only, high/extreme
    // risk, or protected-target (shell/login/security) action into Included.
    // The executor apply-time guards remain authoritative regardless.
    let (status, reason) =
        apply_profile_escalation(action, status, reason, escalate_true, escalate_false);

    let risk_allowed = match preset {
        "conservative" => action.risk == "safe" || action.risk == "low",
        "balanced" => action.risk != "high" && action.risk != "extreme",
        "aggressive" => !action.expert_only && action.risk != "extreme",
        _ => action.risk == "safe" || action.risk == "low",
    };

    let mut final_status = if status == ActionStatus::Included && !risk_allowed {
        ActionStatus::Optional
    } else {
        status
    };

    if action.tags.iter().any(|tag| tag == "manual-only") && final_status == ActionStatus::Included
    {
        final_status = ActionStatus::Optional;
    }

    ResolvedAction {
        action: action.clone(),
        status: final_status,
        blocked_reason: reason,
    }
}

/// Apply a profile's per-action `override` to a freshly-determined status.
/// `escalate_false` demotes a default-on action to Optional (always safe).
/// `escalate_true` opts an Optional action into Included, but ONLY when the
/// action is not expert-only, not high/extreme risk, and does not touch a
/// protected shell/login/security target — otherwise the escalation is refused
/// and the action stays Optional. This keeps a profile from quietly forcing a
/// dangerous change on; the executor guards are the authoritative backstop.
fn apply_profile_escalation(
    action: &PlaybookAction,
    status: ActionStatus,
    reason: Option<String>,
    escalate_true: &HashSet<&str>,
    escalate_false: &HashSet<&str>,
) -> (ActionStatus, Option<String>) {
    let id = action.id.as_str();
    match status {
        ActionStatus::Optional if escalate_true.contains(id) => {
            if action.expert_only
                || action.risk == "high"
                || action.risk == "extreme"
                || crate::executor::action_hits_protected_target(action)
            {
                (
                    ActionStatus::Optional,
                    Some(format!(
                        "Profile escalation refused: '{}' is expert-only, high-risk, or affects a protected shell/login/security target",
                        id
                    )),
                )
            } else {
                (ActionStatus::Included, None)
            }
        }
        ActionStatus::Included if escalate_false.contains(id) => (
            ActionStatus::Optional,
            Some("Set optional by profile override".to_string()),
        ),
        other => (other, reason),
    }
}

/// Resolve a loaded playbook into an executable plan for a specific profile and preset.
pub fn resolve_plan(
    playbook: &LoadedPlaybook,
    profile: &str,
    preset: &str,
    windows_build: Option<u32>,
) -> ResolvedPlan {
    let profile_override = playbook.profiles.iter().find(|p| p.profile == profile);
    let blocked_set: HashSet<&str> = profile_override
        .map(|override_data| {
            override_data
                .blocked_actions
                .iter()
                .map(|s| s.as_str())
                .collect()
        })
        .unwrap_or_default();
    let optional_set: HashSet<&str> = profile_override
        .map(|override_data| {
            override_data
                .optional_actions
                .iter()
                .map(|s| s.as_str())
                .collect()
        })
        .unwrap_or_default();
    // Per-action `override:` escalations/demotions from the profile.
    let escalate_true: HashSet<&str> = profile_override
        .map(|override_data| {
            override_data
                .overrides
                .iter()
                .filter_map(|(id, ov)| (ov.default == Some(true)).then_some(id.as_str()))
                .collect()
        })
        .unwrap_or_default();
    let escalate_false: HashSet<&str> = profile_override
        .map(|override_data| {
            override_data
                .overrides
                .iter()
                .filter_map(|(id, ov)| (ov.default == Some(false)).then_some(id.as_str()))
                .collect()
        })
        .unwrap_or_default();

    let build = windows_build.unwrap_or(22631);

    let guide_phases = guide_phase_blueprints();
    let translated_phases = winutil_phase_blueprints();
    let translated_catalog = winutil_action_catalog();

    let mut resolved_phases = Vec::new();
    let mut total_included = 0;
    let mut total_blocked = 0;
    let mut total_optional = 0;
    let mut total_expert = 0;
    let mut blocked_reasons = Vec::new();

    for phase in &guide_phases {
        let mut resolved_actions = Vec::new();

        for advisory_action in &phase.advisory_actions {
            resolved_actions.push(resolve_action_status(
                &advisory_action_to_playbook_action(phase.chapter, phase.id, advisory_action),
                profile,
                preset,
                build,
                &blocked_set,
                &optional_set,
                &escalate_true,
                &escalate_false,
            ));
        }

        for loaded_phase_id in &phase.loaded_phase_ids {
            if let Some(loaded_phase) = find_loaded_phase(playbook, loaded_phase_id) {
                if loaded_phase.is_builtin {
                    continue;
                }

                for action in &loaded_phase.actions {
                    resolved_actions.push(resolve_action_status(
                        action,
                        profile,
                        preset,
                        build,
                        &blocked_set,
                        &optional_set,
                        &escalate_true,
                        &escalate_false,
                    ));
                }
            }
        }

        tally_actions(
            &resolved_actions,
            &mut total_included,
            &mut total_blocked,
            &mut total_optional,
            &mut total_expert,
            &mut blocked_reasons,
        );

        if !resolved_actions.is_empty() {
            resolved_phases.push(ResolvedPhase {
                id: phase.id.to_string(),
                name: phase.name.to_string(),
                actions: resolved_actions,
            });
        }
    }

    for phase in &translated_phases {
        let resolved_actions: Vec<ResolvedAction> = winutil_actions_for_phase(phase)
            .into_iter()
            .map(|action| {
                resolve_action_status(
                    &action,
                    profile,
                    preset,
                    build,
                    &blocked_set,
                    &optional_set,
                    &escalate_true,
                    &escalate_false,
                )
            })
            .collect();

        tally_actions(
            &resolved_actions,
            &mut total_included,
            &mut total_blocked,
            &mut total_optional,
            &mut total_expert,
            &mut blocked_reasons,
        );

        if !resolved_actions.is_empty() {
            resolved_phases.push(ResolvedPhase {
                id: phase.id.to_string(),
                name: phase.name.to_string(),
                actions: resolved_actions,
            });
        }
    }

    let resolved_action_count = total_action_count(&resolved_phases);

    ResolvedPlan {
        profile: profile.to_string(),
        preset: preset.to_string(),
        phases: resolved_phases,
        total_included,
        total_blocked,
        total_optional,
        total_expert_only: total_expert,
        blocked_reasons,
        trace: ResolutionTrace {
            load: playbook.load_trace.clone(),
            normalization: playbook.normalization_trace.clone(),
            planning: ResolutionPlanningTrace {
                profile: profile.to_string(),
                preset: preset.to_string(),
                windows_build: build,
                blocked_patterns: blocked_set
                    .iter()
                    .map(|entry| (*entry).to_string())
                    .collect(),
                optional_patterns: optional_set
                    .iter()
                    .map(|entry| (*entry).to_string())
                    .collect(),
            },
            advisory: AdvisoryTrace {
                phase_count: guide_phases.len(),
                action_count: guide_action_catalog().len(),
            },
            translation: TranslationTrace {
                source: "winutil".to_string(),
                source_catalog_ref: source_catalog_ref(),
                phase_count: translated_phases.len(),
                translated_action_count: translated_catalog.len(),
            },
            execution_contracts: ExecutionContractTrace {
                contract_version: "cleanroom.v1".to_string(),
                action_count: resolved_action_count,
            },
        },
    }
}

fn determine_inclusion(
    action: &PlaybookAction,
    optional_set: &HashSet<&str>,
) -> (ActionStatus, Option<String>) {
    if action.expert_only {
        (ActionStatus::ExpertOnly, Some("Expert-only action".into()))
    } else if optional_set.contains(action.id.as_str()) || !action.default {
        (ActionStatus::Optional, None)
    } else {
        (ActionStatus::Included, None)
    }
}

fn tally_actions(
    resolved_actions: &[ResolvedAction],
    total_included: &mut usize,
    total_blocked: &mut usize,
    total_optional: &mut usize,
    total_expert: &mut usize,
    blocked_reasons: &mut Vec<BlockedAction>,
) {
    for action in resolved_actions {
        match &action.status {
            ActionStatus::Included => *total_included += 1,
            ActionStatus::Blocked | ActionStatus::BuildGated => {
                *total_blocked += 1;
                if let Some(reason) = &action.blocked_reason {
                    blocked_reasons.push(BlockedAction {
                        action_id: action.action.id.clone(),
                        reason: reason.clone(),
                    });
                }
            }
            ActionStatus::Optional => *total_optional += 1,
            ActionStatus::ExpertOnly => *total_expert += 1,
        }
    }
}

fn total_action_count(phases: &[ResolvedPhase]) -> usize {
    phases.iter().map(|phase| phase.actions.len()).sum()
}

#[cfg(test)]
mod tests {
    use super::resolve_action_status;
    use crate::playbook::{ActionStatus, PlaybookAction, RegistryChange, ServiceChange};
    use std::collections::HashSet;

    fn base_action(id: &str) -> PlaybookAction {
        PlaybookAction {
            id: id.to_string(),
            name: "Test action".to_string(),
            description: String::new(),
            rationale: String::new(),
            risk: "low".to_string(),
            tier: "free".to_string(),
            default: false,
            expert_only: false,
            requires_reboot: false,
            reversible: true,
            estimated_seconds: 2,
            blocked_profiles: Vec::new(),
            min_windows_build: None,
            registry_changes: Vec::new(),
            service_changes: Vec::new(),
            bcd_changes: Vec::new(),
            power_changes: Vec::new(),
            powershell_commands: Vec::new(),
            packages: Vec::new(),
            tasks: Vec::new(),
            file_renames: Vec::new(),
            tags: Vec::new(),
            warning_message: None,
        }
    }

    fn set(items: &[&'static str]) -> HashSet<&'static str> {
        items.iter().copied().collect()
    }

    // Resolve a single action under a profile that escalates `escalate` to
    // default-on. balanced preset / build 22631 are representative.
    fn escalated_status(action: &PlaybookAction, escalate: &HashSet<&str>) -> ActionStatus {
        let empty: HashSet<&str> = HashSet::new();
        resolve_action_status(
            action,
            "gaming_desktop",
            "balanced",
            22631,
            &empty,
            &empty,
            escalate,
            &empty,
        )
        .status
    }

    #[test]
    fn profile_escalates_safe_optional_action_into_included() {
        let action = base_action("perf.safe-tweak");
        let escalate = set(&["perf.safe-tweak"]);
        assert_eq!(escalated_status(&action, &escalate), ActionStatus::Included);
    }

    #[test]
    fn profile_cannot_escalate_protected_service_action() {
        let mut action = base_action("services.disable-dcomlaunch");
        action.service_changes = vec![ServiceChange {
            name: "DcomLaunch".to_string(),
            startup_type: "Disabled".to_string(),
        }];
        let escalate = set(&["services.disable-dcomlaunch"]);
        assert_ne!(
            escalated_status(&action, &escalate),
            ActionStatus::Included,
            "a profile must never escalate an action that disables a protected service"
        );
    }

    #[test]
    fn profile_cannot_escalate_shell_coupled_package_action() {
        let mut action = base_action("appx.remove-search");
        action.packages = vec!["Microsoft.Windows.Search".to_string()];
        let escalate = set(&["appx.remove-search"]);
        assert_ne!(
            escalated_status(&action, &escalate),
            ActionStatus::Included,
            "a profile must never escalate removal of a shell-coupled package"
        );
    }

    #[test]
    fn profile_cannot_escalate_catastrophic_registry_action() {
        let mut action = base_action("shell.hijack-winlogon");
        action.registry_changes = vec![RegistryChange {
            hive: "HKLM".to_string(),
            path: r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon".to_string(),
            value_name: "Shell".to_string(),
            value: serde_json::json!("malware.exe"),
            value_type: "String".to_string(),
        }];
        let escalate = set(&["shell.hijack-winlogon"]);
        assert_ne!(
            escalated_status(&action, &escalate),
            ActionStatus::Included,
            "a profile must never escalate a Winlogon Shell hijack"
        );
    }

    #[test]
    fn profile_cannot_escalate_high_risk_security_action() {
        let mut action = base_action("privacy.disable-smartscreen");
        action.risk = "high".to_string();
        let escalate = set(&["privacy.disable-smartscreen"]);
        assert_ne!(
            escalated_status(&action, &escalate),
            ActionStatus::Included,
            "a profile must never force a high-risk security action on by default"
        );
    }

    #[test]
    fn profile_default_false_override_demotes_included_action() {
        let mut action = base_action("perf.default-on");
        action.default = true;
        let empty: HashSet<&str> = HashSet::new();
        let escalate_false = set(&["perf.default-on"]);
        let status = resolve_action_status(
            &action,
            "gaming_desktop",
            "balanced",
            22631,
            &empty,
            &empty,
            &empty,
            &escalate_false,
        )
        .status;
        assert_eq!(status, ActionStatus::Optional);
    }
}
