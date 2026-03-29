// ─── JSON-RPC Server ────────────────────────────────────────────────────────
// Communicates with the Electron main process over stdin/stdout.
// Each line is a JSON-RPC request; each response is a single JSON line.

use crate::db::Database;
use crate::{appbundle, assessor, classifier, executor, personalizer, playbook, rollback, transformer};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, time::Instant};
use tokio::process::Command;
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

#[derive(Debug, Serialize, Deserialize)]
struct ResumeJournalFile {
    reason: String,
    created_at: String,
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
pub async fn serve(db: Database) -> Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let reader = BufReader::new(stdin);
    let mut lines = reader.lines();

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

        let response = dispatch(&db, &request, start_time).await;
        let mut json = serde_json::to_string(&response)?;
        json.push('\n');
        stdout.write_all(json.as_bytes()).await?;
        stdout.flush().await?;
    }

    Ok(())
}

async fn dispatch(
    db: &Database,
    req: &RpcRequest,
    start_time: Instant,
) -> RpcResponse {
    let id = req.id;
    let params = &req.params;

    match req.method.as_str() {
        // ── System status ───────────────────────────────────────────────
        "system.status" => {
            let uptime = start_time.elapsed().as_secs();
            RpcResponse::ok(
                id,
                serde_json::json!({
                    "status": "running",
                    "uptimeSeconds": uptime,
                    "version": env!("CARGO_PKG_VERSION"),
                }),
            )
        }

        "system.reboot" => {
            let reason = params
                .get("reason")
                .and_then(|v| v.as_str())
                .unwrap_or("playbook-reboot-required");

            match schedule_system_reboot(reason).await {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => {
                    tracing::error!(error = %e, "Failed to schedule reboot");
                    RpcResponse::err(id, -60, format!("Failed to schedule reboot: {}", e))
                }
            }
        }

        // ── Assessment ──────────────────────────────────────────────────
        "assess.full" => {
            tracing::info!("Full system assessment requested");
            match assessor::assess_system().await {
                Ok(mut assessment) => {
                    // Persist to database
                    match store_assessment(db, &assessment) {
                        Ok(assess_id) => {
                            // Inject the DB id into the response so callers can reference it
                            if let Some(obj) = assessment.as_object_mut() {
                                obj.insert("id".to_string(), serde_json::json!(assess_id));
                            }
                        }
                        Err(e) => {
                            tracing::error!("Failed to store assessment: {}", e);
                            return RpcResponse::err(
                                id,
                                -2,
                                format!("Assessment succeeded but storage failed: {}", e),
                            );
                        }
                    }
                    RpcResponse::ok(id, assessment)
                }
                Err(e) => {
                    tracing::error!("Assessment failed: {}", e);
                    RpcResponse::err(id, -10, format!("Assessment failed: {}", e))
                }
            }
        }

        // ── Classification ──────────────────────────────────────────────
        "classify.machine" => {
            let assessment_id = params
                .get("assessmentId")
                .and_then(|v| v.as_str());

            // Load assessment: by ID, inline, or latest from DB
            let assessment = if let Some(aid) = assessment_id {
                match load_assessment(db, aid) {
                    Ok(a) => a,
                    Err(e) => {
                        return RpcResponse::err(id, -4, format!("Assessment not found: {}", e));
                    }
                }
            } else if let Some(data) = params.get("assessment") {
                data.clone()
            } else {
                // No params — use the most recent assessment
                match load_latest_assessment(db) {
                    Ok(a) => a,
                    Err(e) => {
                        return RpcResponse::err(id, -3, format!("No assessment available: {}", e));
                    }
                }
            };

            match classifier::classify(&assessment) {
                Ok(classification) => {
                    if let Err(e) = store_classification(db, assessment_id, &classification) {
                        tracing::error!("Failed to store classification: {}", e);
                    }
                    RpcResponse::ok(id, classification)
                }
                Err(e) => {
                    tracing::error!("Classification failed: {}", e);
                    RpcResponse::err(id, -11, format!("Classification failed: {}", e))
                }
            }
        }

        // ── Transformation plan ─────────────────────────────────────────
        "transform.plan" => {
            let classification_id = params
                .get("classificationId")
                .and_then(|v| v.as_str());
            let preset = params
                .get("preset")
                .and_then(|v| v.as_str())
                .unwrap_or("balanced");

            let classification = if let Some(cid) = classification_id {
                match load_classification(db, cid) {
                    Ok(c) => c,
                    Err(e) => {
                        return RpcResponse::err(
                            id,
                            -4,
                            format!("Classification not found: {}", e),
                        );
                    }
                }
            } else if let Some(data) = params.get("classification") {
                data.clone()
            } else if let Some(profile) = params.get("profile").and_then(|v| v.as_str()) {
                // Allow passing profile directly for convenience
                serde_json::json!({
                    "primary": profile,
                    "confidence": 1.0,
                    "preservationFlags": if profile == "work_pc" {
                        serde_json::json!(["print_spooler", "rdp_server", "smb_client", "group_policy_client"])
                    } else {
                        serde_json::json!([])
                    }
                })
            } else {
                return RpcResponse::err(
                    id,
                    -3,
                    "Missing: classificationId, classification, or profile".into(),
                );
            };

            tracing::info!(preset = preset, "Generating transformation plan");

            match transformer::generate_plan(&classification, preset) {
                Ok(plan) => {
                    if let Err(e) = store_plan(db, classification_id, preset, &plan) {
                        tracing::error!("Failed to store plan: {}", e);
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
        "transform.getActions" => {
            let category = params.get("category").and_then(|v| v.as_str());
            tracing::info!(category = ?category, "Getting actions");
            let actions = transformer::get_actions(category);
            RpcResponse::ok(id, serde_json::json!(actions))
        }

        // ── Execute action ──────────────────────────────────────────────
        "execute.applyAction" => {
            let action_id = match params.get("actionId").and_then(|v| v.as_str()) {
                Some(aid) => aid,
                None => {
                    return RpcResponse::err(id, -3, "Missing required param: actionId".into());
                }
            };

            // Look up action data from params or embedded definitions
            let action_data = if let Some(data) = params.get("actionData") {
                data.clone()
            } else {
                let playbook_dir = resolve_playbook_dir()
                    .unwrap_or_else(playbook::default_playbook_dir);
                let playbook_lookup = playbook::find_action_definition(
                    &playbook_dir,
                    action_id,
                );

                match playbook_lookup {
                    Ok(Some(def)) => def,
                    Ok(None) => match transformer::get_actions(None)
                        .into_iter()
                        .find(|a| a.get("id").and_then(|v| v.as_str()) == Some(action_id))
                    {
                        Some(def) => def,
                        None => {
                            return RpcResponse::err(
                                id,
                                -20,
                                format!("Action not found: {}", action_id),
                            );
                        }
                    },
                    Err(e) => {
                        tracing::error!(action_id = action_id, error = %e, "Playbook action lookup failed");
                        return RpcResponse::err(
                            id,
                            -20,
                            format!("Action lookup failed: {}", e),
                        );
                    }
                }
            };

            tracing::info!(action_id = action_id, "Applying action");

            match executor::execute_action(db, action_id, &action_data) {
                Ok(outcome) => RpcResponse::ok(id, outcome),
                Err(e) => {
                    tracing::error!(action_id = action_id, error = %e, "Action execution failed");
                    RpcResponse::err(id, -20, format!("Action failed: {}", e))
                }
            }
        }

        // ── Rollback ────────────────────────────────────────────────────
        "rollback.list" => {
            match rollback::list_snapshots(db) {
                Ok(snapshots) => RpcResponse::ok(id, serde_json::json!(snapshots)),
                Err(e) => {
                    tracing::error!("Failed to list snapshots: {}", e);
                    RpcResponse::err(id, -30, format!("Failed to list snapshots: {}", e))
                }
            }
        }

        "rollback.restore" => {
            let snapshot_id = match params.get("snapshotId").and_then(|v| v.as_str()) {
                Some(sid) => sid,
                None => {
                    return RpcResponse::err(
                        id,
                        -3,
                        "Missing required param: snapshotId".into(),
                    );
                }
            };

            tracing::info!(snapshot_id = snapshot_id, "Restoring snapshot");

            match rollback::restore_snapshot(db, snapshot_id) {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => {
                    tracing::error!(
                        snapshot_id = snapshot_id,
                        error = %e,
                        "Snapshot restoration failed"
                    );
                    RpcResponse::err(id, -31, format!("Restore failed: {}", e))
                }
            }
        }

        "rollback.audit" => {
            let limit = params
                .get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(50) as usize;

            match query_audit_log(db, limit) {
                Ok(entries) => RpcResponse::ok(id, serde_json::json!(entries)),
                Err(e) => {
                    tracing::error!("Failed to query audit log: {}", e);
                    RpcResponse::err(id, -32, format!("Audit query failed: {}", e))
                }
            }
        }

        // ── Journal / reboot-resume ────────────────────────────────────
        "journal.state" => match load_resume_journal() {
            Ok(Some(state)) => RpcResponse::ok(id, state),
            Ok(None) => RpcResponse::ok(id, serde_json::Value::Null),
            Err(e) => {
                tracing::error!(error = %e, "Failed to read resume journal");
                RpcResponse::err(id, -61, format!("Failed to read resume journal: {}", e))
            }
        },

        "journal.resume" => match clear_resume_journal() {
            Ok(()) => RpcResponse::ok(
                id,
                serde_json::json!({
                    "status": "complete",
                    "resumed": 0,
                }),
            ),
            Err(e) => {
                tracing::error!(error = %e, "Failed to clear resume journal");
                RpcResponse::err(id, -62, format!("Failed to resume journal: {}", e))
            }
        },

        "journal.cancel" => match clear_resume_journal() {
            Ok(()) => RpcResponse::ok(id, serde_json::json!({ "status": "cancelled" })),
            Err(e) => {
                tracing::error!(error = %e, "Failed to cancel resume journal");
                RpcResponse::err(id, -63, format!("Failed to cancel journal: {}", e))
            }
        },

        // ── Full pipeline: assess + classify + plan in one call ─────────
        "pipeline.assessClassifyPlan" => {
            let preset = params.get("preset").and_then(|v| v.as_str()).unwrap_or("conservative");

            // Step 1: Assess
            let assessment = match assessor::assess_system().await {
                Ok(mut a) => {
                    match store_assessment(db, &a) {
                        Ok(aid) => {
                            if let Some(obj) = a.as_object_mut() {
                                obj.insert("id".to_string(), serde_json::json!(aid));
                            }
                        }
                        Err(e) => tracing::warn!("Failed to store assessment: {}", e),
                    }
                    a
                }
                Err(e) => return RpcResponse::err(id, -10, format!("Assessment failed: {}", e)),
            };

            // Step 2: Classify
            let classification = match classifier::classify(&assessment) {
                Ok(c) => {
                    let _ = store_classification(db, None, &c);
                    c
                }
                Err(e) => return RpcResponse::err(id, -11, format!("Classification failed: {}", e)),
            };

            // Step 3: Plan
            let plan = match transformer::generate_plan(&classification, preset) {
                Ok(p) => {
                    let _ = store_plan(db, None, preset, &p);
                    p
                }
                Err(e) => return RpcResponse::err(id, -12, format!("Plan generation failed: {}", e)),
            };

            RpcResponse::ok(id, serde_json::json!({
                "assessment": {
                    "windows": assessment.get("windows"),
                    "appx": assessment.get("appx"),
                    "services": assessment.get("services"),
                    "vm": assessment.get("vm"),
                    "workSignals": assessment.get("workSignals"),
                    "hardware": assessment.get("hardware"),
                    "overallScore": assessment.get("overallScore"),
                },
                "classification": classification,
                "plan": plan,
            }))
        }

        // ── Personalization ──────────────────────────────────────────────
        "personalize.options" => {
            let profile = params
                .get("profile")
                .and_then(|v| v.as_str())
                .unwrap_or("gaming_desktop");

            tracing::info!(profile = profile, "Getting personalization options");
            let options = personalizer::get_personalization_options(profile);
            RpcResponse::ok(id, options)
        }

        "personalize.apply" => {
            let profile = match params.get("profile").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => {
                    return RpcResponse::err(
                        id,
                        -3,
                        "Missing required param: profile".into(),
                    );
                }
            };

            let options = params
                .get("options")
                .cloned()
                .unwrap_or(serde_json::json!({}));

            tracing::info!(profile = profile, "Applying personalization");

            match personalizer::apply_personalization(db, profile, &options) {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => {
                    tracing::error!(profile = profile, error = %e, "Personalization failed");
                    RpcResponse::err(id, -40, format!("Personalization failed: {}", e))
                }
            }
        }

        "personalize.revert" => {
            let snapshot_id = match params.get("snapshotId").and_then(|v| v.as_str()) {
                Some(sid) => sid,
                None => {
                    return RpcResponse::err(
                        id,
                        -3,
                        "Missing required param: snapshotId".into(),
                    );
                }
            };

            tracing::info!(snapshot_id = snapshot_id, "Reverting personalization");

            match personalizer::revert_personalization(db, snapshot_id) {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => {
                    tracing::error!(
                        snapshot_id = snapshot_id,
                        error = %e,
                        "Personalization revert failed"
                    );
                    RpcResponse::err(id, -41, format!("Personalization revert failed: {}", e))
                }
            }
        }

        // ── Playbook: load and resolve ─────────────────────────────────
        "playbook.resolve" => {
            let profile = params.get("profile").and_then(|v| v.as_str()).unwrap_or("gaming_desktop");
            let preset = params.get("preset").and_then(|v| v.as_str()).unwrap_or("balanced");
            let windows_build = params.get("windowsBuild").and_then(|v| v.as_u64()).map(|b| b as u32);

            let playbook_dir = match resolve_playbook_dir() {
                Some(d) => d,
                None => {
                    return RpcResponse::err(id, -50, "Playbook directory not found".into());
                }
            };

            tracing::info!(
                profile = profile,
                preset = preset,
                dir = ?playbook_dir,
                "Resolving playbook"
            );

            match crate::playbook::load_playbook(&playbook_dir) {
                Ok(playbook) => {
                    let plan = crate::playbook::resolve_plan(&playbook, profile, preset, windows_build);
                    let mut result = plan.to_json();
                    // Add manifest metadata
                    if let Some(obj) = result.as_object_mut() {
                        obj.insert("playbookName".to_string(), serde_json::json!(playbook.manifest.name));
                        obj.insert("playbookVersion".to_string(), serde_json::json!(playbook.manifest.version));
                        obj.insert("totalActions".to_string(), serde_json::json!(playbook.total_actions));
                    }
                    RpcResponse::ok(id, result)
                }
                Err(e) => {
                    tracing::error!(error = %e, "Playbook load failed");
                    RpcResponse::err(id, -51, format!("Playbook load failed: {}", e))
                }
            }
        }

        // ── Verify registry value (read-back proof) ─────────────────────
        "verify.registryValue" => {
            let hive = match params.get("hive").and_then(|v| v.as_str()) {
                Some(h) => h,
                None => return RpcResponse::err(id, -3, "Missing param: hive".into()),
            };
            let path = match params.get("path").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => return RpcResponse::err(id, -3, "Missing param: path".into()),
            };
            let value_name = match params.get("valueName").and_then(|v| v.as_str()) {
                Some(v) => v,
                None => return RpcResponse::err(id, -3, "Missing param: valueName".into()),
            };

            tracing::info!(hive = hive, path = path, value_name = value_name, "Verifying registry value");
            let current = executor::read_registry_value_public(hive, path, value_name);

            RpcResponse::ok(id, serde_json::json!({
                "hive": hive,
                "path": path,
                "valueName": value_name,
                "currentValue": current,
                "exists": current.is_some(),
            }))
        }

        // ── App bundles: get recommended apps for a profile ─────────
        "appbundle.getRecommended" => {
            let profile = params
                .get("profile")
                .and_then(|v| v.as_str())
                .unwrap_or("gaming_desktop");

            let playbook_dir = match resolve_playbook_dir() {
                Some(d) => d,
                None => {
                    return RpcResponse::err(id, -50, "Playbook directory not found".into());
                }
            };

            tracing::info!(profile = profile, "Getting recommended app bundle");

            match appbundle::get_recommended(&playbook_dir, profile) {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => {
                    tracing::error!(profile = profile, error = %e, "Failed to get recommended apps");
                    RpcResponse::err(id, -52, format!("App bundle load failed: {}", e))
                }
            }
        }

        // ── App bundles: resolve install queue ────────────────────────
        "appbundle.resolve" => {
            let profile = params
                .get("profile")
                .and_then(|v| v.as_str())
                .unwrap_or("gaming_desktop");
            let selected_apps: Vec<String> = params
                .get("selectedApps")
                .or_else(|| params.get("appIds"))
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            if selected_apps.is_empty() {
                return RpcResponse::err(id, -3, "Missing or empty param: selectedApps/appIds".into());
            }

            let playbook_dir = match resolve_playbook_dir() {
                Some(d) => d,
                None => {
                    return RpcResponse::err(id, -50, "Playbook directory not found".into());
                }
            };

            tracing::info!(
                profile = profile,
                selected = selected_apps.len(),
                "Resolving app install queue"
            );

            match appbundle::resolve(&playbook_dir, profile, &selected_apps) {
                Ok(result) => RpcResponse::ok(id, result),
                Err(e) => {
                    tracing::error!(profile = profile, error = %e, "Failed to resolve app bundle");
                    RpcResponse::err(id, -53, format!("App bundle resolve failed: {}", e))
                }
            }
        }

        // ── Unknown method ──────────────────────────────────────────────
        other => {
            tracing::warn!(method = other, "Unknown RPC method");
            RpcResponse::err(id, -1, format!("Unknown method: {}", other))
        }
    }
}

// ─── Playbook directory resolution ──────────────────────────────────────────

/// Resolve the playbook directory. Checks relative to binary, then cwd, then fallback.
fn resolve_playbook_dir() -> Option<std::path::PathBuf> {
    // Try relative to binary location
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let candidate = parent
                .join("..")
                .join("..")
                .join("..")
                .join("..")
                .join("playbooks");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // Try cwd/playbooks
    if let Ok(cwd) = std::env::current_dir() {
        let candidate = cwd.join("playbooks");
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // Last resort
    let fallback = std::path::PathBuf::from("playbooks");
    if fallback.exists() {
        return Some(fallback);
    }

    None
}

// ─── Reboot-resume journal helpers ──────────────────────────────────────────

fn resume_journal_path() -> anyhow::Result<PathBuf> {
    #[cfg(windows)]
    let dir = {
        let base = std::env::var("LOCALAPPDATA")
            .unwrap_or_else(|_| "C:\\ProgramData".to_string());
        PathBuf::from(base).join("redcore-os")
    };

    #[cfg(not(windows))]
    let dir = PathBuf::from("./data");

    fs::create_dir_all(&dir)?;
    Ok(dir.join("resume-journal.json"))
}

fn sanitize_reboot_reason(reason: &str) -> String {
    let normalized = reason
        .chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    if normalized.is_empty() {
        "playbook-reboot-required".to_string()
    } else {
        normalized.chars().take(120).collect()
    }
}

fn journal_entry_to_state(entry: ResumeJournalFile) -> serde_json::Value {
    serde_json::json!({
        "planId": "resume-reboot",
        "currentStepId": "reboot-pending",
        "lastCompletedStepId": null,
        "overallProgress": 100,
        "requiresReboot": true,
        "canResume": true,
        "completedActionIds": [],
        "failedActionIds": [],
        "steps": [{
            "id": "reboot-pending",
            "planId": "resume-reboot",
            "stepType": "reboot_pending",
            "stepOrder": 0,
            "status": "awaiting_reboot",
            "actionId": null,
            "description": entry.reason,
            "createdAt": entry.created_at,
            "updatedAt": entry.created_at,
            "completedAt": null,
            "error": null,
        }],
    })
}

fn write_resume_journal(reason: &str) -> anyhow::Result<ResumeJournalFile> {
    let entry = ResumeJournalFile {
        reason: sanitize_reboot_reason(reason),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let path = resume_journal_path()?;
    fs::write(&path, serde_json::to_vec_pretty(&entry)?)?;
    Ok(entry)
}

fn load_resume_journal() -> anyhow::Result<Option<serde_json::Value>> {
    let path = resume_journal_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let bytes = fs::read(&path)?;
    let entry: ResumeJournalFile = serde_json::from_slice(&bytes)?;
    Ok(Some(journal_entry_to_state(entry)))
}

fn clear_resume_journal() -> anyhow::Result<()> {
    let path = resume_journal_path()?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

async fn schedule_system_reboot(reason: &str) -> anyhow::Result<serde_json::Value> {
    let entry = write_resume_journal(reason)?;

    #[cfg(windows)]
    {
        let status = Command::new("shutdown.exe")
            .args(["/r", "/t", "0", "/f", "/c", entry.reason.as_str()])
            .status()
            .await?;

        if !status.success() {
            anyhow::bail!("shutdown.exe exited with status {}", status);
        }

        return Ok(serde_json::json!({
            "status": "scheduled",
            "reason": entry.reason,
        }));
    }

    #[cfg(not(windows))]
    {
        Ok(serde_json::json!({
            "status": "simulated",
            "reason": entry.reason,
        }))
    }
}

// ─── Database helpers ───────────────────────────────────────────────────────

fn store_assessment(db: &Database, assessment: &serde_json::Value) -> anyhow::Result<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let data = serde_json::to_string(assessment)?;

    db.conn().execute(
        "INSERT INTO assessments (id, assessed_at, data) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, now, data],
    )?;

    tracing::info!(assessment_id = id.as_str(), "Assessment stored");
    Ok(id)
}

fn load_assessment(db: &Database, id: &str) -> anyhow::Result<serde_json::Value> {
    let data: String = db.conn().query_row(
        "SELECT data FROM assessments WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;
    Ok(serde_json::from_str(&data)?)
}

fn load_latest_assessment(db: &Database) -> anyhow::Result<serde_json::Value> {
    let data: String = db.conn().query_row(
        "SELECT data FROM assessments ORDER BY assessed_at DESC LIMIT 1",
        [],
        |row| row.get(0),
    )?;
    Ok(serde_json::from_str(&data)?)
}

fn store_classification(
    db: &Database,
    assessment_id: Option<&str>,
    classification: &serde_json::Value,
) -> anyhow::Result<String> {
    let id = uuid::Uuid::new_v4().to_string();
    let profile = classification["primary"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    let confidence = classification["confidence"]
        .as_f64()
        .unwrap_or(0.0);
    let data = serde_json::to_string(classification)?;
    // Use NULL when no stored assessment exists to avoid FK violation
    let aid: Option<&str> = assessment_id;

    db.conn().execute(
        "INSERT INTO classifications (id, assessment_id, profile, confidence, data)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, aid, profile, confidence, data],
    )?;

    tracing::info!(
        classification_id = id.as_str(),
        profile = profile.as_str(),
        "Classification stored"
    );
    Ok(id)
}

fn load_classification(db: &Database, id: &str) -> anyhow::Result<serde_json::Value> {
    let data: String = db.conn().query_row(
        "SELECT data FROM classifications WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;
    Ok(serde_json::from_str(&data)?)
}

fn store_plan(
    db: &Database,
    classification_id: Option<&str>,
    preset: &str,
    plan: &serde_json::Value,
) -> anyhow::Result<String> {
    let id = plan["id"]
        .as_str()
        .unwrap_or(&uuid::Uuid::new_v4().to_string())
        .to_string();
    let now = chrono::Utc::now().to_rfc3339();
    // Use NULL when no stored classification exists to avoid FK violation
    let cid: Option<&str> = classification_id;
    let data = serde_json::to_string(plan)?;

    db.conn().execute(
        "INSERT INTO transform_plans (id, classification_id, preset, created_at, data)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, cid, preset, now, data],
    )?;

    tracing::info!(plan_id = id.as_str(), preset = preset, "Plan stored");
    Ok(id)
}

fn query_audit_log(
    db: &Database,
    limit: usize,
) -> anyhow::Result<Vec<serde_json::Value>> {
    let mut stmt = db.conn().prepare(
        "SELECT id, timestamp, category, action, detail, severity
         FROM audit_log ORDER BY timestamp DESC LIMIT ?1",
    )?;

    let entries = stmt
        .query_map([limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "timestamp": row.get::<_, String>(1)?,
                "category": row.get::<_, String>(2)?,
                "action": row.get::<_, String>(3)?,
                "detail": row.get::<_, String>(4)?,
                "severity": row.get::<_, String>(5)?,
            }))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}
