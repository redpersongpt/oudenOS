// ─── redcore-service ────────────────────────────────────────────────────────
// Privileged orchestration daemon for redcore-Tuning.
// Communicates with the Electron shell via JSON-RPC over stdio/named pipe.
//
// ARCHITECTURE:
// - All privileged operations happen here (registry, WMI, ETW, services)
// - The Electron renderer never touches system APIs
// - State persisted in SQLite (benchmarks, rollback, journal, audit)
// - License validation via cloud API with offline grace period

mod db;
mod error;
mod ipc;
mod license;
mod scanner;
mod compatibility;
mod planner;
mod executor;
mod rollback;
mod journal;
mod benchmark;
mod apphub;
mod powershell;
mod intelligence;

use anyhow::Result;
use tracing_subscriber::{fmt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize structured logging — MUST write to stderr, not stdout.
    // stdout is reserved exclusively for JSON-RPC responses to Electron.
    fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("redcore_service=info")),
        )
        .with_target(false)
        .json()
        .init();

    tracing::info!("redcore-service starting");

    // Initialize database
    let db = db::Database::init()?;
    tracing::info!("Database initialized at {:?}", db.path());

    // Check license state
    let license_state = license::validate_cached(&db).await;
    tracing::info!("License tier: {:?}", license_state.tier);

    // Check for pending journal entries (reboot-resume)
    if let Some(journal_state) = journal::check_pending(&db)? {
        tracing::info!(
            "Pending journal found: plan={}, step={}",
            journal_state.plan_id,
            journal_state.current_step_id
        );
    }

    // Start IPC server
    ipc::serve(db, license_state).await?;

    Ok(())
}
