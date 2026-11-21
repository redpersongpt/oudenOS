// ─── oudenos-os-service ─────────────────────────────────────────────────────
// Privileged orchestration daemon for oudenOS.
// Communicates with the Electron shell via JSON-RPC over stdio.
//
// ARCHITECTURE:
// - All privileged operations happen here (registry, WMI, services, AppX)
// - The Electron renderer never touches system APIs
// - State persisted in SQLite (assessments, classifications, rollback, audit)

pub mod appbundle;
mod assessor;
mod catalog;
mod classifier;
mod db;
mod engine;
mod executor;
mod facts;
mod health;
mod ipc;
pub mod ledger;
mod personalizer;
pub mod playbook;
mod powershell;
mod questionnaire;
mod registry;
mod restore_point;
mod rollback;
mod services;
mod transformer;

mod migrate;

use anyhow::Result;
use tracing_subscriber::{fmt, EnvFilter};

/// stderr writer that never reports a failure. If the parent closes our
/// stderr pipe, tracing-subscriber's fallback is `eprintln!`, which panics on
/// a broken pipe and would fail the request being handled. Logging must never
/// be able to break a system operation, so write errors are swallowed here.
#[derive(Clone, Copy)]
struct LossyStderr;

impl std::io::Write for LossyStderr {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let _ = std::io::stderr().write_all(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        let _ = std::io::stderr().flush();
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize structured logging — MUST write to stderr, not stdout.
    // stdout is reserved exclusively for JSON-RPC responses to Electron.
    fmt()
        .with_writer(|| LossyStderr)
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("oudenos_os_service=info")),
        )
        .with_target(false)
        .json()
        .init();

    tracing::info!("oudenos-os-service starting");

    // Initialize database
    let db = db::Database::init()?;
    tracing::info!("Database initialized at {:?}", db.path());

    // One-time migration: import legacy sidecar journal into DB ledger
    migrate::import_legacy_sidecar(&db);

    // Start IPC server
    ipc::serve(db).await?;

    Ok(())
}
