// ─── Playbook System ────────────────────────────────────────────────────────
// Loads, parses, validates, and merges YAML playbook files into an executable
// transformation plan. This replaces the hardcoded embedded_actions() approach.
//
// Architecture:
//   manifest.yaml → phases → modules (*.yaml) → actions
//   profiles/*.yaml → blockedActions/block, optionalActions, preservationFlags/
//     preserve, inherits (parent profile), and override (per-action default).
//     Escalating an action to default-on can never bypass the executor's
//     protected shell/service/registry guards (see resolver::apply_profile_escalation).
//   The loader produces a PlaybookPlan that the executor consumes.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

mod advisory;
mod loader;
mod resolver;
mod serialization;
mod translation;

use advisory::guide_action_catalog;
pub use loader::{default_playbook_dir, load_playbook};
pub use resolver::resolve_plan;
pub use serialization::playbook_action_to_execution_json;
use translation::{load_source_catalog, winutil_action_catalog};

// ─── Schema types ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    #[serde(rename = "wizardConfig")]
    pub wizard_config: Option<String>,
    #[serde(default = "default_min_build")]
    #[serde(rename = "minWindowsBuild")]
    pub min_windows_build: u32,
    #[serde(default = "default_max_build")]
    #[serde(rename = "maxWindowsBuild")]
    pub max_windows_build: u32,
    pub phases: Vec<Phase>,
    #[serde(default)]
    pub profiles: std::collections::HashMap<String, ProfileRef>,
}

