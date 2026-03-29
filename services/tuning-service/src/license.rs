use crate::db::Database;
use serde::{Deserialize, Serialize};

const CLOUD_API_BASE: &str = "https://api.redcoreos.net";
const VALIDATE_TIMEOUT_SECS: u64 = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseState {
    pub tier: String,          // "free" | "premium"
    pub status: String,        // "active" | "expired" | "trialing" | etc.
    pub expires_at: Option<String>,
    pub device_bound: bool,
    pub device_id: Option<String>,
    pub last_validated_at: String,
    pub offline_grace_days: u32,
    pub offline_days_remaining: u32,
}

impl Default for LicenseState {
    fn default() -> Self {
        LicenseState {
            tier: "free".to_string(),
            status: "active".to_string(),
            expires_at: None,
            device_bound: false,
            device_id: None,
            last_validated_at: chrono::Utc::now().to_rfc3339(),
            offline_grace_days: 7,
            offline_days_remaining: 7,
        }
    }
}

/// Validate license from local cache, falling back to cloud validation.
/// Returns free tier if validation fails and grace period is exhausted.
pub async fn validate_cached(db: &Database) -> LicenseState {
    // Try to load cached license from SQLite
    match load_cached(db) {
        Some(cached) => {
            // Check if we need to revalidate
            if should_revalidate(&cached) {
                match validate_remote(&cached).await {
                    Ok(refreshed) => {
                        save_cache(db, &refreshed);
                        refreshed
                    }
                    Err(_) => {
                        // Network failure — check grace period
                        if cached.offline_days_remaining > 0 {
                            tracing::warn!(
                                "License validation failed, {} offline days remaining",
                                cached.offline_days_remaining
                            );
                            cached
                        } else {
                            tracing::warn!("License grace period exhausted, falling back to free tier");
                            LicenseState::default()
                        }
                    }
                }
            } else {
                cached
            }
        }
        None => {
            tracing::info!("No cached license found, using free tier");
            LicenseState::default()
        }
    }
}

fn load_cached(db: &Database) -> Option<LicenseState> {
    db.conn()
        .query_row(
            "SELECT data FROM license_cache WHERE id = 1",
            [],
            |row| {
                let data: String = row.get(0)?;
                Ok(serde_json::from_str::<LicenseState>(&data).ok())
            },
        )
        .ok()
        .flatten()
}

fn save_cache(db: &Database, state: &LicenseState) {
    let data = serde_json::to_string(state).unwrap_or_default();
    let _ = db.conn().execute(
        "INSERT OR REPLACE INTO license_cache (id, tier, status, expires_at, device_id, last_validated_at, data)
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            state.tier,
            state.status,
            state.expires_at,
            state.device_id,
            state.last_validated_at,
            data,
        ],
    );
}

fn should_revalidate(state: &LicenseState) -> bool {
    // Revalidate if last check was more than 24 hours ago
    if let Ok(last) = chrono::DateTime::parse_from_rfc3339(&state.last_validated_at) {
        let elapsed = chrono::Utc::now().signed_duration_since(last);
        elapsed.num_hours() >= 24
    } else {
        true
    }
}

/// Cloud license validation response shape
#[derive(Debug, Deserialize)]
struct CloudValidateResponse {
    tier: String,
    status: String,
    expires_at: Option<String>,
    device_bound: bool,
    device_id: Option<String>,
}

async fn validate_remote(cached: &LicenseState) -> Result<LicenseState, String> {
    let device_id = match &cached.device_id {
        Some(id) => id.clone(),
        None => return Err("No device ID in cached state".to_string()),
    };

    let api_base = std::env::var("REDCORE_API_URL")
        .unwrap_or_else(|_| CLOUD_API_BASE.to_string());
    let url = format!("{}/v1/license/validate", api_base);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(VALIDATE_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let body = serde_json::json!({
        "deviceFingerprint": device_id,
        "licenseKey": std::env::var("REDCORE_LICENSE_KEY").unwrap_or_default(),
    });

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Cloud API returned {}", response.status()));
    }

    let data: CloudValidateResponse = response
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;

    // Decrement offline_days_remaining by days since last validation
    let now = chrono::Utc::now();
    let last = chrono::DateTime::parse_from_rfc3339(&cached.last_validated_at)
        .unwrap_or_else(|_| now.fixed_offset());
    let days_since = (now.signed_duration_since(last).num_days()).max(0) as u32;
    let remaining = cached.offline_days_remaining.saturating_sub(days_since);

    Ok(LicenseState {
        tier: data.tier,
        status: data.status,
        expires_at: data.expires_at,
        device_bound: data.device_bound,
        device_id: data.device_id,
        last_validated_at: now.to_rfc3339(),
        offline_grace_days: cached.offline_grace_days,
        offline_days_remaining: remaining.max(cached.offline_grace_days), // reset on successful validate
    })
}
