// ─── JSON-RPC Server ────────────────────────────────────────────────────────
// Communicates with the Electron main process over stdin/stdout.
// Each line is a JSON-RPC request; each response is a single JSON line.

use crate::db::Database;
use crate::license::LicenseState;
use crate::{apphub, benchmark, executor, intelligence, journal, planner, rollback, scanner};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};

#[derive(Debug, Deserialize)]
struct RpcRequest {
    id: u64,
    method: String,
    params: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct RpcResponse {
    id: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Debug, Serialize)]
struct RpcError {
    code: i32,
    message: String,
}

impl RpcResponse {
    fn ok(id: u64, value: serde_json::Value) -> Self {
        Self {
            id,
            result: Some(value),
            error: None,
        }
    }

    fn err(id: u64, code: i32, message: String) -> Self {
        Self {
            id,
            result: None,
            error: Some(RpcError { code, message }),
        }
    }
}

/// Serve JSON-RPC over stdio.
/// The Electron main process spawns this binary and communicates via stdin/stdout.
/// Returns true when the feature is allowed for the given tier.
fn tier_allows(license: &LicenseState, feature: &str) -> bool {
    // Free-tier features always allowed
    let free_features = [
        "hardware_scan",
        "health_overview",
        "basic_startup_cleanup",
        "basic_debloat",
        "limited_recommendations",
        "basic_benchmark",
        "bios_guidance_preview",
        "speculative_mitigation_analysis",
        "tuning_plans",
        "machine_classification",
        "intelligent_recommendations",
        "app_install_hub",
        "rollback_center",
        "benchmark_lab",
    ];
    if free_features.contains(&feature) {
        return true;
    }
    // Premium features require active premium or expert tier
    (license.tier == "premium" || license.tier == "expert")
        && (license.status == "active" || license.status == "trialing")
        && license.offline_days_remaining > 0
}

pub async fn serve(db: Database, license: LicenseState) -> Result<()> {
    use std::sync::{Arc, Mutex};

    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let reader = BufReader::new(stdin);
    let mut lines = reader.lines();

    // License is mutable so main process can push a tier update at runtime
    let live_license: Arc<Mutex<LicenseState>> = Arc::new(Mutex::new(license));

    let start_time = Instant::now();

    tracing::info!("IPC server ready (stdio mode)");

    while let Some(line) = lines.next_line().await? {
        let request: RpcRequest = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                tracing::warn!("Invalid RPC request: {}", e);
                continue;
            }
        };

        tracing::debug!("RPC: {} (id={})", request.method, request.id);

        let current_license = live_license.lock().map(|g| g.clone()).unwrap_or_default();
        let response = dispatch(&db, &current_license, &request, start_time, &live_license).await;
        let mut json = serde_json::to_string(&response)?;
        json.push('\n');
        stdout.write_all(json.as_bytes()).await?;
        stdout.flush().await?;
    }

    Ok(())
}

