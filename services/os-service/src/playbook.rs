
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};

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

fn default_min_build() -> u32 { 19041 }
fn default_max_build() -> u32 { 99999 }

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
    pub tags: Vec<String>,
    #[serde(default)]
    #[serde(rename = "warningMessage")]
    pub warning_message: Option<String>,
}

fn default_risk() -> String { "safe".into() }
fn default_tier() -> String { "free".into() }
fn default_true() -> bool { true }
fn default_seconds() -> u32 { 2 }

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

fn default_disable() -> String { "disable".into() }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileOverride {
    pub profile: String,
    pub label: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub preset: Option<String>,
    #[serde(default)]
    #[serde(rename = "blockedActions")]
    pub blocked_actions: Vec<String>,
    #[serde(default)]
    #[serde(rename = "optionalActions")]
    pub optional_actions: Vec<String>,
    #[serde(default)]
    #[serde(rename = "preservationFlags")]
    pub preservation_flags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadedPlaybook {
    pub manifest: PlaybookManifest,
    pub phases: Vec<LoadedPhase>,
    pub total_actions: usize,
    pub profiles: Vec<ProfileOverride>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadedPhase {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_builtin: bool,
    pub actions: Vec<PlaybookAction>,
}

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
    Included,       // Will be applied
    Optional,       // Available but not selected by default
    ExpertOnly,     // Hidden unless expert mode
    Blocked,        // Blocked by profile
    BuildGated,     // Windows version incompatible
}

#[derive(Debug, Clone, Serialize)]
pub struct BlockedAction {
    pub action_id: String,
    pub reason: String,
}

pub fn load_playbook(playbook_dir: &Path) -> anyhow::Result<LoadedPlaybook> {
    let manifest_path = playbook_dir.join("manifest.yaml");
    let manifest_text = std::fs::read_to_string(&manifest_path)
        .map_err(|e| anyhow::anyhow!("Failed to read manifest.yaml: {}", e))?;
    let manifest: PlaybookManifest = serde_yaml::from_str(&manifest_text)
        .map_err(|e| anyhow::anyhow!("Failed to parse manifest.yaml: {}", e))?;

    tracing::info!(
        name = manifest.name.as_str(),
        version = manifest.version.as_str(),
        phases = manifest.phases.len(),
        "Loading playbook"
    );

    let mut phases: Vec<LoadedPhase> = Vec::new();
    let mut total_actions = 0usize;

    for phase in &manifest.phases {
        let is_builtin = phase.phase_type.as_deref() == Some("builtin");
        let mut phase_actions: Vec<PlaybookAction> = Vec::new();

        if !is_builtin {
            for module_path in &phase.modules {
                if module_path.contains("..") {
                    tracing::error!(
                        path = module_path.as_str(),
                        "Playbook module path contains '..', skipping (possible path traversal)"
                    );
                    continue;
                }
                let full_path = playbook_dir.join(module_path);
                match load_module(&full_path) {
                    Ok(module) => {
                        tracing::debug!(
                            module = module.module.as_str(),
                            actions = module.actions.len(),
                            "Loaded playbook module"
                        );
                        phase_actions.extend(module.actions);
                    }
                    Err(e) => {
                        tracing::warn!(
                            path = module_path.as_str(),
                            error = %e,
                            "Failed to load playbook module — skipping"
                        );
                    }
                }
            }
        }

        total_actions += phase_actions.len();
        phases.push(LoadedPhase {
            id: phase.id.clone(),
            name: phase.name.clone(),
            description: phase.description.clone(),
            is_builtin,
            actions: phase_actions,
        });
    }

    let mut profiles: Vec<ProfileOverride> = Vec::new();
    for (profile_id, profile_ref) in &manifest.profiles {
        if let Some(override_path) = &profile_ref.overrides {
            let full_path = playbook_dir.join(override_path);
            match load_profile_override(&full_path) {
                Ok(mut po) => {
                    po.profile = profile_id.clone();
                    profiles.push(po);
                }
                Err(e) => {
                    tracing::warn!(
                        profile = profile_id.as_str(),
                        error = %e,
                        "Failed to load profile override"
                    );
                }
            }
        }
    }

    tracing::info!(
        total_actions = total_actions,
        phases = phases.len(),
        profiles = profiles.len(),
        "Playbook loaded"
    );

    Ok(LoadedPlaybook {
        manifest,
        phases,
        total_actions,
        profiles,
    })
}

pub fn default_playbook_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap()
        .parent().unwrap()
        .join("playbooks")
}

pub fn find_action_definition(
    playbook_dir: &Path,
    action_id: &str,
) -> anyhow::Result<Option<serde_json::Value>> {
    let playbook = load_playbook(playbook_dir)?;
    Ok(playbook
        .phases
        .iter()
        .flat_map(|phase| phase.actions.iter())
        .find(|action| action.id == action_id)
        .map(playbook_action_to_execution_json))
}

