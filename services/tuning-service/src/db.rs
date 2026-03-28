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

        let path = data_dir.join("redcore.db");
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
            PathBuf::from(appdata).join("redcore-tuning")
        }
        #[cfg(not(windows))]
        {
            PathBuf::from("./data")
        }
    }

    fn run_migrations(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS device_profiles (
                id TEXT PRIMARY KEY,
                scanned_at TEXT NOT NULL,
                data TEXT NOT NULL  -- JSON blob
            );

            CREATE TABLE IF NOT EXISTS tuning_plans (
                id TEXT PRIMARY KEY,
                device_profile_id TEXT NOT NULL,
                preset TEXT NOT NULL,
                created_at TEXT NOT NULL,
                data TEXT NOT NULL,  -- JSON blob
                FOREIGN KEY (device_profile_id) REFERENCES device_profiles(id)
            );

            CREATE TABLE IF NOT EXISTS action_outcomes (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL,
                action_id TEXT NOT NULL,
                status TEXT NOT NULL,
                applied_at TEXT NOT NULL,
                data TEXT NOT NULL,
                FOREIGN KEY (plan_id) REFERENCES tuning_plans(id)
            );

            CREATE TABLE IF NOT EXISTS benchmark_results (
                id TEXT PRIMARY KEY,
                device_profile_id TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                data TEXT NOT NULL,
                FOREIGN KEY (device_profile_id) REFERENCES device_profiles(id)
            );

            CREATE TABLE IF NOT EXISTS rollback_snapshots (
                id TEXT PRIMARY KEY,
                plan_id TEXT,
                scope TEXT NOT NULL,
                created_at TEXT NOT NULL,
                description TEXT NOT NULL,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS journal_entries (
                id TEXT PRIMARY KEY,
                plan_id TEXT NOT NULL,
                phase_id TEXT NOT NULL,
                step_type TEXT NOT NULL,
                step_order INTEGER NOT NULL,
                status TEXT NOT NULL,
                action_id TEXT,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                error TEXT,
                metadata TEXT NOT NULL DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                category TEXT NOT NULL,
                action TEXT NOT NULL,
                detail TEXT NOT NULL,
                action_id TEXT,
                plan_id TEXT,
                snapshot_id TEXT,
                severity TEXT NOT NULL DEFAULT 'info'
            );

            CREATE TABLE IF NOT EXISTS license_cache (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                tier TEXT NOT NULL,
                status TEXT NOT NULL,
                expires_at TEXT,
                device_id TEXT,
                last_validated_at TEXT NOT NULL,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS machine_classifications (
                id TEXT PRIMARY KEY,
                device_profile_id TEXT NOT NULL,
                classified_at TEXT NOT NULL,
                primary_archetype TEXT NOT NULL,
                confidence REAL NOT NULL,
                scores TEXT NOT NULL,      -- JSON blob of archetype scores
                signals TEXT NOT NULL,     -- JSON blob of signal factors
                data TEXT NOT NULL,        -- Full classification JSON
                FOREIGN KEY (device_profile_id) REFERENCES device_profiles(id)
            );

            CREATE INDEX IF NOT EXISTS idx_classification_device ON machine_classifications(device_profile_id);
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_journal_plan ON journal_entries(plan_id, step_order);
            CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(status);
            CREATE INDEX IF NOT EXISTS idx_benchmark_device ON benchmark_results(device_profile_id);
            CREATE INDEX IF NOT EXISTS idx_rollback_created ON rollback_snapshots(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_rollback_plan ON rollback_snapshots(plan_id);
            CREATE INDEX IF NOT EXISTS idx_tuning_plans_device ON tuning_plans(device_profile_id);
            CREATE INDEX IF NOT EXISTS idx_outcomes_action ON action_outcomes(action_id);
            CREATE INDEX IF NOT EXISTS idx_outcomes_plan ON action_outcomes(plan_id);
            ",
        )?;
        Ok(())
    }
}
