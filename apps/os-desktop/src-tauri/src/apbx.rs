// APBX bundle creator — Rust port of apps/os-desktop/src/main/lib/apbx.ts
// Creates ZIP-based .apbx packages containing playbooks, wizard state,
// resolved configuration, manifest with checksums, and execution provenance.
//
// This runs in the Tauri backend (unprivileged). It does NOT perform
// system mutations — it only reads playbook files and serializes state.

use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPackageRequest {
    pub detected_profile: Option<serde_json::Value>,
    pub playbook_preset: Option<String>,
    pub answers: Option<serde_json::Value>,
    pub resolved_playbook: Option<serde_json::Value>,
    pub decision_summary: Option<serde_json::Value>,
    pub action_provenance: Option<serde_json::Value>,
    pub execution_journal: Option<serde_json::Value>,
    pub service_journal_state: Option<serde_json::Value>,
    pub ledger_state: Option<serde_json::Value>,
    pub personalization: Option<serde_json::Value>,
    pub selected_app_ids: Option<Vec<String>>,
}

#[derive(serde::Serialize)]
pub struct ExportResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
    #[serde(rename = "sizeBytes", skip_serializing_if = "Option::is_none")]
    pub size_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ExportResult {
    pub fn ok(path: String, sha256: String, size: u64) -> Self {
        Self {
            ok: true,
            path: Some(path),
            sha256: Some(sha256),
            size_bytes: Some(size),
            error: None,
        }
    }
    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            ok: false,
            path: None,
            sha256: None,
            size_bytes: None,
            error: Some(msg.into()),
        }
    }
}

pub fn create_bundle(
    output_path: &Path,
    playbook_root: &Path,
    wizard_metadata: &serde_json::Value,
    state: &ExportPackageRequest,
    version: &str,
    commit: &str,
) -> Result<ExportResult, String> {
    let built_at = chrono_free_iso();
    let has_state = state.detected_profile.is_some();
    let package_kind = if has_state {
        "user-resolved"
    } else {
        "wizard-template"
    };
    let package_stem = if has_state {
        format!("ouden-os-user-{version}-{commit}")
    } else {
        format!("ouden-os-template-{version}-{commit}")
    };

    // Build the bundle in a temp directory, then ZIP it
    let temp_dir = std::env::temp_dir().join(format!("ouden-os-apbx-{}", std::process::id()));
    let pkg_dir = temp_dir.join(&package_stem);

    let payload_dir = pkg_dir.join("payload").join("playbooks");
    let state_dir = pkg_dir.join("state");
    let wizard_dir = pkg_dir.join("wizard");
    let config_dir = pkg_dir.join("Configuration");
    let injection_dir = pkg_dir.join("injection");
    let meta_dir = pkg_dir.join("meta");

    for d in [
        &payload_dir,
        &state_dir,
        &wizard_dir,
        &config_dir,
        &injection_dir,
        &meta_dir,
    ] {
        fs::create_dir_all(d).map_err(|e| format!("mkdir failed: {e}"))?;
    }

    // wizard.json
    write_json(&wizard_dir.join("wizard.json"), wizard_metadata)?;

    // Configuration/main.yml
    let config_yml = render_resolved_config(wizard_metadata, state, package_kind);
    fs::write(config_dir.join("main.yml"), config_yml).map_err(|e| e.to_string())?;

    // injection/staging.json
    let staging = serde_json::json!({
        "supportsISO": wizard_metadata.get("supportsISO").and_then(|v| v.as_bool()).unwrap_or(false),
        "supportsOffline": true,
        "supportsImageInjection": true,
        "injectPath": wizard_metadata.pointer("/iso/injectPath"),
        "disableBitLocker": wizard_metadata.pointer("/iso/disableBitLocker").and_then(|v| v.as_bool()).unwrap_or(false),
        "disableHardwareRequirements": wizard_metadata.pointer("/iso/disableHardwareRequirements").and_then(|v| v.as_bool()).unwrap_or(false),
        "supportedBuilds": wizard_metadata.get("supportedBuilds").unwrap_or(&serde_json::json!([])),
    });
    write_json(&injection_dir.join("staging.json"), &staging)?;

    // meta/release.json
    let artifact_name = output_path
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_default();
    let release = serde_json::json!({
        "product": "ouden-os",
        "packageRole": package_kind,
        "artifactName": artifact_name,
        "version": version,
        "commit": commit,
        "builtAt": built_at,
        "sourceRepo": wizard_metadata.get("git").and_then(|v| v.as_str()).unwrap_or(""),
        "sourceWizardConfig": "playbooks/wizard.json",
    });
    write_json(&meta_dir.join("release.json"), &release)?;

    // Copy playbooks
    copy_dir_recursive(playbook_root, &payload_dir).map_err(|e| format!("copy playbooks: {e}"))?;

    // Write state files
    if has_state {
        write_json(
            &state_dir.join("answers.json"),
            &val_or_null(&state.answers),
        )?;
        write_json(
            &state_dir.join("profile.json"),
            &val_or_null(&state.detected_profile),
        )?;
        write_json(
            &state_dir.join("personalization.json"),
            &val_or_null(&state.personalization),
        )?;
        write_json(
            &state_dir.join("selected-apps.json"),
            &serde_json::json!(state.selected_app_ids.as_deref().unwrap_or(&[])),
        )?;
        write_json(
            &state_dir.join("resolved-playbook.json"),
            &val_or_null(&state.resolved_playbook),
        )?;
        write_json(
            &state_dir.join("decision-summary.json"),
            &val_or_null(&state.decision_summary),
        )?;
        write_json(
            &state_dir.join("action-provenance.json"),
            &val_or_null(&state.action_provenance),
        )?;
        write_json(
            &state_dir.join("execution-journal.json"),
            &val_or_null(&state.execution_journal),
        )?;
        write_json(
            &state_dir.join("service-journal-state.json"),
            &val_or_null(&state.service_journal_state),
        )?;
        if state.ledger_state.is_some() {
            write_json(
                &state_dir.join("execution-ledger.json"),
                &val_or_null(&state.ledger_state),
            )?;
        }
    }

    // Compute checksums for all files in the package
    let all_files = list_files_recursive(&pkg_dir);
    let checksums: Vec<serde_json::Value> = all_files
        .iter()
        .map(|f| {
            let rel = f.strip_prefix(&pkg_dir).unwrap_or(f);
            let hash = sha256_file(f).unwrap_or_default();
            let size = fs::metadata(f).map(|m| m.len()).unwrap_or(0);
            serde_json::json!({
                "path": rel.to_string_lossy().replace('\\', "/"),
                "sha256": hash,
                "sizeBytes": size,
            })
        })
        .collect();

    // Build manifest
    let action_provenance = &state.action_provenance;
    let execution_journal = &state.execution_journal;
    let manifest = build_manifest(
        wizard_metadata,
        state,
        package_kind,
        version,
        commit,
        &built_at,
        &artifact_name,
        &checksums,
        action_provenance,
        execution_journal,
    );
    write_json(&pkg_dir.join("manifest.json"), &manifest)?;

    // Create ZIP
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    zip_directory(&pkg_dir, &package_stem, output_path)?;

    let sha256 = sha256_file(output_path).unwrap_or_default();
    let size = fs::metadata(output_path).map(|m| m.len()).unwrap_or(0);

    // Cleanup temp
    let _ = fs::remove_dir_all(&temp_dir);

    Ok(ExportResult::ok(
        output_path.to_string_lossy().to_string(),
        sha256,
        size,
    ))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn write_json(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, format!("{content}\n")).map_err(|e| format!("write {}: {e}", path.display()))
}