pub fn playbook_action_to_execution_json(action: &PlaybookAction) -> serde_json::Value {
    serde_json::json!({
        "id": action.id,
        "name": action.name,
        "description": action.description,
        "rationale": action.rationale,
        "risk": action.risk,
        "tier": action.tier,
        "default": action.default,
        "expertOnly": action.expert_only,
        "requiresReboot": action.requires_reboot,
        "reversible": action.reversible,
        "estimatedSeconds": action.estimated_seconds,
        "blockedProfiles": action.blocked_profiles,
        "minWindowsBuild": action.min_windows_build,
        "registryChanges": action.registry_changes.iter().map(|change| {
            serde_json::json!({
                "hive": change.hive,
                "path": change.path,
                "valueName": change.value_name,
                "value": change.value,
                "valueType": change.value_type,
            })
        }).collect::<Vec<_>>(),
        "serviceChanges": action.service_changes.iter().map(|change| {
            serde_json::json!({
                "name": change.name,
                "startupType": change.startup_type,
            })
        }).collect::<Vec<_>>(),
        "bcdChanges": action.bcd_changes.iter().map(|change| {
            serde_json::json!({
                "element": change.element,
                "newValue": change.new_value,
            })
        }).collect::<Vec<_>>(),
        "powerChanges": action.power_changes.iter().map(|change| {
            serde_json::json!({
                "settingPath": change.setting_path,
                "newValue": change.new_value,
            })
        }).collect::<Vec<_>>(),
        "powerShellCommands": action.powershell_commands,
        "packages": action.packages,
        "tasks": action.tasks.iter().map(|task| {
            serde_json::json!({
                "name": task.name,
                "path": task.path,
                "action": task.action,
            })
        }).collect::<Vec<_>>(),
        "tags": action.tags,
        "warningMessage": action.warning_message,
    })
}

fn load_module(path: &Path) -> anyhow::Result<PlaybookModule> {
    let text = std::fs::read_to_string(path)?;
    let module: PlaybookModule = serde_yaml::from_str(&text)?;
    Ok(module)
}

fn load_profile_override(path: &Path) -> anyhow::Result<ProfileOverride> {
    let text = std::fs::read_to_string(path)?;
    let po: ProfileOverride = serde_yaml::from_str(&text)?;
    Ok(po)
}

