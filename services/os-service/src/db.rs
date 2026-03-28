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
        #[cfg(windows)]
        {
            let appdata = std::env::var("LOCALAPPDATA")
                .unwrap_or_else(|_| "C:\\ProgramData".to_string());
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
            ",
        )?;
        Ok(())
    }
}
