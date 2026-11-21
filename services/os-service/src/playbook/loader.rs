use super::{
    LoadedPhase, LoadedPlaybook, PlaybookLoadTrace, PlaybookManifest, PlaybookModule,
    PlaybookNormalizationTrace, ProfileOverride,
};
use crate::facts::{ActionExtras, ActionRequires};
use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

/// Load the playbook from a directory containing manifest.yaml + module files.
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
    let mut module_refs = Vec::new();
    let mut action_extras: HashMap<String, ActionExtras> = HashMap::new();

    for phase in &manifest.phases {
        let is_builtin = phase.phase_type.as_deref() == Some("builtin");
        let mut phase_actions = Vec::new();

        if !is_builtin {
            for module_path in &phase.modules {
                // A module that cannot be loaded is a hard error: silently
                // dropping it would also drop its safety-relevant content.
                if module_path.contains("..") {
                    anyhow::bail!(
                        "Playbook module path '{}' contains '..' (phase '{}')",
                        module_path,
                        phase.id
                    );
                }

                let full_path = playbook_dir.join(module_path);
                let (module, extras) = load_module(&full_path).map_err(|e| {
                    anyhow::anyhow!(
                        "Failed to load playbook module '{}' (phase '{}'): {}",
                        module_path,
                        phase.id,
                        e
                    )
                })?;
                validate_module_actions(&module, module_path)?;
                tracing::debug!(
                    module = module.module.as_str(),
                    actions = module.actions.len(),
                    "Loaded playbook module"
                );
                module_refs.push(full_path.display().to_string());
                for (id, extra) in extras {
                    if !extra.is_empty() {
                        action_extras.insert(id, extra);
                    }
                }
                phase_actions.extend(module.actions);
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

    let mut profiles = Vec::new();
    let mut profile_override_refs = Vec::new();
    for (profile_id, profile_ref) in &manifest.profiles {
        if let Some(override_path) = &profile_ref.overrides {
            if override_path.contains("..") {
                anyhow::bail!(
                    "Profile override path '{}' for '{}' contains '..'",
                    override_path,
                    profile_id
                );
            }
            let full_path = playbook_dir.join(override_path);
            // A malformed profile is a hard error: silently dropping it would
            // drop its block list (e.g. vm_cautious) and include blocked actions.
            let mut override_data = load_profile_override(&full_path).map_err(|e| {
                anyhow::anyhow!(
                    "Failed to load profile override '{}' for '{}': {}",
                    override_path,
                    profile_id,
                    e
                )
            })?;
            override_data.profile = profile_id.clone();
            profile_override_refs.push(full_path.display().to_string());
            profiles.push(override_data);
        }
    }

    // Flatten `inherits:` chains so each profile carries its full effective set
    // of blocked/optional/preserve lists and per-action overrides.
    let profiles = resolve_profile_inheritance(profiles);

    let loaded_module_count = module_refs.len();

    let load_trace = PlaybookLoadTrace {
        manifest_ref: manifest_path.display().to_string(),
        module_refs,
        profile_override_refs,
        loaded_module_count,
        loaded_profile_count: profiles.len(),
    };

    let normalization_trace = PlaybookNormalizationTrace {
        declared_phase_count: manifest.phases.len(),
        loaded_phase_count: phases.len(),
        builtin_phase_count: phases.iter().filter(|phase| phase.is_builtin).count(),
        total_catalog_actions: total_actions,
    };

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
        load_trace,
        normalization_trace,
        action_extras,
    })
}

/// Optional action fields read from the raw module YAML (see facts::ActionExtras).
#[derive(Debug, Deserialize)]
struct RawModuleExtras {
    #[serde(default)]
    actions: Vec<RawActionExtras>,
}

#[derive(Debug, Deserialize)]
struct RawActionExtras {
    id: String,
    #[serde(default, rename = "maxWindowsBuild")]
    max_windows_build: Option<u32>,
    #[serde(default)]
    requires: Option<ActionRequires>,
}

