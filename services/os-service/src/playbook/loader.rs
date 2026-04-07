use super::{
    LoadedPhase, LoadedPlaybook, PlaybookLoadTrace, PlaybookManifest, PlaybookModule,
    PlaybookNormalizationTrace, ProfileOverride,
};
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

    for phase in &manifest.phases {
        let is_builtin = phase.phase_type.as_deref() == Some("builtin");
        let mut phase_actions = Vec::new();

        if !is_builtin {
            for module_path in &phase.modules {
                if module_path.contains("..") {
                    tracing::error!(
                        path = module_path.as_str(),
                        "Playbook module path contains '..', skipping"
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
                        module_refs.push(full_path.display().to_string());
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

    let mut profiles = Vec::new();
    let mut profile_override_refs = Vec::new();
    for (profile_id, profile_ref) in &manifest.profiles {
        if let Some(override_path) = &profile_ref.overrides {
            let full_path = playbook_dir.join(override_path);
            match load_profile_override(&full_path) {
                Ok(mut override_data) => {
                    override_data.profile = profile_id.clone();
                    profile_override_refs.push(full_path.display().to_string());
                    profiles.push(override_data);
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
    })
}

pub fn default_playbook_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("playbooks")
}

fn load_module(path: &Path) -> anyhow::Result<PlaybookModule> {
    let text = std::fs::read_to_string(path)?;
    let module: PlaybookModule = serde_yaml::from_str(&text)?;
    Ok(module)
}

fn load_profile_override(path: &Path) -> anyhow::Result<ProfileOverride> {
    let text = std::fs::read_to_string(path)?;
    let profile_override: ProfileOverride = serde_yaml::from_str(&text)?;
    Ok(profile_override)
}
