// ─── Legacy Sidecar Migration ───────────────────────────────────────────────
// One-time import of resume-journal.json into the DB execution ledger.
// Runs on service startup. If the sidecar file exists and the DB has no active
// plan, imports the sidecar state, then deletes the file.
// If the DB already has an active plan, the sidecar is stale — just delete it.

use crate::db::Database;
use crate::ledger;
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
struct LegacySidecar {
    plan_id: String,
    #[allow(dead_code)]
    reason: String,
    #[allow(dead_code)]
    created_at: String,
    #[allow(dead_code)]
    updated_at: String,
    package: Option<LegacyPackage>,
    #[allow(dead_code)]
    current_action: Option<LegacyAction>,
    completed_actions: Vec<LegacyAction>,
    failed_actions: Vec<LegacyAction>,
    pending_reboot_actions: Vec<LegacyAction>,
    #[allow(dead_code)]
    last_resume_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LegacyPackage {
    plan_id: String,
    package_id: String,
    package_role: String,
    package_version: Option<String>,
    package_source_ref: Option<String>,
    action_provenance_ref: Option<String>,
    execution_journal_ref: Option<String>,
    source_commit: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LegacyAction {
    #[allow(dead_code)]
    id: String,
    action_id: String,
    label: String,
    phase: String,
    package_source_ref: Option<String>,
    provenance_ref: Option<String>,
    question_keys: Vec<String>,
    selected_values: Vec<String>,
    requires_reboot: bool,
    status: String,
    #[allow(dead_code)]
    result_status: Option<String>,
    rollback_snapshot_id: Option<String>,
    #[allow(dead_code)]
    error: Option<String>,
    #[allow(dead_code)]
    created_at: String,
    #[allow(dead_code)]
    updated_at: String,
    #[allow(dead_code)]
    completed_at: Option<String>,
}

fn sidecar_path() -> PathBuf {
    #[cfg(windows)]
    {
        let base = std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());
        PathBuf::from(base).join("redcore-os").join("resume-journal.json")
    }

    #[cfg(not(windows))]
    {
        PathBuf::from("./data/resume-journal.json")
    }
}

pub fn import_legacy_sidecar(db: &Database) {
    let path = sidecar_path();
    if !path.exists() {
        return;
    }

    tracing::info!(path = ?path, "Found legacy sidecar file — attempting migration");

    // Check if DB already has an active plan
    match ledger::load_active_plan(db) {
        Ok(Some(plan)) => {
            tracing::info!(
                plan_id = plan.id.as_str(),
                "DB already has active plan '{}' — deleting stale sidecar",
                plan.id
            );
            if let Err(e) = std::fs::remove_file(&path) {
                tracing::warn!(error = %e, "Failed to delete stale sidecar file");
            }
            return;
        }
        Err(e) => {
            tracing::warn!(error = %e, "Failed to check active plan — skipping sidecar migration");
            return;
        }
        Ok(None) => {
            // No active plan — proceed with import
        }
    }

    // Read and parse sidecar
    let content = match std::fs::read(&path) {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to read sidecar file");
            return;
        }
    };

    let sidecar: LegacySidecar = match serde_json::from_slice(&content) {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!(error = %e, "Failed to parse sidecar JSON — deleting corrupt file");
            let _ = std::fs::remove_file(&path);
            return;
        }
    };

    // Build package identity
    let package = sidecar.package.as_ref().map(|p| ledger::PackageIdentity {
        plan_id: p.plan_id.clone(),
        package_id: p.package_id.clone(),
        package_role: p.package_role.clone(),
        package_version: p.package_version.clone(),
        package_source_ref: p.package_source_ref.clone(),
        action_provenance_ref: p.action_provenance_ref.clone(),
        execution_journal_ref: p.execution_journal_ref.clone(),
        source_commit: p.source_commit.clone(),
    });

    let pkg = match package {
        Some(p) => p,
        None => {
            tracing::warn!("Sidecar has no package identity — cannot import");
            let _ = std::fs::remove_file(&path);
            return;
        }
    };

    // Build action queue from all actions (completed + failed + pending)
    let mut all_actions: Vec<ledger::QueuedAction> = Vec::new();
    let mut pos = 0i32;

    for action in sidecar.completed_actions.iter()
        .chain(sidecar.failed_actions.iter())
        .chain(sidecar.pending_reboot_actions.iter())
    {
        all_actions.push(ledger::QueuedAction {
            action_id: action.action_id.clone(),
            action_name: action.label.clone(),
            phase: action.phase.clone(),
            queue_position: pos,
            inclusion_reason: None,
            blocked_reason: None,
            preserved_reason: None,
            risk_level: "safe".to_string(),
            expert_only: false,
            requires_reboot: action.requires_reboot,
            package_source_ref: action.package_source_ref.clone(),
            provenance_ref: action.provenance_ref.clone(),
            question_keys: action.question_keys.clone(),
            selected_values: action.selected_values.clone(),
        });
        pos += 1;
    }

    if all_actions.is_empty() {
        tracing::info!("Sidecar has no actions to import — deleting");
        let _ = std::fs::remove_file(&path);
        return;
    }

    // Create the plan in DB ledger
    if let Err(e) = ledger::create_plan(db, &pkg, "unknown", "balanced", &all_actions) {
        tracing::error!(error = %e, "Failed to create plan from sidecar");
        return;
    }

    // Record results for completed/failed actions
    for action in &sidecar.completed_actions {
        let status = if action.status == "completed" || action.status == "applied" {
            "success"
        } else {
            &action.status
        };
        let _ = ledger::record_action_result(db, &sidecar.plan_id, &ledger::ActionResult {
            action_id: action.action_id.clone(),
            status: status.to_string(),
            rollback_snapshot_id: action.rollback_snapshot_id.clone(),
            error_message: None,
            duration_ms: None,
        });
    }

    for action in &sidecar.failed_actions {
        let _ = ledger::record_action_result(db, &sidecar.plan_id, &ledger::ActionResult {
            action_id: action.action_id.clone(),
            status: "failed".to_string(),
            rollback_snapshot_id: action.rollback_snapshot_id.clone(),
            error_message: action.error.clone(),
            duration_ms: None,
        });
    }

    // If there are pending reboot actions, mark plan as paused_reboot
    if !sidecar.pending_reboot_actions.is_empty() {
        if let Err(e) = ledger::mark_reboot_pending(db, &sidecar.plan_id, "migrated-from-sidecar") {
            tracing::error!(error = %e, "Failed to mark migrated plan as paused_reboot");
        }
    } else {
        // All done — complete the plan
        if let Err(e) = ledger::complete_plan(db, &sidecar.plan_id) {
            tracing::error!(error = %e, "Failed to complete migrated plan");
        }
    }

    // Delete the sidecar file
    if let Err(e) = std::fs::remove_file(&path) {
        tracing::warn!(error = %e, "Failed to delete migrated sidecar file");
    } else {
        tracing::info!(
            plan_id = sidecar.plan_id.as_str(),
            completed = sidecar.completed_actions.len(),
            failed = sidecar.failed_actions.len(),
            pending = sidecar.pending_reboot_actions.len(),
            "Legacy sidecar migrated to DB ledger and deleted"
        );
    }
}
