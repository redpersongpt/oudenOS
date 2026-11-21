// Pure helpers with no Tauri dependency, so tests/ can compile them directly
// (see tests/bridge.rs) without linking the WebView/comctl32 stack.

// SECURITY: Allowlist of RPC methods the renderer is permitted to invoke on
// the privileged service. Any method not in this list is rejected at the
// Tauri boundary so a compromised renderer (e.g. via XSS in playbook data)
// cannot reach arbitrary privileged handlers.
// Sync check: every entry here MUST have a handler in os-service/src/ipc.rs
// dispatch(), and every renderer invoke() call MUST be listed here.
pub const ALLOWED_SERVICE_METHODS: &[&str] = &[
    // System / status
    "system.status",
    "system.reboot",
    "system.elevationStatus",
    "system.restorePointStatus",
    "system.createRestorePoint",
    // Assessment + classification
    "assess.full",
    "classify.machine",
    // Playbook resolution
    "playbook.resolve",
    // Questionnaire
    "questionnaire.resolve",
    // Personalization
    "personalize.apply",
    "personalize.revert",
    // Execution + ledger (actionData is resolved server-side, never trusted from client)
    "execute.applyAction",
    "ledger.createPlan",
    "ledger.markStarted",
    "ledger.recordResult",
    "ledger.completePlan",
    "ledger.query",
    // Rollback (post-apply "Undo everything")
    "rollback.list",
    "rollback.restore",
    "rollback.audit",
    // Journal / reboot resume
    "journal.state",
    "journal.resume",
    "journal.cancel",
];

/// UTF-8 BOM + CRLF so Notepad / ANSI viewers show box-drawing characters and
/// Turkish text correctly.
pub fn encode_log(content: &str) -> Vec<u8> {
    let normalized = content.replace("\r\n", "\n").replace('\n', "\r\n");
    let mut bytes = Vec::with_capacity(normalized.len() + 3);
    bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    bytes.extend_from_slice(normalized.as_bytes());
    bytes
}
