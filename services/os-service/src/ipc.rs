// ─── JSON-RPC Server ────────────────────────────────────────────────────────
// Communicates with the Electron main process over stdin/stdout.
// Each line is a JSON-RPC request; each response is a single JSON line.

use crate::db::Database;
use crate::{
    assessor, classifier, executor, ledger, personalizer, playbook, questionnaire, rollback,
    transformer,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tokio::io::{self, AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

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

fn is_retired_unsafe_action(action_id: &str) -> bool {
    matches!(
        action_id,
        "cpu.disable-dynamic-tick"
            | "cpu.global-timer-resolution"
            | "gpu.disable-hags"
            | "memory.disable-compression"
            | "perf.disable-ndu"
            | "perf.large-system-cache"
            | "perf.disable-prefetch"
            | "perf.svchost-split-threshold"
            | "perf.disable-page-combining"
            | "privacy.disable-smart-app-control"
            | "storage.disable-8dot3-filenames"
            | "system.disable-windows-update"
            | "services.disable-wuauserv"
            | "services.disable-update-orchestrator-svc"
            | "services.disable-bits"
            | "services.disable-waasmedic"
            | "services.disable-delivery-optimization"
    )
}

// Sidecar structs removed — DB-backed execution ledger is the only truth path.

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RpcExecutionJournalContext {
    package: RpcExecutionJournalPackage,
    action: RpcExecutionJournalAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RpcExecutionJournalPackage {
    plan_id: String,
    package_id: String,
    package_role: String,
    package_version: Option<String>,
    package_source_ref: Option<String>,
    action_provenance_ref: Option<String>,
    execution_journal_ref: Option<String>,
    source_commit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RpcExecutionJournalAction {
    action_id: String,
    label: String,
    phase: String,
    package_source_ref: Option<String>,
    provenance_ref: Option<String>,
    question_keys: Vec<String>,
    selected_values: Vec<String>,
    requires_reboot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RpcRebootJournalContext {
    plan_id: String,
    package_id: String,
    package_role: String,
    package_version: Option<String>,
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

async fn dispatch(db: &Database, req: &RpcRequest, start_time: Instant) -> RpcResponse {
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
            let reboot_context = params
                .get("journalContext")
                .cloned()
                .and_then(|value| serde_json::from_value::<RpcRebootJournalContext>(value).ok());

            // Mark reboot in DB ledger if a plan exists
            if let Some(ref ctx) = reboot_context {
                if let Err(e) = ledger::mark_reboot_pending(db, &ctx.plan_id, reason) {
                    tracing::error!(error = %e, "Failed to mark reboot in DB ledger");
                }
            }

            match schedule_system_reboot(reason, reboot_context).await {
                Ok(result) => {
                    let detail = format!(
                        "reboot scheduled · planId={} · packageId={} · packageRole={}",
                        result
                            .get("planId")
                            .and_then(|value| value.as_str())
                            .unwrap_or("null"),
                        result
                            .get("packageId")
                            .and_then(|value| value.as_str())
                            .unwrap_or("null"),
                        result
                            .get("packageRole")
                            .and_then(|value| value.as_str())
                            .unwrap_or("null"),
                    );
                    let _ = append_audit_log(db, "journal", "reboot_scheduled", &detail, "info");
                    RpcResponse::ok(id, result)
                }
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
            let assessment_id = params.get("assessmentId").and_then(|v| v.as_str());

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
            let classification_id = params.get("classificationId").and_then(|v| v.as_str());
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

            if is_retired_unsafe_action(action_id) {
                return RpcResponse::err(
                    id,
                    -21,
                    format!("Action retired for Windows stability: {}", action_id),
                );
            }

            // Look up action data from params or embedded definitions
            let action_data = if let Some(data) = params.get("actionData") {
                data.clone()
            } else {
                let playbook_dir =
                    resolve_playbook_dir().unwrap_or_else(playbook::default_playbook_dir);
                let playbook_lookup = playbook::find_action_definition(&playbook_dir, action_id);

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
                        return RpcResponse::err(id, -20, format!("Action lookup failed: {}", e));
                    }
                }
            };

            // Guard: reject expert_only actions unless caller explicitly confirms
            let is_expert = action_data
                .get("expertOnly")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let risk = action_data
                .get("risk")
                .and_then(|v| v.as_str())
                .unwrap_or("low");
            if is_expert || risk == "extreme" {
                let expert_confirmed = params
                    .get("expertConfirmed")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                if !expert_confirmed {
                    return RpcResponse::err(
                        id,
                        -22,
                        format!(
                            "Action '{}' is expert-only (risk: {}). Requires explicit confirmation.",
                            action_id, risk
                        ),
                    );
                }
            }

            tracing::info!(action_id = action_id, "Applying action");
            let journal_context = params
                .get("journalContext")
                .cloned()
                .and_then(|value| serde_json::from_value::<RpcExecutionJournalContext>(value).ok());
            let audit_context = journal_context.as_ref().map(|context| {
                format!(
                    "package={} role={} provenanceRef={} packageSourceRef={}",
                    context.package.package_id,
                    context.package.package_role,
                    context.action.provenance_ref.as_deref().unwrap_or("null"),
                    context
                        .action
                        .package_source_ref
                        .as_deref()
                        .unwrap_or("null"),
                )
            });

            match executor::execute_action(db, action_id, &action_data, audit_context.as_deref()) {
                Ok(outcome) => {
                    let result_status = outcome
                        .get("status")
                        .and_then(|value| value.as_str())
                        .unwrap_or("failed");
                    let rollback_snapshot_id = outcome
                        .get("rollbackSnapshotId")
                        .or_else(|| outcome.get("snapshotId"))
                        .and_then(|value| value.as_str())
                        .map(|value| value.to_string());

                    let mut enriched_outcome = outcome.clone();

                    // ── Record in DB-backed ledger (sole truth path) ──
                    if let Some(context) = journal_context.as_ref() {
                        let plan_id = &context.package.plan_id;

                        let ledger_result = ledger::ActionResult {
                            action_id: action_id.to_string(),
                            status: result_status.to_string(),
                            rollback_snapshot_id: rollback_snapshot_id.clone(),
                            error_message: if result_status == "failed" {
                                Some(format!("Action {} returned failure", action_id))
                            } else {
                                None
                            },
                            duration_ms: None,
                        };
                        if let Err(e) = ledger::record_action_result(db, plan_id, &ledger_result) {
                            tracing::error!(action_id = action_id, error = %e, "Failed to record in DB ledger");
                        }

                        if let Some(object) = enriched_outcome.as_object_mut() {
                            object.insert(
                                "packageId".to_string(),
                                serde_json::json!(context.package.package_id),
                            );
                            object.insert(
                                "packageRole".to_string(),
                                serde_json::json!(context.package.package_role),
                            );
                            object.insert(
                                "packageSourceRef".to_string(),
                                serde_json::json!(context.action.package_source_ref),
                            );
                            object.insert(
                                "provenanceRef".to_string(),
                                serde_json::json!(context.action.provenance_ref),
                            );
                            object.insert(
                                "journalRef".to_string(),
                                serde_json::json!(format!(
                                    "{}#/{}",
                                    context
                                        .package
                                        .execution_journal_ref
                                        .clone()
                                        .unwrap_or_else(
                                            || "state/execution-journal.json".to_string()
                                        ),
                                    context.action.action_id
                                )),
                            );
                            object.insert("resumePlanId".to_string(), serde_json::json!(plan_id));
                        }
                    }

                    RpcResponse::ok(id, enriched_outcome)
                }
                Err(e) => {
                    tracing::error!(action_id = action_id, error = %e, "Action execution failed");

                    // Record failure in DB ledger if context available
                    if let Some(context) = journal_context.as_ref() {
                        let _ = ledger::record_action_result(
                            db,
                            &context.package.plan_id,
                            &ledger::ActionResult {
                                action_id: action_id.to_string(),
                                status: "failed".to_string(),
                                rollback_snapshot_id: None,
                                error_message: Some(format!("{}", e)),
                                duration_ms: None,
                            },
                        );
                    }

                    RpcResponse::err(id, -20, format!("Action failed: {}", e))
                }
            }
        }

        // ── Rollback ────────────────────────────────────────────────────
        "rollback.list" => match rollback::list_snapshots(db) {
            Ok(snapshots) => RpcResponse::ok(id, serde_json::json!(snapshots)),
            Err(e) => {
                tracing::error!("Failed to list snapshots: {}", e);
                RpcResponse::err(id, -30, format!("Failed to list snapshots: {}", e))
            }
        },

        "rollback.restore" => {
            let snapshot_id = match params.get("snapshotId").and_then(|v| v.as_str()) {
                Some(sid) => sid,
                None => {
                    return RpcResponse::err(id, -3, "Missing required param: snapshotId".into());
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
            let limit = params.get("limit").and_then(|v| v.as_u64()).unwrap_or(50) as usize;

            match query_audit_log(db, limit) {
                Ok(entries) => RpcResponse::ok(id, serde_json::json!(entries)),
                Err(e) => {
                    tracing::error!("Failed to query audit log: {}", e);
                    RpcResponse::err(id, -32, format!("Audit query failed: {}", e))
                }
            }
        }

        // ── Journal / reboot-resume (DB-backed ledger — sole truth path) ──
        "journal.state" => match ledger::load_active_plan(db) {
            Ok(Some(plan)) => match ledger::query_plan_journal_state(db, &plan.id) {
                Ok(state) => RpcResponse::ok(id, state),
                Err(e) => {
                    tracing::error!(error = %e, "Failed to query DB ledger state");
                    RpcResponse::err(id, -61, format!("Ledger query failed: {}", e))
                }
            },
            Ok(None) => RpcResponse::ok(id, serde_json::Value::Null),
            Err(e) => {
                tracing::error!(error = %e, "Failed to query DB ledger");
                RpcResponse::err(id, -61, format!("Ledger error: {}", e))
            }
        },

        "journal.resume" => match ledger::load_active_plan(db) {
            Ok(Some(plan)) if plan.status == "paused_reboot" => {
                match ledger::resume_plan(db, &plan.id) {
                    Ok(resume_result) => {
                        let remaining_count = resume_result.remaining_actions.len();
                        let package_id =
                            resume_result.package.as_ref().map(|p| p.package_id.clone());
                        let package_role = resume_result
                            .package
                            .as_ref()
                            .map(|p| p.package_role.clone());

                        let remaining_actions: Vec<serde_json::Value> = resume_result.remaining_actions.iter().map(|entry| {
                                serde_json::json!({
                                    "actionId": entry.action_id,
                                    "actionName": entry.action_name,
                                    "phase": entry.phase,
                                    "queuePosition": entry.queue_position,
                                    "packageSourceRef": entry.package_source_ref,
                                    "provenanceRef": entry.provenance_ref,
                                    "questionKeys": serde_json::from_str::<serde_json::Value>(&entry.question_keys_json).unwrap_or(serde_json::json!([])),
                                    "selectedValues": serde_json::from_str::<serde_json::Value>(&entry.selected_values_json).unwrap_or(serde_json::json!([])),
                                    "requiresReboot": entry.requires_reboot,
                                    "riskLevel": entry.risk_level,
                                    "expertOnly": entry.expert_only,
                                })
                            }).collect();

                        let detail = format!(
                            "resume · planId={} · packageId={} · remaining={}",
                            plan.id,
                            package_id.clone().unwrap_or_else(|| "null".to_string()),
                            remaining_count,
                        );
                        let _ =
                            append_audit_log(db, "journal", "resume_from_ledger", &detail, "info");

                        RpcResponse::ok(
                            id,
                            serde_json::json!({
                                "status": "resumed",
                                "resumed": remaining_count,
                                "planId": plan.id,
                                "packageId": package_id,
                                "packageRole": package_role,
                                "remainingActions": remaining_actions,
                            }),
                        )
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "Ledger resume failed");
                        RpcResponse::err(id, -62, format!("Resume failed: {}", e))
                    }
                }
            }
            Ok(_) => RpcResponse::ok(
                id,
                serde_json::json!({
                    "status": "complete",
                    "resumed": 0,
                    "planId": serde_json::Value::Null,
                    "packageId": serde_json::Value::Null,
                    "packageRole": serde_json::Value::Null,
                    "remainingActions": [],
                }),
            ),
            Err(e) => {
                tracing::error!(error = %e, "Ledger query failed during resume");
                RpcResponse::err(id, -62, format!("Resume failed: {}", e))
            }
        },

        "journal.cancel" => {
            if let Ok(Some(plan)) = ledger::load_active_plan(db) {
                if let Err(e) = ledger::cancel_plan(db, &plan.id) {
                    tracing::error!(error = %e, "Failed to cancel ledger plan");
                    return RpcResponse::err(id, -63, format!("Cancel failed: {}", e));
                }
            }
            let _ = append_audit_log(
                db,
                "journal",
                "resume_cancelled",
                "cancelled via ledger",
                "info",
            );
            RpcResponse::ok(id, serde_json::json!({ "status": "cancelled" }))
        }

        // ── Full pipeline: assess + classify + plan in one call ─────────
        "pipeline.assessClassifyPlan" => {
            let preset = params
                .get("preset")
                .and_then(|v| v.as_str())
                .unwrap_or("conservative");

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
                Err(e) => {
                    return RpcResponse::err(id, -11, format!("Classification failed: {}", e))
                }
            };

            // Step 3: Plan
            let plan = match transformer::generate_plan(&classification, preset) {
                Ok(p) => {
                    let _ = store_plan(db, None, preset, &p);
                    p
                }
                Err(e) => {
                    return RpcResponse::err(id, -12, format!("Plan generation failed: {}", e))
                }
            };

            RpcResponse::ok(
                id,
                serde_json::json!({
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
                }),
            )
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
                    return RpcResponse::err(id, -3, "Missing required param: profile".into());
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
                    return RpcResponse::err(id, -3, "Missing required param: snapshotId".into());
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
        "questionnaire.resolve" => {
            let profile = params
                .get("profile")
                .and_then(|v| v.as_str())
                .unwrap_or("gaming_desktop");
            let windows_build = params
                .get("windowsBuild")
                .and_then(|v| v.as_u64())
                .map(|value| value as u32)
                .unwrap_or(22631);

            let playbook_dir = match resolve_playbook_dir() {
                Some(d) => d,
                None => {
                    return RpcResponse::err(id, -50, "Playbook directory not found".into());
                }
            };

            match crate::playbook::load_playbook(&playbook_dir) {
                Ok(playbook) => {
                    match questionnaire::load_questionnaire_schema(&playbook_dir, &playbook) {
                        Ok(schema) => {
                            let mut result = serde_json::to_value(schema)
                                .unwrap_or_else(|_| serde_json::json!({}));
                            if let Some(obj) = result.as_object_mut() {
                                obj.insert("profile".to_string(), serde_json::json!(profile));
                                obj.insert(
                                    "windowsBuild".to_string(),
                                    serde_json::json!(windows_build),
                                );
                            }
                            RpcResponse::ok(id, result)
                        }
                        Err(e) => {
                            RpcResponse::err(id, -52, format!("Questionnaire load failed: {}", e))
                        }
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "Playbook load failed");
                    RpcResponse::err(id, -51, format!("Playbook load failed: {}", e))
                }
            }
        }

        "playbook.resolve" => {
            let profile = params
                .get("profile")
                .and_then(|v| v.as_str())
                .unwrap_or("gaming_desktop");
            let preset = params
                .get("preset")
                .and_then(|v| v.as_str())
                .unwrap_or("balanced");
            let windows_build = params
                .get("windowsBuild")
                .and_then(|v| v.as_u64())
                .map(|b| b as u32);
            let answers = params
                .get("answers")
                .cloned()
                .and_then(|value| {
                    serde_json::from_value::<questionnaire::QuestionnaireAnswers>(value).ok()
                })
                .unwrap_or_default();

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
                    let windows_build = windows_build.unwrap_or(22631);
                    let plan = crate::playbook::resolve_plan(
                        &playbook,
                        profile,
                        preset,
                        Some(windows_build),
                    );
                    let mut result =
                        match questionnaire::load_questionnaire_schema(&playbook_dir, &playbook) {
                            Ok(schema) => questionnaire::evaluate_answers_on_plan(
                                &schema,
                                &answers,
                                profile,
                                windows_build,
                                &plan,
                            )
                            .to_json(),
                            Err(_) => plan.to_json(),
                        };
                    // Add manifest metadata
                    if let Some(obj) = result.as_object_mut() {
                        obj.insert(
                            "playbookName".to_string(),
                            serde_json::json!(playbook.manifest.name),
                        );
                        obj.insert(
                            "playbookVersion".to_string(),
                            serde_json::json!(playbook.manifest.version),
                        );
                        obj.insert(
                            "totalActions".to_string(),
                            serde_json::json!(playbook.total_actions),
                        );
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

            tracing::info!(
                hive = hive,
                path = path,
                value_name = value_name,
                "Verifying registry value"
            );
            let current = executor::read_registry_value_public(hive, path, value_name);

            RpcResponse::ok(
                id,
                serde_json::json!({
                    "hive": hive,
                    "path": path,
                    "valueName": value_name,
                    "currentValue": current,
                    "exists": current.is_some(),
                }),
            )
        }

        // App bundle system removed — app installs can register RunOnce/Active Setup
        // entries that wedge Windows logon (black screen, no taskbar).
        "appbundle.getRecommended" | "appbundle.resolve" | "appbundle.install" => RpcResponse::err(
            id,
            -100,
            "App install system has been removed from RedcoreOS.".into(),
        ),

        // ── Execution Ledger: DB-backed plan/queue management ────────────
        "ledger.createPlan" => {
            let package = match serde_json::from_value::<ledger::PackageIdentity>(
                params
                    .get("package")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null),
            ) {
                Ok(p) => p,
                Err(e) => {
                    return RpcResponse::err(id, -3, format!("Invalid package identity: {}", e))
                }
            };
            let profile = params
                .get("profile")
                .and_then(|v| v.as_str())
                .unwrap_or("gaming_desktop");
            let preset = params
                .get("preset")
                .and_then(|v| v.as_str())
                .unwrap_or("balanced");
            let actions: Vec<ledger::QueuedAction> = params
                .get("actions")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();

            if actions.is_empty() {
                return RpcResponse::err(id, -3, "No actions provided for execution plan".into());
            }

            match ledger::create_plan(db, &package, profile, preset, &actions) {
                Ok(plan_id) => {
                    let _ = append_audit_log(
                        db,
                        "ledger",
                        "plan_created",
                        &format!(
                            "planId={} actions={} package={}",
                            plan_id,
                            actions.len(),
                            package.package_id
                        ),
                        "info",
                    );
                    RpcResponse::ok(
                        id,
                        serde_json::json!({
                            "planId": plan_id,
                            "totalActions": actions.len(),
                            "status": "running",
                        }),
                    )
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to create execution plan");
                    RpcResponse::err(id, -70, format!("Failed to create plan: {}", e))
                }
            }
        }

        "ledger.recordResult" => {
            let plan_id = match params.get("planId").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => return RpcResponse::err(id, -3, "Missing param: planId".into()),
            };
            let result = match serde_json::from_value::<ledger::ActionResult>(
                params
                    .get("result")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null),
            ) {
                Ok(r) => r,
                Err(e) => return RpcResponse::err(id, -3, format!("Invalid action result: {}", e)),
            };

            match ledger::record_action_result(db, plan_id, &result) {
                Ok(()) => RpcResponse::ok(id, serde_json::json!({ "status": "recorded" })),
                Err(e) => {
                    tracing::error!(error = %e, "Failed to record action result in ledger");
                    RpcResponse::err(id, -71, format!("Failed to record result: {}", e))
                }
            }
        }

        "ledger.markStarted" => {
            let plan_id = match params.get("planId").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => return RpcResponse::err(id, -3, "Missing param: planId".into()),
            };
            let action_id = match params.get("actionId").and_then(|v| v.as_str()) {
                Some(a) => a,
                None => return RpcResponse::err(id, -3, "Missing param: actionId".into()),
            };

            match ledger::mark_action_started(db, plan_id, action_id) {
                Ok(()) => RpcResponse::ok(id, serde_json::json!({ "status": "started" })),
                Err(e) => RpcResponse::err(id, -72, format!("Failed to mark started: {}", e)),
            }
        }

        "ledger.completePlan" => {
            let plan_id = match params.get("planId").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => return RpcResponse::err(id, -3, "Missing param: planId".into()),
            };

            match ledger::complete_plan(db, plan_id) {
                Ok(()) => {
                    let _ = append_audit_log(
                        db,
                        "ledger",
                        "plan_completed",
                        &format!("planId={}", plan_id),
                        "info",
                    );
                    RpcResponse::ok(id, serde_json::json!({ "status": "completed" }))
                }
                Err(e) => RpcResponse::err(id, -73, format!("Failed to complete plan: {}", e)),
            }
        }

        "ledger.query" => {
            let plan_id = params.get("planId").and_then(|v| v.as_str());

            // If planId given, query that plan. Otherwise query the active plan.
            let target_plan_id = if let Some(pid) = plan_id {
                pid.to_string()
            } else {
                match ledger::load_active_plan(db) {
                    Ok(Some(plan)) => plan.id,
                    Ok(None) => return RpcResponse::ok(id, serde_json::Value::Null),
                    Err(e) => {
                        return RpcResponse::err(
                            id,
                            -74,
                            format!("Failed to find active plan: {}", e),
                        )
                    }
                }
            };

            let include_ledger = params
                .get("includeLedger")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            match ledger::query_plan_journal_state(db, &target_plan_id) {
                Ok(mut state) => {
                    if include_ledger {
                        if let Ok(entries) = ledger::query_ledger_entries(db, &target_plan_id) {
                            if let Some(obj) = state.as_object_mut() {
                                obj.insert("ledgerEvents".to_string(), serde_json::json!(entries));
                            }
                        }
                    }
                    RpcResponse::ok(id, state)
                }
                Err(e) => RpcResponse::err(id, -74, format!("Ledger query failed: {}", e)),
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

/// Resolve the playbook directory across packaged and dev layouts.
fn resolve_playbook_dir() -> Option<std::path::PathBuf> {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    if let Ok(from_env) = std::env::var("REDCORE_PLAYBOOK_DIR") {
        candidates.push(std::path::PathBuf::from(from_env));
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("playbooks"));
            candidates.push(parent.join("resources").join("playbooks"));
            candidates.push(parent.join("..").join("resources").join("playbooks"));
            candidates.push(
                parent
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("..")
                    .join("playbooks"),
            );
        }
    }

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("playbooks"));
        candidates.push(cwd.join("resources").join("playbooks"));
        candidates.push(cwd.join("..").join("playbooks"));
    }

    candidates.push(std::path::PathBuf::from("playbooks"));

    let default_dir = crate::playbook::default_playbook_dir();
    candidates.push(default_dir);

    for candidate in candidates {
        if candidate.exists() {
            return candidate.canonicalize().ok().or(Some(candidate));
        }
    }

    None
}