pub fn resolve_plan(
    playbook: &LoadedPlaybook,
    profile: &str,
    preset: &str,
    windows_build: Option<u32>,
) -> ResolvedPlan {
    let profile_override = playbook.profiles.iter().find(|p| p.profile == profile);
    let blocked_set: HashSet<&str> = profile_override
        .map(|po| po.blocked_actions.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();
    let optional_set: HashSet<&str> = profile_override
        .map(|po| po.optional_actions.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    let build = windows_build.unwrap_or(22631); // Default to 23H2

    let mut resolved_phases: Vec<ResolvedPhase> = Vec::new();
    let mut total_included = 0;
    let mut total_blocked = 0;
    let mut total_optional = 0;
    let mut total_expert = 0;
    let mut blocked_reasons: Vec<BlockedAction> = Vec::new();

    for phase in &playbook.phases {
        if phase.is_builtin {
            continue; // Builtin phases are handled by Rust code
        }

        let mut resolved_actions: Vec<ResolvedAction> = Vec::new();

        for action in &phase.actions {
            let is_wildcard_blocked = blocked_set.iter().any(|pattern| {
                pattern.ends_with(".*") && action.id.starts_with(&pattern[..pattern.len() - 2])
            });

            let (status, reason) = if is_wildcard_blocked || blocked_set.contains(action.id.as_str())
                || action.blocked_profiles.contains(&profile.to_string())
            {
                (ActionStatus::Blocked, Some(format!("Blocked for {} profile", profile)))
            } else if let Some(min_build) = action.min_windows_build {
                if build < min_build {
                    (ActionStatus::BuildGated, Some(format!("Requires Windows build {} or later", min_build)))
                } else {
                    determine_inclusion(&action, preset, &optional_set)
                }
            } else {
                determine_inclusion(&action, preset, &optional_set)
            };

            let risk_allowed = match preset {
                "conservative" => action.risk == "safe" || action.risk == "low",
                "balanced" => action.risk != "high" && action.risk != "extreme",
                "aggressive" => true,
                _ => action.risk == "safe" || action.risk == "low",
            };

            let final_status = if status == ActionStatus::Included && !risk_allowed {
                ActionStatus::Optional // Downgrade to optional if risk exceeds preset
            } else {
                status
            };

            match &final_status {
                ActionStatus::Included => total_included += 1,
                ActionStatus::Blocked | ActionStatus::BuildGated => {
                    total_blocked += 1;
                    if let Some(r) = &reason {
                        blocked_reasons.push(BlockedAction {
                            action_id: action.id.clone(),
                            reason: r.clone(),
                        });
                    }
                }
                ActionStatus::Optional => total_optional += 1,
                ActionStatus::ExpertOnly => total_expert += 1,
            }

            resolved_actions.push(ResolvedAction {
                action: action.clone(),
                status: final_status,
                blocked_reason: reason,
            });
        }

        if !resolved_actions.is_empty() {
            resolved_phases.push(ResolvedPhase {
                id: phase.id.clone(),
                name: phase.name.clone(),
                actions: resolved_actions,
            });
        }
    }

    ResolvedPlan {
        profile: profile.to_string(),
        preset: preset.to_string(),
        phases: resolved_phases,
        total_included,
        total_blocked,
        total_optional,
        total_expert_only: total_expert,
        blocked_reasons,
    }
}

fn determine_inclusion(
    action: &PlaybookAction,
    _preset: &str,
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

impl ResolvedPlan {
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "profile": self.profile,
            "preset": self.preset,
            "totalIncluded": self.total_included,
            "totalBlocked": self.total_blocked,
            "totalOptional": self.total_optional,
            "totalExpertOnly": self.total_expert_only,
            "phases": self.phases.iter().map(|p| {
                serde_json::json!({
                    "id": p.id,
                    "name": p.name,
                    "actions": p.actions.iter().map(|a| {
                        serde_json::json!({
                            "id": a.action.id,
                            "name": a.action.name,
                            "description": a.action.description,
                            "category": a.action.tags.first().unwrap_or(&a.action.risk),
                            "risk": a.action.risk,
                            "status": format!("{:?}", a.status),
                            "default": a.action.default,
                            "expertOnly": a.action.expert_only,
                            "blockedReason": a.blocked_reason,
                            "requiresReboot": a.action.requires_reboot,
                            "warningMessage": a.action.warning_message,
                        })
                    }).collect::<Vec<_>>(),
                })
            }).collect::<Vec<_>>(),
            "blockedReasons": self.blocked_reasons.iter().map(|b| {
                serde_json::json!({
                    "actionId": b.action_id,
                    "reason": b.reason,
                })
            }).collect::<Vec<_>>(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;

    fn playbook_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent().unwrap()
            .parent().unwrap()
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
        println!("Loaded playbook: {} actions across {} phases",
            playbook.total_actions, playbook.phases.len());
    }

    #[test]
    fn test_resolve_plan_gaming() {
        let dir = playbook_dir();
        if !dir.exists() { return; }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(22631));
        assert!(plan.total_included > 0);
        println!("Gaming aggressive: {} included, {} blocked, {} optional",
            plan.total_included, plan.total_blocked, plan.total_optional);
    }

    #[test]
    fn test_resolve_plan_work_pc_blocks() {
        let dir = playbook_dir();
        if !dir.exists() { return; }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "work_pc", "conservative", Some(22631));

        let included_ids: HashSet<String> = plan.phases.iter()
            .flat_map(|p| p.actions.iter())
            .filter(|a| a.status == ActionStatus::Included)
            .map(|a| a.action.id.clone())
            .collect();

        assert!(!included_ids.contains("perf.mmcss-system-responsiveness"),
            "MMCSS must be blocked for work_pc");
        assert!(!included_ids.contains("shell.reduce-search-box"),
            "Search box reduction must be blocked for work_pc");

        assert!(included_ids.contains("privacy.disable-advertising-id"),
            "Advertising ID disable should be included for work_pc");

        println!("Work PC: {} included, {} blocked",
            plan.total_included, plan.total_blocked);
    }

    #[test]
    fn test_all_actions_have_unique_ids_and_payloads() {
        let dir = playbook_dir();
        if !dir.exists() { return; }

        let playbook = load_playbook(&dir).unwrap();
        let mut seen_ids: HashSet<String> = HashSet::new();

        for phase in &playbook.phases {
            for action in &phase.actions {
                assert!(
                    seen_ids.insert(action.id.clone()),
                    "Duplicate playbook action id: {}",
                    action.id
                );

                let has_payload =
                    !action.registry_changes.is_empty() ||
                    !action.service_changes.is_empty() ||
                    !action.bcd_changes.is_empty() ||
                    !action.power_changes.is_empty() ||
                    !action.powershell_commands.is_empty() ||
                    !action.packages.is_empty() ||
                    !action.tasks.is_empty();

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
        if !dir.exists() { return; }

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
}
