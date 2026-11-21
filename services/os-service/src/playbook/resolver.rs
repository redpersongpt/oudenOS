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
use crate::facts::{check_requires, ActionExtras, HardwareFacts};
use std::collections::{HashMap, HashSet};

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
    resolve_action_status_with_extras(
        action,
        profile,
        preset,
        build,
        blocked_set,
        optional_set,
        escalate_true,
        escalate_false,
        None,
        &HardwareFacts::default(),
    )
}

pub(crate) fn resolve_action_status_with_extras(
    action: &PlaybookAction,
    profile: &str,
    preset: &str,
    build: u32,
    blocked_set: &HashSet<&str>,
    optional_set: &HashSet<&str>,
    escalate_true: &HashSet<&str>,
    escalate_false: &HashSet<&str>,
    extras: Option<&ActionExtras>,
    facts: &HardwareFacts,
) -> ResolvedAction {
    // Actions the service refuses to execute are never part of a plan.
    if crate::executor::is_retired_unsafe_action(&action.id) {
        return ResolvedAction {
            action: action.clone(),
            status: ActionStatus::Blocked,
            blocked_reason: Some("retired: removed for Windows stability".to_string()),
        };
    }
    if let Some(max_build) = extras.and_then(|e| e.max_windows_build) {
        if build > max_build {
            return ResolvedAction {
                action: action.clone(),
                status: ActionStatus::BuildGated,
                blocked_reason: Some(format!("Not applicable after Windows build {}", max_build)),
            };
        }
    }
    if let Some(requires) = extras.and_then(|e| e.requires.as_ref()) {
        if let Err(reason) = check_requires(requires, facts) {
            return ResolvedAction {
                action: action.clone(),
                status: ActionStatus::Blocked,
                blocked_reason: Some(reason),
            };
        }
    }

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

/// Resolve a loaded playbook into an executable plan for a specific profile and
/// preset, using the service's current hardware facts for `requires` gating.
pub fn resolve_plan(
    playbook: &LoadedPlaybook,
    profile: &str,
    preset: &str,
    windows_build: Option<u32>,
) -> ResolvedPlan {
    resolve_plan_with_facts(
        playbook,
        profile,
        preset,
        windows_build,
        &crate::facts::current_facts(),
    )
}

/// Resolve with explicit hardware facts (tests use synthetic facts).
pub fn resolve_plan_with_facts(
    playbook: &LoadedPlaybook,
    profile: &str,
    preset: &str,
    windows_build: Option<u32>,
    facts: &HardwareFacts,
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
                    resolved_actions.push(resolve_action_status_with_extras(
                        action,
                        profile,
                        preset,
                        build,
                        &blocked_set,
                        &optional_set,
                        &escalate_true,
                        &escalate_false,
                        playbook.action_extras.get(&action.id),
                        facts,
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

    let mut plan = ResolvedPlan {
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
    };
    dedupe_included_actions(&mut plan);
    plan
}

/// Registry targets an action writes, normalized for comparison.
fn registry_targets(action: &PlaybookAction) -> Vec<(String, String, String)> {
    action
        .registry_changes
        .iter()
        .map(|change| {
            (
                change.hive.trim().to_ascii_uppercase(),
                change.path.trim().trim_matches('\\').to_ascii_lowercase(),
                change.value_name.to_ascii_lowercase(),
            )
        })
        .collect()
}

fn has_non_registry_mutations(action: &PlaybookAction) -> bool {
    !action.service_changes.is_empty()
        || !action.bcd_changes.is_empty()
        || !action.power_changes.is_empty()
        || !action.powershell_commands.is_empty()
        || !action.packages.is_empty()
        || !action.tasks.is_empty()
        || !action.file_renames.is_empty()
}

/// Walk Included actions in plan order; an action that only writes registry
/// values all of which an earlier Included action already writes is a
/// duplicate (e.g. perf.disable-gamebar-presence / startup.disable-gamebar-presence)
/// and is Blocked with "Duplicate of <id>". Totals are recomputed.
pub fn dedupe_included_actions(plan: &mut ResolvedPlan) {
    let mut covered: HashMap<(String, String, String), String> = HashMap::new();
    for phase in &mut plan.phases {
        for resolved in &mut phase.actions {
            if resolved.status != ActionStatus::Included {
                continue;
            }
            let targets = registry_targets(&resolved.action);
            if targets.is_empty() {
                continue;
            }
            let duplicate_of = if has_non_registry_mutations(&resolved.action) {
                None
            } else {
                let owners: Vec<&String> = targets.iter().filter_map(|t| covered.get(t)).collect();
                if owners.len() == targets.len() {
                    owners.first().map(|id| (*id).clone())
                } else {
                    None
                }
            };
            match duplicate_of {
                Some(owner) => {
                    resolved.status = ActionStatus::Blocked;
                    resolved.blocked_reason = Some(format!(
                        "Duplicate of {} (writes the same registry values)",
                        owner
                    ));
                }
                None => {
                    for target in targets {
                        covered.entry(target).or_insert_with(|| resolved.action.id.clone());
                    }
                }
            }
        }
    }
    recompute_totals(plan);
}

/// Recompute the plan's totals and blocked reasons from action statuses.
pub(crate) fn recompute_totals(plan: &mut ResolvedPlan) {
    let mut included = 0;
    let mut blocked = 0;
    let mut optional = 0;
    let mut expert = 0;
    let mut reasons = Vec::new();
    for phase in &plan.phases {
        tally_actions(&phase.actions, &mut included, &mut blocked, &mut optional, &mut expert, &mut reasons);
    }
    plan.total_included = included;
    plan.total_blocked = blocked;
    plan.total_optional = optional;
    plan.total_expert_only = expert;
    plan.blocked_reasons = reasons;
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
            delete: false,
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

    #[test]
    fn profile_cannot_escalate_expert_only_action() {
        let mut action = base_action("security.disable-vbs");
        action.expert_only = true;
        let escalate = set(&["security.disable-vbs"]);
        assert_ne!(escalated_status(&action, &escalate), ActionStatus::Included);
    }

    fn with_extras(
        action: &PlaybookAction,
        build: u32,
        extras: &crate::facts::ActionExtras,
        facts: &crate::facts::HardwareFacts,
    ) -> ActionStatus {
        let empty: HashSet<&str> = HashSet::new();
        super::resolve_action_status_with_extras(
            action,
            "gaming_desktop",
            "balanced",
            build,
            &empty,
            &empty,
            &empty,
            &empty,
            Some(extras),
            facts,
        )
        .status
    }

    #[test]
    fn retired_actions_are_blocked_never_included() {
        let mut action = base_action("memory.disable-compression");
        action.default = true;
        let status = escalated_status(&action, &HashSet::new());
        assert_eq!(status, ActionStatus::Blocked);
    }

    #[test]
    fn max_windows_build_gates_newer_builds() {
        let mut action = base_action("shell.legacy-only");
        action.default = true;
        let extras = crate::facts::ActionExtras {
            max_windows_build: Some(22631),
            requires: None,
        };
        let facts = crate::facts::HardwareFacts::default();
        assert_eq!(with_extras(&action, 26100, &extras, &facts), ActionStatus::BuildGated);
        assert_eq!(with_extras(&action, 22631, &extras, &facts), ActionStatus::Included);
    }

    #[test]
    fn hardware_requirements_block_unmet_or_unknown() {
        let mut action = base_action("gpu.nvidia-only");
        action.default = true;
        let extras = crate::facts::ActionExtras {
            max_windows_build: None,
            requires: Some(crate::facts::ActionRequires {
                gpu_vendor: Some("nvidia".into()),
                ..Default::default()
            }),
        };
        let nvidia = crate::facts::HardwareFacts {
            gpu_vendors: Some(vec!["nvidia".into()]),
            ..Default::default()
        };
        let amd = crate::facts::HardwareFacts {
            gpu_vendors: Some(vec!["amd".into()]),
            ..Default::default()
        };
        assert_eq!(with_extras(&action, 26100, &extras, &nvidia), ActionStatus::Included);
        assert_eq!(with_extras(&action, 26100, &extras, &amd), ActionStatus::Blocked);
        assert_eq!(
            with_extras(&action, 26100, &extras, &crate::facts::HardwareFacts::default()),
            ActionStatus::Blocked
        );
    }

    #[test]
    fn duplicate_registry_actions_are_deduplicated() {
        use crate::playbook::{ResolvedAction, ResolvedPhase};
        let change = RegistryChange {
            hive: "HKLM".to_string(),
            path: r"SOFTWARE\X\PresenceWriter".to_string(),
            value_name: "ActivationType".to_string(),
            value: serde_json::json!(0),
            value_type: "DWord".to_string(),
            delete: false,
        };
        let mut first = base_action("perf.disable-gamebar-presence");
        first.registry_changes = vec![change.clone()];
        let mut second = base_action("startup.disable-gamebar-presence");
        second.registry_changes = vec![change];
        let dir = crate::playbook::default_playbook_dir();
        if !dir.exists() {
            return;
        }
        // Only used to obtain a well-formed plan shell; loading is covered by
        // loader::every_declared_action_loads.
        let Ok(playbook) = crate::playbook::load_playbook(&dir) else {
            return;
        };
        let mut plan = super::resolve_plan_with_facts(
            &playbook,
            "gaming_desktop",
            "balanced",
            Some(26100),
            &crate::facts::HardwareFacts::default(),
        );
        plan.phases = vec![ResolvedPhase {
            id: "p".into(),
            name: "P".into(),
            actions: vec![
                ResolvedAction { action: first, status: ActionStatus::Included, blocked_reason: None },
                ResolvedAction { action: second, status: ActionStatus::Included, blocked_reason: None },
            ],
        }];
        super::dedupe_included_actions(&mut plan);
        assert_eq!(plan.phases[0].actions[0].status, ActionStatus::Included);
        assert_eq!(plan.phases[0].actions[1].status, ActionStatus::Blocked);
        assert!(plan.phases[0].actions[1]
            .blocked_reason
            .as_deref()
            .unwrap()
            .contains("perf.disable-gamebar-presence"));
        assert_eq!(plan.total_included, 1);
    }
}