/// Structural validation that serde cannot express.
fn validate_module_actions(module: &PlaybookModule, module_path: &str) -> anyhow::Result<()> {
    for action in &module.actions {
        for task in &action.tasks {
            let kind = task.action.trim().to_ascii_lowercase();
            if kind != "disable" && kind != "enable" {
                anyhow::bail!(
                    "{}: action '{}' task '{}' has unsupported action '{}' (expected enable|disable)",
                    module_path,
                    action.id,
                    task.name,
                    task.action
                );
            }
        }
        for change in &action.registry_changes {
            if !change.delete && change.value_type.trim().is_empty() {
                anyhow::bail!(
                    "{}: action '{}' registry change {}\\{}\\{} has no valueType (use delete: true to remove a value)",
                    module_path,
                    action.id,
                    change.hive,
                    change.path,
                    change.value_name
                );
            }
        }
    }
    Ok(())
}

pub fn default_playbook_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("playbooks")
}

fn load_module(path: &Path) -> anyhow::Result<(PlaybookModule, Vec<(String, ActionExtras)>)> {
    let text = std::fs::read_to_string(path)?;
    let module: PlaybookModule = serde_yaml::from_str(&text)?;
    let raw: RawModuleExtras = serde_yaml::from_str(&text)?;
    let extras = raw
        .actions
        .into_iter()
        .map(|a| {
            (
                a.id,
                ActionExtras {
                    max_windows_build: a.max_windows_build,
                    requires: a.requires,
                },
            )
        })
        .collect();
    Ok((module, extras))
}

fn load_profile_override(path: &Path) -> anyhow::Result<ProfileOverride> {
    let text = std::fs::read_to_string(path)?;
    let profile_override: ProfileOverride = serde_yaml::from_str(&text)?;
    Ok(profile_override)
}

/// Resolve `inherits:` chains so each profile's blocked/optional/preserve lists
/// and per-action `override`s include those of its ancestors. Child entries win
/// on conflict. Missing parents and cycles are tolerated (logged + ignored).
pub(crate) fn resolve_profile_inheritance(profiles: Vec<ProfileOverride>) -> Vec<ProfileOverride> {
    let by_id: HashMap<String, ProfileOverride> = profiles
        .iter()
        .map(|p| (p.profile.clone(), p.clone()))
        .collect();
    profiles
        .iter()
        .map(|p| {
            let mut visited = HashSet::new();
            visited.insert(p.profile.clone());
            merge_with_parents(p, &by_id, &mut visited)
        })
        .collect()
}

fn merge_with_parents(
    child: &ProfileOverride,
    by_id: &HashMap<String, ProfileOverride>,
    visited: &mut HashSet<String>,
) -> ProfileOverride {
    let Some(parent_id) = child.inherits.clone() else {
        return child.clone();
    };
    if !visited.insert(parent_id.clone()) {
        // Already on the chain — cycle. Stop here with the child as-is.
        tracing::warn!(
            profile = child.profile.as_str(),
            parent = parent_id.as_str(),
            "profile inheritance cycle detected; ignoring further inheritance"
        );
        return child.clone();
    }
    let Some(parent) = by_id.get(&parent_id) else {
        tracing::warn!(
            profile = child.profile.as_str(),
            parent = parent_id.as_str(),
            "profile inherits an unknown parent; ignoring"
        );
        return child.clone();
    };
    let resolved_parent = merge_with_parents(parent, by_id, visited);
    merge_profiles(&resolved_parent, child)
}

/// Merge `child` onto `base`: union the lists (parent first), child's per-action
/// overrides win, and child keeps its own scalar fields.
fn merge_profiles(base: &ProfileOverride, child: &ProfileOverride) -> ProfileOverride {
    let mut merged = child.clone();
    merged.blocked_actions = union_preserve_order(&base.blocked_actions, &child.blocked_actions);
    merged.optional_actions = union_preserve_order(&base.optional_actions, &child.optional_actions);
    merged.preservation_flags =
        union_preserve_order(&base.preservation_flags, &child.preservation_flags);
    let mut overrides = base.overrides.clone();
    for (id, ov) in &child.overrides {
        overrides.insert(id.clone(), ov.clone());
    }
    merged.overrides = overrides;
    merged.inherits = None;
    merged
}