fn val_or_null(v: &Option<serde_json::Value>) -> serde_json::Value {
    v.clone().unwrap_or(serde_json::Value::Null)
}

fn sha256_file(path: &Path) -> Result<String, std::io::Error> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 8192];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn list_files_recursive(dir: &Path) -> Vec<PathBuf> {
    walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.into_path())
        .collect()
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let target = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

fn zip_directory(source_dir: &Path, root_name: &str, output: &Path) -> Result<(), String> {
    let file = fs::File::create(output).map_err(|e| format!("create zip: {e}"))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in walkdir::WalkDir::new(source_dir) {
        let entry = entry.map_err(|e| e.to_string())?;
        let abs = entry.path();
        let rel = abs.strip_prefix(source_dir).unwrap_or(abs);
        let archive_path = format!("{root_name}/{}", rel.to_string_lossy().replace('\\', "/"));

        if entry.file_type().is_dir() {
            zip.add_directory(&archive_path, options)
                .map_err(|e| e.to_string())?;
        } else {
            zip.start_file(&archive_path, options)
                .map_err(|e| e.to_string())?;
            let mut f = fs::File::open(abs).map_err(|e| e.to_string())?;
            std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn render_resolved_config(
    wm: &serde_json::Value,
    state: &ExportPackageRequest,
    package_kind: &str,
) -> String {
    let mut lines = vec![
        "---".to_string(),
        format!(
            "title: \"{}\"",
            wm.get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Ouden OS Package")
        ),
        format!(
            "packageId: \"{}\"",
            wm.get("packageId")
                .and_then(|v| v.as_str())
                .unwrap_or("ouden-os")
        ),
        format!("packageKind: \"{package_kind}\""),
        format!(
            "profile: \"{}\"",
            state
                .detected_profile
                .as_ref()
                .and_then(|p| p.get("id"))
                .and_then(|v| v.as_str())
                .unwrap_or("template")
        ),
        format!(
            "preset: \"{}\"",
            state.playbook_preset.as_deref().unwrap_or("balanced")
        ),
        "requirements:".to_string(),
    ];

    if let Some(reqs) = wm.get("requirements").and_then(|v| v.as_array()) {
        for r in reqs {
            lines.push(format!("  - \"{}\"", r.as_str().unwrap_or("")));
        }
    }

    lines.push("injection:".to_string());
    lines.push(format!(
        "  supportsISO: {}",
        wm.get("supportsISO")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    ));
    lines.push(format!(
        "  injectPath: \"{}\"",
        wm.pointer("/iso/injectPath")
            .and_then(|v| v.as_str())
            .unwrap_or("sources/$OEM$/$1/redcore/wizard")
    ));
    lines.push(format!(
        "  disableBitLocker: {}",
        wm.pointer("/iso/disableBitLocker")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    ));
    lines.push(format!(
        "  disableHardwareRequirements: {}",
        wm.pointer("/iso/disableHardwareRequirements")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    ));

    if state.detected_profile.is_some() {
        lines.push("selectedApps:".to_string());
        let apps = state.selected_app_ids.as_deref().unwrap_or(&[]);
        if apps.is_empty() {
            lines.push("  []".to_string());
        } else {
            for app in apps {
                lines.push(format!("  - \"{app}\""));
            }
        }
        lines.push("answers:".to_string());
        if let Some(answers) = state.answers.as_ref().and_then(|a| a.as_object()) {
            for (key, value) in answers {
                lines.push(format!(
                    "  {key}: \"{}\"",
                    value.as_str().unwrap_or(&value.to_string())
                ));
            }
        }
    }

    lines.join("\n") + "\n"
}

fn build_manifest(
    wm: &serde_json::Value,
    state: &ExportPackageRequest,
    package_kind: &str,
    version: &str,
    commit: &str,
    built_at: &str,
    artifact_name: &str,
    checksums: &[serde_json::Value],
    action_provenance: &Option<serde_json::Value>,
    execution_journal: &Option<serde_json::Value>,
) -> serde_json::Value {
    let ap_count = action_provenance
        .as_ref()
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);
    let ej_count = execution_journal
        .as_ref()
        .and_then(|v| v.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    serde_json::json!({
        "format": "ouden-os-apbx",
        "formatVersion": 1,
        "packageKind": package_kind,
        "packageId": wm.get("packageId").and_then(|v| v.as_str()).unwrap_or("ouden-os"),
        "title": wm.get("title").and_then(|v| v.as_str()).unwrap_or("Ouden OS Package"),
        "packageVersion": version,
        "commit": commit,
        "builtAt": built_at,
        "source": {
            "repo": wm.get("git").and_then(|v| v.as_str()).unwrap_or(""),
            "wizardConfig": "playbooks/wizard.json",
        },
        "supportedBuilds": wm.get("supportedBuilds").unwrap_or(&serde_json::json!([])),
        "requirements": wm.get("requirements").unwrap_or(&serde_json::json!([])),
        "riskLevel": state.decision_summary.as_ref()
            .and_then(|d| d.get("riskLevel")).and_then(|v| v.as_str()).unwrap_or("template"),
        "release": {
            "product": "ouden-os",
            "packageRole": package_kind,
            "artifactName": artifact_name,
            "version": version,
            "commit": commit,
            "builtAt": built_at,
        },
        "payload": {
            "includesPlaybooks": true,
            "includesResolvedPlaybook": state.resolved_playbook.is_some(),
            "includesWizardMetadata": true,
            "includesDecisionSummary": state.decision_summary.is_some(),
            "includesAnswerState": state.detected_profile.is_some(),
            "includesActionProvenance": action_provenance.is_some(),
            "includesExecutionJournal": execution_journal.is_some(),
            "includesServiceJournalState": state.service_journal_state.is_some(),
            "includesExecutionLedger": state.ledger_state.is_some(),
        },
        "provenance": {
            "actionCount": ap_count,
            "journalEntryCount": ej_count,
        },
        "checksums": checksums,
    })
}

fn chrono_free_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Simple ISO-ish timestamp without pulling in chrono
    let secs_per_day = 86400u64;
    let days = now / secs_per_day;
    let rem = now % secs_per_day;
    let h = rem / 3600;
    let m = (rem % 3600) / 60;
    let s = rem % 60;
    // Approximate date from epoch days (good enough for bundle timestamps)
    let (y, mo, d) = epoch_days_to_date(days);
    format!("{y:04}-{mo:02}-{d:02}T{h:02}:{m:02}:{s:02}Z")
}

fn epoch_days_to_date(days: u64) -> (u64, u64, u64) {
    // Simplified date calculation from epoch days
    let mut y = 1970;
    let mut remaining = days;
    loop {
        let days_in_year = if is_leap(y) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let leap = is_leap(y);
    let month_days = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut mo = 1u64;
    for &md in &month_days {
        if remaining < md {
            break;
        }
        remaining -= md;
        mo += 1;
    }
    (y, mo, remaining + 1)
}

fn is_leap(y: u64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}
