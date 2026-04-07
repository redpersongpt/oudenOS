use super::{PlaybookAction, ResolvedAction, ResolvedPlan};
use crate::engine;

#[derive(Debug, Clone, Default)]
struct SourceMetadata {
    chapter: Option<String>,
    vendor: Option<String>,
    category: Option<String>,
    link: Option<String>,
    action_id: Option<String>,
    registry_ops: Option<u32>,
    service_ops: Option<u32>,
    scheduled_task_ops: Option<u32>,
    invoke_script_ops: Option<u32>,
    undo_script_ops: Option<u32>,
    appx_ops: Option<u32>,
}

pub fn playbook_action_to_execution_json(action: &PlaybookAction) -> serde_json::Value {
    let contract = engine::ActionExecutionContract::from_playbook_action(action);
    let metadata = source_metadata(action);

    let mut json = contract.to_value();
    if let Some(obj) = json.as_object_mut() {
        obj.insert(
            "sourceChapter".to_string(),
            serde_json::json!(metadata.chapter),
        );
        obj.insert(
            "sourceVendor".to_string(),
            serde_json::json!(metadata.vendor),
        );
        obj.insert(
            "sourceCategory".to_string(),
            serde_json::json!(metadata.category),
        );
        obj.insert("sourceLink".to_string(), serde_json::json!(metadata.link));
        obj.insert(
            "sourceActionId".to_string(),
            serde_json::json!(metadata.action_id),
        );
        obj.insert(
            "sourceOperations".to_string(),
            serde_json::json!({
                "registry": metadata.registry_ops,
                "service": metadata.service_ops,
                "scheduledTask": metadata.scheduled_task_ops,
                "invokeScript": metadata.invoke_script_ops,
                "undoScript": metadata.undo_script_ops,
                "appx": metadata.appx_ops,
            }),
        );
    }
    json
}

pub(crate) fn resolved_plan_to_json(plan: &ResolvedPlan) -> serde_json::Value {
    serde_json::json!({
        "profile": plan.profile,
        "preset": plan.preset,
        "totalIncluded": plan.total_included,
        "totalBlocked": plan.total_blocked,
        "totalOptional": plan.total_optional,
        "totalExpertOnly": plan.total_expert_only,
        "resolutionTrace": serde_json::to_value(&plan.trace).unwrap_or_default(),
        "phases": plan.phases.iter().map(|phase| {
            serde_json::json!({
                "id": phase.id,
                "name": phase.name,
                "actions": phase.actions.iter().map(resolved_action_to_json).collect::<Vec<_>>(),
            })
        }).collect::<Vec<_>>(),
        "blockedReasons": plan.blocked_reasons.iter().map(|blocked| {
            serde_json::json!({
                "actionId": blocked.action_id,
                "reason": blocked.reason,
            })
        }).collect::<Vec<_>>(),
    })
}

fn resolved_action_to_json(action: &ResolvedAction) -> serde_json::Value {
    let contract = engine::ActionExecutionContract::from_playbook_action(&action.action);
    let metadata = source_metadata(&action.action);

    serde_json::json!({
        "id": action.action.id,
        "name": action.action.name,
        "description": action.action.description,
        "category": action.action.tags.first().unwrap_or(&action.action.risk),
        "risk": action.action.risk,
        "status": format!("{:?}", action.status),
        "default": action.action.default,
        "expertOnly": action.action.expert_only,
        "blockedReason": action.blocked_reason,
        "requiresReboot": action.action.requires_reboot,
        "warningMessage": action.action.warning_message,
        "executionMode": contract.execution_mode,
        "manualOnly": contract.manual_only,
        "benchmarkRequired": contract.benchmark_required,
        "contractVersion": contract.contract_version,
        "privilegeRequirements": serde_json::to_value(contract.privilege_requirements).unwrap_or_default(),
        "rollbackBoundary": serde_json::to_value(contract.rollback_boundary).unwrap_or_default(),
        "mutationSummary": serde_json::to_value(contract.mutation_summary).unwrap_or_default(),
        "mutations": serde_json::to_value(contract.mutations).unwrap_or_default(),
        "fileRenames": serde_json::to_value(contract.file_renames).unwrap_or_default(),
        "sourceChapter": metadata.chapter.unwrap_or_default(),
        "sourceVendor": metadata.vendor.unwrap_or_default(),
        "sourceCategory": metadata.category.unwrap_or_default(),
        "sourceLink": metadata.link.unwrap_or_default(),
        "sourceActionId": metadata.action_id.unwrap_or_default(),
        "sourceOperations": {
            "registry": metadata.registry_ops.unwrap_or_default(),
            "service": metadata.service_ops.unwrap_or_default(),
            "scheduledTask": metadata.scheduled_task_ops.unwrap_or_default(),
            "invokeScript": metadata.invoke_script_ops.unwrap_or_default(),
            "undoScript": metadata.undo_script_ops.unwrap_or_default(),
            "appx": metadata.appx_ops.unwrap_or_default(),
        },
    })
}

fn source_metadata(action: &PlaybookAction) -> SourceMetadata {
    SourceMetadata {
        chapter: tag_value(action, "chapter:"),
        vendor: tag_value(action, "source:"),
        category: tag_value(action, "source-category:"),
        link: tag_value(action, "source-link:"),
        action_id: tag_value(action, "source-action-id:"),
        registry_ops: parsed_tag_value(action, "source-op-registry:"),
        service_ops: parsed_tag_value(action, "source-op-service:"),
        scheduled_task_ops: parsed_tag_value(action, "source-op-scheduled-task:"),
        invoke_script_ops: parsed_tag_value(action, "source-op-invoke-script:"),
        undo_script_ops: parsed_tag_value(action, "source-op-undo-script:"),
        appx_ops: parsed_tag_value(action, "source-op-appx:"),
    }
}

fn tag_value(action: &PlaybookAction, prefix: &str) -> Option<String> {
    action
        .tags
        .iter()
        .find_map(|tag| tag.strip_prefix(prefix))
        .map(str::to_string)
}

fn parsed_tag_value(action: &PlaybookAction, prefix: &str) -> Option<u32> {
    tag_value(action, prefix).and_then(|value| value.parse::<u32>().ok())
}
