// ─── Execution Ledger ───────────────────────────────────────────────────────
// DB-backed execution plan, queue, and ledger.
// This is the authoritative source of execution truth across reboot boundaries.
// Replaces the JSON sidecar file (resume-journal.json) with real SQLite tables.

use crate::db::Database;
use anyhow::Result;
use serde::{Deserialize, Serialize};

// ─── Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageIdentity {
    pub plan_id: String,
    pub package_id: String,
    pub package_role: String,
    pub package_version: Option<String>,
    pub package_source_ref: Option<String>,
    pub action_provenance_ref: Option<String>,
    pub execution_journal_ref: Option<String>,
    pub source_commit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueuedAction {
    pub action_id: String,
    pub action_name: String,
    pub phase: String,
    pub queue_position: i32,
    pub inclusion_reason: Option<String>,
    pub blocked_reason: Option<String>,
    pub preserved_reason: Option<String>,
    pub risk_level: String,
    pub expert_only: bool,
    pub requires_reboot: bool,
    pub package_source_ref: Option<String>,
    pub provenance_ref: Option<String>,
    pub question_keys: Vec<String>,
    pub selected_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    pub action_id: String,
    pub status: String,
    pub rollback_snapshot_id: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: Option<i64>,
}

// ─── Plan creation ──────────────────────────────────────────────────────────

pub fn create_plan(
    db: &Database,
    package: &PackageIdentity,
    profile: &str,
    preset: &str,
    actions: &[QueuedAction],
) -> Result<String> {
    let now = chrono::Utc::now().to_rfc3339();

    // One transaction for the whole plan: a crash can never leave a partially
    // enqueued plan, and N inserts cost one commit instead of N.
    let tx = db.conn().unchecked_transaction()?;

    db.conn().execute(
        "INSERT OR IGNORE INTO execution_plans
         (id, package_id, package_role, package_version, package_source_ref,
          action_provenance_ref, execution_journal_ref, source_commit,
          profile, preset, total_actions, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'running', ?12, ?12)",
        rusqlite::params![
            package.plan_id,
            package.package_id,
            package.package_role,
            package.package_version,
            package.package_source_ref,
            package.action_provenance_ref,
            package.execution_journal_ref,
            package.source_commit,
            profile,
            preset,
            actions.len() as i32,
            now,
        ],
    )?;

    // Insert all actions into the queue
    for action in actions {
        let id = format!("q-{}-{}", package.plan_id, action.action_id);
        let question_keys_json = serde_json::to_string(&action.question_keys)?;
        let selected_values_json = serde_json::to_string(&action.selected_values)?;

        db.conn().execute(
            "INSERT OR IGNORE INTO execution_queue
             (id, plan_id, action_id, action_name, phase, queue_position, status,
              inclusion_reason, blocked_reason, preserved_reason, risk_level, expert_only,
              requires_reboot, package_source_ref, provenance_ref, question_keys, selected_values,
              created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'queued', ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?17)",
            rusqlite::params![
                id,
                package.plan_id,
                action.action_id,
                action.action_name,
                action.phase,
                action.queue_position,
                action.inclusion_reason,
                action.blocked_reason,
                action.preserved_reason,
                action.risk_level,
                action.expert_only as i32,
                action.requires_reboot as i32,
                action.package_source_ref,
                action.provenance_ref,
                question_keys_json,
                selected_values_json,
                now,
            ],
        )?;

        // Ledger: enqueued event
        append_ledger_event(
            db,
            &package.plan_id,
            &action.action_id,
            "enqueued",
            "queued",
            Some(&format!(
                "pos={} phase={}",
                action.queue_position, action.phase
            )),
            action.package_source_ref.as_deref(),
            action.provenance_ref.as_deref(),
            None,
        )?;
    }

    tx.commit()?;

    tracing::info!(
        plan_id = package.plan_id.as_str(),
        total = actions.len(),
        "Execution plan created in DB ledger"
    );

    Ok(package.plan_id.clone())
}

// ─── Record action result ───────────────────────────────────────────────────

