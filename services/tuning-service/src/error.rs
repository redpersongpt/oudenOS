use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum ServiceError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("IPC error: {0}")]
    Ipc(String),

    #[error("Scanner error: {0}")]
    Scanner(String),

    #[error("Compatibility check failed: {0}")]
    Compatibility(String),

    #[error("Tuning action failed: {action_id} — {reason}")]
    ActionFailed { action_id: String, reason: String },

    #[error("Rollback failed: {0}")]
    Rollback(String),

    #[error("License error: {0}")]
    License(String),

    #[error("PowerShell execution failed: {0}")]
    PowerShell(String),

    #[error("Feature requires premium tier: {0}")]
    PremiumRequired(String),

    #[error("Action not found: {0}")]
    ActionNotFound(String),

    #[error("Incompatible Windows build {build} for action {action}")]
    IncompatibleBuild { build: u32, action: String },
}

pub type Result<T> = std::result::Result<T, ServiceError>;