// ─── Helpers ────────────────────────────────────────────────────────────────

fn append_audit_log(
    db: &Database,
    category: &str,
    action: &str,
    detail: &str,
    severity: &str,
) -> anyhow::Result<()> {
    let audit_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![audit_id, now, category, action, detail, severity],
    )?;
    Ok(())
}

async fn schedule_system_reboot(
    reason: &str,
    reboot_context: Option<RpcRebootJournalContext>,
) -> anyhow::Result<serde_json::Value> {
    let safe_reason = reason
        .chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let safe_reason = if safe_reason.is_empty() {
        "playbook-reboot-required".to_string()
    } else {
        safe_reason.chars().take(120).collect()
    };

    let plan_id = reboot_context
        .as_ref()
        .map(|c| c.plan_id.clone())
        .unwrap_or_else(|| "reboot".to_string());
    let package_id = reboot_context.as_ref().map(|c| c.package_id.clone());
    let package_role = reboot_context.as_ref().map(|c| c.package_role.clone());

    #[cfg(windows)]
    {
        let status = Command::new("shutdown.exe")
            .args(["/r", "/t", "0", "/f", "/c", &safe_reason])
            .status()
            .await?;

        if !status.success() {
            anyhow::bail!("shutdown.exe exited with status {}", status);
        }

        return Ok(serde_json::json!({
            "status": "scheduled",
            "reason": safe_reason,
            "planId": plan_id,
            "packageId": package_id,
            "packageRole": package_role,
        }));
    }

    #[cfg(not(windows))]
    {
        Ok(serde_json::json!({
            "status": "simulated",
            "reason": safe_reason,
            "planId": plan_id,
            "packageId": package_id,
            "packageRole": package_role,
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
    let data: String =
        db.conn()
            .query_row("SELECT data FROM assessments WHERE id = ?1", [id], |row| {
                row.get(0)
            })?;
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
    let confidence = classification["confidence"].as_f64().unwrap_or(0.0);
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
    let fallback_id = uuid::Uuid::new_v4().to_string();
    let id = plan["id"].as_str().unwrap_or(&fallback_id).to_string();
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

fn query_audit_log(db: &Database, limit: usize) -> anyhow::Result<Vec<serde_json::Value>> {
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
