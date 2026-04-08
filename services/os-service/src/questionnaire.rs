use crate::playbook::{ActionStatus, LoadedPlaybook, PlaybookAction, ResolvedPlan};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

pub type QuestionnaireAnswers = BTreeMap<String, Value>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionnaireSchema {
    pub package_id: String,
    pub title: String,
    pub short_description: String,
    pub description: String,
    pub details: String,
    pub version: String,
    pub supported_builds: Vec<u32>,
    pub chapters: Vec<QuestionnaireChapter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionnaireChapter {
    pub id: String,
    pub title: String,
    pub description: String,
    pub kind: String,
    #[serde(default)]
    pub source_prompt: String,
    #[serde(default)]
    pub source_sections: Vec<String>,
    #[serde(default)]
    pub callouts: Vec<String>,
    pub questions: Vec<QuestionnaireQuestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionnaireQuestion {
    pub key: String,
    pub icon: String,
    pub label: String,
    pub title: String,
    pub desc: String,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub kind: String,
    #[serde(default = "default_required")]
    pub required: bool,
    #[serde(default)]
    pub required_value: Option<Value>,
    #[serde(default)]
    pub visibility: Option<QuestionVisibility>,
    pub options: Vec<QuestionOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionVisibility {
    #[serde(default)]
    pub min_preset: Option<String>,
    #[serde(default)]
    pub only_preset: Option<String>,
    #[serde(default)]
    pub min_windows_build: Option<u32>,
    #[serde(default)]
    pub exclude_laptop: Option<bool>,
    #[serde(default)]
    pub exclude_work_pc: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionOption {
    pub value: Value,
    pub title: String,
    pub desc: String,
    #[serde(default)]
    pub badge: Option<String>,
    #[serde(default)]
    pub badge_color: Option<String>,
    #[serde(default)]
    pub danger: Option<bool>,
    #[serde(default)]
    pub behavior: Option<QuestionBehavior>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionBehavior {
    #[serde(default)]
    pub value: Option<Value>,
    #[serde(default)]
    pub include_actions: Vec<String>,
    #[serde(default)]
    pub block_actions: Vec<String>,
    #[serde(default)]
    pub block_reason: Option<String>,
    #[serde(default)]
    pub warnings: Vec<String>,
    #[serde(default)]
    pub requires_reboot: Option<bool>,
    #[serde(default)]
    pub estimated_actions: Option<usize>,
    #[serde(default)]
    pub estimated_blocked: Option<usize>,
    #[serde(default)]
    pub estimated_preserved: Option<usize>,
    #[serde(default)]
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WizardConfigFile {
    package_id: String,
    title: String,
    short_description: String,
    description: String,
    details: String,
    version: String,
    #[serde(default)]
    supported_builds: Vec<u32>,
    #[serde(default)]
    desktop_questions: Vec<WizardQuestionFile>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WizardQuestionFile {
    key: String,
    icon: String,
    label: String,
    title: String,
    desc: String,
    #[serde(default)]
    note: Option<String>,
    #[serde(default)]
    visibility: Option<QuestionVisibility>,
    options: Vec<QuestionOption>,
}

#[derive(Debug, Clone)]
pub struct QuestionnaireContext {
    pub is_laptop: bool,
    pub is_work_pc: bool,
    pub windows_build: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionnaireDecisionEffect {
    pub question_key: String,
    pub question_label: String,
    pub selected_value: Value,
    pub selected_title: String,
    pub included_actions: Vec<String>,
    pub blocked_actions: Vec<String>,
    pub blocked_reason: Option<String>,
    pub warnings: Vec<String>,
    pub requires_reboot: bool,
    pub estimated_actions: usize,
    pub estimated_blocked: usize,
    pub estimated_preserved: usize,
    pub risk_level: String,
    pub option_source_ref: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionnaireDecisionSummary {
    pub estimated_actions: usize,
    pub estimated_blocked: usize,
    pub estimated_preserved: usize,
    pub reboot_required: bool,
    pub risk_level: String,
    pub warnings: Vec<String>,
    pub selected_effects: Vec<QuestionnaireDecisionEffect>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDecisionSource {
    pub effect: String,
    pub question_key: String,
    pub question_label: String,
    pub selected_value: Value,
    pub selected_title: String,
    pub blocked_reason: Option<String>,
    pub warnings: Vec<String>,
    pub risk_level: String,
    pub requires_reboot: bool,
    pub estimated_preserved: usize,
    pub option_source_ref: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDecisionProvenance {
    pub action_id: String,
    pub action_name: String,
    pub phase_id: String,
    pub phase_name: String,
    pub description: String,
    pub default_status: String,
    pub final_status: String,
    pub inclusion_reason: Option<String>,
    pub blocked_reason: Option<String>,
    pub preserved_reason: Option<String>,
    pub reason_origin: String,
    pub warnings: Vec<String>,
    pub risk_level: String,
    pub expert_only: bool,
    pub requires_reboot: bool,
    pub offline_applicable: bool,
    pub image_applicable: bool,
    pub source_question_ids: Vec<String>,
    pub source_option_values: Vec<Value>,
    pub sources: Vec<ActionDecisionSource>,
    pub package_source_ref: String,
    pub journal_record_refs: Vec<String>,
    pub execution_result_ref: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WizardPackageRefs {
    pub manifest_ref: String,
    pub wizard_metadata_ref: String,
    pub resolved_playbook_ref: String,
    pub decision_summary_ref: String,
    pub action_provenance_ref: String,
    pub execution_journal_ref: String,
    pub injection_metadata_ref: String,
    #[serde(default)]
    pub plan_id: Option<String>,
    #[serde(default)]
    pub package_id: Option<String>,
    #[serde(default)]
    pub package_role: Option<String>,
    #[serde(default)]
    pub package_version: Option<String>,
    #[serde(default)]
    pub package_source_ref: Option<String>,
    #[serde(default)]
    pub source_commit: Option<String>,
}

#[derive(Debug, Clone)]
pub struct EvaluatedResolvedPlan {
    pub plan: ResolvedPlan,
    pub decision_summary: QuestionnaireDecisionSummary,
    pub action_provenance: Vec<ActionDecisionProvenance>,
    pub package_refs: WizardPackageRefs,
}

#[derive(Debug, Clone)]
struct QuestionnaireChapterDefinition {
    id: &'static str,
    title: &'static str,
    description: &'static str,
    kind: &'static str,
    source_prompt: &'static str,
    source_sections: &'static [&'static str],
    callouts: &'static [&'static str],
    question_keys: &'static [&'static str],
}

#[derive(Debug, Clone)]
struct ActionDecisionSourceInternal {
    effect: &'static str,
    question_key: String,
    question_label: String,
    selected_value: Value,
    selected_title: String,
    blocked_reason: Option<String>,
    warnings: Vec<String>,
    risk_level: String,
    requires_reboot: bool,
    estimated_preserved: usize,
    option_source_ref: String,
}

fn default_required() -> bool {
    true
}

fn package_refs() -> WizardPackageRefs {
    WizardPackageRefs {
        manifest_ref: "manifest.yaml".to_string(),
        wizard_metadata_ref: "wizard/questionnaire.json".to_string(),
        resolved_playbook_ref: "state/resolved-playbook.json".to_string(),
        decision_summary_ref: "state/decision-summary.json".to_string(),
        action_provenance_ref: "state/action-provenance.json".to_string(),
        execution_journal_ref: "state/execution-journal.json".to_string(),
        injection_metadata_ref: "state/injection-metadata.json".to_string(),
        plan_id: None,
        package_id: Some("redcore-os".to_string()),
        package_role: Some("user-resolved".to_string()),
        package_version: Some("1.0".to_string()),
        package_source_ref: Some("wizard/questionnaire.json".to_string()),
        source_commit: None,
    }
}

fn chapter_definitions() -> Vec<QuestionnaireChapterDefinition> {
    vec![
        QuestionnaireChapterDefinition {
            id: "preset",
            title: "Optimization Level",
            description: "Choose how aggressive the optimization should be. This gates which questions appear in later chapters.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["presets"],
            callouts: &[],
            question_keys: &[
                "aggressionPreset",
            ],
        },
        QuestionnaireChapterDefinition {
            id: "essentials",
            title: "Essential Tweaks",
            description: "Core system changes derived from internal research and community-validated defaults. These are the highest-impact, lowest-risk changes.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["essentials", "power", "storage", "startup"],
            callouts: &[],
            question_keys: &[
                "highPerformancePlan",
                "disableFastStartup",
                "disableHibernation",
                "disableIndexing",
                "disableBackgroundApps",
                "disableSysmain",
                "disableAutomaticMaintenance",
                "optimizeThreadPriority",
                "keepPrinterSupport",
                "keepRemoteAccess",
                "disableAutoplay",
                "disableLastAccessTime",
                "svcHostSplitThreshold",
                "disableFaultTolerantHeap",
            ],
        },
        QuestionnaireChapterDefinition {
            id: "privacy",
            title: "Privacy & Telemetry",
            description: "Remove Microsoft telemetry, consumer tracking, and data collection defaults. Internal telemetry hardening.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["privacy", "telemetry", "essentials"],
            callouts: &[],
            question_keys: &[
                "telemetryLevel",
                "disableActivityFeed",
                "disableClipboardHistory",
                "disableLocation",
                "disableAdvertisingId",
                "disableTailoredExperiences",
                "disableSpeechPersonalization",
                "disableDeliveryOptimization",
                "disableErrorReporting",
                "disableCloudContent",
                "disableWpbt",
                "powershellTelemetryOptout",
            ],
        },
        QuestionnaireChapterDefinition {
            id: "performance",
            title: "Performance & Gaming",
            description: "Gaming optimizations, GPU tweaks, scheduler tuning, and input improvements. Validated against real benchmarks.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["gaming", "gpu", "scheduler", "input"],
            callouts: &[
                "Fullscreen optimizations, timer behavior, and GPU changes should be validated with real frametime traces.",
            ],
            question_keys: &[
                "enableGameMode",
                "disableGameDvr",
                "disableFullscreenOptimizations",
                "legacyFlipPresentation",
                "disableTransparency",
                "disableMouseAcceleration",
                "disableStickyKeys",
                "disableMemoryCompression",
                "disableCoreParking",
                "aggressiveBoostMode",
                "mmcssTuning",
                "disableGpuTelemetry",
                "gpuPstateLock",
                "disableDevicePowerSaving",
            ],
        },
        QuestionnaireChapterDefinition {
            id: "shell",
            title: "Shell & UX Cleanup",
            description: "Remove ads, suggestions, and clutter from the Windows shell. Clean up taskbar, context menus, and Explorer defaults.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["shell", "taskbar", "context-menu", "explorer"],
            callouts: &[],
            question_keys: &[
                "stripSearchWebNoise",
                "edgeBehavior",
                "disableCopilot",
                "disableAiApps",
                "cleanupTaskbar",
                "cleanupContextMenu",
                "cleanupExplorer",
                "enableEndTask",
            ],
        },
        QuestionnaireChapterDefinition {
            id: "network",
            title: "Network & Devices",
            description: "Network stack and device power management changes. Sourced from internal research NIC, USB, and protocol hardening.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["network", "usb", "pcie"],
            callouts: &[
                "Incorrect NIC or power-management tweaks can hurt latency or break connectivity.",
            ],
            question_keys: &[
                "disableNetbios",
                "disableIpv6",
                "disableTeredo",
                "disableNagle",
                "disableUsbSelectiveSuspend",
                "disablePcieLinkStatePm",
            ],
        },
        QuestionnaireChapterDefinition {
            id: "security",
            title: "Security Tradeoffs",
            description: "These reduce overhead by removing protection. Both internal research and internal flag these as expert-only with explicit security warnings.",
            kind: "preferences",
            source_prompt: "internal",
            source_sections: &["security", "defender", "mitigations"],
            callouts: &[
                "If anticheat, corporate policy, or security posture matters, leave these alone unless you have measured the impact.",
            ],
            question_keys: &[
                "disableSmartScreen",
                "disableDefender",
                "disableHvci",
                "disableVbs",
                "reduceMitigations",
                "disableCpuMitigations",
                "disableVulnerableDriverBlocklist",
                "disableWindowsUpdate",
            ],
        },
    ]
}

fn question_context(profile: &str, windows_build: u32) -> QuestionnaireContext {
    QuestionnaireContext {
        is_laptop: matches!(profile, "gaming_laptop" | "office_laptop"),
        is_work_pc: profile == "work_pc",
        windows_build,
    }
}

fn preset_rank(preset: &str) -> usize {
    match preset {
        "conservative" => 0,
        "balanced" => 1,
        "aggressive" => 2,
        "expert" => 3,
        _ => 1,
    }
}

fn normalized_risk_label(risk: &str) -> String {
    match risk.trim().to_lowercase().as_str() {
        "low" | "safe" => "safe".to_string(),
        "medium" | "mixed" => "mixed".to_string(),
        "high" | "aggressive" => "aggressive".to_string(),
        "expert" => "expert".to_string(),
        other => other.to_string(),
    }
}

fn merge_risk(current: &str, next: Option<&str>) -> String {
    let current_rank = preset_rank(&normalized_risk_label(current));
    let next_rank = next
        .map(normalized_risk_label)
        .map(|label| preset_rank(&label))
        .unwrap_or(current_rank);
    if next_rank > current_rank {
        match next_rank {
            0 => "safe".to_string(),
            1 => "mixed".to_string(),
            2 => "aggressive".to_string(),
            _ => "expert".to_string(),
        }
    } else {
        normalized_risk_label(current)
    }
}

fn current_preset(answers: &QuestionnaireAnswers) -> String {
    answers
        .get("aggressionPreset")
        .and_then(Value::as_str)
        .unwrap_or("balanced")
        .to_string()
}

fn question_visible(
    question: &QuestionnaireQuestion,
    answers: &QuestionnaireAnswers,
    context: &QuestionnaireContext,
) -> bool {
    let Some(visibility) = &question.visibility else {
        return true;
    };

    let preset = current_preset(answers);

    if let Some(only_preset) = &visibility.only_preset {
        if preset != *only_preset {
            return false;
        }
    }

    if let Some(min_preset) = &visibility.min_preset {
        if preset_rank(&preset) < preset_rank(min_preset) {
            return false;
        }
    }

    if let Some(min_windows_build) = visibility.min_windows_build {
        if context.windows_build < min_windows_build {
            return false;
        }
    }

    if visibility.exclude_laptop.unwrap_or(false) && context.is_laptop {
        return false;
    }

    if visibility.exclude_work_pc.unwrap_or(false) && context.is_work_pc {
        return false;
    }

    true
}

fn selected_option<'a>(
    question: &'a QuestionnaireQuestion,
    answer: &Value,
) -> Option<(usize, &'a QuestionOption)> {
    question
        .options
        .iter()
        .enumerate()
        .find(|(_, option)| option.value == *answer)
}

fn build_effect(
    question: &QuestionnaireQuestion,
    answer: &Value,
    question_index: usize,
    option_index: usize,
    option: &QuestionOption,
) -> QuestionnaireDecisionEffect {
    let behavior = option.behavior.clone().unwrap_or_default();
    QuestionnaireDecisionEffect {
        question_key: question.key.clone(),
        question_label: question.label.clone(),
        selected_value: answer.clone(),
        selected_title: option.title.clone(),
        included_actions: behavior.include_actions.clone(),
        blocked_actions: behavior.block_actions.clone(),
        blocked_reason: behavior.block_reason.clone(),
        warnings: behavior.warnings.clone(),
        requires_reboot: behavior.requires_reboot.unwrap_or(false),
        estimated_actions: behavior
            .estimated_actions
            .unwrap_or(behavior.include_actions.len()),
        estimated_blocked: behavior
            .estimated_blocked
            .unwrap_or(behavior.block_actions.len()),
        estimated_preserved: behavior.estimated_preserved.unwrap_or(0),
        risk_level: normalized_risk_label(behavior.risk_level.as_deref().unwrap_or("safe")),
        option_source_ref: format!(
            "wizard/questionnaire.json#/questions/{}/options/{}",
            question_index, option_index
        ),
    }
}

fn all_questions(schema: &QuestionnaireSchema) -> Vec<&QuestionnaireQuestion> {
    schema
        .chapters
        .iter()
        .flat_map(|chapter| chapter.questions.iter())
        .collect()
}

pub fn load_questionnaire_schema(
    playbook_dir: &Path,
    playbook: &LoadedPlaybook,
) -> Result<QuestionnaireSchema> {
    let wizard_rel = playbook
        .manifest
        .wizard_config
        .as_deref()
        .unwrap_or("wizard.json");
    let wizard_path = playbook_dir.join(wizard_rel);
    let text = std::fs::read_to_string(&wizard_path)?;
    let file: WizardConfigFile = serde_json::from_str(&text)?;

    let wizard_questions = file
        .desktop_questions
        .into_iter()
        .map(|question| {
            (
                question.key.clone(),
                QuestionnaireQuestion {
                    key: question.key,
                    icon: question.icon,
                    label: question.label,
                    title: question.title,
                    desc: question.desc,
                    note: question.note,
                    kind: "single-choice".to_string(),
                    required: true,
                    required_value: None,
                    visibility: question.visibility,
                    options: question.options,
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    let chapters = chapter_definitions()
        .into_iter()
        .map(|definition| QuestionnaireChapter {
            id: definition.id.to_string(),
            title: definition.title.to_string(),
            description: definition.description.to_string(),
            kind: definition.kind.to_string(),
            source_prompt: definition.source_prompt.to_string(),
            source_sections: definition
                .source_sections
                .iter()
                .map(|value| (*value).to_string())
                .collect(),
            callouts: definition
                .callouts
                .iter()
                .map(|value| (*value).to_string())
                .collect(),
            questions: definition
                .question_keys
                .iter()
                .filter_map(|key| wizard_questions.get(*key).cloned())
                .collect(),
        })
        .filter(|chapter| !chapter.questions.is_empty())
        .collect();

    Ok(QuestionnaireSchema {
        package_id: file.package_id,
        title: file.title,
        short_description: file.short_description,
        description: file.description,
        details: file.details,
        version: file.version,
        supported_builds: file.supported_builds,
        chapters,
    })
}

pub fn evaluate_answers(
    schema: &QuestionnaireSchema,
    answers: &QuestionnaireAnswers,
    context: &QuestionnaireContext,
) -> QuestionnaireDecisionSummary {
    let mut warnings = BTreeSet::new();
    let mut selected_effects = Vec::new();
    let mut estimated_actions = 0usize;
    let mut estimated_blocked = 0usize;
    let mut estimated_preserved = 0usize;
    let mut reboot_required = false;
    let mut risk_level = "safe".to_string();

    for (question_index, question) in all_questions(schema).into_iter().enumerate() {
        if !question_visible(question, answers, context) {
            continue;
        }
        let Some(answer) = answers.get(&question.key) else {
            continue;
        };
        if answer.is_null() {
            continue;
        }
        let Some((option_index, option)) = selected_option(question, answer) else {
            continue;
        };
        let effect = build_effect(question, answer, question_index, option_index, option);
        for warning in &effect.warnings {
            warnings.insert(warning.clone());
        }
        estimated_actions += effect.estimated_actions;
        estimated_blocked += effect.estimated_blocked;
        estimated_preserved += effect.estimated_preserved;
        reboot_required |= effect.requires_reboot;
        risk_level = merge_risk(&risk_level, Some(&effect.risk_level));
        selected_effects.push(effect);
    }

    QuestionnaireDecisionSummary {
        estimated_actions,
        estimated_blocked,
        estimated_preserved,
        reboot_required,
        risk_level,
        warnings: warnings.into_iter().collect(),
        selected_effects,
    }
}

fn find_action_mut<'a>(
    plan: &'a mut ResolvedPlan,
    action_id: &str,
) -> Option<&'a mut crate::playbook::ResolvedAction> {
    for phase in &mut plan.phases {
        if let Some(action) = phase
            .actions
            .iter_mut()
            .find(|entry| entry.action.id == action_id)
        {
            return Some(action);
        }
    }
    None
}

fn include_action(plan: &mut ResolvedPlan, action_id: &str) {
    let Some(action) = find_action_mut(plan, action_id) else {
        return;
    };
    if matches!(
        action.status,
        ActionStatus::Blocked | ActionStatus::BuildGated | ActionStatus::ExpertOnly
    ) {
        return;
    }
    action.status = ActionStatus::Included;
    action.blocked_reason = None;
}

fn block_action(plan: &mut ResolvedPlan, action_id: &str, reason: &str) {
    let Some(action) = find_action_mut(plan, action_id) else {
        return;
    };
    if action.status == ActionStatus::BuildGated {
        return;
    }
    action.status = ActionStatus::Blocked;
    action.blocked_reason = Some(reason.to_string());
}

fn recompute_plan_totals(plan: &mut ResolvedPlan) {
    let mut total_included = 0usize;
    let mut total_blocked = 0usize;
    let mut total_optional = 0usize;
    let mut total_expert_only = 0usize;
    let mut blocked_reasons = Vec::new();

    for phase in &plan.phases {
        for action in &phase.actions {
            match action.status {
                ActionStatus::Included => total_included += 1,
                ActionStatus::Optional => total_optional += 1,
                ActionStatus::ExpertOnly => total_expert_only += 1,
                ActionStatus::Blocked | ActionStatus::BuildGated => {
                    total_blocked += 1;
                    if let Some(reason) = &action.blocked_reason {
                        blocked_reasons.push(crate::playbook::BlockedAction {
                            action_id: action.action.id.clone(),
                            reason: reason.clone(),
                        });
                    }
                }
            }
        }
    }

    plan.total_included = total_included;
    plan.total_blocked = total_blocked;
    plan.total_optional = total_optional;
    plan.total_expert_only = total_expert_only;
    plan.blocked_reasons = blocked_reasons;
}

fn status_label(status: &ActionStatus) -> String {
    match status {
        ActionStatus::Included => "Included".to_string(),
        ActionStatus::Optional => "Optional".to_string(),
        ActionStatus::ExpertOnly => "ExpertOnly".to_string(),
        ActionStatus::Blocked => "Blocked".to_string(),
        ActionStatus::BuildGated => "BuildGated".to_string(),
    }
}

fn derive_action_risk(action: &PlaybookAction) -> String {
    if action.expert_only {
        return "expert".to_string();
    }
    normalized_risk_label(&action.risk)
}

fn find_action_with_phase<'a>(
    plan: &'a ResolvedPlan,
    action_id: &str,
) -> Option<(&'a str, &'a str, &'a crate::playbook::ResolvedAction)> {
    for phase in &plan.phases {
        if let Some(action) = phase
            .actions
            .iter()
            .find(|entry| entry.action.id == action_id)
        {
            return Some((&phase.id, &phase.name, action));
        }
    }
    None
}

fn build_action_provenance(
    base_plan: &ResolvedPlan,
    final_plan: &ResolvedPlan,
    summary: &QuestionnaireDecisionSummary,
) -> Vec<ActionDecisionProvenance> {
    let mut source_map = BTreeMap::<String, Vec<ActionDecisionSourceInternal>>::new();
    for effect in &summary.selected_effects {
        let include_source = ActionDecisionSourceInternal {
            effect: "include",
            question_key: effect.question_key.clone(),
            question_label: effect.question_label.clone(),
            selected_value: effect.selected_value.clone(),
            selected_title: effect.selected_title.clone(),
            blocked_reason: effect.blocked_reason.clone(),
            warnings: effect.warnings.clone(),
            risk_level: effect.risk_level.clone(),
            requires_reboot: effect.requires_reboot,
            estimated_preserved: effect.estimated_preserved,
            option_source_ref: effect.option_source_ref.clone(),
        };
        let block_source = ActionDecisionSourceInternal {
            effect: "block",
            ..include_source.clone()
        };

        for action_id in &effect.included_actions {
            source_map
                .entry(action_id.clone())
                .or_default()
                .push(include_source.clone());
        }
        for action_id in &effect.blocked_actions {
            source_map
                .entry(action_id.clone())
                .or_default()
                .push(block_source.clone());
        }
    }

    let refs = package_refs();
    let mut provenance = Vec::new();

    for phase in &final_plan.phases {
        for action in &phase.actions {
            let base_entry =
                find_action_with_phase(base_plan, &action.action.id).map(|(_, _, action)| action);
            let sources = source_map
                .get(&action.action.id)
                .cloned()
                .unwrap_or_default();
            let mut warnings = BTreeSet::new();
            let mut risk_level = derive_action_risk(&action.action);
            for source in &sources {
                risk_level = merge_risk(&risk_level, Some(&source.risk_level));
                for warning in &source.warnings {
                    warnings.insert(warning.clone());
                }
            }
            if let Some(warning) = &action.action.warning_message {
                warnings.insert(warning.clone());
            }

            let include_sources = sources
                .iter()
                .filter(|source| source.effect == "include")
                .collect::<Vec<_>>();
            let block_sources = sources
                .iter()
                .filter(|source| source.effect == "block")
                .collect::<Vec<_>>();

            let mut reason_origin = "base-playbook".to_string();
            let mut inclusion_reason = None;
            let mut blocked_reason = action.blocked_reason.clone();
            let mut preserved_reason = None;

            if action.status == ActionStatus::BuildGated {
                reason_origin = "build-gate".to_string();
                blocked_reason = action
                    .blocked_reason
                    .clone()
                    .or_else(|| Some("Blocked by Windows build requirements.".to_string()));
            } else if !block_sources.is_empty() && action.status == ActionStatus::Blocked {
                reason_origin = "user-choice".to_string();
                blocked_reason = block_sources[0]
                    .blocked_reason
                    .clone()
                    .or(blocked_reason.clone());
                preserved_reason = blocked_reason.clone();
            } else if !include_sources.is_empty() && action.status == ActionStatus::Included {
                reason_origin = "user-choice".to_string();
                inclusion_reason = Some(format!(
                    "Included because \"{}\" was selected for {}.",
                    include_sources[0].selected_title, include_sources[0].question_label
                ));
            } else if action.status == ActionStatus::Blocked {
                reason_origin = "profile-safeguard".to_string();
                preserved_reason = action
                    .blocked_reason
                    .clone()
                    .or_else(|| Some("Preserved by profile or machine safeguards.".to_string()));
            } else if action.status == ActionStatus::Included {
                inclusion_reason = Some("Included by the base playbook profile.".to_string());
            }

            let entry = ActionDecisionProvenance {
                action_id: action.action.id.clone(),
                action_name: action.action.name.clone(),
                phase_id: phase.id.clone(),
                phase_name: phase.name.clone(),
                description: action.action.description.clone(),
                default_status: base_entry
                    .map(|entry| status_label(&entry.status))
                    .unwrap_or_else(|| status_label(&action.status)),
                final_status: status_label(&action.status),
                inclusion_reason,
                blocked_reason,
                preserved_reason,
                reason_origin,
                warnings: warnings.into_iter().collect(),
                risk_level,
                expert_only: action.action.expert_only,
                requires_reboot: action.action.requires_reboot
                    || sources.iter().any(|source| source.requires_reboot),
                offline_applicable: action.status != ActionStatus::BuildGated,
                image_applicable: action.status != ActionStatus::BuildGated,
                source_question_ids: sources
                    .iter()
                    .map(|source| source.question_key.clone())
                    .collect(),
                source_option_values: sources
                    .iter()
                    .map(|source| source.selected_value.clone())
                    .collect(),
                sources: sources
                    .into_iter()
                    .map(|source| ActionDecisionSource {
                        effect: source.effect.to_string(),
                        question_key: source.question_key,
                        question_label: source.question_label,
                        selected_value: source.selected_value,
                        selected_title: source.selected_title,
                        blocked_reason: source.blocked_reason,
                        warnings: source.warnings,
                        risk_level: source.risk_level,
                        requires_reboot: source.requires_reboot,
                        estimated_preserved: source.estimated_preserved,
                        option_source_ref: source.option_source_ref,
                    })
                    .collect(),
                package_source_ref: String::new(),
                journal_record_refs: Vec::new(),
                execution_result_ref: None,
            };
            provenance.push(entry);
        }
    }

    provenance
        .into_iter()
        .enumerate()
        .map(|(index, mut entry)| {
            entry.package_source_ref = format!("{}#/actions/{}", refs.action_provenance_ref, index);
            entry
        })
        .collect()
}

pub fn evaluate_answers_on_plan(
    schema: &QuestionnaireSchema,
    answers: &QuestionnaireAnswers,
    profile: &str,
    windows_build: u32,
    base_plan: &ResolvedPlan,
) -> EvaluatedResolvedPlan {
    let context = question_context(profile, windows_build);
    let summary = evaluate_answers(schema, answers, &context);
    let mut final_plan = base_plan.clone();

    for effect in &summary.selected_effects {
        for action_id in &effect.included_actions {
            include_action(&mut final_plan, action_id);
        }
        if let Some(reason) = &effect.blocked_reason {
            for action_id in &effect.blocked_actions {
                block_action(&mut final_plan, action_id, reason);
            }
        }
    }

    recompute_plan_totals(&mut final_plan);
    let action_provenance = build_action_provenance(base_plan, &final_plan, &summary);

    EvaluatedResolvedPlan {
        plan: final_plan,
        decision_summary: summary,
        action_provenance,
        package_refs: package_refs(),
    }
}

impl EvaluatedResolvedPlan {
    pub fn to_json(&self) -> Value {
        let mut value = self.plan.to_json();
        if let Some(object) = value.as_object_mut() {
            object.insert(
                "decisionSummary".to_string(),
                serde_json::to_value(&self.decision_summary).unwrap_or_else(|_| json!(null)),
            );
            object.insert(
                "actionProvenance".to_string(),
                serde_json::to_value(&self.action_provenance).unwrap_or_else(|_| json!([])),
            );
            object.insert(
                "packageRefs".to_string(),
                serde_json::to_value(&self.package_refs).unwrap_or_else(|_| json!(null)),
            );
        }
        value
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::playbook;
    use std::path::PathBuf;

    fn playbook_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("playbooks")
    }

    #[test]
    fn loads_backend_questionnaire_schema() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = playbook::load_playbook(&dir).unwrap();
        let schema = load_questionnaire_schema(&dir, &playbook).unwrap();
        assert!(!schema.chapters.is_empty());
        assert!(schema
            .chapters
            .iter()
            .flat_map(|chapter| chapter.questions.iter())
            .any(|question| question.key == "benchmarkReady"));
        assert!(schema
            .chapters
            .iter()
            .flat_map(|chapter| chapter.questions.iter())
            .any(|question| question.key == "highPerformancePlan"));
    }

    #[test]
    fn evaluates_answers_against_resolved_plan() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = playbook::load_playbook(&dir).unwrap();
        let schema = load_questionnaire_schema(&dir, &playbook).unwrap();
        let base_plan =
            playbook::resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));
        let answers = QuestionnaireAnswers::from([
            (
                "aggressionPreset".to_string(),
                Value::String("balanced".to_string()),
            ),
            ("benchmarkReady".to_string(), Value::Bool(true)),
            ("physicalSetupReviewed".to_string(), Value::Bool(true)),
            ("coolingReviewed".to_string(), Value::Bool(true)),
            ("biosTradeoffsReviewed".to_string(), Value::Bool(true)),
            ("stabilityValidated".to_string(), Value::Bool(true)),
            ("offlineInstallPlanReviewed".to_string(), Value::Bool(true)),
            ("highPerformancePlan".to_string(), Value::Bool(true)),
            ("disableIndexing".to_string(), Value::Bool(true)),
        ]);

        let evaluated =
            evaluate_answers_on_plan(&schema, &answers, "gaming_desktop", 22631, &base_plan);
        assert!(evaluated.decision_summary.estimated_actions >= 2);
        assert!(evaluated
            .decision_summary
            .selected_effects
            .iter()
            .any(|effect| effect.question_key == "highPerformancePlan"));
        assert_eq!(evaluated.plan.profile, "gaming_desktop");
        assert!(!evaluated.action_provenance.is_empty());
    }
}