fn default_min_build() -> u32 {
    19041
}
fn default_max_build() -> u32 {
    99999
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Phase {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    #[serde(rename = "type")]
    pub phase_type: Option<String>,
    #[serde(default)]
    pub modules: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileRef {
    pub label: String,
    #[serde(default)]
    pub preset: Option<String>,
    #[serde(default)]
    pub overrides: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookModule {
    pub module: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub actions: Vec<PlaybookAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookAction {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub rationale: String,
    #[serde(default = "default_risk")]
    pub risk: String,
    #[serde(default = "default_tier")]
    pub tier: String,
    #[serde(default = "default_true")]
    pub default: bool,
    #[serde(default)]
    #[serde(rename = "expertOnly")]
    pub expert_only: bool,
    #[serde(default)]
    #[serde(rename = "requiresReboot")]
    pub requires_reboot: bool,
    #[serde(default = "default_true")]
    pub reversible: bool,
    #[serde(default = "default_seconds")]
    #[serde(rename = "estimatedSeconds")]
    pub estimated_seconds: u32,
    #[serde(default)]
    #[serde(rename = "blockedProfiles")]
    pub blocked_profiles: Vec<String>,
    #[serde(default)]
    #[serde(rename = "minWindowsBuild")]
    pub min_windows_build: Option<u32>,
    #[serde(default)]
    #[serde(rename = "registryChanges")]
    pub registry_changes: Vec<RegistryChange>,
    #[serde(default)]
    #[serde(rename = "serviceChanges")]
    pub service_changes: Vec<ServiceChange>,
    #[serde(default)]
    #[serde(rename = "bcdChanges")]
    pub bcd_changes: Vec<BcdChange>,
    #[serde(default)]
    #[serde(rename = "powerChanges")]
    pub power_changes: Vec<PowerChange>,
    #[serde(default)]
    #[serde(rename = "powerShellCommands")]
    pub powershell_commands: Vec<String>,
    #[serde(default)]
    pub packages: Vec<String>,
    #[serde(default)]
    pub tasks: Vec<TaskChange>,
    #[serde(default)]
    #[serde(rename = "fileRenames")]
    pub file_renames: Vec<FileRename>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    #[serde(rename = "warningMessage")]
    pub warning_message: Option<String>,
}

fn default_risk() -> String {
    "safe".into()
}
fn default_tier() -> String {
    "free".into()
}
fn default_true() -> bool {
    true
}
fn default_seconds() -> u32 {
    2
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryChange {
    pub hive: String,
    pub path: String,
    #[serde(rename = "valueName")]
    pub value_name: String,
    pub value: serde_json::Value,
    #[serde(rename = "valueType")]
    pub value_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceChange {
    pub name: String,
    #[serde(rename = "startupType")]
    pub startup_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BcdChange {
    pub element: String,
    #[serde(rename = "newValue")]
    pub new_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerChange {
    #[serde(rename = "settingPath")]
    pub setting_path: String,
    #[serde(rename = "newValue")]
    pub new_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskChange {
    pub name: String,
    pub path: String,
    #[serde(default = "default_disable")]
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileRename {
    pub source: String,
    pub target: String,
    #[serde(default)]
    #[serde(rename = "requiresTrustedInstaller")]
    pub requires_trusted_installer: bool,
    #[serde(default)]
    #[serde(rename = "cpuVendor")]
    pub cpu_vendor: Option<String>,
}

fn default_disable() -> String {
    "disable".into()
}

/// Per-action override declared by a profile. Currently only `default` is
/// meaningful: `true` opts an otherwise-optional action into the plan,
/// `false` demotes a default-on action to optional. Escalation to Included is
/// bounded by the executor's protected-target guards (see resolver).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProfileActionOverride {
    #[serde(default)]
    pub default: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProfileOverride {
    #[serde(default)]
    pub profile: String,
    // Accept both `label:` (work-pc, vm-cautious) and `name:` (gaming-desktop,
    // low-spec, office-laptop) — older profiles used `name`.
    #[serde(default, alias = "name")]
    pub label: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub preset: Option<String>,
    // Accept both `blockedActions:` and the shorthand `block:` used by the
    // inheritance-style profiles.
    #[serde(default, rename = "blockedActions", alias = "block")]
    pub blocked_actions: Vec<String>,
    #[serde(default, rename = "optionalActions")]
    pub optional_actions: Vec<String>,
    // Accept both `preservationFlags:` and the shorthand `preserve:`.
    #[serde(default, rename = "preservationFlags", alias = "preserve")]
    pub preservation_flags: Vec<String>,
    // Parent profile id to inherit blocked/optional/preserve/override from.
    #[serde(default)]
    pub inherits: Option<String>,
    // Per-action default overrides (the `override:` map in the YAML).
    #[serde(default, rename = "override")]
    pub overrides: HashMap<String, ProfileActionOverride>,
    // Informational only — modeled so deny_unknown_fields does not reject the
    // profiles that carry them; not consumed by the resolver.
    #[serde(default)]
    pub modules: Vec<String>,
    #[serde(default)]
    pub notes: Vec<String>,
}

// ─── Loaded playbook (merged result) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybookLoadTrace {
    pub manifest_ref: String,
    pub module_refs: Vec<String>,
    pub profile_override_refs: Vec<String>,
    pub loaded_module_count: usize,
    pub loaded_profile_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybookNormalizationTrace {
    pub declared_phase_count: usize,
    pub loaded_phase_count: usize,
    pub builtin_phase_count: usize,
    pub total_catalog_actions: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionPlanningTrace {
    pub profile: String,
    pub preset: String,
    pub windows_build: u32,
    pub blocked_patterns: Vec<String>,
    pub optional_patterns: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvisoryTrace {
    pub phase_count: usize,
    pub action_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationTrace {
    pub source: String,
    pub source_catalog_ref: String,
    pub phase_count: usize,
    pub translated_action_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionContractTrace {
    pub contract_version: String,
    pub action_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolutionTrace {
    pub load: PlaybookLoadTrace,
    pub normalization: PlaybookNormalizationTrace,
    pub planning: ResolutionPlanningTrace,
    pub advisory: AdvisoryTrace,
    pub translation: TranslationTrace,
    pub execution_contracts: ExecutionContractTrace,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadedPlaybook {
    pub manifest: PlaybookManifest,
    pub phases: Vec<LoadedPhase>,
    pub total_actions: usize,
    pub profiles: Vec<ProfileOverride>,
    pub load_trace: PlaybookLoadTrace,
    pub normalization_trace: PlaybookNormalizationTrace,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadedPhase {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_builtin: bool,
    pub actions: Vec<PlaybookAction>,
}

// ─── Resolved plan (after profile + preset filtering) ───────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedPlan {
    pub profile: String,
    pub preset: String,
    pub phases: Vec<ResolvedPhase>,
    pub total_included: usize,
    pub total_blocked: usize,
    pub total_optional: usize,
    pub total_expert_only: usize,
    pub blocked_reasons: Vec<BlockedAction>,
    pub trace: ResolutionTrace,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedPhase {
    pub id: String,
    pub name: String,
    pub actions: Vec<ResolvedAction>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedAction {
    pub action: PlaybookAction,
    pub status: ActionStatus,
    pub blocked_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum ActionStatus {
    Included,   // Will be applied
    Optional,   // Available but not selected by default
    ExpertOnly, // Hidden unless expert mode
    Blocked,    // Blocked by profile
    BuildGated, // Windows version incompatible
}

#[derive(Debug, Clone, Serialize)]
pub struct BlockedAction {
    pub action_id: String,
    pub reason: String,
}

pub fn find_action_definition(
    playbook_dir: &Path,
    action_id: &str,
) -> anyhow::Result<Option<serde_json::Value>> {
    let playbook = load_playbook(playbook_dir)?;
    let playbook_match = playbook
        .phases
        .iter()
        .flat_map(|phase| phase.actions.iter())
        .find(|action| action.id == action_id)
        .map(playbook_action_to_execution_json);

    if playbook_match.is_some() {
        return Ok(playbook_match);
    }

    Ok(guide_action_catalog()
        .into_iter()
        .find(|action| action.id == action_id)
        .map(|action| playbook_action_to_execution_json(&action))
        .or_else(|| {
            winutil_action_catalog()
                .into_iter()
                .find(|action| action.id == action_id)
                .map(|action| playbook_action_to_execution_json(&action))
        }))
}

// ─── JSON serialization for IPC ─────────────────────────────────────────────

impl ResolvedPlan {
    pub fn to_json(&self) -> serde_json::Value {
        serialization::resolved_plan_to_json(self)
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::{HashMap, HashSet};
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
    fn test_load_manifest() {
        let dir = playbook_dir();
        if !dir.exists() {
            eprintln!("Playbook dir not found at {:?} — skipping", dir);
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        assert!(!playbook.manifest.name.is_empty());
        assert!(playbook.manifest.phases.len() >= 5);
        println!(
            "Loaded playbook: {} actions across {} phases",
            playbook.total_actions,
            playbook.phases.len()
        );
    }

    #[test]
    fn test_resolve_plan_gaming() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(22631));
        assert!(plan.total_included > 0);
        println!(
            "Gaming aggressive: {} included, {} blocked, {} optional",
            plan.total_included, plan.total_blocked, plan.total_optional
        );
    }

    #[test]
    fn test_resolve_plan_work_pc_blocks() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "work_pc", "conservative", Some(22631));

        // Verify work_pc blocks are applied
        let included_ids: HashSet<String> = plan
            .phases
            .iter()
            .flat_map(|p| p.actions.iter())
            .filter(|a| a.status == ActionStatus::Included)
            .map(|a| a.action.id.clone())
            .collect();

        assert!(
            !included_ids.contains("perf.mmcss-system-responsiveness"),
            "MMCSS must be blocked for work_pc"
        );
        assert!(
            !included_ids.contains("shell.reduce-search-box"),
            "Search box reduction must be blocked for work_pc"
        );

        // But safe privacy actions should be included
        assert!(
            included_ids.contains("privacy.disable-advertising-id"),
            "Advertising ID disable should be included for work_pc"
        );

        println!(
            "Work PC: {} included, {} blocked",
            plan.total_included, plan.total_blocked
        );
    }

    #[test]
    fn test_all_actions_have_unique_ids_and_payloads() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let mut seen_ids: HashSet<String> = HashSet::new();

        for phase in &playbook.phases {
            for action in &phase.actions {
                assert!(
                    seen_ids.insert(action.id.clone()),
                    "Duplicate playbook action id: {}",
                    action.id
                );

                let has_payload = !action.registry_changes.is_empty()
                    || !action.service_changes.is_empty()
                    || !action.bcd_changes.is_empty()
                    || !action.power_changes.is_empty()
                    || !action.powershell_commands.is_empty()
                    || !action.packages.is_empty()
                    || !action.tasks.is_empty()
                    || !action.file_renames.is_empty();

                assert!(
                    has_payload,
                    "Playbook action '{}' has no executable payload",
                    action.id
                );
            }
        }
    }

    #[test]
    fn test_build_gated_actions_resolve_by_windows_build() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let old_build = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(22631));
        let new_build = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(26100));

        let old_actions: HashMap<String, ActionStatus> = old_build
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .map(|action| (action.action.id.clone(), action.status.clone()))
            .collect();

        let new_actions: HashMap<String, ActionStatus> = new_build
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .map(|action| (action.action.id.clone(), action.status.clone()))
            .collect();

        assert_eq!(
            old_actions.get("privacy.disable-recall"),
            Some(&ActionStatus::BuildGated),
            "Recall should be gated on older Windows builds",
        );
        assert_eq!(
            old_actions.get("privacy.disable-click-to-do"),
            Some(&ActionStatus::BuildGated),
            "Click to Do should be gated on older Windows builds",
        );
        assert_eq!(
            old_actions.get("shell.enable-end-task"),
            Some(&ActionStatus::Included),
            "End Task should be available on Windows 11 23H2 builds",
        );

        assert_eq!(
            new_actions.get("privacy.disable-recall"),
            Some(&ActionStatus::Included),
            "Recall should resolve on supported Windows builds",
        );
        assert_eq!(
            new_actions.get("privacy.disable-click-to-do"),
            Some(&ActionStatus::Included),
            "Click to Do should resolve on supported Windows builds",
        );
    }

    /// Server-side build-gating contract — the source of truth that replaces the
    /// retired client-side decision-override audits (questionnaire-execution-audit /
    /// verification-matrix). On Windows 10 (22H2, build 19045) every build-specific
    /// action must be BuildGated (Recall/ClickToDo require 26100, End Task 22631).
    #[test]
    fn test_build_gates_exclude_windows10_unsupported_builds() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(19045));
        let actions: HashMap<String, ActionStatus> = plan
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .map(|action| (action.action.id.clone(), action.status.clone()))
            .collect();

        for id in [
            "privacy.disable-recall",
            "privacy.disable-click-to-do",
            "shell.enable-end-task",
        ] {
            assert_eq!(
                actions.get(id),
                Some(&ActionStatus::BuildGated),
                "{id} must be BuildGated on Windows 10 (build 19045)",
            );
        }
    }

    #[test]
    fn test_guide_phases_lead_with_evidence_and_hardware() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));
        let phase_ids: Vec<&str> = plan.phases.iter().map(|phase| phase.id.as_str()).collect();

        assert!(phase_ids.starts_with(&[
            "benchmarking",
            "hardware-foundation",
            "bios-uefi",
            "usb-layout",
            "peripherals",
            "stability-and-clocking",
            "windows-install",
        ]));
        assert!(phase_ids.contains(&"windows-baseline"));
        assert!(phase_ids.contains(&"windows-performance"));
        assert!(phase_ids.contains(&"windows-security"));
    }

    #[test]
    fn test_guide_advisories_are_optional_and_manual() {
        let guide_json = guide_action_catalog()
            .into_iter()
            .find(|action| action.id == "guide.benchmark.capture-baseline")
            .map(|action| playbook_action_to_execution_json(&action))
            .expect("guide benchmark action should exist");

        assert_eq!(
            guide_json
                .get("manualOnly")
                .and_then(|value| value.as_bool()),
            Some(true)
        );
        assert_eq!(
            guide_json
                .get("executionMode")
                .and_then(|value| value.as_str()),
            Some("manual")
        );
        assert_eq!(
            guide_json
                .get("benchmarkRequired")
                .and_then(|value| value.as_bool()),
            Some(true)
        );

        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));
        let action = plan
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .find(|action| action.action.id == "guide.benchmark.capture-baseline")
            .expect("resolved guide benchmark action should exist");

        assert_eq!(action.status, ActionStatus::Optional);
    }

    #[test]
    fn test_find_action_definition_supports_guide_actions() {
        let guide_action = guide_action_catalog()
            .into_iter()
            .find(|action| action.id == "guide.windows.device-layout")
            .expect("guide action should exist");

        let json = playbook_action_to_execution_json(&guide_action);

        assert_eq!(
            json.get("manualOnly").and_then(|value| value.as_bool()),
            Some(true)
        );
        assert_eq!(
            json.get("sourceChapter").and_then(|value| value.as_str()),
            Some("11.8, 11.34-11.39, 11.41.7")
        );
    }

    #[test]
    fn test_winutil_catalog_translates_to_manual_actions() {
        let action = winutil_action_catalog()
            .into_iter()
            .find(|action| action.id == "winutil.WPFTweaksActivity")
            .expect("translated WinUtil action should exist");

        let json = playbook_action_to_execution_json(&action);

        assert_eq!(
            json.get("manualOnly").and_then(|value| value.as_bool()),
            Some(true)
        );
        assert_eq!(
            json.get("sourceVendor").and_then(|value| value.as_str()),
            Some("winutil")
        );
        assert_eq!(
            json.get("sourceCategory").and_then(|value| value.as_str()),
            Some("Essential Tweaks")
        );
        assert_eq!(
            json.get("sourceActionId").and_then(|value| value.as_str()),
            Some("WPFTweaksActivity")
        );
        assert_eq!(
            json.get("sourceOperations")
                .and_then(|value| value.get("registry"))
                .and_then(|value| value.as_u64()),
            Some(3)
        );
    }

    #[test]
    fn test_resolve_plan_includes_winutil_translation_phases() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));

        let phase = plan
            .phases
            .iter()
            .find(|phase| phase.id == "winutil-essential")
            .expect("winutil essential phase should exist");

        assert!(phase
            .actions
            .iter()
            .any(|action| action.action.id == "winutil.WPFTweaksTelemetry"));
        assert!(phase
            .actions
            .iter()
            .all(|action| action.status == ActionStatus::Optional));
    }

    #[test]
    fn test_winutil_catalog_translation_matches_source_catalog_count() {
        let catalog = load_source_catalog().expect("source catalog should load");
        let source_actions = catalog
            .sources
            .iter()
            .find(|entry| entry.source == "winutil")
            .map(|entry| entry.actions.len())
            .expect("winutil source should exist");

        assert_eq!(winutil_action_catalog().len(), source_actions);
    }

    #[test]
    fn test_resolved_plan_contains_all_translated_winutil_actions() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));

        let resolved_winutil_ids: HashSet<String> = plan
            .phases
            .iter()
            .filter(|phase| phase.id.starts_with("winutil-"))
            .flat_map(|phase| phase.actions.iter())
            .map(|action| action.action.id.clone())
            .collect();

        let translated_ids: HashSet<String> = winutil_action_catalog()
            .into_iter()
            .map(|action| action.id)
            .collect();

        assert_eq!(resolved_winutil_ids, translated_ids);
    }

    #[test]
    fn test_winutil_translation_phase_counts_match_source_categories() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));

        let phase_counts: HashMap<&str, usize> = plan
            .phases
            .iter()
            .filter(|phase| phase.id.starts_with("winutil-"))
            .map(|phase| (phase.id.as_str(), phase.actions.len()))
            .collect();

        assert_eq!(phase_counts.get("winutil-essential"), Some(&16));
        assert_eq!(phase_counts.get("winutil-advanced"), Some(&23));
        assert_eq!(phase_counts.get("winutil-preferences"), Some(&19));
        assert_eq!(phase_counts.get("winutil-performance-plans"), Some(&2));
    }

    #[test]
    fn test_playbook_action_definition_preserves_file_renames() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let action = playbook
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .find(|action| action.id == "security.disable-cpu-mitigations")
            .expect("cpu mitigation action should exist");

        assert_eq!(action.file_renames.len(), 2);

        let json = playbook_action_to_execution_json(action);
        assert_eq!(
            json.get("fileRenames")
                .and_then(|value| value.as_array())
                .map(|value| value.len()),
            Some(2)
        );
        assert_eq!(
            json.get("privilegeRequirements")
                .and_then(|value| value.as_array())
                .map(|entries| entries
                    .iter()
                    .any(|entry| entry.as_str() == Some("trustedInstaller"))),
            Some(true)
        );
    }

    #[test]
    fn test_loaded_playbook_captures_load_trace() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        assert!(playbook.load_trace.manifest_ref.ends_with("manifest.yaml"));
        assert!(!playbook.load_trace.module_refs.is_empty());
        assert!(!playbook.load_trace.profile_override_refs.is_empty());
        assert!(playbook.normalization_trace.declared_phase_count >= playbook.phases.len());
        assert_eq!(
            playbook.normalization_trace.total_catalog_actions,
            playbook.total_actions
        );
    }

    #[test]
    fn all_profiles_load_and_inheritance_flattens() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        // Every profile in the manifest must parse. This guards against schema
        // drift and the historic bug where profiles using `inherits/override/
        // preserve/block/name` silently failed to load (or dropped keys).
        assert_eq!(
            playbook.load_trace.loaded_profile_count, 8,
            "all 8 manifest profiles must load successfully"
        );

        // budget_desktop inherits gaming_desktop and declares per-action overrides;
        // after load, inheritance is flattened and the override map is populated.
        let budget = playbook
            .profiles
            .iter()
            .find(|p| p.profile == "budget_desktop")
            .expect("budget_desktop must be loaded");
        assert!(
            budget.inherits.is_none(),
            "inheritance must be flattened at load time"
        );
        assert_eq!(
            budget
                .overrides
                .get("services.disable-sysmain")
                .and_then(|o| o.default),
            Some(true),
            "budget_desktop override:services.disable-sysmain:default=true must parse"
        );
    }

    #[test]
    fn svchost_split_threshold_uses_max_value() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let action = playbook
            .phases
            .iter()
            .flat_map(|phase| &phase.actions)
            .find(|action| action.id == "perf.svchost-split-threshold")
            .expect("perf.svchost-split-threshold must exist");
        let reg = action
            .registry_changes
            .iter()
            .find(|change| change.value_name == "SvcHostSplitThresholdInKB")
            .expect("svchost action must set SvcHostSplitThresholdInKB");
        // Max threshold (0xFFFFFFFF) so services un-split regardless of RAM, matching
        // the built-in catalog. Guards against the old static 64 GB value (67108864),
        // which only un-split on <=64 GB systems, drifting back and creating a
        // YAML-vs-transformer conflict.
        assert_eq!(
            reg.value.as_u64(),
            Some(4294967295),
            "SvcHostSplitThresholdInKB must be 0xFFFFFFFF (RAM-independent un-split)"
        );
    }

    #[test]
    fn mmcss_system_responsiveness_is_consistent() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let values: Vec<Option<u64>> = playbook
            .phases
            .iter()
            .flat_map(|phase| &phase.actions)
            .flat_map(|action| &action.registry_changes)
            .filter(|change| change.value_name == "SystemResponsiveness")
            .map(|change| change.value.as_u64())
            .collect();
        assert!(
            !values.is_empty(),
            "expected at least one MMCSS SystemResponsiveness writer"
        );
        // Every MMCSS SystemResponsiveness writer must agree on 10 so two actions
        // never write conflicting values (10 vs 0) to the same key. 0 is avoided
        // intentionally — it can starve MMCSS audio threads and cause stutter.
        for value in &values {
            assert_eq!(
                *value,
                Some(10),
                "all SystemResponsiveness writers must use 10 (balanced, audio-safe)"
            );
        }
    }

    #[test]
    fn test_resolved_plan_emits_traceable_boundaries() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));
        let json = plan.to_json();

        assert_eq!(
            json.get("resolutionTrace")
                .and_then(|trace| trace.get("planning"))
                .and_then(|planning| planning.get("profile"))
                .and_then(|value| value.as_str()),
            Some("gaming_desktop")
        );
        assert_eq!(
            json.get("resolutionTrace")
                .and_then(|trace| trace.get("translation"))
                .and_then(|translation| translation.get("source"))
                .and_then(|value| value.as_str()),
            Some("winutil")
        );
        assert_eq!(
            json.get("resolutionTrace")
                .and_then(|trace| trace.get("executionContracts"))
                .and_then(|contracts| contracts.get("contractVersion"))
                .and_then(|value| value.as_str()),
            Some("cleanroom.v1")
        );
    }
}
