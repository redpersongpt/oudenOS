
#[cfg(windows)]
use crate::powershell;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

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

#[derive(Debug, Clone, Serialize)]
pub struct InstallResult {
    pub id: String,
    pub name: String,
    pub status: String,
    #[serde(rename = "downloadedPath")]
    pub downloaded_path: Option<String>,
    #[serde(rename = "exitCode")]
    pub exit_code: Option<i32>,
    pub error: Option<String>,
}

struct LoadedBundles {
    manifest: BundleManifestFile,
    catalog: CatalogFile,
}

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

pub fn install(playbook_dir: &Path, app_id: &str) -> anyhow::Result<serde_json::Value> {
    let loaded = load_bundles(playbook_dir)?;
    let entry = match loaded.catalog.apps.get(app_id) {
        Some(entry) => entry,
        None => {
            return Ok(serde_json::json!(InstallResult {
                id: app_id.to_string(),
                name: app_id.to_string(),
                status: "failed".to_string(),
                downloaded_path: None,
                exit_code: None,
                error: Some("Selected app not found in catalog".to_string()),
            }));
        }
    };

    let result = install_catalog_entry(app_id, entry)?;
    Ok(serde_json::to_value(result)?)
}

#[cfg(windows)]
fn install_catalog_entry(app_id: &str, entry: &CatalogEntry) -> anyhow::Result<InstallResult> {
    let app_name = entry.name.clone();
    let safe_url = powershell::escape_ps_string(entry.url.as_str());
    let safe_silent_args = powershell::escape_ps_string(entry.silent_args.as_str());
    let safe_id = powershell::escape_ps_string(app_id);
    let download_dir = installer_cache_dir()?;
    let safe_download_dir = powershell::escape_ps_string(download_dir.to_string_lossy().as_ref());

    let script = format!(
        "$ProgressPreference='SilentlyContinue'; \
         [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; \
         $uri = '{url}'; \
         $appId = '{app_id}'; \
         $silentArgs = '{silent_args}'; \
         $downloadDir = '{download_dir}'; \
         New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null; \
         $uriObject = [Uri]$uri; \
         $ext = [System.IO.Path]::GetExtension($uriObject.AbsolutePath); \
         if ([string]::IsNullOrWhiteSpace($ext)) {{ $ext = '.exe' }}; \
         $downloadPath = Join-Path $downloadDir ($appId + $ext); \
         Invoke-WebRequest -Uri $uri -OutFile $downloadPath -MaximumRedirection 5 -UseBasicParsing; \
         if (-not (Test-Path $downloadPath)) {{ throw 'Installer download failed.' }}; \
         $installerPath = $downloadPath; \
         if ($ext -ieq '.zip') {{ \
             $extractDir = Join-Path $downloadDir ($appId + '-extract'); \
             if (Test-Path $extractDir) {{ Remove-Item -Path $extractDir -Recurse -Force }}; \
             Expand-Archive -Path $downloadPath -DestinationPath $extractDir -Force; \
             $candidate = Get-ChildItem -Path $extractDir -Recurse -File | \
               Where-Object {{ $_.Extension -in @('.exe', '.msi') }} | \
               Select-Object -First 1; \
             if ($null -eq $candidate) {{ throw 'Archive does not contain a supported installer.' }}; \
             $installerPath = $candidate.FullName; \
             $ext = $candidate.Extension; \
         }}; \
         if ($ext -ieq '.msi') {{ \
             $args = \"/i `\"$installerPath`\" $silentArgs\"; \
             $proc = Start-Process -FilePath 'msiexec.exe' -ArgumentList $args -PassThru -Wait -WindowStyle Hidden; \
         }} else {{ \
             $proc = Start-Process -FilePath $installerPath -ArgumentList $silentArgs -PassThru -Wait -WindowStyle Hidden; \
         }}; \
         [PSCustomObject]@{{ \
             downloadedPath = $downloadPath; \
             installerPath = $installerPath; \
             exitCode = $proc.ExitCode; \
         }} | ConvertTo-Json -Compress",
        url = safe_url,
        app_id = safe_id,
        silent_args = safe_silent_args,
        download_dir = safe_download_dir,
    );

    let result = powershell::execute(&script)?;
    if !result.success {
        return Ok(InstallResult {
            id: app_id.to_string(),
            name: app_name,
            status: "failed".to_string(),
            downloaded_path: None,
            exit_code: Some(result.exit_code),
            error: Some(result.stderr.trim().to_string()),
        });
    }

    let payload: serde_json::Value = serde_json::from_str(result.stdout.trim())
        .map_err(|e| anyhow::anyhow!("Failed to parse installer result: {}", e))?;
    let exit_code = payload.get("exitCode").and_then(|value| value.as_i64()).map(|value| value as i32);
    let downloaded_path = payload
        .get("downloadedPath")
        .and_then(|value| value.as_str())
        .map(ToOwned::to_owned);

    Ok(InstallResult {
        id: app_id.to_string(),
        name: app_name,
        status: if exit_code.unwrap_or(1) == 0 {
            "installed".to_string()
        } else {
            "failed".to_string()
        },
        downloaded_path,
        exit_code,
        error: if exit_code.unwrap_or(1) == 0 {
            None
        } else {
            Some(format!("Installer exited with code {}", exit_code.unwrap_or(-1)))
        },
    })
}

#[cfg(not(windows))]
fn install_catalog_entry(app_id: &str, entry: &CatalogEntry) -> anyhow::Result<InstallResult> {
    Ok(InstallResult {
        id: app_id.to_string(),
        name: entry.name.clone(),
        status: "skipped".to_string(),
        downloaded_path: None,
        exit_code: None,
        error: Some("App installation is only supported on Windows.".to_string()),
    })
}

#[cfg(windows)]
fn installer_cache_dir() -> anyhow::Result<PathBuf> {
    let base = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());
    let dir = PathBuf::from(base).join("redcore-os").join("downloads");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

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

        let recommended: Vec<&str> = apps
            .iter()
            .filter(|a| a["recommended"].as_bool() == Some(true))
            .filter_map(|a| a["id"].as_str())
            .collect();
        assert!(recommended.contains(&"steam"), "Steam must be recommended for gaming");
        assert!(recommended.contains(&"discord"), "Discord must be recommended for gaming");

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

        let recommended_count = apps
            .iter()
            .filter(|a| a["recommended"].as_bool() == Some(true))
            .count();
        assert_eq!(recommended_count, 0);
        assert!(apps.len() >= 10, "All catalog apps should still be listed");
    }
}
