
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

mod migrate;

use anyhow::Result;
use tracing_subscriber::{fmt, EnvFilter};

#[tokio::main]
async fn main() -> Result<()> {
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

    let db = db::Database::init()?;
    tracing::info!("Database initialized at {:?}", db.path());

    migrate::import_legacy_sidecar(&db);

    ipc::serve(db).await?;

    Ok(())
}