fn union_preserve_order(base: &[String], child: &[String]) -> Vec<String> {
    let mut out = base.to_vec();
    for item in child {
        if !out.contains(item) {
            out.push(item.clone());
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn repo_playbook_dir() -> PathBuf {
        default_playbook_dir()
    }

    fn scratch_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "oudenos-loader-{}-{}",
            name,
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Every `- id:` entry in every module the manifest references must load;
    /// counted from the files so the number never drifts.
    #[test]
    fn every_declared_action_loads() {
        let dir = repo_playbook_dir();
        if !dir.exists() {
            return;
        }
        let manifest: PlaybookManifest =
            serde_yaml::from_str(&std::fs::read_to_string(dir.join("manifest.yaml")).unwrap())
                .unwrap();
        let mut declared = 0usize;
        for phase in &manifest.phases {
            if phase.phase_type.as_deref() == Some("builtin") {
                continue;
            }
            for module in &phase.modules {
                let text = std::fs::read_to_string(dir.join(module)).unwrap();
                declared += text
                    .lines()
                    .filter(|line| line.trim_start().starts_with("- id:"))
                    .count();
            }
        }
        let playbook = load_playbook(&dir).expect("playbook must load without errors");
        assert_eq!(
            playbook.total_actions, declared,
            "loaded action count must equal the number of `- id:` entries in the manifest's modules"
        );
    }

    #[test]
    fn malformed_module_or_profile_is_a_hard_error() {
        let dir = scratch_dir("bad-profile");
        std::fs::write(
            dir.join("manifest.yaml"),
            "name: t\nversion: '1'\ndescription: d\nphases:\n  - id: p\n    name: P\n    description: d\n    modules: [m.yaml]\nprofiles:\n  vm_cautious:\n    label: VM\n    overrides: profiles/vm.yaml\n",
        )
        .unwrap();
        std::fs::write(
            dir.join("m.yaml"),
            "module: m\nname: M\ndescription: d\ncategory: c\nactions:\n  - id: a.one\n    name: One\n    description: d\n    registryChanges:\n      - hive: HKCU\n        path: Software\\\\X\n        valueName: V\n        value: 1\n        valueType: DWord\n",
        )
        .unwrap();
        std::fs::create_dir_all(dir.join("profiles")).unwrap();
        std::fs::write(dir.join("profiles").join("vm.yaml"), "blockedActions: [a.one]\nunknownKey: 1\n").unwrap();
        let err = load_playbook(&dir).unwrap_err().to_string();
        assert!(err.contains("profile override"), "{err}");

        // Fix the profile, break the module (registry change without valueType).
        std::fs::write(dir.join("profiles").join("vm.yaml"), "blockedActions: [a.one]\n").unwrap();
        std::fs::write(
            dir.join("m.yaml"),
            "module: m\nname: M\ndescription: d\ncategory: c\nactions:\n  - id: a.one\n    name: One\n    description: d\n    registryChanges:\n      - hive: HKCU\n        path: Software\\\\X\n        valueName: V\n",
        )
        .unwrap();
        assert!(load_playbook(&dir).is_err());

        // Valid module with a delete entry, extras and an enable task loads.
        std::fs::write(
            dir.join("m.yaml"),
            "module: m\nname: M\ndescription: d\ncategory: c\nactions:\n  - id: a.one\n    name: One\n    description: d\n    maxWindowsBuild: 22631\n    requires:\n      gpuVendor: nvidia\n    tasks:\n      - name: T\n        path: \\\\X\\\\\n        action: enable\n    registryChanges:\n      - hive: HKCU\n        path: Software\\\\X\n        valueName: V\n        delete: true\n",
        )
        .unwrap();
        let playbook = load_playbook(&dir).unwrap();
        assert_eq!(playbook.total_actions, 1);
        let extras = playbook.action_extras.get("a.one").unwrap();
        assert_eq!(extras.max_windows_build, Some(22631));
        assert_eq!(
            extras.requires.as_ref().unwrap().gpu_vendor.as_deref(),
            Some("nvidia")
        );
        assert!(playbook.phases[0].actions[0].registry_changes[0].delete);

        // Unknown task action is rejected.
        std::fs::write(
            dir.join("m.yaml"),
            "module: m\nname: M\ndescription: d\ncategory: c\nactions:\n  - id: a.one\n    name: One\n    description: d\n    tasks:\n      - name: T\n        path: \\\\X\\\\\n        action: delete\n",
        )
        .unwrap();
        assert!(load_playbook(&dir).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
