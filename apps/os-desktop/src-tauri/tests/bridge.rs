// Unit tests for the Tauri shell's pure helpers. The modules are compiled
// directly (no Tauri link) so the test exe starts on Windows without the
// app manifest and without elevation.

#[allow(dead_code)]
#[path = "../src/service_bridge.rs"]
mod service_bridge;
#[path = "../src/util.rs"]
mod util;

use service_bridge::{
    find_service_data_dir, parse_response_line, playbook_dir_candidates,
    service_binary_candidates, service_exe_name, timeout_for, ServiceBridge,
};
use util::{encode_log, ALLOWED_SERVICE_METHODS};
use std::path::Path;
use std::time::Duration;

#[test]
fn parses_success_and_error_lines() {
    let (id, res) = parse_response_line(r#"{"id":7,"result":{"ok":true}}"#).unwrap();
    assert_eq!(id, 7);
    assert_eq!(res.unwrap()["ok"], true);

    let (id, res) = parse_response_line(r#"{"id":8,"error":{"code":-1,"message":"boom"}}"#).unwrap();
    assert_eq!(id, 8);
    let err = res.unwrap_err();
    assert_eq!(err.message, "boom");
    assert_eq!(err.code, Some(-1));

    let (_, res) = parse_response_line(r#"{"id":10,"error":{"code":-23,"message":"Action not applicable on this system: x"}}"#).unwrap();
    assert_eq!(res.unwrap_err().code, Some(-23));

    // A serialized `"error": null` is a success, not an error.
    let (_, res) = parse_response_line(r#"{"id":9,"result":1,"error":null}"#).unwrap();
    assert!(res.is_ok());

    assert!(parse_response_line("not json").is_none());
    assert!(parse_response_line(r#"{"level":"info"}"#).is_none());
}

#[test]
fn slow_methods_get_long_timeouts() {
    assert!(timeout_for("system.createRestorePoint") >= Duration::from_secs(300));
    assert!(timeout_for("execute.applyAction") >= Duration::from_secs(300));
    assert_eq!(timeout_for("system.status"), Duration::from_secs(60));
}

#[test]
fn candidates_start_with_bundle_locations() {
    let res = Path::new("C:/bundle/resources");
    let exe = Path::new("C:/bundle");
    let svc = service_binary_candidates(res, Some(exe));
    assert_eq!(svc[0], res.join(service_exe_name()));
    assert_eq!(svc[2], exe.join(service_exe_name()));
    let pb = playbook_dir_candidates(res, Some(exe));
    assert_eq!(pb[0], res.join("playbooks"));
    // No CWD-relative "../../" candidates in any build.
    assert!(svc.iter().chain(pb.iter()).all(|p| !p.starts_with("..")));
    // Release builds never look inside the compile-time repository.
    if !cfg!(debug_assertions) {
        assert_eq!(svc.len(), 4);
        assert_eq!(pb.len(), 3);
    }
}

#[test]
fn data_dir_override_is_debug_only() {
    if cfg!(debug_assertions) {
        assert!(find_service_data_dir().is_some());
    } else {
        assert!(find_service_data_dir().is_none());
    }
}

#[test]
fn call_fails_cleanly_when_never_started() {
    let bridge = ServiceBridge::new();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_time()
        .build()
        .unwrap();
    let err = rt
        .block_on(bridge.call("system.status", serde_json::json!({})))
        .unwrap_err();
    assert!(err.message.contains("never started"), "{err}");
    assert_eq!(err.code, None);
    // The single automatic restart attempt is now used up.
    let err = rt
        .block_on(bridge.call("system.status", serde_json::json!({})))
        .unwrap_err();
    assert!(err.message.contains("could not be restarted") || err.message.contains("not running"), "{err}");
    assert!(bridge.restarted());
}

#[test]
fn log_is_bom_crlf_encoded() {
    let bytes = encode_log("═ a\nb\r\nç");
    assert_eq!(&bytes[..3], &[0xEF, 0xBB, 0xBF]);
    assert_eq!(std::str::from_utf8(&bytes[3..]).unwrap(), "═ a\r\nb\r\nç");
}

#[test]
fn allowlist_has_no_duplicates_and_keeps_undo_methods() {
    let mut v = ALLOWED_SERVICE_METHODS.to_vec();
    v.sort();
    v.dedup();
    assert_eq!(v.len(), ALLOWED_SERVICE_METHODS.len());
    for m in ["rollback.list", "rollback.restore", "personalize.revert", "system.elevationStatus"] {
        assert!(ALLOWED_SERVICE_METHODS.contains(&m), "{m}");
    }
}
