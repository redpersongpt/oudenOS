// ─── redcore-os-service ─────────────────────────────────────────────────────
// Privileged orchestration daemon for redcore-OS.
// Communicates with the Electron shell via JSON-RPC over stdio.
//
// ARCHITECTURE:
// - All privileged operations happen here (registry, WMI, services, AppX)
// - The Electron renderer never touches system APIs
// - State persisted in SQLite (assessments, classifications, rollback, audit)

pub mod appbundle;
mod assessor;
mod classifier;
mod db;
mod executor;
mod ipc;
pub mod ledger;
mod personalizer;
pub mod playbook;
mod powershell;
mod rollback;
mod transformer;

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
                .unwrap_or_else(|_| EnvFilter::new("redcore_os_service=info")),
        )
        .with_target(false)
        .json()
        .init();

    tracing::info!("redcore-os-service starting");

    // Initialize database
    let db = db::Database::init()?;
    tracing::info!("Database initialized at {:?}", db.path());

    // Start IPC server
    ipc::serve(db).await?;

    Ok(())
}
