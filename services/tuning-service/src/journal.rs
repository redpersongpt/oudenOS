// ─── Reboot-Resume Journal ──────────────────────────────────────────────────
// Persists workflow state across app closures, reboots, and crashes.
// On startup, the service checks for pending journal entries and signals
// the UI to resume the workflow.

use crate::db::Database;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct JournalState {
    pub plan_id: String,
    pub current_step_id: String,
    pub last_completed_step_id: Option<String>,
    pub next_step_id: Option<String>,
    pub overall_progress: u8,
    pub requires_reboot: bool,
    pub requires_bios_return: bool,
    pub can_resume: bool,
}

/// Check for pending journal entries that need to resume after reboot.
pub fn check_pending(db: &Database) -> anyhow::Result<Option<JournalState>> {
    let mut stmt = db.conn().prepare(
        "SELECT plan_id, id, status, step_order FROM journal_entries
         WHERE status IN ('awaiting_reboot', 'awaiting_bios_return', 'in_progress')
         ORDER BY step_order ASC LIMIT 1",
    )?;

    let result = stmt.query_row([], |row| {
        let plan_id: String = row.get(0)?;
        let step_id: String = row.get(1)?;
        let status: String = row.get(2)?;

        Ok(JournalState {
            plan_id,
            current_step_id: step_id,
            last_completed_step_id: None,
            next_step_id: None,
            overall_progress: 0,
            requires_reboot: status == "awaiting_reboot",
            requires_bios_return: status == "awaiting_bios_return",
            can_resume: true,
        })
    });

    match result {
        Ok(state) => Ok(Some(state)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Create a new journal entry for a plan step.
pub fn create_entry(
    db: &Database,
    plan_id: &str,
    phase_id: &str,
    step_type: &str,
    step_order: i32,
    action_id: Option<&str>,
    description: &str,
) -> anyhow::Result<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.conn().execute(
        "INSERT INTO journal_entries (id, plan_id, phase_id, step_type, step_order, status, action_id, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6, ?7, ?8, ?8)",
        rusqlite::params![id, plan_id, phase_id, step_type, step_order, action_id, description, now],
    )?;

    Ok(id)
}

/// Update a journal entry's status.
pub fn update_status(db: &Database, entry_id: &str, status: &str, error: Option<&str>) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    let completed_at = if status == "completed" || status == "failed" || status == "skipped" {
        Some(now.clone())
    } else {
        None
    };

    db.conn().execute(
        "UPDATE journal_entries SET status = ?1, updated_at = ?2, completed_at = ?3, error = ?4 WHERE id = ?5",
        rusqlite::params![status, now, completed_at, error, entry_id],
    )?;

    Ok(())
}