async fn dispatch(
    db: &Database,
    license: &LicenseState,
    req: &RpcRequest,
    start_time: Instant,
    live_license: &std::sync::Arc<std::sync::Mutex<LicenseState>>,
) -> RpcResponse {
    let id = req.id;
    let params = &req.params;

    match req.method.as_str() {
        // ── Hardware scanning ───────────────────────────────────────────
        "scan.hardware" | "scan.quick" => {
            tracing::info!("Hardware scan requested (method={})", req.method);
            match scanner::scan_full(|_progress| {}).await {
                Ok(profile) => {
                    // Persist the profile to the database
                    if let Err(e) = store_device_profile(db, &profile) {
                        tracing::error!("Failed to store device profile: {}", e);
                        return RpcResponse::err(id, -2, format!("Scan succeeded but storage failed: {}", e));
                    }
                    RpcResponse::ok(id, profile)
                }
                Err(e) => {
                    tracing::error!("Hardware scan failed: {}", e);
                    RpcResponse::err(id, -10, format!("Scan failed: {}", e))
                }
            }
        }

        // ── Tuning plan generation (FREE — all tiers can generate plans) ──
        "tuning.generatePlan" => {
            let device_profile_id = match params.get("deviceProfileId").and_then(|v| v.as_str()) {
                Some(id) => id,
                None => return RpcResponse::err(id, -3, "Missing required param: deviceProfileId".into()),
            };
            let preset = params
                .get("preset")
                .and_then(|v| v.as_str())
                .unwrap_or("balanced");

            tracing::info!(
                "Generating plan for profile={} preset={}",
                device_profile_id,
                preset
            );

            // Load device profile from DB
            let profile = match load_device_profile(db, device_profile_id) {
                Ok(p) => p,
                Err(e) => {
                    tracing::error!("Failed to load device profile {}: {}", device_profile_id, e);
                    return RpcResponse::err(id, -4, format!("Device profile not found: {}", e));
                }
            };

            match planner::generate_plan(&profile, preset) {
                Ok(plan) => {
                    // Persist plan to DB
                    if let Err(e) = store_tuning_plan(db, device_profile_id, preset, &plan) {
                        tracing::error!("Failed to store tuning plan: {}", e);
                        return RpcResponse::err(id, -5, format!("Plan generated but storage failed: {}", e));
                    }
                    RpcResponse::ok(id, plan)
                }
                Err(e) => {
                    tracing::error!("Plan generation failed: {}", e);
                    RpcResponse::err(id, -11, format!("Plan generation failed: {}", e))
                }
            }
        }

        // ── Action definitions ──────────────────────────────────────────
        "tuning.getActions" => {
            let category = params.get("category").and_then(|v| v.as_str());
            tracing::info!("Getting actions, category={:?}", category);
            let actions = planner::get_actions(category);
            RpcResponse::ok(id, serde_json::json!(actions))
        }

        // ── Apply a single action ───────────────────────────────────────
        "tuning.applyAction" => {
            if !tier_allows(license, "full_tuning_engine") {
                return RpcResponse::err(id, -403, "Premium feature: full_tuning_engine".into());
            }
            let action_id = match params.get("actionId").and_then(|v| v.as_str()) {
                Some(aid) => aid,
                None => return RpcResponse::err(id, -3, "Missing required param: actionId".into()),
            };
            // Look up action data from params or embedded definitions
            let action_data = match params.get("actionData").cloned() {
                Some(data) if !data.is_null() && data.as_object().map_or(false, |o| !o.is_empty()) => data,
                _ => {
                    // Look up from embedded action definitions
                    match planner::get_actions(None).into_iter().find(|a| {
                        a.get("id").and_then(|v| v.as_str()) == Some(action_id)
                    }) {
                        Some(action_def) => action_def,
                        None => return RpcResponse::err(id, -20, format!("Action not found: {}", action_id)),
                    }
                }
            };

            let expert_mode_enabled = params
                .get("expertModeEnabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            tracing::info!(action_id, expert_mode_enabled, "Applying action");

            match executor::execute_action(db, action_id, &action_data, expert_mode_enabled) {
                Ok(outcome) => RpcResponse::ok(id, outcome),
                Err(e) => {
                    tracing::error!("Action execution failed for {}: {}", action_id, e);
                    RpcResponse::err(id, -12, format!("Action failed: {}", e))
                }
            }
        }

        // ── Rollback: list snapshots ────────────────────────────────────
        "rollback.listSnapshots" => {
            tracing::info!("Listing rollback snapshots");
            match rollback::list_snapshots(db) {
                Ok(snapshots) => match serde_json::to_value(&snapshots) {
                    Ok(val) => RpcResponse::ok(id, val),
                    Err(e) => RpcResponse::err(id, -6, format!("Serialization error: {}", e)),
                },
                Err(e) => {
                    tracing::error!("Failed to list snapshots: {}", e);
                    RpcResponse::err(id, -13, format!("Failed to list snapshots: {}", e))
                }
            }
        }

        // ── Rollback: restore a snapshot ────────────────────────────────
        "rollback.restore" => {
            let snapshot_id = match params.get("snapshotId").and_then(|v| v.as_str()) {
                Some(sid) => sid,
                None => return RpcResponse::err(id, -3, "Missing required param: snapshotId".into()),
            };

            tracing::info!("Restoring snapshot: {}", snapshot_id);
            match rollback::restore_snapshot(db, snapshot_id) {
                Ok(outcome) => RpcResponse::ok(id, outcome),
                Err(e) => {
                    tracing::error!("Snapshot restore failed for {}: {}", snapshot_id, e);
                    RpcResponse::err(id, -14, format!("Restore failed: {}", e))
                }
            }
        }

        // ── Rollback: get diff for a snapshot ───────────────────────────
        "rollback.getDiff" => {
            let snapshot_id = match params.get("snapshotId").and_then(|v| v.as_str()) {
                Some(sid) => sid,
                None => return RpcResponse::err(id, -3, "Missing required param: snapshotId".into()),
            };

            tracing::info!("Getting diff for snapshot: {}", snapshot_id);
            match rollback::get_diff(db, snapshot_id) {
                Ok(diff) => RpcResponse::ok(id, diff),
                Err(e) => {
                    tracing::error!("Failed to get snapshot diff {}: {}", snapshot_id, e);
                    RpcResponse::err(id, -15, format!("Failed to get diff: {}", e))
                }
            }
        }

        // ── Audit log ───────────────────────────────────────────────────
        "rollback.getAuditLog" => {
            let limit = params.get("limit").and_then(|v| v.as_i64()).unwrap_or(50);
            let offset = params.get("offset").and_then(|v| v.as_i64()).unwrap_or(0);

            tracing::info!("Querying audit log (limit={}, offset={})", limit, offset);
            match query_audit_log(db, limit, offset) {
                Ok(entries) => RpcResponse::ok(id, entries),
                Err(e) => {
                    tracing::error!("Failed to query audit log: {}", e);
                    RpcResponse::err(id, -16, format!("Audit log query failed: {}", e))
                }
            }
        }

        // ── Journal: check for pending resume state ─────────────────────
        "journal.getState" => {
            tracing::info!("Checking journal for pending state");
            match journal::check_pending(db) {
                Ok(state) => {
                    let val = match state {
                        Some(s) => serde_json::to_value(&s).unwrap_or(serde_json::Value::Null),
                        None => serde_json::Value::Null,
                    };
                    RpcResponse::ok(id, val)
                }
                Err(e) => {
                    tracing::error!("Journal check failed: {}", e);
                    RpcResponse::err(id, -17, format!("Journal check failed: {}", e))
                }
            }
        }

        // ── License state ───────────────────────────────────────────────
        "license.getState" => {
            tracing::info!("Returning cached license state");
            match serde_json::to_value(license) {
                Ok(val) => RpcResponse::ok(id, val),
                Err(e) => RpcResponse::err(id, -6, format!("Serialization error: {}", e)),
            }
        }

        // ── License tier update (pushed from Electron main process) ────
        "license.setTier" => {
            let tier = params.get("tier").and_then(|v| v.as_str()).unwrap_or("free");
            let status = params.get("status").and_then(|v| v.as_str()).unwrap_or("active");
            tracing::info!("License tier updated: tier={} status={}", tier, status);
            if let Ok(mut guard) = live_license.lock() {
                guard.tier = tier.to_string();
                guard.status = status.to_string();
            }
            RpcResponse::ok(id, serde_json::json!({ "accepted": true }))
        }

        // ── Service status ──────────────────────────────────────────────
        "system.getServiceStatus" => {
            let uptime_secs = start_time.elapsed().as_secs();
            tracing::debug!("Service status requested (uptime={}s)", uptime_secs);
            RpcResponse::ok(
                id,
                serde_json::json!({
                    "version": env!("CARGO_PKG_VERSION"),
                    "uptime": uptime_secs,
                    "dbPath": db.path().to_string_lossy(),
                    "licenseTier": license.tier,
                    "logLevel": "info"
                }),
            )
        }

        // ── Preview action (read-only) ──────────────────────────────────
        "tuning.previewAction" => {
            let action_id = match params.get("actionId").and_then(|v| v.as_str()) {
                Some(aid) => aid,
                None => return RpcResponse::err(id, -3, "Missing required param: actionId".into()),
            };
            match planner::get_actions(None).into_iter().find(|a| {
                a.get("id").and_then(|v| v.as_str()) == Some(action_id)
            }) {
                Some(action_def) => RpcResponse::ok(id, action_def),
                None => RpcResponse::err(id, -20, format!("Action not found: {}", action_id)),
            }
        }

        // ── Apply all actions in a plan ─────────────────────────────────
        "tuning.applyPlan" => {
            if !tier_allows(license, "full_tuning_engine") {
                return RpcResponse::err(id, -403, "Premium feature: full_tuning_engine".into());
            }
            let plan_id = match params.get("planId").and_then(|v| v.as_str()) {
                Some(pid) => pid,
                None => return RpcResponse::err(id, -3, "Missing required param: planId".into()),
            };
            tracing::info!("Applying plan: {}", plan_id);

            let plan_data = match load_tuning_plan(db, plan_id) {
                Ok(p) => p,
                Err(e) => return RpcResponse::err(id, -4, format!("Plan not found: {}", e)),
            };
            let actions = plan_data
                .get("actions")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();

            let mut results = Vec::new();
            for action_entry in &actions {
                let action_data = match action_entry.get("action") {
                    Some(a) => a,
                    None => continue,
                };
                let aid = action_data.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
                let mut data_with_plan = action_data.clone();
                if let Some(obj) = data_with_plan.as_object_mut() {
                    obj.insert("planId".to_string(), serde_json::json!(plan_id));
                }
                match executor::execute_action(db, aid, &data_with_plan, false) {
                    Ok(outcome) => results.push(outcome),
                    Err(e) => {
                        tracing::error!("Plan action {} failed: {}", aid, e);
                        results.push(serde_json::json!({"actionId": aid, "status": "failed", "error": e.to_string()}));
                    }
                }
            }
            RpcResponse::ok(id, serde_json::json!({"planId": plan_id, "actionsApplied": results.len(), "results": results}))
        }

        // ── Journal: resume after reboot ────────────────────────────────
        "journal.resume" => {
            tracing::info!("Resuming journal after reboot");
            let entries: Vec<String> = match db.conn().prepare(
                "SELECT id FROM journal_entries WHERE status = 'awaiting_reboot' ORDER BY step_order ASC"
            ) {
                Ok(mut stmt) => {
                    match stmt.query_map([], |row| row.get(0)) {
                        Ok(rows) => {
                            let mut ids = Vec::new();
                            for row_result in rows {
                                match row_result {
                                    Ok(entry_id) => ids.push(entry_id),
                                    Err(e) => {
                                        tracing::error!("Failed to read journal entry row: {}", e);
                                        return RpcResponse::err(id, -17, format!("Journal query failed: {}", e));
                                    }
                                }
                            }
                            ids
                        }
                        Err(e) => {
                            tracing::error!("Failed to map journal entries: {}", e);
                            return RpcResponse::err(id, -17, format!("Journal query failed: {}", e));
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to query journal entries: {}", e);
                    return RpcResponse::err(id, -17, format!("Journal query failed: {}", e));
                }
            };
            let mut resumed = 0u32;
            for entry_id in &entries {
                if journal::update_status(db, entry_id, "completed", None).is_ok() {
                    resumed += 1;
                }
            }
            tracing::info!("Resumed {} journal entries", resumed);
            RpcResponse::ok(id, serde_json::json!({"resumed": resumed}))
        }

        // ── Journal: cancel pending ─────────────────────────────────────
        "journal.cancel" => {
            tracing::info!("Cancelling pending journal entries");
            let now = chrono::Utc::now().to_rfc3339();
            match db.conn().execute(
                "UPDATE journal_entries SET status='cancelled', updated_at=?1, completed_at=?1
                 WHERE status IN ('awaiting_reboot','awaiting_bios_return','in_progress','pending')",
                rusqlite::params![now],
            ) {
                Ok(count) => RpcResponse::ok(id, serde_json::json!({"cancelled": count})),
                Err(e) => {
                    tracing::error!("Failed to cancel journal entries: {}", e);
                    RpcResponse::err(id, -17, format!("Journal cancel failed: {}", e))
                }
            }
        }

        // ── App hub: get catalog ────────────────────────────────────────
        "apphub.getCatalog" => {
            tracing::info!("App hub catalog requested");
            let catalog: Vec<serde_json::Value> = apphub::get_catalog()
                .into_iter()
                .map(|a| serde_json::json!({
                    "id": a.id,
                    "name": a.name,
                    "category": a.category,
                    "description": a.description,
                    "version": "latest",
                    "downloadUrl": a.download_url,
                    "checksum": "",
                    "checksumAlgo": "none",
                    "silentInstallArgs": a.silent_args,
                    "trusted": true,
                    "iconUrl": null,
                }))
                .collect();
            RpcResponse::ok(id, serde_json::json!(catalog))
        }

        // ── App hub: install an app ─────────────────────────────────────
        "apphub.install" => {
            let app_id = match params.get("appId").and_then(|v| v.as_str()) {
                Some(aid) => aid,
                None => return RpcResponse::err(id, -3, "Missing required param: appId".into()),
            };
            tracing::info!(app_id, "Installing app");
            match apphub::install_app(db, app_id) {
                Ok(outcome) => RpcResponse::ok(id, outcome),
                Err(e) => RpcResponse::err(id, -31, format!("App install failed: {}", e)),
            }
        }

        // ── Benchmark: run ──────────────────────────────────────────────
        "benchmark.run" => {
            let bench_type = params.get("config")
                .and_then(|c| c.get("type"))
                .and_then(|v| v.as_str())
                .unwrap_or("system_latency");
            let device_profile_id = params.get("config")
                .and_then(|c| c.get("deviceProfileId"))
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            let tags: Vec<String> = params.get("tags")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();

            tracing::info!(bench_type, "Running benchmark");
            match benchmark::run_benchmark(db, device_profile_id, bench_type, params, &tags).await {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => RpcResponse::err(id, -32, format!("Benchmark failed: {}", e)),
            }
        }

        // ── Benchmark: list ─────────────────────────────────────────────
        "benchmark.list" => {
            let dpid = params.get("deviceProfileId").and_then(|v| v.as_str());
            match benchmark::list_benchmarks(db, dpid) {
                Ok(results) => RpcResponse::ok(id, results),
                Err(e) => RpcResponse::err(id, -33, format!("Benchmark list failed: {}", e)),
            }
        }

        // ── Benchmark: compare ──────────────────────────────────────────
        "benchmark.compare" => {
            let baseline_id = match params.get("baselineId").and_then(|v| v.as_str()) {
                Some(bid) => bid,
                None => return RpcResponse::err(id, -3, "Missing baselineId".into()),
            };
            let comparison_id = match params.get("comparisonId").and_then(|v| v.as_str()) {
                Some(cid) => cid,
                None => return RpcResponse::err(id, -3, "Missing comparisonId".into()),
            };
            match benchmark::compare_benchmarks(db, baseline_id, comparison_id) {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => RpcResponse::err(id, -34, format!("Benchmark compare failed: {}", e)),
            }
        }

        // ── System: request reboot ──────────────────────────────────────
        "system.requestReboot" => {
            let reason = params.get("reason").and_then(|v| v.as_str()).unwrap_or("tuning");
            tracing::info!("Reboot requested: reason={}", reason);
            let audit_id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now().to_rfc3339();
            let _ = db.conn().execute(
                "INSERT INTO audit_log (id, timestamp, category, action, detail, severity) VALUES (?1, ?2, 'system', 'reboot_requested', ?3, 'info')",
                rusqlite::params![audit_id, now, format!("Reboot requested: {}", reason)],
            );
            #[cfg(windows)]
            {
                let script = "shutdown /r /t 5 /c \"redcore-Tuning: reboot for tuning changes\"";
                match crate::powershell::execute(script) {
                    Ok(_) => RpcResponse::ok(id, serde_json::json!({"scheduled": true, "delaySeconds": 5})),
                    Err(e) => RpcResponse::err(id, -30, format!("Reboot failed: {}", e)),
                }
            }
            #[cfg(not(windows))]
            {
                RpcResponse::ok(id, serde_json::json!({"scheduled": true, "delaySeconds": 5, "simulated": true}))
            }
        }

        // ── Machine Intelligence: classify ──────────────────────────────
        "intelligence.classify" => {
            let device_profile_id = match params.get("deviceProfileId").and_then(|v| v.as_str()) {
                Some(dpid) => dpid,
                None => return RpcResponse::err(id, -3, "Missing required param: deviceProfileId".into()),
            };
            let profile = match load_device_profile(db, device_profile_id) {
                Ok(p) => p,
                Err(e) => return RpcResponse::err(id, -4, format!("Device profile not found: {}", e)),
            };
            match intelligence::classify(&profile) {
                Ok(mut classification) => {
                    // Inject deviceProfileId
                    if let Some(obj) = classification.as_object_mut() {
                        obj.insert("deviceProfileId".to_string(), serde_json::json!(device_profile_id));
                    }
                    // Persist to DB
                    let class_id = uuid::Uuid::new_v4().to_string();
                    let now = chrono::Utc::now().to_rfc3339();
                    let primary = classification.get("primary").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let confidence = classification.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let _ = db.conn().execute(
                        "INSERT INTO machine_classifications (id, device_profile_id, classified_at, primary_archetype, confidence, scores, signals, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                        rusqlite::params![
                            class_id, device_profile_id, now, primary, confidence,
                            classification.get("scores").map(|v| v.to_string()).unwrap_or_default(),
                            classification.get("signals").map(|v| v.to_string()).unwrap_or_default(),
                            serde_json::to_string(&classification).unwrap_or_default(),
                        ],
                    );
                    RpcResponse::ok(id, classification)
                }
                Err(e) => RpcResponse::err(id, -40, format!("Classification failed: {}", e)),
            }
        }

        // ── Machine Intelligence: full profile ──────────────────────────
        "intelligence.getProfile" => {
            if !tier_allows(license, "intelligent_recommendations") {
                return RpcResponse::err(id, -403, "Premium feature: intelligent_recommendations".into());
            }
            let device_profile_id = match params.get("deviceProfileId").and_then(|v| v.as_str()) {
                Some(dpid) => dpid,
                None => return RpcResponse::err(id, -3, "Missing required param: deviceProfileId".into()),
            };
            let profile = match load_device_profile(db, device_profile_id) {
                Ok(p) => p,
                Err(e) => return RpcResponse::err(id, -4, format!("Device profile not found: {}", e)),
            };
            let classification = match intelligence::classify(&profile) {
                Ok(c) => c,
                Err(e) => return RpcResponse::err(id, -40, format!("Classification failed: {}", e)),
            };
            match intelligence::build_profile(&profile, &classification) {
                Ok(full_profile) => RpcResponse::ok(id, full_profile),
                Err(e) => RpcResponse::err(id, -41, format!("Profile build failed: {}", e)),
            }
        }

        // ── Machine Intelligence: recommendations ───────────────────────
        "intelligence.getRecommendations" => {
            if !tier_allows(license, "intelligent_recommendations") {
                return RpcResponse::err(id, -403, "Premium feature: intelligent_recommendations".into());
            }
            let device_profile_id = match params.get("deviceProfileId").and_then(|v| v.as_str()) {
                Some(dpid) => dpid,
                None => return RpcResponse::err(id, -3, "Missing required param: deviceProfileId".into()),
            };
            let profile = match load_device_profile(db, device_profile_id) {
                Ok(p) => p,
                Err(e) => return RpcResponse::err(id, -4, format!("Device profile not found: {}", e)),
            };
            let classification = match intelligence::classify(&profile) {
                Ok(c) => c,
                Err(e) => return RpcResponse::err(id, -40, format!("Classification failed: {}", e)),
            };
            match intelligence::recommend(&profile, &classification) {
                Ok(recs) => RpcResponse::ok(id, serde_json::json!(recs)),
                Err(e) => RpcResponse::err(id, -42, format!("Recommendations failed: {}", e)),
            }
        }

        // ── Unknown method ──────────────────────────────────────────────
        _ => {
            tracing::warn!("Unknown RPC method: {}", req.method);
            RpcResponse::err(id, -1, format!("Unknown method: {}", req.method))
        }
    }
}

// ─── Database helpers ───────────────────────────────────────────────────────

/// Persist a scanned device profile to the database.
fn store_device_profile(db: &Database, profile: &serde_json::Value) -> anyhow::Result<()> {
    let profile_id = profile
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let now = chrono::Utc::now().to_rfc3339();
    let data = serde_json::to_string(profile)?;

    db.conn().execute(
        "INSERT OR REPLACE INTO device_profiles (id, scanned_at, data) VALUES (?1, ?2, ?3)",
        rusqlite::params![profile_id, now, data],
    )?;

    tracing::info!("Stored device profile: {}", profile_id);
    Ok(())
}

/// Load a device profile from the database by ID.
fn load_device_profile(db: &Database, profile_id: &str) -> anyhow::Result<serde_json::Value> {
    let data: String = db.conn().query_row(
        "SELECT data FROM device_profiles WHERE id = ?1",
        [profile_id],
        |row| row.get(0),
    )?;

    let profile: serde_json::Value = serde_json::from_str(&data)?;
    Ok(profile)
}

/// Persist a generated tuning plan to the database.
fn store_tuning_plan(
    db: &Database,
    device_profile_id: &str,
    preset: &str,
    plan: &serde_json::Value,
) -> anyhow::Result<()> {
    let plan_id = plan
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let now = chrono::Utc::now().to_rfc3339();
    let data = serde_json::to_string(plan)?;

    db.conn().execute(
        "INSERT OR REPLACE INTO tuning_plans (id, device_profile_id, preset, created_at, data) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![plan_id, device_profile_id, preset, now, data],
    )?;

    tracing::info!("Stored tuning plan: {}", plan_id);
    Ok(())
}

fn load_tuning_plan(db: &Database, plan_id: &str) -> anyhow::Result<serde_json::Value> {
    let data: String = db.conn().query_row(
        "SELECT data FROM tuning_plans WHERE id = ?1",
        rusqlite::params![plan_id],
        |row| row.get(0),
    )?;
    let plan: serde_json::Value = serde_json::from_str(&data)?;
    Ok(plan)
}

/// Query the audit_log table with pagination.
fn query_audit_log(
    db: &Database,
    limit: i64,
    offset: i64,
) -> anyhow::Result<serde_json::Value> {
    let mut stmt = db.conn().prepare(
        "SELECT id, timestamp, category, action, detail, action_id, plan_id, snapshot_id, severity
         FROM audit_log ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2",
    )?;

    let entries: Vec<serde_json::Value> = stmt
        .query_map(rusqlite::params![limit, offset], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "timestamp": row.get::<_, String>(1)?,
                "category": row.get::<_, String>(2)?,
                "action": row.get::<_, String>(3)?,
                "detail": row.get::<_, String>(4)?,
                "actionId": row.get::<_, Option<String>>(5)?,
                "planId": row.get::<_, Option<String>>(6)?,
                "snapshotId": row.get::<_, Option<String>>(7)?,
                "severity": row.get::<_, String>(8)?,
            }))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(serde_json::json!(entries))
}
