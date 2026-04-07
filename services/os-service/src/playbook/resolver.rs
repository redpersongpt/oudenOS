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

    let risk_allowed = match preset {
        "conservative" => action.risk == "safe" || action.risk == "low",
        "balanced" => action.risk != "high" && action.risk != "extreme",
        "aggressive" => true,
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
                resolve_action_status(&action, profile, preset, build, &blocked_set, &optional_set)
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
