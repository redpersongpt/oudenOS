// ─── Database ───────────────────────────────────────────────────────────────
// SQLite state store for redcore-OS service.
// Tables: assessments, classifications, transform_plans, action_outcomes,
//         rollback_snapshots, audit_log.

use anyhow::Result;
use rusqlite::Connection;
use std::path::PathBuf;

pub struct Database {
    conn: Connection,
    path: PathBuf,
}

impl Database {
    pub fn init() -> Result<Self> {
        let data_dir = Self::data_dir();
        std::fs::create_dir_all(&data_dir)?;

        let path = data_dir.join("redcore-os.db");
        let conn = Connection::open(&path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Database { conn, path };
        db.run_migrations()?;
        Ok(db)
    }

    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    fn data_dir() -> PathBuf {
        if let Ok(explicit_dir) = std::env::var("REDCORE_OS_DATA_DIR") {
            let candidate = PathBuf::from(explicit_dir);
            if !candidate.as_os_str().is_empty() {
                return candidate;
            }
        }

        #[cfg(windows)]
        {
            let appdata = std::env::var("LOCALAPPDATA")
                .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".to_string());
            PathBuf::from(appdata).join("redcore-os")
        }
        #[cfg(not(windows))]
        {
            PathBuf::from("./data")
        }
    }

    fn run_migrations(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY,
                assessed_at TEXT NOT NULL,
                data TEXT NOT NULL  -- JSON blob
            );

            CREATE TABLE IF NOT EXISTS classifications (
                id TEXT PRIMARY KEY,
                assessment_id TEXT,  -- nullable: NULL when classification was done inline (no stored assessment)
                profile TEXT NOT NULL,
                confidence REAL NOT NULL,
                data TEXT NOT NULL,  -- JSON blob
                FOREIGN KEY (assessment_id) REFERENCES assessments(id)
            );

            CREATE TABLE IF NOT EXISTS transform_plans (
                id TEXT PRIMARY KEY,
                classification_id TEXT,  -- nullable: NULL when plan was generated inline (no stored classification)
                preset TEXT NOT NULL,
                created_at TEXT NOT NULL,
                data TEXT NOT NULL,  -- JSON blob
                FOREIGN KEY (classification_id) REFERENCES classifications(id)
            );

            CREATE TABLE IF NOT EXISTS action_outcomes (
                id TEXT PRIMARY KEY,
                action_id TEXT NOT NULL,
                status TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                data TEXT NOT NULL  -- JSON blob
            );

            CREATE TABLE IF NOT EXISTS rollback_snapshots (
                id TEXT PRIMARY KEY,
                scope TEXT NOT NULL,
                created_at TEXT NOT NULL,
                data TEXT NOT NULL  -- JSON blob
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                category TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'info'
            );

            CREATE INDEX IF NOT EXISTS idx_classification_assessment
                ON classifications(assessment_id);
            CREATE INDEX IF NOT EXISTS idx_plan_classification
                ON transform_plans(classification_id);
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp
                ON audit_log(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_rollback_created
                ON rollback_snapshots(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_assessments_time
                ON assessments(assessed_at DESC);
            CREATE INDEX IF NOT EXISTS idx_outcomes_action
                ON action_outcomes(action_id);

            -- ── Execution Ledger (DB-backed, replaces resume-journal.json) ──

            CREATE TABLE IF NOT EXISTS execution_plans (
                id TEXT PRIMARY KEY,
                package_id TEXT NOT NULL,
                package_role TEXT NOT NULL,         -- 'wizard-template' | 'user-resolved'
                package_version TEXT,
                package_source_ref TEXT,
                action_provenance_ref TEXT,
                execution_journal_ref TEXT,
                source_commit TEXT,
                profile TEXT NOT NULL,
                preset TEXT NOT NULL,
                total_actions INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | paused_reboot | completed | failed | cancelled
                reboot_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                last_resume_at TEXT
            );

            CREATE TABLE IF NOT EXISTS execution_queue (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL,
                action_id TEXT NOT NULL,
                action_name TEXT NOT NULL,
                phase TEXT NOT NULL,
                queue_position INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',  -- queued | running | completed | failed | skipped | preserved | awaiting_reboot
                inclusion_reason TEXT,
                blocked_reason TEXT,
                preserved_reason TEXT,
                risk_level TEXT NOT NULL DEFAULT 'safe',
                expert_only INTEGER NOT NULL DEFAULT 0,
                requires_reboot INTEGER NOT NULL DEFAULT 0,
                package_source_ref TEXT,
                provenance_ref TEXT,
                question_keys TEXT NOT NULL DEFAULT '[]',     -- JSON array
                selected_values TEXT NOT NULL DEFAULT '[]',   -- JSON array
                rollback_snapshot_id TEXT,
                result_status TEXT,
                error_message TEXT,
                duration_ms INTEGER,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                FOREIGN KEY (plan_id) REFERENCES execution_plans(id)
            );

            CREATE TABLE IF NOT EXISTS execution_ledger (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL,
                action_id TEXT NOT NULL,
                event_type TEXT NOT NULL,   -- enqueued | started | completed | failed | skipped | preserved | reboot_scheduled | resumed
                status TEXT NOT NULL,
                detail TEXT,
                package_source_ref TEXT,
                provenance_ref TEXT,
                rollback_snapshot_id TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (plan_id) REFERENCES execution_plans(id)
            );

            CREATE INDEX IF NOT EXISTS idx_exec_plan_status
                ON execution_plans(status);
            CREATE INDEX IF NOT EXISTS idx_exec_queue_plan
                ON execution_queue(plan_id, queue_position);
            CREATE INDEX IF NOT EXISTS idx_exec_queue_status
                ON execution_queue(plan_id, status);
            CREATE INDEX IF NOT EXISTS idx_exec_ledger_plan
                ON execution_ledger(plan_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_exec_ledger_action
                ON execution_ledger(action_id);
            ",
        )?;
        Ok(())
    }
}