pub fn record_action_result(db: &Database, plan_id: &str, result: &ActionResult) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();

    let queue_status = queue_status_for(&result.status);

    // COALESCE: a later report without a snapshot id / error (e.g. the UI's
    // own recordResult after the service already recorded the outcome) must
    // never erase the rollback link or the error detail.
    db.conn().execute(
        "UPDATE execution_queue SET
            status = ?1,
            result_status = ?2,
            rollback_snapshot_id = COALESCE(?3, rollback_snapshot_id),
            error_message = COALESCE(?4, error_message),
            duration_ms = COALESCE(?5, duration_ms),
            updated_at = ?6,
            completed_at = ?6
         WHERE plan_id = ?7 AND action_id = ?8",
        rusqlite::params![
            queue_status,
            result.status,
            result.rollback_snapshot_id,
            result.error_message,
            result.duration_ms,
            now,
            plan_id,
            result.action_id,
        ],
    )?;

    let event_type = event_type_for(&result.status);

    append_ledger_event(
        db,
        plan_id,
        &result.action_id,
        event_type,
        &result.status,
        result.error_message.as_deref(),
        None,
        None,
        result.rollback_snapshot_id.as_deref(),
    )?;

    Ok(())
}

/// Queue status for an executor/UI result status.
pub fn queue_status_for(status: &str) -> &'static str {
    match status {
        "success" | "completed" | "partial" | "applied" => "completed",
        "skipped" => "skipped",
        "preserved" => "preserved",
        "awaiting_reboot" => "awaiting_reboot",
        "running" => "running",
        // failed, rolled_back, rollback_failed and anything unknown
        _ => "failed",
    }
}

/// Ledger event type for a result status (skipped is not a failure).
pub fn event_type_for(status: &str) -> &'static str {
    match queue_status_for(status) {
        "completed" => "completed",
        "skipped" => "skipped",
        "preserved" => "preserved",
        _ => "failed",
    }
}

// ─── Mark action as started ─────────────────────────────────────────────────

pub fn mark_action_started(db: &Database, plan_id: &str, action_id: &str) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();

    db.conn().execute(
        "UPDATE execution_queue SET status = 'running', started_at = ?1, updated_at = ?1
         WHERE plan_id = ?2 AND action_id = ?3",
        rusqlite::params![now, plan_id, action_id],
    )?;

    append_ledger_event(
        db, plan_id, action_id, "started", "running", None, None, None, None,
    )?;
    Ok(())
}

// ─── Mark actions awaiting reboot ───────────────────────────────────────────

pub fn mark_reboot_pending(db: &Database, plan_id: &str, reason: &str) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();

    // Mark the plan as paused_reboot
    db.conn().execute(
        "UPDATE execution_plans SET status = 'paused_reboot', reboot_reason = ?1, updated_at = ?2
         WHERE id = ?3",
        rusqlite::params![reason, now, plan_id],
    )?;

    // All queued (remaining) actions stay as-is — they form the persisted remaining queue
    // The service owns this queue and will re-dispatch on resume

    append_ledger_event(
        db,
        plan_id,
        "__plan__",
        "reboot_scheduled",
        "paused_reboot",
        Some(reason),
        None,
        None,
        None,
    )?;

    tracing::info!(
        plan_id = plan_id,
        reason = reason,
        "Plan marked paused_reboot in DB ledger"
    );
    Ok(())
}

// ─── Resume: get remaining queue ────────────────────────────────────────────

