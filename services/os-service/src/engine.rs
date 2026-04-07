use crate::playbook::{
    BcdChange, FileRename, PlaybookAction, PowerChange, RegistryChange, ServiceChange, TaskChange,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeSet;

const CONTRACT_VERSION: &str = "cleanroom.v1";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RollbackBoundary {
    pub snapshot_required: bool,
    pub fully_supported: bool,
    pub automatic_restore_supported: bool,
    #[serde(default)]
    pub strategies: Vec<String>,
    #[serde(default)]
    pub limitations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MutationSummary {
    pub total: usize,
    pub automatic: usize,
    pub manual: usize,
    pub registry: usize,
    pub service: usize,
    pub scheduled_task: usize,
    pub appx: usize,
    pub bcd: usize,
    pub power: usize,
    pub powershell: usize,
    pub file_rename: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MutationDescriptor {
    pub kind: String,
    pub target: String,
    pub privilege: String,
    pub rollback: String,
    pub automatic: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionExecutionContract {
    #[serde(default = "default_contract_version")]
    pub contract_version: String,
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub rationale: String,
    #[serde(default = "default_risk")]
    pub risk: String,
    #[serde(default = "default_tier")]
    pub tier: String,
    #[serde(default)]
    #[serde(rename = "default")]
    pub default_selected: bool,
    #[serde(default)]
    #[serde(rename = "expertOnly")]
    pub expert_only: bool,
    #[serde(default)]
    #[serde(rename = "requiresReboot")]
    pub requires_reboot: bool,
    #[serde(default = "default_true")]
    pub reversible: bool,
    #[serde(default)]
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
    #[serde(default)]
    #[serde(rename = "manualOnly")]
    pub manual_only: bool,
    #[serde(default)]
    #[serde(rename = "benchmarkRequired")]
    pub benchmark_required: bool,
    #[serde(default)]
    #[serde(rename = "executionMode")]
    pub execution_mode: String,
    #[serde(default)]
    #[serde(rename = "privilegeRequirements")]
    pub privilege_requirements: Vec<String>,
    #[serde(default)]
    #[serde(rename = "rollbackBoundary")]
    pub rollback_boundary: RollbackBoundary,
    #[serde(default)]
    #[serde(rename = "mutationSummary")]
    pub mutation_summary: MutationSummary,
    #[serde(default)]
    pub mutations: Vec<MutationDescriptor>,
}

fn default_contract_version() -> String {
    CONTRACT_VERSION.to_string()
}

fn default_risk() -> String {
    "safe".to_string()
}

fn default_tier() -> String {
    "free".to_string()
}

fn default_true() -> bool {
    true
}

impl ActionExecutionContract {
    pub fn from_value(value: &Value) -> Result<Self> {
        let mut contract: Self = serde_json::from_value(value.clone())?;
        contract.normalize();
        Ok(contract)
    }

    pub fn from_playbook_action(action: &PlaybookAction) -> Self {
        let manual_only = action.tags.iter().any(|tag| tag == "manual-only");
        let benchmark_required = action.tags.iter().any(|tag| tag == "benchmark-required");

        let mut contract = Self {
            contract_version: CONTRACT_VERSION.to_string(),
            id: action.id.clone(),
            name: action.name.clone(),
            description: action.description.clone(),
            rationale: action.rationale.clone(),
            risk: action.risk.clone(),
            tier: action.tier.clone(),
            default_selected: action.default,
            expert_only: action.expert_only,
            requires_reboot: action.requires_reboot,
            reversible: action.reversible,
            estimated_seconds: action.estimated_seconds,
            blocked_profiles: action.blocked_profiles.clone(),
            min_windows_build: action.min_windows_build,
            registry_changes: action.registry_changes.clone(),
            service_changes: action.service_changes.clone(),
            bcd_changes: action.bcd_changes.clone(),
            power_changes: action.power_changes.clone(),
            powershell_commands: action.powershell_commands.clone(),
            packages: action.packages.clone(),
            tasks: action.tasks.clone(),
            file_renames: action.file_renames.clone(),
            tags: action.tags.clone(),
            warning_message: action.warning_message.clone(),
            manual_only,
            benchmark_required,
            execution_mode: String::new(),
            privilege_requirements: Vec::new(),
            rollback_boundary: RollbackBoundary::default(),
            mutation_summary: MutationSummary::default(),
            mutations: Vec::new(),
        };
        contract.normalize();
        contract
    }

    pub fn to_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or_else(|_| serde_json::json!({}))
    }

    fn normalize(&mut self) {
        self.contract_version = CONTRACT_VERSION.to_string();

        let mutations = describe_mutations(self);
        let summary = summarize_mutations(&mutations);
        let rollback = analyze_rollback(self, &mutations);

        if self.execution_mode.is_empty() {
            self.execution_mode = if self.manual_only || summary.total == 0 {
                "manual".to_string()
            } else {
                "automatic".to_string()
            };
        }

        if summary.total == 0 {
            self.manual_only = true;
        }

        self.privilege_requirements = collect_privileges(&mutations);
        self.rollback_boundary = rollback;
        self.mutation_summary = summary;
        self.mutations = mutations;
    }
}

fn describe_mutations(contract: &ActionExecutionContract) -> Vec<MutationDescriptor> {
    let automatic = !contract.manual_only;
    let mut out = Vec::new();

    for change in &contract.registry_changes {
        let target = format!("{}\\{}\\{}", change.hive, change.path, change.value_name);
        out.push(MutationDescriptor {
            kind: "registry".to_string(),
            target,
            privilege: "administrator".to_string(),
            rollback: "registryValue".to_string(),
            automatic,
            note: None,
        });
    }

    for change in &contract.service_changes {
        out.push(MutationDescriptor {
            kind: "service".to_string(),
            target: change.name.clone(),
            privilege: "administrator".to_string(),
            rollback: "serviceStartType".to_string(),
            automatic,
            note: None,
        });
    }

    for task in &contract.tasks {
        out.push(MutationDescriptor {
            kind: "scheduledTask".to_string(),
            target: format!("{}{}", task.path, task.name),
            privilege: "administrator".to_string(),
            rollback: "taskState".to_string(),
            automatic,
            note: None,
        });
    }

    for package in &contract.packages {
        out.push(MutationDescriptor {
            kind: "appx".to_string(),
            target: package.clone(),
            privilege: "administrator".to_string(),
            rollback: "noteOnly".to_string(),
            automatic,
            note: Some("AppX removal cannot be automatically reinstalled.".to_string()),
        });
    }

    for change in &contract.bcd_changes {
        out.push(MutationDescriptor {
            kind: "bcd".to_string(),
            target: change.element.clone(),
            privilege: "administrator".to_string(),
            rollback: "bcdElement".to_string(),
            automatic,
            note: None,
        });
    }

    for change in &contract.power_changes {
        out.push(MutationDescriptor {
            kind: "power".to_string(),
            target: change.setting_path.clone(),
            privilege: "administrator".to_string(),
            rollback: "powerSetting".to_string(),
            automatic,
            note: None,
        });
    }

    for script in &contract.powershell_commands {
        out.push(MutationDescriptor {
            kind: "powershell".to_string(),
            target: script.chars().take(96).collect(),
            privilege: "administrator".to_string(),
            rollback: "commandSpecific".to_string(),
            automatic,
            note: Some("PowerShell commands rely on the declarative action author to ensure reversibility.".to_string()),
        });
    }

    for rename in &contract.file_renames {
        let privilege = if rename.requires_trusted_installer {
            "trustedInstaller"
        } else {
            "administrator"
        };
        let note = rename
            .cpu_vendor
            .as_ref()
            .map(|vendor| format!("Applies only when CPU vendor is {}.", vendor));
        out.push(MutationDescriptor {
            kind: "fileRename".to_string(),
            target: format!("{} -> {}", rename.source, rename.target),
            privilege: privilege.to_string(),
            rollback: "fileRename".to_string(),
            automatic,
            note,
        });
    }

    out
}

fn summarize_mutations(mutations: &[MutationDescriptor]) -> MutationSummary {
    let mut summary = MutationSummary::default();
    summary.total = mutations.len();

    for mutation in mutations {
        if mutation.automatic {
            summary.automatic += 1;
        } else {
            summary.manual += 1;
        }

        match mutation.kind.as_str() {
            "registry" => summary.registry += 1,
            "service" => summary.service += 1,
            "scheduledTask" => summary.scheduled_task += 1,
            "appx" => summary.appx += 1,
            "bcd" => summary.bcd += 1,
            "power" => summary.power += 1,
            "powershell" => summary.powershell += 1,
            "fileRename" => summary.file_rename += 1,
            _ => {}
        }
    }

    if summary.total == 0 {
        summary.manual = 1;
    }

    summary
}

fn analyze_rollback(
    contract: &ActionExecutionContract,
    mutations: &[MutationDescriptor],
) -> RollbackBoundary {
    let mut strategies = BTreeSet::new();
    let mut limitations = Vec::new();
    let mut fully_supported = contract.reversible;
    let mut automatic_restore_supported = false;

    for mutation in mutations {
        strategies.insert(mutation.rollback.clone());
        match mutation.rollback.as_str() {
            "noteOnly" => {
                fully_supported = false;
                limitations.push(format!(
                    "{} requires manual reinstall if you revert it.",
                    mutation.target
                ));
            }
            "commandSpecific" => {
                fully_supported = false;
                limitations.push(format!(
                    "{} depends on action-specific undo logic, not generic rollback.",
                    mutation.target
                ));
            }
            "fileRename" => {
                automatic_restore_supported = true;
                limitations.push(format!(
                    "{} can be restored automatically only when the destination file was absent before apply.",
                    mutation.target
                ));
            }
            "none" => {
                fully_supported = false;
            }
            _ => {
                automatic_restore_supported = true;
            }
        }
    }

    RollbackBoundary {
        snapshot_required: !contract.manual_only && !mutations.is_empty(),
        fully_supported: fully_supported && !mutations.is_empty(),
        automatic_restore_supported,
        strategies: strategies.into_iter().collect(),
        limitations,
    }
}

fn collect_privileges(mutations: &[MutationDescriptor]) -> Vec<String> {
    let mut privileges = BTreeSet::new();

    for mutation in mutations {
        privileges.insert(mutation.privilege.clone());
    }

    privileges.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::ActionExecutionContract;
    use crate::playbook::{FileRename, PlaybookAction, RegistryChange};

    fn sample_action() -> PlaybookAction {
        PlaybookAction {
            id: "security.disable-cpu-mitigations".to_string(),
            name: "Disable CPU mitigations".to_string(),
            description: "Test action".to_string(),
            rationale: "Test rationale".to_string(),
            risk: "extreme".to_string(),
            tier: "premium".to_string(),
            default: false,
            expert_only: true,
            requires_reboot: true,
            reversible: true,
            estimated_seconds: 10,
            blocked_profiles: vec!["work_pc".to_string()],
            min_windows_build: Some(22631),
            registry_changes: vec![RegistryChange {
                hive: "HKLM".to_string(),
                path: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management"
                    .to_string(),
                value_name: "FeatureSettingsOverride".to_string(),
                value: serde_json::json!(3),
                value_type: "DWord".to_string(),
            }],
            service_changes: Vec::new(),
            bcd_changes: Vec::new(),
            power_changes: Vec::new(),
            powershell_commands: Vec::new(),
            packages: Vec::new(),
            tasks: Vec::new(),
            file_renames: vec![FileRename {
                source: "C:\\Windows\\System32\\mcupdate_GenuineIntel.dll".to_string(),
                target: "C:\\Windows\\System32\\mcupdate_GenuineIntel.dll.bak".to_string(),
                requires_trusted_installer: true,
                cpu_vendor: Some("Intel".to_string()),
            }],
            tags: vec!["chapter:11.30".to_string()],
            warning_message: Some("High risk".to_string()),
        }
    }

    #[test]
    fn playbook_actions_compile_to_typed_contracts() {
        let contract = ActionExecutionContract::from_playbook_action(&sample_action());

        assert_eq!(contract.contract_version, "cleanroom.v1");
        assert_eq!(contract.mutation_summary.total, 2);
        assert_eq!(contract.mutation_summary.registry, 1);
        assert_eq!(contract.mutation_summary.file_rename, 1);
        assert!(contract
            .privilege_requirements
            .contains(&"administrator".to_string()));
        assert!(contract
            .privilege_requirements
            .contains(&"trustedInstaller".to_string()));
        assert!(contract
            .rollback_boundary
            .strategies
            .contains(&"fileRename".to_string()));
    }

    #[test]
    fn empty_contracts_normalize_to_manual_review() {
        let value = serde_json::json!({
            "id": "legacy.noop",
            "name": "Legacy noop",
            "description": "No executable changes"
        });

        let contract = ActionExecutionContract::from_value(&value).unwrap();
        assert!(contract.manual_only);
        assert_eq!(contract.execution_mode, "manual");
        assert_eq!(contract.mutation_summary.total, 0);
    }
}
