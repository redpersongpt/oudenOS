// ─── App Bundle System ──────────────────────────────────────────────────────
// Loads profile-aware software bundles from playbooks/app-bundles/ and resolves
// them into an install queue. Integrates as a playbook stage alongside the
// existing cleanup/services/privacy/performance phases.
//
// Flow:
//   1. UI calls `appbundle.getRecommended { profile }` to show the picker
//   2. User toggles apps on/off
//   3. UI calls `appbundle.resolve { profile, selectedApps }` to get install queue

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;

// ─── YAML schema types ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
struct BundleManifestFile {
    name: String,
    version: String,
    bundles: HashMap<String, BundleEntry>,
}

#[derive(Debug, Clone, Deserialize)]
struct BundleEntry {
    label: String,
    description: String,
    apps: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct CatalogFile {
    apps: HashMap<String, CatalogEntry>,
}

#[derive(Debug, Clone, Deserialize)]
struct CatalogEntry {
    name: String,
    category: String,
    description: String,
    url: String,
    #[serde(rename = "silentArgs")]
    silent_args: String,
    #[serde(rename = "workSafe")]
    work_safe: bool,
}

// ─── Public types (returned to IPC callers) ─────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct AppBundleManifest {
    pub name: String,
    pub version: String,
    pub bundles: Vec<AppBundle>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AppBundle {
    pub profile: String,
    pub label: String,
    pub description: String,
    pub app_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedApp {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub url: String,
    #[serde(rename = "silentArgs")]
    pub silent_args: String,
    #[serde(rename = "workSafe")]
    pub work_safe: bool,
    pub selected: bool,
    pub recommended: bool,
}

// ─── Internal loaded state ──────────────────────────────────────────────────

struct LoadedBundles {
    manifest: BundleManifestFile,
    catalog: CatalogFile,
}

// ─── Loader ─────────────────────────────────────────────────────────────────

/// Load both manifest.yaml and catalog.yaml from the app-bundles directory.
fn load_bundles(playbook_dir: &Path) -> anyhow::Result<LoadedBundles> {
    let bundle_dir = playbook_dir.join("app-bundles");

    let manifest_path = bundle_dir.join("manifest.yaml");
    let manifest_text = std::fs::read_to_string(&manifest_path)
        .map_err(|e| anyhow::anyhow!("Failed to read app-bundles/manifest.yaml: {}", e))?;
    let manifest: BundleManifestFile = serde_yaml::from_str(&manifest_text)
        .map_err(|e| anyhow::anyhow!("Failed to parse app-bundles/manifest.yaml: {}", e))?;

    let catalog_path = bundle_dir.join("catalog.yaml");
    let catalog_text = std::fs::read_to_string(&catalog_path)
        .map_err(|e| anyhow::anyhow!("Failed to read app-bundles/catalog.yaml: {}", e))?;
    let catalog: CatalogFile = serde_yaml::from_str(&catalog_text)
        .map_err(|e| anyhow::anyhow!("Failed to parse app-bundles/catalog.yaml: {}", e))?;

    tracing::info!(
        name = manifest.name.as_str(),
        version = manifest.version.as_str(),
        bundles = manifest.bundles.len(),
        catalog_apps = catalog.apps.len(),
        "App bundles loaded"
    );

    Ok(LoadedBundles { manifest, catalog })
}

// ─── Resolver ───────────────────────────────────────────────────────────────

/// Returns the recommended app list for a profile. Every app in the catalog is
/// returned; those in the profile's bundle are marked `recommended: true` and
/// `selected: true` by default.
pub fn get_recommended(playbook_dir: &Path, profile: &str) -> anyhow::Result<serde_json::Value> {
    let loaded = load_bundles(playbook_dir)?;

    let bundle = loaded.manifest.bundles.get(profile);
    let recommended_ids: HashSet<&str> = bundle
        .map(|b| b.apps.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    let bundle_meta = bundle.map(|b| {
        serde_json::json!({
            "label": b.label,
            "description": b.description,
        })
    });

    let mut apps: Vec<ResolvedApp> = Vec::new();

    // First: add all recommended apps in bundle order (preserves intended ordering)
    if let Some(b) = bundle {
        for app_id in &b.apps {
            if let Some(entry) = loaded.catalog.apps.get(app_id) {
                apps.push(ResolvedApp {
                    id: app_id.clone(),
                    name: entry.name.clone(),
                    category: entry.category.clone(),
                    description: entry.description.clone(),
                    url: entry.url.clone(),
                    silent_args: entry.silent_args.clone(),
                    work_safe: entry.work_safe,
                    selected: true,
                    recommended: true,
                });
            } else {
                tracing::warn!(
                    app_id = app_id.as_str(),
                    profile = profile,
                    "Bundle references app not found in catalog"
                );
            }
        }
    }

    // Then: add remaining catalog apps (not in bundle) as unselected extras
    let mut remaining: Vec<(&String, &CatalogEntry)> = loaded
        .catalog
        .apps
        .iter()
        .filter(|(id, _)| !recommended_ids.contains(id.as_str()))
        .collect();
    remaining.sort_by_key(|(id, _)| id.to_string());

    for (app_id, entry) in remaining {
        apps.push(ResolvedApp {
            id: app_id.clone(),
            name: entry.name.clone(),
            category: entry.category.clone(),
            description: entry.description.clone(),
            url: entry.url.clone(),
            silent_args: entry.silent_args.clone(),
            work_safe: entry.work_safe,
            selected: false,
            recommended: false,
        });
    }

    tracing::info!(
        profile = profile,
        recommended = recommended_ids.len(),
        total = apps.len(),
        "Resolved app bundle recommendations"
    );

    Ok(serde_json::json!({
        "profile": profile,
        "bundle": bundle_meta,
        "apps": apps,
        "availableProfiles": loaded.manifest.bundles.keys()
            .collect::<Vec<_>>(),
    }))
}

/// Resolves the final install queue given a profile and the user's selected app IDs.
/// Only apps present in the catalog are returned. Unknown IDs are logged and skipped.
pub fn resolve(
    playbook_dir: &Path,
    profile: &str,
    selected_app_ids: &[String],
) -> anyhow::Result<serde_json::Value> {
    let loaded = load_bundles(playbook_dir)?;

    let bundle = loaded.manifest.bundles.get(profile);
    let recommended_ids: HashSet<&str> = bundle
        .map(|b| b.apps.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    let mut install_queue: Vec<ResolvedApp> = Vec::new();
    let mut skipped: Vec<String> = Vec::new();

    for app_id in selected_app_ids {
        match loaded.catalog.apps.get(app_id) {
            Some(entry) => {
                install_queue.push(ResolvedApp {
                    id: app_id.clone(),
                    name: entry.name.clone(),
                    category: entry.category.clone(),
                    description: entry.description.clone(),
                    url: entry.url.clone(),
                    silent_args: entry.silent_args.clone(),
                    work_safe: entry.work_safe,
                    selected: true,
                    recommended: recommended_ids.contains(app_id.as_str()),
                });
            }
            None => {
                tracing::warn!(app_id = app_id.as_str(), "Selected app not found in catalog — skipping");
                skipped.push(app_id.clone());
            }
        }
    }

    tracing::info!(
        profile = profile,
        queued = install_queue.len(),
        skipped = skipped.len(),
        "Resolved app install queue"
    );

    Ok(serde_json::json!({
        "profile": profile,
        "installQueue": install_queue,
        "skipped": skipped,
        "totalQueued": install_queue.len(),
    }))
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
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
    fn test_load_bundles() {
        let dir = playbook_dir();
        if !dir.join("app-bundles").exists() {
            eprintln!("app-bundles dir not found — skipping");
            return;
        }
        let loaded = load_bundles(&dir).unwrap();
        assert!(!loaded.manifest.name.is_empty());
        assert!(loaded.manifest.bundles.len() >= 7);
        assert!(loaded.catalog.apps.len() >= 10);
    }

    #[test]
    fn test_get_recommended_gaming() {
        let dir = playbook_dir();
        if !dir.join("app-bundles").exists() {
            return;
        }
        let result = get_recommended(&dir, "gaming_desktop").unwrap();
        let apps = result["apps"].as_array().unwrap();

        // Gaming bundle should recommend Steam and Discord
        let recommended: Vec<&str> = apps
            .iter()
            .filter(|a| a["recommended"].as_bool() == Some(true))
            .filter_map(|a| a["id"].as_str())
            .collect();
        assert!(recommended.contains(&"steam"), "Steam must be recommended for gaming");
        assert!(recommended.contains(&"discord"), "Discord must be recommended for gaming");

        // All catalog apps should be present
        assert!(apps.len() >= 10);
    }

    #[test]
    fn test_get_recommended_work_pc() {
        let dir = playbook_dir();
        if !dir.join("app-bundles").exists() {
            return;
        }
        let result = get_recommended(&dir, "work_pc").unwrap();
        let apps = result["apps"].as_array().unwrap();

        // Work PC should NOT recommend gaming apps
        let recommended: Vec<&str> = apps
            .iter()
            .filter(|a| a["recommended"].as_bool() == Some(true))
            .filter_map(|a| a["id"].as_str())
            .collect();
        assert!(!recommended.contains(&"steam"), "Steam must NOT be recommended for work_pc");
        assert!(recommended.contains(&"brave"), "Brave must be recommended for work_pc");
    }

    #[test]
    fn test_resolve_selected() {
        let dir = playbook_dir();
        if !dir.join("app-bundles").exists() {
            return;
        }
        let selected = vec!["7zip".to_string(), "brave".to_string(), "nonexistent".to_string()];
        let result = resolve(&dir, "work_pc", &selected).unwrap();

        assert_eq!(result["totalQueued"].as_u64(), Some(2));
        assert_eq!(result["skipped"].as_array().unwrap().len(), 1);

        let queue = result["installQueue"].as_array().unwrap();
        let ids: Vec<&str> = queue.iter().filter_map(|a| a["id"].as_str()).collect();
        assert!(ids.contains(&"7zip"));
        assert!(ids.contains(&"brave"));
    }

    #[test]
    fn test_unknown_profile_returns_empty_recommendations() {
        let dir = playbook_dir();
        if !dir.join("app-bundles").exists() {
            return;
        }
        let result = get_recommended(&dir, "nonexistent_profile").unwrap();
        let apps = result["apps"].as_array().unwrap();

        // All apps should be present but none recommended
        let recommended_count = apps
            .iter()
            .filter(|a| a["recommended"].as_bool() == Some(true))
            .count();
        assert_eq!(recommended_count, 0);
        assert!(apps.len() >= 10, "All catalog apps should still be listed");
    }
}