pub fn get_remaining_queue(db: &Database, plan_id: &str) -> Result<Vec<QueueEntry>> {
    let mut stmt = db.conn().prepare(
        "SELECT id, action_id, action_name, phase, queue_position, status,
                package_source_ref, provenance_ref, question_keys, selected_values,
                requires_reboot, risk_level, expert_only, inclusion_reason
         FROM execution_queue
         WHERE plan_id = ?1 AND status IN ('queued', 'running')
         ORDER BY queue_position ASC",
    )?;

    let entries = stmt
        .query_map([plan_id], |row| {
            Ok(QueueEntry {
                id: row.get(0)?,
                action_id: row.get(1)?,
                action_name: row.get(2)?,
                phase: row.get(3)?,
                queue_position: row.get(4)?,
                status: row.get(5)?,
                package_source_ref: row.get(6)?,
                provenance_ref: row.get(7)?,
                question_keys_json: row.get(8)?,
                selected_values_json: row.get(9)?,
                requires_reboot: row.get::<_, i32>(10)? != 0,
                risk_level: row.get(11)?,
                expert_only: row.get::<_, i32>(12)? != 0,
                inclusion_reason: row.get(13)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

#[derive(Debug, Clone)]
pub struct QueueEntry {
    pub id: String,
    pub action_id: String,
    pub action_name: String,
    pub phase: String,
    pub queue_position: i32,
    pub status: String,
    pub package_source_ref: Option<String>,
    pub provenance_ref: Option<String>,
    pub question_keys_json: String,
    pub selected_values_json: String,
    pub requires_reboot: bool,
    pub risk_level: String,
    pub expert_only: bool,
    pub inclusion_reason: Option<String>,
}

// ─── Resume execution ───────────────────────────────────────────────────────

pub fn resume_plan(db: &Database, plan_id: &str) -> Result<ResumeResult> {
    let now = chrono::Utc::now().to_rfc3339();

    // Update plan status
    db.conn().execute(
        "UPDATE execution_plans SET status = 'running', last_resume_at = ?1, updated_at = ?1
         WHERE id = ?2",
        rusqlite::params![now, plan_id],
    )?;

    let remaining = get_remaining_queue(db, plan_id)?;

    // Load package identity
    let package = load_plan_package(db, plan_id)?;

    append_ledger_event(
        db,
        plan_id,
        "__plan__",
        "resumed",
        "running",
        Some(&format!("remaining={}", remaining.len())),
        None,
        None,
        None,
    )?;

    tracing::info!(
        plan_id = plan_id,
        remaining = remaining.len(),
        "Plan resumed from DB ledger"
    );

    Ok(ResumeResult {
        plan_id: plan_id.to_string(),
        remaining_actions: remaining,
        package,
    })
}

#[derive(Debug)]
pub struct ResumeResult {
    pub plan_id: String,
    pub remaining_actions: Vec<QueueEntry>,
    pub package: Option<PackageIdentity>,
}

// ─── Complete plan ──────────────────────────────────────────────────────────

pub fn complete_plan(db: &Database, plan_id: &str) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();

    db.conn().execute(
        "UPDATE execution_plans SET status = 'completed', completed_at = ?1, updated_at = ?1
         WHERE id = ?2",
        rusqlite::params![now, plan_id],
    )?;

    append_ledger_event(
        db,
        plan_id,
        "__plan__",
        "completed",
        "completed",
        None,
        None,
        None,
        None,
    )?;
    Ok(())
}

// ─── Cancel plan ────────────────────────────────────────────────────────────

pub fn cancel_plan(db: &Database, plan_id: &str) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();

    db.conn().execute(
        "UPDATE execution_plans SET status = 'cancelled', updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, plan_id],
    )?;

    // Mark remaining queued actions as skipped
    db.conn().execute(
        "UPDATE execution_queue SET status = 'skipped', updated_at = ?1
         WHERE plan_id = ?2 AND status IN ('queued', 'running')",
        rusqlite::params![now, plan_id],
    )?;

    append_ledger_event(
        db,
        plan_id,
        "__plan__",
        "cancelled",
        "cancelled",
        None,
        None,
        None,
        None,
    )?;
    Ok(())
}

// ─── Load active plan ───────────────────────────────────────────────────────

pub fn load_active_plan(db: &Database) -> Result<Option<PlanState>> {
    let result = db.conn().query_row(
        "SELECT id, package_id, package_role, package_version, package_source_ref,
                action_provenance_ref, execution_journal_ref, source_commit,
                profile, preset, total_actions, status, reboot_reason,
                created_at, updated_at, completed_at, last_resume_at
         FROM execution_plans
         WHERE status IN ('running', 'paused_reboot')
         ORDER BY created_at DESC LIMIT 1",
        [],
        |row| {
            Ok(PlanState {
                id: row.get(0)?,
                package_id: row.get(1)?,
                package_role: row.get(2)?,
                package_version: row.get(3)?,
                package_source_ref: row.get(4)?,
                action_provenance_ref: row.get(5)?,
                execution_journal_ref: row.get(6)?,
                source_commit: row.get(7)?,
                profile: row.get(8)?,
                preset: row.get(9)?,
                total_actions: row.get(10)?,
                status: row.get(11)?,
                reboot_reason: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
                completed_at: row.get(15)?,
                last_resume_at: row.get(16)?,
            })
        },
    );

    match result {
        Ok(plan) => Ok(Some(plan)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

#[derive(Debug, Clone)]
pub struct PlanState {
    pub id: String,
    pub package_id: String,
    pub package_role: String,
    pub package_version: Option<String>,
    pub package_source_ref: Option<String>,
    pub action_provenance_ref: Option<String>,
    pub execution_journal_ref: Option<String>,
    pub source_commit: Option<String>,
    pub profile: String,
    pub preset: String,
    pub total_actions: i32,
    pub status: String,
    pub reboot_reason: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub last_resume_at: Option<String>,
}

// ─── Query full plan state (for journal.state IPC) ──────────────────────────

pub fn query_plan_journal_state(db: &Database, plan_id: &str) -> Result<serde_json::Value> {
    let plan = db.conn().query_row(
        "SELECT id, package_id, package_role, package_version, package_source_ref,
                action_provenance_ref, execution_journal_ref, source_commit,
                total_actions, status, reboot_reason, last_resume_at
         FROM execution_plans WHERE id = ?1",
        [plan_id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, i32>(8)?,
                row.get::<_, String>(9)?,
                row.get::<_, Option<String>>(10)?,
                row.get::<_, Option<String>>(11)?,
            ))
        },
    )?;

    let (
        id,
        pkg_id,
        pkg_role,
        pkg_ver,
        pkg_src,
        prov_ref,
        journal_ref,
        src_commit,
        total,
        status,
        reboot_reason,
        last_resume,
    ) = plan;

    // Load all queue entries for this plan
    let mut stmt = db.conn().prepare(
        "SELECT action_id, action_name, phase, queue_position, status,
                package_source_ref, provenance_ref, question_keys, selected_values,
                requires_reboot, rollback_snapshot_id, result_status, error_message,
                started_at, completed_at, duration_ms
         FROM execution_queue WHERE plan_id = ?1 ORDER BY queue_position ASC",
    )?;

    let steps: Vec<serde_json::Value> = stmt
        .query_map([&id], |row| {
            let qk: String = row.get(7)?;
            let sv: String = row.get(8)?;
            Ok(serde_json::json!({
                "actionId": row.get::<_, String>(0)?,
                "actionName": row.get::<_, String>(1)?,
                "phase": row.get::<_, String>(2)?,
                "queuePosition": row.get::<_, i32>(3)?,
                "status": row.get::<_, String>(4)?,
                "packageSourceRef": row.get::<_, Option<String>>(5)?,
                "provenanceRef": row.get::<_, Option<String>>(6)?,
                "questionKeys": serde_json::from_str::<serde_json::Value>(&qk).unwrap_or(serde_json::json!([])),
                "selectedValues": serde_json::from_str::<serde_json::Value>(&sv).unwrap_or(serde_json::json!([])),
                "requiresReboot": row.get::<_, i32>(9)? != 0,
                "rollbackSnapshotId": row.get::<_, Option<String>>(10)?,
                "resultStatus": row.get::<_, Option<String>>(11)?,
                "errorMessage": row.get::<_, Option<String>>(12)?,
                "startedAt": row.get::<_, Option<String>>(13)?,
                "completedAt": row.get::<_, Option<String>>(14)?,
                "durationMs": row.get::<_, Option<i64>>(15)?,
            }))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let completed_ids: Vec<String> = steps
        .iter()
        .filter(|s| s["status"] == "completed")
        .filter_map(|s| s["actionId"].as_str().map(String::from))
        .collect();

    let failed_ids: Vec<String> = steps
        .iter()
        .filter(|s| s["status"] == "failed")
        .filter_map(|s| s["actionId"].as_str().map(String::from))
        .collect();

    let remaining_refs: Vec<String> = steps
        .iter()
        .filter(|s| s["status"] == "queued" || s["status"] == "running")
        .filter_map(|s| s["provenanceRef"].as_str().map(String::from))
        .collect();

    let pending_reboot_ids: Vec<String> = steps
        .iter()
        .filter(|s| s["status"] == "awaiting_reboot")
        .filter_map(|s| s["actionId"].as_str().map(String::from))
        .collect();

    let completed_count = completed_ids.len() as i32;
    let total_processed = steps.iter().filter(|s| s["status"] != "queued").count() as i32;
    let progress = if total > 0 {
        ((completed_count as f64 / total as f64) * 100.0) as i32
    } else {
        0
    };

    let can_resume = status == "paused_reboot" && !remaining_refs.is_empty();

    // Find current action (first running or first queued)
    let current = steps
        .iter()
        .find(|s| s["status"] == "running")
        .or_else(|| steps.iter().find(|s| s["status"] == "queued"));

    Ok(serde_json::json!({
        "planId": id,
        "currentStepId": current.map(|s| s["actionId"].as_str().unwrap_or("")).unwrap_or(""),
        "lastCompletedStepId": steps.iter().rev().find(|s| s["status"] == "completed").and_then(|s| s["actionId"].as_str()),
        "overallProgress": progress,
        "requiresReboot": status == "paused_reboot",
        "canResume": can_resume,
        "completedActionIds": completed_ids,
        "failedActionIds": failed_ids,
        "package": {
            "planId": id,
            "packageId": pkg_id,
            "packageRole": pkg_role,
            "packageVersion": pkg_ver,
            "packageSourceRef": pkg_src,
            "actionProvenanceRef": prov_ref,
            "executionJournalRef": journal_ref,
            "sourceCommit": src_commit,
        },
        "currentActionId": current.and_then(|s| s["actionId"].as_str()),
        "currentActionProvenanceRef": current.and_then(|s| s["provenanceRef"].as_str()),
        "currentActionPackageSourceRef": current.and_then(|s| s["packageSourceRef"].as_str()),
        "currentActionQuestionKeys": current.map(|s| &s["questionKeys"]).unwrap_or(&serde_json::json!([])),
        "currentActionSelectedValues": current.map(|s| &s["selectedValues"]).unwrap_or(&serde_json::json!([])),
        "pendingRebootActionIds": pending_reboot_ids,
        "pendingRebootProvenanceRefs": steps.iter()
            .filter(|s| s["status"] == "awaiting_reboot")
            .filter_map(|s| s["provenanceRef"].as_str().map(String::from))
            .collect::<Vec<_>>(),
        "remainingActionProvenanceRefs": remaining_refs,
        "lastResumeAt": last_resume,
        "steps": steps,
        "totalActions": total,
        "totalCompleted": completed_count,
        "totalFailed": failed_ids.len(),
        "totalRemaining": steps.iter().filter(|s| s["status"] == "queued" || s["status"] == "running").count(),
        "status": status,
        "rebootReason": reboot_reason,
    }))
}

// ─── Query ledger for export/audit ──────────────────────────────────────────

pub fn query_ledger_entries(db: &Database, plan_id: &str) -> Result<Vec<serde_json::Value>> {
    let mut stmt = db.conn().prepare(
        "SELECT id, action_id, event_type, status, detail, package_source_ref,
                provenance_ref, rollback_snapshot_id, timestamp
         FROM execution_ledger WHERE plan_id = ?1 ORDER BY timestamp ASC",
    )?;

    let entries = stmt
        .query_map([plan_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "actionId": row.get::<_, String>(1)?,
                "eventType": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "detail": row.get::<_, Option<String>>(4)?,
                "packageSourceRef": row.get::<_, Option<String>>(5)?,
                "provenanceRef": row.get::<_, Option<String>>(6)?,
                "rollbackSnapshotId": row.get::<_, Option<String>>(7)?,
                "timestamp": row.get::<_, String>(8)?,
            }))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

// ─── Internal helpers ───────────────────────────────────────────────────────

fn load_plan_package(db: &Database, plan_id: &str) -> Result<Option<PackageIdentity>> {
    let result = db.conn().query_row(
        "SELECT package_id, package_role, package_version, package_source_ref,
                action_provenance_ref, execution_journal_ref, source_commit
         FROM execution_plans WHERE id = ?1",
        [plan_id],
        |row| {
            Ok(PackageIdentity {
                plan_id: plan_id.to_string(),
                package_id: row.get(0)?,
                package_role: row.get(1)?,
                package_version: row.get(2)?,
                package_source_ref: row.get(3)?,
                action_provenance_ref: row.get(4)?,
                execution_journal_ref: row.get(5)?,
                source_commit: row.get(6)?,
            })
        },
    );

    match result {
        Ok(pkg) => Ok(Some(pkg)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

fn append_ledger_event(
    db: &Database,
    plan_id: &str,
    action_id: &str,
    event_type: &str,
    status: &str,
    detail: Option<&str>,
    package_source_ref: Option<&str>,
    provenance_ref: Option<&str>,
    rollback_snapshot_id: Option<&str>,
) -> Result<()> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.conn().execute(
        "INSERT INTO execution_ledger
         (id, plan_id, action_id, event_type, status, detail, package_source_ref,
          provenance_ref, rollback_snapshot_id, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            plan_id,
            action_id,
            event_type,
            status,
            detail,
            package_source_ref,
            provenance_ref,
            rollback_snapshot_id,
            now,
        ],
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn package() -> PackageIdentity {
        PackageIdentity {
            plan_id: "plan-1".into(),
            package_id: "pkg".into(),
            package_role: "user-resolved".into(),
            package_version: None,
            package_source_ref: None,
            action_provenance_ref: None,
            execution_journal_ref: None,
            source_commit: None,
        }
    }

    fn queued(id: &str, pos: i32) -> QueuedAction {
        QueuedAction {
            action_id: id.into(),
            action_name: id.into(),
            phase: "p".into(),
            queue_position: pos,
            inclusion_reason: None,
            blocked_reason: None,
            preserved_reason: None,
            risk_level: "safe".into(),
            expert_only: false,
            requires_reboot: false,
            package_source_ref: None,
            provenance_ref: None,
            question_keys: vec![],
            selected_values: vec![],
        }
    }

    #[test]
    fn later_result_without_snapshot_keeps_rollback_link() {
        let db = Database::open_in_memory().unwrap();
        create_plan(&db, &package(), "gaming_desktop", "balanced", &[queued("a.one", 0)]).unwrap();
        record_action_result(
            &db,
            "plan-1",
            &ActionResult {
                action_id: "a.one".into(),
                status: "rolled_back".into(),
                rollback_snapshot_id: Some("snap-1".into()),
                error_message: Some("boom".into()),
                duration_ms: None,
            },
        )
        .unwrap();
        record_action_result(
            &db,
            "plan-1",
            &ActionResult {
                action_id: "a.one".into(),
                status: "failed".into(),
                rollback_snapshot_id: None,
                error_message: None,
                duration_ms: None,
            },
        )
        .unwrap();
        let (snap, err, status): (Option<String>, Option<String>, String) = db
            .conn()
            .query_row(
                "SELECT rollback_snapshot_id, error_message, status FROM execution_queue WHERE action_id='a.one'",
                [],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .unwrap();
        assert_eq!(snap.as_deref(), Some("snap-1"));
        assert_eq!(err.as_deref(), Some("boom"));
        assert_eq!(status, "failed");
    }

    #[test]
    fn skipped_is_not_recorded_as_failed() {
        assert_eq!(event_type_for("skipped"), "skipped");
        assert_eq!(event_type_for("partial"), "completed");
        assert_eq!(event_type_for("rollback_failed"), "failed");
        assert_eq!(queue_status_for("rolled_back"), "failed");
        let db = Database::open_in_memory().unwrap();
        create_plan(&db, &package(), "gaming_desktop", "balanced", &[queued("a.one", 0), queued("a.two", 1)]).unwrap();
        record_action_result(
            &db,
            "plan-1",
            &ActionResult {
                action_id: "a.two".into(),
                status: "skipped".into(),
                rollback_snapshot_id: None,
                error_message: None,
                duration_ms: None,
            },
        )
        .unwrap();
        let event: String = db
            .conn()
            .query_row(
                "SELECT event_type FROM execution_ledger WHERE action_id='a.two' AND event_type != 'enqueued'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(event, "skipped");
        let queued_count: i64 = db
            .conn()
            .query_row("SELECT COUNT(*) FROM execution_queue WHERE plan_id='plan-1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(queued_count, 2);
    }
}
