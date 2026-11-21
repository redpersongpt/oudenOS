// ─── Action Executor ────────────────────────────────────────────────────────
// Applies tuning actions with pre-flight checks, a rollback snapshot taken
// BEFORE any change, native registry/service APIs, and audit logging.
//
// Per change the executor decides one of:
//   applied  — the change was made (and verified for registry writes)
//   skipped  — nothing was changed; `reason` says why (already_configured,
//              access_denied_protected, not_found, protected_target, …)
//   failed   — the change failed; everything already applied is rolled back
// A failed pre-flight (e.g. a snapshot read error) aborts before any change.

use crate::db::Database;
use crate::engine::ActionExecutionContract;
use crate::playbook::{FileRename, PlaybookAction, RegistryChange};
use crate::powershell;
use crate::registry::{self, Hive, RegKind, RegValue};
use crate::rollback;
use serde_json::Value;
pub(crate) fn is_shell_coupled_package(package_name: &str) -> bool {
    // These packages own Explorer, Start, taskbar, or shell-adjacent UX.
    const SHELL_COUPLED_PACKAGES: &[&str] = &[
        "Microsoft.Windows.ShellExperienceHost",
        "Microsoft.Windows.StartMenuExperienceHost",
        "Microsoft.Windows.Search",
        "Microsoft.Windows.ContentDeliveryManager",
        "Microsoft.Windows.CloudExperienceHost",
        "Microsoft.Windows.SecHealthUI",
        "Microsoft.AAD.BrokerPlugin",
        "Microsoft.AccountsControl",
        "Microsoft.LockApp",
        "Microsoft.Windows.Apprep.ChxApp",
        "Microsoft.Windows.AssignedAccessLockApp",
        "Microsoft.Windows.ParentalControls",
        "Microsoft.Windows.PeopleExperienceHost",
        "Microsoft.Windows.PinningConfirmationDialog",
        "Microsoft.Windows.SecureAssessmentBrowser",
        "Microsoft.Windows.XGpuEjectDialog",
        "MicrosoftWindows.Client.WebExperience",
        "MicrosoftWindows.Client.CBS",
        "Microsoft.Windows.CrossDeviceResume",
        "Microsoft.MicrosoftEdge",
        "windows.immersivecontrolpanel",
        "Windows.PrintDialog",
        "Windows.CBSPreview",
        "MicrosoftWindows.UndockedDevKit",
        "NcsiUwpApp",
    ];
    // NOTE: Microsoft.549981C3F5F10 (Cortana) is deliberately NOT here. On
    // current Windows (Win10 2004+ / Win11) Search is its own package/process
    // (SearchHost.exe / SearchApp.exe), so removing the Cortana app does not
    // break the search bar — appx.remove-cortana is a legitimate debloat.

    SHELL_COUPLED_PACKAGES
        .iter()
        .any(|entry| package_name.eq_ignore_ascii_case(entry))
}

fn matches_protected_service_name(service_name: &str, protected_name: &str) -> bool {
    if service_name.eq_ignore_ascii_case(protected_name) {
        return true;
    }

    let normalized_service = service_name.to_ascii_lowercase();
    let normalized_protected = protected_name.to_ascii_lowercase();

    normalized_service
        .strip_prefix(&normalized_protected)
        .is_some_and(|suffix| suffix.starts_with('_'))
}

pub(crate) fn is_protected_service(service_name: &str) -> bool {
    // AppInfo/AppReadiness/UdkUserSvc/TimeBrokerSvc are explicitly protected
    // because older tweak packs disable them and wedge UAC, login, or shell UX.
    const PROTECTED_SERVICES: &[&str] = &[
        "DcomLaunch",
        "RpcSs",
        "RpcEptMapper",
        "DPS",
        "Themes",
        "UxSms",
        "ShellHWDetection",
        "FontCache",
        "Schedule",
        "gpsvc",
        "EventSystem",
        "ProfSvc",
        "UserManager",
        "StateRepository",
        "TokenBroker",
        "StorSvc",
        "ClipSVC",
        "AppXSvc",
        "LicenseManager",
        "BFE",
        "mpssvc",
        "NlaSvc",
        "EventLog",
        "CryptSvc",
        "DeviceInstall",
        "WpnService",
        "AppInfo",
        "AppReadiness",
        "BrokerInfrastructure",
        "TimeBrokerSvc",
        // Core OS services that wedge WMI, login, hardware, or networking if disabled.
        "Winmgmt",
        "SamSs",
        "LSM",
        "Power",
        "PlugPlay",
        "Dnscache",
        "CoreMessagingRegistrar",
    ];
    const PROTECTED_SERVICE_TEMPLATES: &[&str] = &["UdkUserSvc"];

    PROTECTED_SERVICES
        .iter()
        .any(|entry| service_name.eq_ignore_ascii_case(entry))
        || PROTECTED_SERVICE_TEMPLATES
            .iter()
            .any(|entry| matches_protected_service_name(service_name, entry))
}

/// Block writes to a small set of catastrophic, shell-critical registry targets
/// regardless of which playbook requested them. These keys decide what Windows
/// launches as the user's shell / login process; clobbering them can leave the
/// machine with no desktop after reboot. This is defense-in-depth: the shipped
/// playbooks never touch these, but a malformed or custom playbook could.
pub(crate) fn is_protected_registry_target(path: &str, value_name: &str) -> bool {
    let path_lower = path.to_ascii_lowercase();
    // Winlogon `Shell` / `Userinit` define the interactive shell and logon chain.
    if path_lower.contains("winlogon")
        && (value_name.eq_ignore_ascii_case("Shell")
            || value_name.eq_ignore_ascii_case("Userinit"))
    {
        return true;
    }
    // Image File Execution Options "Debugger" on a shell host hijacks the
    // process at launch — a classic way to brick Explorer / Search / Start /
    // Task Manager. Cover Explorer + Task Manager + the Search / Start / shell
    // host processes (SearchHost is the Win11 search UI, SearchApp the Win10 one).
    if path_lower.contains("image file execution options")
        && value_name.eq_ignore_ascii_case("Debugger")
        && (path_lower.ends_with("\\explorer.exe")
            || path_lower.ends_with("\\sihost.exe")
            || path_lower.ends_with("\\taskmgr.exe")
            || path_lower.ends_with("\\searchhost.exe")
            || path_lower.ends_with("\\searchapp.exe")
            || path_lower.ends_with("\\startmenuexperiencehost.exe")
            || path_lower.ends_with("\\shellexperiencehost.exe"))
    {
        return true;
    }
    // A registry write to ...\Services\<name>\Start can disable a service
    // WITHOUT going through the structured service guard (is_protected_service).
    // Block any `Start` write that targets a shell-critical service, so a raw
    // registry tweak can't quietly disable e.g. RpcSs / DcomLaunch / AppXSvc the
    // way GPU-vendor services are disabled via Start=4. (WSearch is intentionally
    // not protected — disabling it degrades search, it never bricks the shell.)
    if value_name.eq_ignore_ascii_case("Start") {
        if let Some(service) = service_name_from_registry_path(&path_lower) {
            if is_protected_service(&service) {
                return true;
            }
        }
    }
    false
}

/// Extract the service name from a `...\services\<name>` registry path (the
/// first segment after the last `\services\`). Returns None if the path is not
/// under a Services key. Input is expected already lowercased.
fn service_name_from_registry_path(path_lower: &str) -> Option<String> {
    let idx = path_lower.rfind("\\services\\")?;
    let rest = &path_lower[idx + "\\services\\".len()..];
    let name = rest.split('\\').next().unwrap_or("");
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

/// True if any mutation in this action targets a shell-critical service, a
/// shell-coupled package, or a catastrophic registry key. A profile must never
/// be able to escalate such an action into the Included set; the resolver
/// consults this, and these apply-time guards remain the authoritative last
/// line of defense regardless.
pub(crate) fn action_hits_protected_target(action: &PlaybookAction) -> bool {
    action
        .service_changes
        .iter()
        .any(|change| is_protected_service(&change.name))
        || action
            .packages
            .iter()
            .any(|package| is_shell_coupled_package(package))
        || action
            .registry_changes
            .iter()
            .any(|change| is_protected_registry_target(&change.path, &change.value_name))
}


/// Actions the service refuses to execute (removed for Windows stability).
/// The resolver marks them Blocked("retired") and execute.applyAction rejects them.
pub(crate) fn is_retired_unsafe_action(action_id: &str) -> bool {
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

// ─── Native command helper ──────────────────────────────────────────────────

/// Run a native executable (bcdedit/powercfg) with a timeout; no shell.
pub(crate) fn run_native(program: &str, args: &[String]) -> anyhow::Result<powershell::PsResult> {
    let mut cmd = std::process::Command::new(program);
    cmd.args(args)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    powershell::run_with_timeout(cmd, powershell::DEFAULT_TIMEOUT, program)
}

// ─── Shell health (native) ──────────────────────────────────────────────────

const SHELL_CRITICAL_SERVICES: &[&str] = &[
    "Themes",
    "AppXSvc",
    "RpcSs",
    "DcomLaunch",
    "ProfSvc",
    "Winmgmt",
    "StateRepository",
    "UserManager",
];

/// Post-apply shell health gate (P0: oudenOS must never leave Windows with a
/// broken shell): shell-critical services must not be Disabled. Native SCM
/// queries (~ms). An inconclusive probe is treated as healthy.
fn check_shell_health() -> (bool, String) {
    let mut bad = Vec::new();
    for name in SHELL_CRITICAL_SERVICES {
        if let Ok(Some(state)) = crate::services::query(name) {
            if state.start_type == "Disabled" {
                bad.push(format!("{} disabled", name));
            }
        }
    }
    if bad.is_empty() {
        (true, "shell healthy".to_string())
    } else {
        (false, format!("UNHEALTHY: {}", bad.join(", ")))
    }
}

// ─── Status helpers ─────────────────────────────────────────────────────────

/// Final status before rollback handling.
///  * failed > 0            → "failed" (rollback decides the final word)
///  * only skips            → "skipped"
///  * applied + skipped     → "partial"  (NEW meaning: applied with skips)
///  * applied only          → "success"
pub(crate) fn compute_status(succeeded: u32, skipped: u32, failed: u32) -> &'static str {
    if failed > 0 {
        "failed"
    } else if succeeded == 0 && skipped > 0 {
        "skipped"
    } else if succeeded > 0 && skipped > 0 {
        "partial"
    } else {
        "success"
    }
}

/// Status after an auto-rollback: "rolled_back" only when the restore
/// itself reported success; anything else is "rollback_failed".
pub(crate) fn status_after_rollback(restore: &anyhow::Result<Value>) -> &'static str {
    match restore {
        Ok(result) if result.get("status").and_then(Value::as_str) == Some("success") => "rolled_back",
        _ => "rollback_failed",
    }
}

fn skipped_entry(kind: &str, extra: Value, reason: &str, note: &str) -> Value {
    let mut entry = serde_json::json!({
        "type": kind,
        "status": "skipped",
        "reason": reason,
        "note": note,
    });
    if let (Some(obj), Some(extra)) = (entry.as_object_mut(), extra.as_object()) {
        for (k, v) in extra {
            obj.insert(k.clone(), v.clone());
        }
    }
    entry
}

// ─── Registry planning ──────────────────────────────────────────────────────

#[derive(Debug, Clone)]
enum RegOp {
    Write(RegValue),
    Delete,
}

#[derive(Debug, Clone)]
struct PlannedRegistry {
    hive: Hive,
    path: String,
    name: String,
    op: RegOp,
    display_path: String,
    snapshot_index: usize,
}

#[derive(Debug)]
enum RegPlan {
    Skip { reason: &'static str, note: String },
    Apply { op: RegOp, previous: rollback::PreviousValue },
}

/// Decide what to do with one registry change. Reads the current value with
/// its real type; a failed read is an error (the action aborts before any
/// change instead of snapshotting "absent" and deleting the value on rollback).
fn plan_registry_change(change: &RegistryChange, action_id: &str) -> anyhow::Result<(Hive, String, RegPlan)> {
    let hive = registry::normalize_hive(&change.hive)?;
    let path = registry::normalize_subkey(&change.path)?;
    registry::validate_value_name(&change.value_name)?;

    if is_protected_registry_target(&path, &change.value_name) {
        return Ok((
            hive,
            path,
            RegPlan::Skip {
                reason: "protected_target",
                note: "Protected shell-critical registry target (e.g. Winlogon Shell/Userinit) — blocked to keep Windows bootable.".to_string(),
            },
        ));
    }

    let op = if change.delete {
        RegOp::Delete
    } else {
        let kind = RegKind::parse(&change.value_type)?;
        RegOp::Write(RegValue::from_json(kind, &change.value)?)
    };

    let current = registry::read_value(hive, &path, &change.value_name).map_err(|e| {
        anyhow::anyhow!("Could not snapshot the current value before changing it ({}); nothing was changed", e)
    })?;

    let already = match (&op, &current) {
        (RegOp::Delete, None) => true,
        (RegOp::Write(desired), Some(cur)) => desired == cur,
        _ => false,
    };
    if already {
        return Ok((
            hive,
            path,
            RegPlan::Skip {
                reason: "already_configured",
                note: "Already configured — no change made.".to_string(),
            },
        ));
    }

    let writable = registry::can_write(hive, &path)
        .map_err(|e| anyhow::anyhow!("Could not check write access ({}); nothing was changed", e))?;
    if !writable {
        return Ok((
            hive,
            path,
            RegPlan::Skip {
                reason: "access_denied_protected",
                note: "Windows protects this key (TrustedInstaller-owned or ACL-restricted); nothing was changed and nothing needs rollback.".to_string(),
            },
        ));
    }

    let created_key = match op {
        RegOp::Write(_) => registry::first_missing_key(hive, &path)
            .map_err(|e| anyhow::anyhow!("Could not inspect key ({}); nothing was changed", e))?,
        RegOp::Delete => None,
    };

    let previous = rollback::PreviousValue {
        change_type: "registry".to_string(),
        path: format!("{}\\{}", hive.as_str(), path),
        value_name: change.value_name.clone(),
        previous_value: current.as_ref().map(RegValue::to_json),
        action_id: action_id.to_string(),
        previous_kind: current.as_ref().map(|v| v.kind.as_str()),
        created_key,
    };
    Ok((hive, path, RegPlan::Apply { op, previous }))
}

fn apply_planned_registry(planned: &PlannedRegistry) -> Result<(), registry::RegError> {
    match &planned.op {
        RegOp::Write(value) => {
            registry::write_value(planned.hive, &planned.path, &planned.name, value)?;
            // Native read-back verification (cheap).
            match registry::read_value(planned.hive, &planned.path, &planned.name)? {
                Some(read) if read == *value => Ok(()),
                _ => Err(registry::RegError {
                    code: 0,
                    op: "verify",
                    target: planned.display_path.clone(),
                }),
            }
        }
        RegOp::Delete => registry::delete_value(planned.hive, &planned.path, &planned.name).map(|_| ()),
    }
}

// ─── Service planning ───────────────────────────────────────────────────────

struct PlannedService {
    name: String,
    start_type: &'static str,
    delayed: bool,
    snapshot_index: usize,
}

fn tamper_protection_on() -> bool {
    registry::read_value(Hive::Hklm, "SOFTWARE\\Microsoft\\Windows Defender\\Features", "TamperProtection")
        .ok()
        .flatten()
        .and_then(|v| v.as_u64())
        == Some(5)
}

const DEFENDER_SERVICES: &[&str] = &[
    "WinDefend",
    "WdFilter",
    "WdBoot",
    "WdNisSvc",
    "WdNisDrv",
    "SecurityHealthService",
    "wscsvc",
    "Sense",
    "MsSecCore",
];

// ─── Tasks ──────────────────────────────────────────────────────────────────

/// Outcome of a scheduled-task change.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TaskOutcome {
    Disabled,
    Enabled,
    AlreadyDisabled,
    AlreadyEnabled,
    Missing,
}

/// Decide a task change from its current state ("Missing" when absent).
pub(crate) fn plan_task(action: &str, state: &str) -> TaskOutcome {
    let enable = action.eq_ignore_ascii_case("enable");
    match (enable, state) {
        (_, "Missing") => TaskOutcome::Missing,
        (false, "Disabled") => TaskOutcome::AlreadyDisabled,
        (false, _) => TaskOutcome::Disabled,
        (true, "Disabled") => TaskOutcome::Enabled,
        (true, _) => TaskOutcome::AlreadyEnabled,
    }
}

/// Query the states of several tasks with one PowerShell call.
#[cfg(windows)]
fn query_task_states(tasks: &[crate::playbook::TaskChange]) -> anyhow::Result<Vec<String>> {
    if tasks.is_empty() {
        return Ok(Vec::new());
    }
    let mut script = String::new();
    for (index, task) in tasks.iter().enumerate() {
        script.push_str(&format!(
            "$t = Get-ScheduledTask -TaskName {} -TaskPath {} -ErrorAction SilentlyContinue; \
             if ($t) {{ Write-Output ('STATE:{}:' + [string]$t.State) }} else {{ Write-Output 'STATE:{}:Missing' }}; ",
            powershell::ps_quote(&task.name)?,
            powershell::ps_quote(&task.path)?,
            index,
            index
        ));
    }
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Could not read scheduled task state: {}", result.stderr.trim());
    }
    let mut states = vec![String::new(); tasks.len()];
    for line in result.stdout.lines() {
        if let Some(rest) = line.trim().strip_prefix("STATE:") {
            if let Some((idx, state)) = rest.split_once(':') {
                if let Ok(i) = idx.parse::<usize>() {
                    if i < states.len() {
                        states[i] = state.trim().to_string();
                    }
                }
            }
        }
    }
    if states.iter().any(String::is_empty) {
        anyhow::bail!("Could not read scheduled task state (incomplete output)");
    }
    Ok(states)
}

#[cfg(not(windows))]
fn query_task_states(tasks: &[crate::playbook::TaskChange]) -> anyhow::Result<Vec<String>> {
    Ok(tasks.iter().map(|_| "Ready".to_string()).collect())
}

#[cfg(windows)]
fn set_task_enabled(name: &str, path: &str, enable: bool) -> anyhow::Result<()> {
    let script = format!(
        "{} -TaskName {} -TaskPath {} | Out-Null",
        if enable { "Enable-ScheduledTask" } else { "Disable-ScheduledTask" },
        powershell::ps_quote(name)?,
        powershell::ps_quote(path)?,
    );
    let result = powershell::execute_mutation(&script)?;
    if !result.success {
        anyhow::bail!("Scheduled task change failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn set_task_enabled(name: &str, _path: &str, enable: bool) -> anyhow::Result<()> {
    tracing::info!(task = name, enable = enable, "[simulated] Would change scheduled task");
    Ok(())
}

// ─── Power / BCD helpers ────────────────────────────────────────────────────

/// Split a power setting path ("<sub>/<setting>", "SCHEME_CURRENT\SUB\SETTING")
/// into (subgroup, setting) tokens accepted by powercfg.
pub(crate) fn split_power_path(path: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = path
        .split(['/', '\\'])
        .map(str::trim)
        .filter(|p| !p.is_empty())
        .filter(|p| !p.eq_ignore_ascii_case("SCHEME_CURRENT"))
        .collect();
    if parts.len() != 2 {
        return None;
    }
    for part in &parts {
        if powershell::validate_safe_arg(part, "power setting").is_err() {
            return None;
        }
    }
    Some((parts[0].to_string(), parts[1].to_string()))
}

fn power_alias_guid(token: &str) -> String {
    match token.to_ascii_uppercase().as_str() {
        "SUB_PROCESSOR" => "54533251-82be-4824-96c1-47b60b740d00".to_string(),
        "PROCTHROTTLEMIN" => "893dee8e-2bef-41e0-89c6-b55d0929964c".to_string(),
        "PROCTHROTTLEMAX" => "bc5038f7-23e0-4960-96da-33abaf5935ec".to_string(),
        "SUB_SLEEP" => "238c9fa8-0aad-41ed-83f4-97be242c8f20".to_string(),
        "SUB_USB" => "2a737441-1930-4402-8d77-b2bebba308a3".to_string(),
        "SUB_PCIEXPRESS" => "501a4d13-42af-4429-9fd1-a8218c268e20".to_string(),
        other => other.to_ascii_lowercase(),
    }
}

/// Read the AC setting index of the active scheme from the registry (no
/// localized `powercfg /query` text parsing).
fn read_power_ac_index(setting_path: &str) -> Option<u64> {
    let (sub, setting) = split_power_path(setting_path)?;
    let (sub, setting) = (power_alias_guid(&sub), power_alias_guid(&setting));
    let schemes = "SYSTEM\\CurrentControlSet\\Control\\Power\\User\\PowerSchemes";
    let active = registry::read_value(Hive::Hklm, schemes, "ActivePowerScheme")
        .ok()
        .flatten()?
        .as_str()?
        .to_ascii_lowercase();
    let user_key = format!("{}\\{}\\{}\\{}", schemes, active, sub, setting);
    if let Some(v) = registry::read_value(Hive::Hklm, &user_key, "ACSettingIndex").ok().flatten() {
        return v.as_u64();
    }
    let default_key = format!(
        "SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\{}\\{}\\DefaultPowerSchemeValues\\{}",
        sub, setting, active
    );
    registry::read_value(Hive::Hklm, &default_key, "ACSettingIndex")
        .ok()
        .flatten()
        .and_then(|v| v.as_u64())
}

/// Normalize a BCD value as printed by `bcdedit /enum` (localized booleans:
/// Turkish prints Evet/Hayır) to the canonical tokens bcdedit accepts.
pub(crate) fn normalize_bcd_value(raw: &str) -> String {
    let lower = raw.trim().to_lowercase();
    const YES: &[&str] = &["yes", "evet", "ja", "oui", "sí", "si", "sim", "да", "tak", "igen", "ano", "kyllä", "on", "true"];
    const NO: &[&str] = &["no", "hayır", "hayir", "nein", "non", "não", "nao", "нет", "nie", "nem", "ne", "ei", "off", "false"];
    if YES.contains(&lower.as_str()) {
        "Yes".to_string()
    } else if NO.contains(&lower.as_str()) {
        "No".to_string()
    } else {
        raw.trim().to_string()
    }
}

/// Extract an element's value from `bcdedit /enum {current}` output by exact
/// first-token match (no substring matching).
pub(crate) fn parse_bcd_element(output: &str, element: &str) -> Option<String> {
    output.lines().find_map(|line| {
        let mut tokens = line.split_whitespace();
        let first = tokens.next()?;
        if first.eq_ignore_ascii_case(element) {
            let rest: Vec<&str> = tokens.collect();
            if rest.is_empty() {
                None
            } else {
                Some(normalize_bcd_value(&rest.join(" ")))
            }
        } else {
            None
        }
    })
}

#[cfg(windows)]
fn read_bcd_value(element: &str) -> anyhow::Result<Option<String>> {
    powershell::validate_safe_arg(element, "BCD element")?;
    let result = run_native("bcdedit.exe", &["/enum".to_string(), "{current}".to_string()])?;
    if !result.success {
        anyhow::bail!("bcdedit /enum failed");
    }
    Ok(parse_bcd_element(&result.stdout, element))
}

#[cfg(not(windows))]
fn read_bcd_value(_element: &str) -> anyhow::Result<Option<String>> {
    Ok(None)
}

#[cfg(windows)]
fn apply_bcd_change(element: &str, new_value: &str) -> anyhow::Result<()> {
    powershell::validate_safe_arg(element, "BCD element")?;
    powershell::validate_safe_arg(new_value, "BCD value")?;
    let result = run_native(
        "bcdedit.exe",
        &["/set".to_string(), "{current}".to_string(), element.to_string(), new_value.to_string()],
    )?;
    if !result.success {
        anyhow::bail!("bcdedit failed (exit {}): {}", result.exit_code, result.stdout.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn apply_bcd_change(_element: &str, _new_value: &str) -> anyhow::Result<()> {
    tracing::info!("[simulated] BCD change");
    Ok(())
}

#[cfg(windows)]
fn apply_power_change(setting_path: &str, new_value: &str) -> anyhow::Result<()> {
    let (sub, setting) = split_power_path(setting_path)
        .ok_or_else(|| anyhow::anyhow!("Invalid power setting path: {}", setting_path))?;
    powershell::validate_safe_arg(new_value, "power value")?;
    let result = run_native(
        "powercfg.exe",
        &["/setacvalueindex".to_string(), "SCHEME_CURRENT".into(), sub, setting, new_value.to_string()],
    )?;
    if !result.success {
        anyhow::bail!("powercfg failed (exit {}): {}", result.exit_code, result.stdout.trim());
    }
    let _ = run_native("powercfg.exe", &["/setactive".to_string(), "SCHEME_CURRENT".into()]);
    Ok(())
}

#[cfg(not(windows))]
fn apply_power_change(setting_path: &str, _new_value: &str) -> anyhow::Result<()> {
    split_power_path(setting_path)
        .ok_or_else(|| anyhow::anyhow!("Invalid power setting path: {}", setting_path))?;
    tracing::info!("[simulated] Power change");
    Ok(())
}

// ─── AppX / PowerShell / file renames ───────────────────────────────────────

/// `Ok(true)` removed, `Ok(false)` deliberately skipped / not installed.
#[cfg(windows)]
fn remove_appx_package(package_name: &str) -> anyhow::Result<bool> {
    if is_shell_coupled_package(package_name) {
        return Ok(false);
    }
    let script = format!(
        "$pkg = Get-AppxPackage -AllUsers -Name {} -ErrorAction SilentlyContinue; \
         if (-not $pkg) {{ Write-Output 'SKIPPED: package not installed'; exit 0 }}; \
         $pkg | Remove-AppxPackage -AllUsers; \
         Write-Output 'OK: package removed'",
        powershell::ps_quote(package_name)?,
    );
    let result = powershell::execute_mutation_with_timeout(&script, powershell::LONG_TIMEOUT)?;
    if !result.success {
        anyhow::bail!("Remove-AppxPackage failed: {}", result.stderr.trim());
    }
    Ok(!result.stdout.contains("SKIPPED"))
}

#[cfg(not(windows))]
fn remove_appx_package(package_name: &str) -> anyhow::Result<bool> {
    Ok(!is_shell_coupled_package(package_name))
}

#[cfg(windows)]
fn execute_ps_command(script: &str) -> anyhow::Result<()> {
    // Playbook-authored commands are system mutations: Stop on first error.
    let result = powershell::execute_mutation_with_timeout(script, powershell::LONG_TIMEOUT)?;
    if !result.success {
        anyhow::bail!("PS command failed: {}", result.stderr.trim());
    }
    Ok(())
}

#[cfg(not(windows))]
fn execute_ps_command(_script: &str) -> anyhow::Result<()> {
    tracing::info!("[simulated] PS command");
    Ok(())
}

/// `Ok(true)` renamed, `Ok(false)` skipped (source missing / target exists).
#[cfg(windows)]
fn apply_file_rename(change: &FileRename) -> anyhow::Result<bool> {
    let source = powershell::ps_quote(&change.source)?;
    let target = powershell::ps_quote(&change.target)?;
    let script = format!(
        "if (-not (Test-Path -LiteralPath {s})) {{ Write-Output 'SKIPPED: source not found'; exit 0 }}; \
         if (Test-Path -LiteralPath {t}) {{ Write-Output 'SKIPPED: target already exists'; exit 0 }}; \
         Move-Item -LiteralPath {s} -Destination {t} -Force; \
         Write-Output 'OK: file renamed'",
        s = source,
        t = target,
    );
    let result = powershell::execute_with_privilege(&script, change.requires_trusted_installer)?;
    if !result.success {
        anyhow::bail!("File rename failed: {}", result.stderr.trim());
    }
    Ok(!result.stdout.contains("SKIPPED"))
}

#[cfg(not(windows))]
fn apply_file_rename(_change: &FileRename) -> anyhow::Result<bool> {
    Ok(true)
}

/// cpuVendor gate for file renames ("Intel"/"AMD"); unknown vendor = skip.
pub(crate) fn rename_vendor_applies(required: Option<&str>, detected: Option<&str>) -> bool {
    match required {
        None => true,
        Some(req) => detected.is_some_and(|d| d.eq_ignore_ascii_case(req.trim())),
    }
}

// ─── Placeholder expansion ──────────────────────────────────────────────────

fn resolve_registry_changes(registry_changes: &[RegistryChange]) -> anyhow::Result<Vec<RegistryChange>> {
    let mut resolved: Vec<RegistryChange> = Vec::new();
    for change in registry_changes {
        resolved.extend(resolve_registry_change(change)?);
    }
    Ok(resolved)
}

#[cfg(windows)]
fn resolve_registry_change(change: &RegistryChange) -> anyhow::Result<Vec<RegistryChange>> {
    let path = change.path.as_str();
    if !path.contains('<') {
        return Ok(vec![change.clone()]);
    }
    if path.contains("<Interface GUID>") {
        return expand_registry_template(change, "<Interface GUID>", &resolve_active_interface_guids()?);
    }
    if path.contains("<Adapter Index>") {
        return expand_registry_template(change, "<Adapter Index>", &resolve_active_adapter_indices()?);
    }
    if path.contains("<GPU Device ID>\\<Instance>") {
        return expand_registry_template(change, "<GPU Device ID>\\<Instance>", &resolve_display_pci_instances()?);
    }
    if path.contains("<device>\\<instance>") {
        return expand_registry_template(change, "<device>\\<instance>", &resolve_scsi_disk_instances()?);
    }
    anyhow::bail!("Unsupported registry placeholder path: {}", path)
}

#[cfg(not(windows))]
fn resolve_registry_change(change: &RegistryChange) -> anyhow::Result<Vec<RegistryChange>> {
    Ok(vec![change.clone()])
}

#[cfg(windows)]
fn expand_registry_template(
    change: &RegistryChange,
    token: &str,
    replacements: &[String],
) -> anyhow::Result<Vec<RegistryChange>> {
    if replacements.is_empty() {
        anyhow::bail!("No runtime targets resolved for placeholder {}", token);
    }
    Ok(replacements
        .iter()
        .map(|replacement| {
            let mut resolved = change.clone();
            resolved.path = change.path.replace(token, replacement);
            resolved
        })
        .collect())
}

#[cfg(windows)]
fn parse_nonempty_lines(stdout: &str) -> Vec<String> {
    stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        // Placeholder values become registry path components: refuse anything odd.
        .filter(|line| !line.contains('\'') && !line.contains(".."))
        .map(ToOwned::to_owned)
        .collect()
}

/// Culture-invariant adapter filter (PowerShell `-match` follows the current
/// culture, e.g. tr-TR dotted/dotless I).
#[cfg(windows)]
const PHYSICAL_ADAPTER_FILTER: &str = "$_.Status -eq 'Up' -and $_.HardwareInterface -eq $true -and -not [regex]::IsMatch([string]$_.InterfaceDescription, 'Virtual|Hyper-V|VPN|Loopback', [Text.RegularExpressions.RegexOptions]'IgnoreCase, CultureInvariant')";

#[cfg(windows)]
fn resolve_active_interface_guids() -> anyhow::Result<Vec<String>> {
    let script = format!(
        "Get-NetAdapter | Where-Object {{ {} }} | Select-Object -ExpandProperty InterfaceGuid | ForEach-Object {{ \
            $guid = [string]$_; \
            if ($guid -and -not $guid.StartsWith('{{')) {{ '{{' + $guid.Trim('{{}}') + '}}' }} else {{ $guid }} \
        }}",
        PHYSICAL_ADAPTER_FILTER
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve active NIC GUIDs: {}", result.stderr.trim());
    }
    let guids = parse_nonempty_lines(&result.stdout);
    if guids.is_empty() {
        anyhow::bail!("No active physical NIC GUIDs found");
    }
    Ok(guids)
}

#[cfg(windows)]
fn resolve_active_adapter_indices() -> anyhow::Result<Vec<String>> {
    let script = format!(
        "$wanted = Get-NetAdapter | Where-Object {{ {} }} | Select-Object -ExpandProperty InterfaceGuid | ForEach-Object {{ ([string]$_).Trim('{{}}') }}; \
         $classRoot = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{{4d36e972-e325-11ce-bfc1-08002be10318}}'; \
         foreach ($key in Get-ChildItem $classRoot -ErrorAction SilentlyContinue) {{ \
            $props = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue; \
            $instance = [string]$props.NetCfgInstanceId; \
            if ($instance -and ($wanted -contains $instance.Trim('{{}}'))) {{ $key.PSChildName }} \
         }}",
        PHYSICAL_ADAPTER_FILTER
    );
    let result = powershell::execute(&script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve active adapter indices: {}", result.stderr.trim());
    }
    let indices = parse_nonempty_lines(&result.stdout);
    if indices.is_empty() {
        anyhow::bail!("No active adapter registry indices found");
    }
    Ok(indices)
}

#[cfg(windows)]
fn resolve_display_pci_instances() -> anyhow::Result<Vec<String>> {
    let script = "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty PNPDeviceID | \
        Where-Object { $_ -like 'PCI\\*' } | ForEach-Object { $_.Substring(4) }";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve display PCI instances: {}", result.stderr.trim());
    }
    let instances = parse_nonempty_lines(&result.stdout);
    if instances.is_empty() {
        anyhow::bail!("No physical display PCI instances found");
    }
    Ok(instances)
}

#[cfg(windows)]
fn resolve_scsi_disk_instances() -> anyhow::Result<Vec<String>> {
    let script = "Get-CimInstance Win32_DiskDrive | Select-Object -ExpandProperty PNPDeviceID | \
        Where-Object { $_ -like 'SCSI\\*' } | ForEach-Object { $_.Substring(5) }";
    let result = powershell::execute(script)?;
    if !result.success {
        anyhow::bail!("Failed to resolve SCSI disk instances: {}", result.stderr.trim());
    }
    let instances = parse_nonempty_lines(&result.stdout);
    if instances.is_empty() {
        anyhow::bail!("No SCSI-backed disk instances found");
    }
    Ok(instances)
}

// ─── Verification read-back (IPC) ───────────────────────────────────────────

/// Read a registry value for the verification IPC. Hive is allowlisted; the
/// result carries the value and its kind.
pub fn read_registry_value_public(hive: &str, path: &str, value_name: &str) -> anyhow::Result<Option<(Value, String)>> {
    let hive = registry::normalize_hive(hive)?;
    let path = registry::normalize_subkey(path)?;
    registry::validate_value_name(value_name)?;
    Ok(registry::read_value(hive, &path, value_name)?.map(|v| (v.to_json(), v.kind.as_str())))
}

// ─── Main entry point ───────────────────────────────────────────────────────

struct Counters {
    succeeded: u32,
    skipped: u32,
    failed: u32,
    results: Vec<Value>,
    applied_indices: Vec<usize>,
}

/// Execute a tuning action: pre-flight + snapshot (in one DB transaction)
/// BEFORE any change, then apply; on failure, auto-rollback exactly the
/// changes that were applied.
pub fn execute_action(
    db: &Database,
    action_id: &str,
    action_data: &Value,
    audit_context: Option<&str>,
) -> anyhow::Result<Value> {
    tracing::info!(action_id = action_id, "Executing action");

    let contract = ActionExecutionContract::from_value(action_data)?;

    if contract.manual_only {
        let now = chrono::Utc::now().to_rfc3339();
        let audit_id = uuid::Uuid::new_v4().to_string();
        db.conn().execute(
            "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
             VALUES (?1, ?2, 'executor', 'manual_action_recorded', ?3, 'info')",
            rusqlite::params![
                audit_id,
                now,
                format!(
                    "Manual review action '{}' recorded with no automatic mutation{}",
                    action_id,
                    audit_context.map(|detail| format!(" · {}", detail)).unwrap_or_default()
                ),
            ],
        )?;

        return Ok(serde_json::json!({
            "actionId": action_id,
            "actionType": "manual",
            "snapshotId": null,
            "rollbackSnapshotId": null,
            "status": "success",
            "succeeded": 0,
            "skipped": 0,
            "failed": 0,
            "results": [{
                "type": "manual",
                "status": "success",
                "note": "Manual review action recorded only. No automatic system mutation was performed."
            }],
        }));
    }

    let action_type = contract.execution_mode.clone();
    let mut c = Counters {
        succeeded: 0,
        skipped: 0,
        failed: 0,
        results: Vec::new(),
        applied_indices: Vec::new(),
    };
    let mut previous_values: Vec<rollback::PreviousValue> = Vec::new();
    let mut preflight_error: Option<String> = None;

    // ── Phase 1: pre-flight + snapshot reads (no system change yet) ──────

    let mut planned_registry: Vec<PlannedRegistry> = Vec::new();
    match resolve_registry_changes(&contract.registry_changes) {
        Err(e) => preflight_error = Some(e.to_string()),
        Ok(changes) => {
            for change in &changes {
                let display = format!("{}\\{}", change.hive, change.path);
                match plan_registry_change(change, action_id) {
                    Ok((_, _, RegPlan::Skip { reason, note })) => {
                        c.skipped += 1;
                        c.results.push(skipped_entry(
                            "registry",
                            serde_json::json!({ "path": display, "valueName": change.value_name }),
                            reason,
                            &note,
                        ));
                    }
                    Ok((hive, path, RegPlan::Apply { op, previous })) => {
                        previous_values.push(previous);
                        planned_registry.push(PlannedRegistry {
                            hive,
                            display_path: format!("{}\\{}", hive.as_str(), path),
                            path,
                            name: change.value_name.clone(),
                            op,
                            snapshot_index: previous_values.len() - 1,
                        });
                    }
                    Err(e) => {
                        preflight_error = Some(format!("{}\\{}: {}", display, change.value_name, e));
                        break;
                    }
                }
            }
        }
    }

    let mut planned_services: Vec<PlannedService> = Vec::new();
    if preflight_error.is_none() {
        for change in &contract.service_changes {
            let name = change.name.as_str();
            let entry = serde_json::json!({ "service": name, "startupType": change.startup_type });
            if name.is_empty() || name.chars().any(|ch| ch.is_control() || ch == '\\' || ch == '/') {
                preflight_error = Some(format!("Invalid service name '{}'", name));
                break;
            }
            if is_protected_service(name) {
                c.skipped += 1;
                c.results.push(skipped_entry("service", entry, "protected_service", "Protected system service — no change made."));
                continue;
            }
            let Some(desired) = crate::services::normalize_start_type(&change.startup_type) else {
                preflight_error = Some(format!("Unsupported startup type '{}' for {}", change.startup_type, name));
                break;
            };
            if DEFENDER_SERVICES.iter().any(|d| d.eq_ignore_ascii_case(name)) && tamper_protection_on() {
                c.skipped += 1;
                c.results.push(skipped_entry("service", entry, "tamper_protection", "Tamper Protection is ON — disable it manually in Windows Security first."));
                continue;
            }
            match crate::services::query(name) {
                Ok(None) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry("service", entry, "not_found", "Service is not installed — no change made."));
                }
                Err(crate::services::SvcError::AccessDenied) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry("service", entry, "access_denied_protected", "Windows protects this service; nothing was changed."));
                }
                Err(e) => {
                    preflight_error = Some(format!("Could not read service {} ({}); nothing was changed", name, e));
                    break;
                }
                Ok(Some(state)) if state.matches(desired) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry("service", entry, "already_configured", "Already configured — no change made."));
                }
                Ok(Some(state)) => {
                    previous_values.push(rollback::PreviousValue {
                        change_type: "service".to_string(),
                        path: name.to_string(),
                        value_name: "StartupType".to_string(),
                        previous_value: Some(serde_json::to_value(&state)?),
                        action_id: action_id.to_string(),
                        ..Default::default()
                    });
                    planned_services.push(PlannedService {
                        name: name.to_string(),
                        start_type: if desired == "AutomaticDelayedStart" { "Automatic" } else { desired },
                        delayed: desired == "AutomaticDelayedStart",
                        snapshot_index: previous_values.len() - 1,
                    });
                }
            }
        }
    }

    // Tasks: one PowerShell call reads every task's real state.
    let mut planned_tasks: Vec<(usize, bool, usize)> = Vec::new(); // (task index, enable, snapshot idx)
    if preflight_error.is_none() && !contract.tasks.is_empty() {
        match query_task_states(&contract.tasks) {
            Err(e) => preflight_error = Some(e.to_string()),
            Ok(states) => {
                for (index, (task, state)) in contract.tasks.iter().zip(states.iter()).enumerate() {
                    let entry = serde_json::json!({ "taskName": task.name, "taskPath": task.path });
                    match plan_task(&task.action, state) {
                        TaskOutcome::Missing => {
                            c.skipped += 1;
                            c.results.push(skipped_entry("task_disable", entry, "not_found", "Scheduled task not present — no change made."));
                        }
                        TaskOutcome::AlreadyDisabled | TaskOutcome::AlreadyEnabled => {
                            c.skipped += 1;
                            c.results.push(skipped_entry("task_disable", entry, "already_configured", "Already configured — no change made."));
                        }
                        outcome => {
                            let enable = outcome == TaskOutcome::Enabled;
                            previous_values.push(rollback::PreviousValue {
                                change_type: "task".to_string(),
                                path: task.path.clone(),
                                value_name: task.name.clone(),
                                previous_value: Some(serde_json::json!({
                                    "state": state,
                                    "applied": if enable { "enable" } else { "disable" },
                                })),
                                action_id: action_id.to_string(),
                                ..Default::default()
                            });
                            planned_tasks.push((index, enable, previous_values.len() - 1));
                        }
                    }
                }
            }
        }
    }

    // AppX: removal cannot be undone; the snapshot records a note.
    let mut planned_packages: Vec<(String, usize)> = Vec::new();
    if preflight_error.is_none() {
        for pkg in &contract.packages {
            if pkg.chars().any(|ch| ch.is_control()) {
                preflight_error = Some(format!("Invalid package name '{}'", pkg));
                break;
            }
            if is_shell_coupled_package(pkg) {
                c.skipped += 1;
                c.results.push(skipped_entry(
                    "appx_remove",
                    serde_json::json!({ "package": pkg }),
                    "protected_package",
                    "Protected/shell-coupled package — no change made.",
                ));
                continue;
            }
            previous_values.push(rollback::PreviousValue {
                change_type: "appx".to_string(),
                path: pkg.to_string(),
                previous_value: Some(Value::String("installed".to_string())),
                action_id: action_id.to_string(),
                ..Default::default()
            });
            planned_packages.push((pkg.to_string(), previous_values.len() - 1));
        }
    }

    // BCD
    let mut planned_bcd: Vec<(usize, usize)> = Vec::new();
    if preflight_error.is_none() {
        for (index, change) in contract.bcd_changes.iter().enumerate() {
            match read_bcd_value(&change.element) {
                Err(e) => {
                    preflight_error = Some(format!("Could not read BCD element {}: {}", change.element, e));
                    break;
                }
                Ok(current) => {
                    let desired = normalize_bcd_value(&change.new_value);
                    if current.as_deref().map(|v| v.eq_ignore_ascii_case(&desired)) == Some(true) {
                        c.skipped += 1;
                        c.results.push(skipped_entry(
                            "bcd",
                            serde_json::json!({ "element": change.element, "newValue": change.new_value }),
                            "already_configured",
                            "Already configured — no change made.",
                        ));
                        continue;
                    }
                    previous_values.push(rollback::PreviousValue {
                        change_type: "bcd".to_string(),
                        path: "bcd".to_string(),
                        value_name: change.element.clone(),
                        previous_value: current.map(Value::String),
                        action_id: action_id.to_string(),
                        ..Default::default()
                    });
                    planned_bcd.push((index, previous_values.len() - 1));
                }
            }
        }
    }

    // Power
    let mut planned_power: Vec<(usize, usize)> = Vec::new();
    if preflight_error.is_none() {
        for (index, change) in contract.power_changes.iter().enumerate() {
            if split_power_path(&change.setting_path).is_none() {
                preflight_error = Some(format!("Invalid power setting path: {}", change.setting_path));
                break;
            }
            let current = read_power_ac_index(&change.setting_path);
            if current.is_some() && current.map(|v| v.to_string()) == Some(change.new_value.trim().to_string()) {
                c.skipped += 1;
                c.results.push(skipped_entry(
                    "power",
                    serde_json::json!({ "settingPath": change.setting_path, "newValue": change.new_value }),
                    "already_configured",
                    "Already configured — no change made.",
                ));
                continue;
            }
            previous_values.push(rollback::PreviousValue {
                change_type: "power".to_string(),
                path: change.setting_path.clone(),
                value_name: "value".to_string(),
                previous_value: current.map(|ac| serde_json::json!({ "ac": ac })),
                action_id: action_id.to_string(),
                ..Default::default()
            });
            planned_power.push((index, previous_values.len() - 1));
        }
    }

    // File renames (cpuVendor-gated)
    let mut planned_renames: Vec<(usize, usize)> = Vec::new();
    if preflight_error.is_none() && !contract.file_renames.is_empty() {
        let cpu = crate::facts::current_facts().cpu_vendor;
        for (index, rename) in contract.file_renames.iter().enumerate() {
            if !rename_vendor_applies(rename.cpu_vendor.as_deref(), cpu.as_deref()) {
                c.skipped += 1;
                c.results.push(skipped_entry(
                    "file_rename",
                    serde_json::json!({ "source": rename.source, "target": rename.target }),
                    "hardware_not_applicable",
                    &format!(
                        "Only applies to {} CPUs (detected: {}).",
                        rename.cpu_vendor.as_deref().unwrap_or("?"),
                        cpu.as_deref().unwrap_or("unknown")
                    ),
                ));
                continue;
            }
            previous_values.push(rollback::PreviousValue {
                change_type: "file_rename".to_string(),
                path: rename.source.clone(),
                value_name: rename.target.clone(),
                previous_value: Some(serde_json::json!({
                    "sourceExisted": std::path::Path::new(&rename.source).exists(),
                    "targetExisted": std::path::Path::new(&rename.target).exists(),
                    "requiresTrustedInstaller": rename.requires_trusted_installer,
                })),
                action_id: action_id.to_string(),
                ..Default::default()
            });
            planned_renames.push((index, previous_values.len() - 1));
        }
    }

    // Pre-flight failure: nothing was changed, nothing to roll back.
    if let Some(error) = preflight_error {
        tracing::error!(action_id = action_id, error = error.as_str(), "Pre-flight failed — no change made");
        c.failed += 1;
        c.results.push(serde_json::json!({
            "type": "preflight",
            "status": "failed",
            "reason": "preflight_failed",
            "error": error,
            "note": "Nothing was changed.",
        }));
        return record_outcome(db, action_id, &action_type, &contract, None, "failed", &c, audit_context, None);
    }

    // ── Phase 2: snapshot BEFORE making changes (one transaction) ───────

    let snapshot_id = if previous_values.is_empty() {
        None
    } else {
        Some(rollback::create_snapshot(
            db,
            &format!("action:{}", action_id),
            &format!("Pre-execution snapshot for action '{}'", action_id),
            &previous_values,
        )?)
    };

    // ── Phase 3: apply (stop on first failure) ───────────────────────────

    let mut touched_services = false;
    'apply: {
        for (pkg, idx) in &planned_packages {
            match remove_appx_package(pkg) {
                Ok(true) => {
                    touched_services = true;
                    c.succeeded += 1;
                    c.applied_indices.push(*idx);
                    c.results.push(serde_json::json!({ "type": "appx_remove", "package": pkg, "status": "success" }));
                }
                Ok(false) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry("appx_remove", serde_json::json!({ "package": pkg }), "not_found", "Package not installed — no change made."));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "appx_remove", "package": pkg, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }

        for (task_index, enable, idx) in &planned_tasks {
            let task = &contract.tasks[*task_index];
            match set_task_enabled(&task.name, &task.path, *enable) {
                Ok(()) => {
                    c.succeeded += 1;
                    c.applied_indices.push(*idx);
                    c.results.push(serde_json::json!({
                        "type": "task_disable",
                        "taskName": task.name,
                        "taskPath": task.path,
                        "action": if *enable { "enable" } else { "disable" },
                        "status": "success",
                    }));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "task_disable", "taskName": task.name, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }

        for planned in &planned_registry {
            match apply_planned_registry(planned) {
                Ok(()) => {
                    if planned.path.to_ascii_lowercase().contains("\\services\\") {
                        touched_services = true;
                    }
                    c.succeeded += 1;
                    c.applied_indices.push(planned.snapshot_index);
                    c.results.push(serde_json::json!({
                        "type": "registry",
                        "path": planned.display_path,
                        "valueName": planned.name,
                        "operation": if matches!(planned.op, RegOp::Delete) { "delete" } else { "write" },
                        "status": "success",
                    }));
                }
                Err(e) if e.is_access_denied() => {
                    // e.g. UCPD-protected TaskbarDa: Windows refused the
                    // write, so nothing changed for this value.
                    c.skipped += 1;
                    c.results.push(skipped_entry(
                        "registry",
                        serde_json::json!({ "path": planned.display_path, "valueName": planned.name }),
                        "access_denied_protected",
                        "Windows refused this change (protected value, e.g. by the UCPD driver); nothing was changed.",
                    ));
                }
                Err(e) => {
                    c.failed += 1;
                    // A failed write may still have created the key: let rollback prune it.
                    c.applied_indices.push(planned.snapshot_index);
                    c.results.push(serde_json::json!({
                        "type": "registry",
                        "path": planned.display_path,
                        "valueName": planned.name,
                        "status": "failed",
                        "error": e.to_string(),
                    }));
                    break 'apply;
                }
            }
        }

        for planned in &planned_services {
            match crate::services::set_start_type(&planned.name, planned.start_type, planned.delayed) {
                Ok(()) => {
                    touched_services = true;
                    c.succeeded += 1;
                    c.applied_indices.push(planned.snapshot_index);
                    if planned.start_type == "Disabled" {
                        let _ = crate::services::request_stop(&planned.name);
                    }
                    c.results.push(serde_json::json!({
                        "type": "service",
                        "service": planned.name,
                        "startupType": planned.start_type,
                        "status": "success",
                    }));
                }
                Err(crate::services::SvcError::AccessDenied) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry(
                        "service",
                        serde_json::json!({ "service": planned.name, "startupType": planned.start_type }),
                        "access_denied_protected",
                        "Windows protects this service; nothing was changed.",
                    ));
                }
                Err(crate::services::SvcError::NotFound) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry(
                        "service",
                        serde_json::json!({ "service": planned.name }),
                        "not_found",
                        "Service is not installed — no change made.",
                    ));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "service", "service": planned.name, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }

        for (index, idx) in &planned_bcd {
            let change = &contract.bcd_changes[*index];
            match apply_bcd_change(&change.element, &change.new_value) {
                Ok(()) => {
                    c.succeeded += 1;
                    c.applied_indices.push(*idx);
                    c.results.push(serde_json::json!({ "type": "bcd", "element": change.element, "newValue": change.new_value, "status": "success" }));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "bcd", "element": change.element, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }

        for (index, idx) in &planned_power {
            let change = &contract.power_changes[*index];
            match apply_power_change(&change.setting_path, &change.new_value) {
                Ok(()) => {
                    c.succeeded += 1;
                    c.applied_indices.push(*idx);
                    c.results.push(serde_json::json!({ "type": "power", "settingPath": change.setting_path, "newValue": change.new_value, "status": "success" }));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "power", "settingPath": change.setting_path, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }

        for script in &contract.powershell_commands {
            if script.trim().is_empty() {
                continue;
            }
            let preview: String = script.chars().take(80).collect();
            match execute_ps_command(script) {
                Ok(()) => {
                    c.succeeded += 1;
                    c.results.push(serde_json::json!({ "type": "powershell", "command": preview, "status": "success" }));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "powershell", "command": preview, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }

        for (index, idx) in &planned_renames {
            let rename = &contract.file_renames[*index];
            match apply_file_rename(rename) {
                Ok(true) => {
                    c.succeeded += 1;
                    c.applied_indices.push(*idx);
                    c.results.push(serde_json::json!({ "type": "file_rename", "source": rename.source, "target": rename.target, "status": "success" }));
                }
                Ok(false) => {
                    c.skipped += 1;
                    c.results.push(skipped_entry(
                        "file_rename",
                        serde_json::json!({ "source": rename.source, "target": rename.target }),
                        "already_configured",
                        "Source missing or target already present — no change made.",
                    ));
                }
                Err(e) => {
                    c.failed += 1;
                    c.results.push(serde_json::json!({ "type": "file_rename", "source": rename.source, "target": rename.target, "status": "failed", "error": e.to_string() }));
                    break 'apply;
                }
            }
        }
    }

    // ── Phase 3.5: shell health gate (native; only when services/AppX or
    //    a Services\* registry key were touched) ──────────────────────────
    if touched_services && c.failed == 0 {
        let (healthy, detail) = check_shell_health();
        if healthy {
            c.results.push(serde_json::json!({ "type": "shell_health", "status": "success", "note": detail }));
        } else {
            c.failed += 1;
            tracing::error!(action_id = action_id, detail = detail.as_str(), "Shell health check FAILED — forcing rollback");
            c.results.push(serde_json::json!({ "type": "shell_health", "status": "failed", "error": detail }));
        }
    }

    // ── Phase 4/5: status + auto-rollback of exactly what was applied ────
    let mut status = compute_status(c.succeeded, c.skipped, c.failed);
    let mut rollback_result: Option<Value> = None;
    if c.failed > 0 {
        if let (Some(snapshot_id), false) = (&snapshot_id, c.applied_indices.is_empty()) {
            tracing::warn!(action_id = action_id, "Auto-rolling back after failure");
            let restore = rollback::restore_snapshot_entries(db, snapshot_id, Some(&c.applied_indices));
            status = status_after_rollback(&restore);
            let entry = match &restore {
                Ok(result) => serde_json::json!({
                    "type": "auto_rollback",
                    "snapshotId": snapshot_id,
                    "status": if status == "rolled_back" { "success" } else { "failed" },
                    "restoreStatus": result.get("status"),
                    "details": result.get("details"),
                    "error": if status == "rolled_back" { Value::Null } else { Value::String("One or more changes could not be restored — see details".into()) },
                }),
                Err(e) => serde_json::json!({
                    "type": "auto_rollback",
                    "snapshotId": snapshot_id,
                    "status": "failed",
                    "error": e.to_string(),
                }),
            };
            rollback_result = Some(entry.clone());
            c.results.push(entry);
        } else {
            status = "failed";
        }
    }

    record_outcome(db, action_id, &action_type, &contract, snapshot_id.as_deref(), status, &c, audit_context, rollback_result)
}

fn record_outcome(
    db: &Database,
    action_id: &str,
    action_type: &str,
    contract: &ActionExecutionContract,
    snapshot_id: Option<&str>,
    status: &str,
    c: &Counters,
    audit_context: Option<&str>,
    rollback_result: Option<Value>,
) -> anyhow::Result<Value> {
    let now = chrono::Utc::now().to_rfc3339();
    // First failing step's error, surfaced at top level for the UI.
    let first_error = c
        .results
        .iter()
        .find(|r| r.get("status").and_then(Value::as_str) == Some("failed"))
        .and_then(|r| r.get("error").and_then(Value::as_str))
        .map(str::to_string);
    let outcome_data = serde_json::json!({
        "actionId": action_id,
        "actionType": action_type,
        "contractVersion": contract.contract_version,
        "executionMode": contract.execution_mode,
        "privilegeRequirements": contract.privilege_requirements,
        "rollbackBoundary": contract.rollback_boundary,
        "mutationSummary": contract.mutation_summary,
        "snapshotId": snapshot_id,
        "rollbackSnapshotId": snapshot_id,
        "status": status,
        "succeeded": c.succeeded,
        "skipped": c.skipped,
        "failed": c.failed,
        "error": first_error,
        "nothingChanged": c.applied_indices.is_empty() && c.succeeded == 0,
        "rollback": rollback_result,
        "results": c.results,
    });

    let tx = db.conn().unchecked_transaction()?;
    db.conn().execute(
        "INSERT INTO audit_log (id, timestamp, category, action, detail, severity)
         VALUES (?1, ?2, 'executor', 'action_executed', ?3, ?4)",
        rusqlite::params![
            uuid::Uuid::new_v4().to_string(),
            now,
            format!(
                "Action '{}' (type={}): {} succeeded, {} skipped, {} failed, status={}",
                action_id, action_type, c.succeeded, c.skipped, c.failed, status
            ) + &audit_context.map(|detail| format!(" · {}", detail)).unwrap_or_default(),
            if matches!(status, "failed" | "rolled_back" | "rollback_failed") { "error" } else { "info" },
        ],
    )?;
    db.conn().execute(
        "INSERT INTO action_outcomes (id, action_id, status, applied_at, data)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            uuid::Uuid::new_v4().to_string(),
            action_id,
            status,
            now,
            serde_json::to_string(&outcome_data)?,
        ],
    )?;
    tx.commit()?;

    tracing::info!(
        action_id = action_id,
        status = status,
        succeeded = c.succeeded,
        skipped = c.skipped,
        failed = c.failed,
        "Action execution complete"
    );
    Ok(outcome_data)
}

#[cfg(test)]
mod tests {
    use super::{is_protected_registry_target, is_protected_service, is_shell_coupled_package};

    #[test]
    fn shell_coupled_packages_stay_blocked() {
        // The FULL shell-coupled package set. Asserting every entry locks the
        // list against accidental shrinkage: removing any name from the const
        // makes is_shell_coupled_package() return false for it and fails here.
        for pkg in [
            "Microsoft.Windows.ShellExperienceHost",
            "Microsoft.Windows.StartMenuExperienceHost",
            "Microsoft.Windows.Search",
            "Microsoft.Windows.ContentDeliveryManager",
            "Microsoft.Windows.CloudExperienceHost",
            "Microsoft.Windows.SecHealthUI",
            "Microsoft.AAD.BrokerPlugin",
            "Microsoft.AccountsControl",
            "Microsoft.LockApp",
            "Microsoft.Windows.Apprep.ChxApp",
            "Microsoft.Windows.AssignedAccessLockApp",
            "Microsoft.Windows.ParentalControls",
            "Microsoft.Windows.PeopleExperienceHost",
            "Microsoft.Windows.PinningConfirmationDialog",
            "Microsoft.Windows.SecureAssessmentBrowser",
            "Microsoft.Windows.XGpuEjectDialog",
            "MicrosoftWindows.Client.WebExperience",
            "MicrosoftWindows.Client.CBS",
            "Microsoft.Windows.CrossDeviceResume",
            "Microsoft.MicrosoftEdge",
            "windows.immersivecontrolpanel",
            "Windows.PrintDialog",
            "Windows.CBSPreview",
            "MicrosoftWindows.UndockedDevKit",
            "NcsiUwpApp",
        ] {
            assert!(
                is_shell_coupled_package(pkg),
                "{pkg} must stay shell-coupled (blocked)"
            );
        }
        // Case-insensitive match still holds.
        assert!(is_shell_coupled_package(
            "microsoft.windows.shellexperiencehost"
        ));
        // A normal app must NOT be treated as shell-coupled.
        assert!(!is_shell_coupled_package("Microsoft.WindowsCalculator"));
    }

    #[test]
    fn protected_services_cover_shell_login_regressions() {
        assert!(is_protected_service("AppXSvc"));
        assert!(is_protected_service("AppInfo"));
        assert!(is_protected_service("AppReadiness"));
        assert!(is_protected_service("TimeBrokerSvc"));
        assert!(is_protected_service("UdkUserSvc_12345"));
        assert!(!is_protected_service("WSearch"));
    }

    #[test]
    fn hard_protected_shell_services_are_all_covered() {
        // The full shell/login/AppX-infrastructure set that must never be
        // disabled by oudenOS. Every entry of PROTECTED_SERVICES is asserted so
        // the list is locked against accidental shrinkage: dropping any name
        // from the const makes is_protected_service() return false for it and
        // fails here. (explorer.exe / SearchHost / RuntimeBroker /
        // ApplicationFrameHost are processes, not services — guarded by the
        // post-apply shell health check, not this list.)
        for svc in [
            "DcomLaunch",
            "RpcSs",
            "RpcEptMapper",
            "DPS",
            "Themes",
            "UxSms",
            "ShellHWDetection",
            "FontCache",
            "Schedule",
            "gpsvc",
            "EventSystem",
            "ProfSvc",
            "UserManager",
            "StateRepository",
            "TokenBroker",
            "StorSvc",
            "ClipSVC",
            "AppXSvc",
            "LicenseManager",
            "BFE",
            "mpssvc",
            "NlaSvc",
            "EventLog",
            "CryptSvc",
            "DeviceInstall",
            "WpnService",
            "AppInfo",
            "AppReadiness",
            "BrokerInfrastructure",
            "TimeBrokerSvc",
            "Winmgmt",
            "SamSs",
            "LSM",
            "Power",
            "PlugPlay",
            "Dnscache",
            "CoreMessagingRegistrar",
        ] {
            assert!(is_protected_service(svc), "{svc} must be hard-protected");
        }
        // Per-user service template instances (suffixed) stay protected too.
        assert!(is_protected_service("UdkUserSvc_4a2b1"));
    }

    #[test]
    fn catastrophic_registry_targets_are_blocked() {
        // Shell / login hijack vectors must be blocked regardless of playbook.
        assert!(is_protected_registry_target(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon",
            "Shell"
        ));
        assert!(is_protected_registry_target(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon",
            "Userinit"
        ));
        assert!(is_protected_registry_target(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\explorer.exe",
            "Debugger"
        ));
        // IFEO Debugger on the Search / Start / shell hosts must also be blocked.
        for host in [
            "searchhost.exe",
            "searchapp.exe",
            "startmenuexperiencehost.exe",
            "shellexperiencehost.exe",
        ] {
            assert!(
                is_protected_registry_target(
                    &format!(
                        r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\{host}"
                    ),
                    "Debugger"
                ),
                "IFEO Debugger on {host} must be blocked"
            );
        }
        // Registry-based service disable (Start=) must be blocked for protected
        // services — a registry tweak cannot bypass is_protected_service.
        assert!(is_protected_registry_target(
            r"SYSTEM\CurrentControlSet\Services\DcomLaunch",
            "Start"
        ));
        assert!(is_protected_registry_target(
            r"SYSTEM\CurrentControlSet\Services\RpcSs",
            "Start"
        ));
        // Benign, legitimate tweaks must NOT be blocked.
        assert!(!is_protected_registry_target(
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced",
            "HideFileExt"
        ));
        assert!(!is_protected_registry_target(
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon",
            "AutoAdminLogon"
        ));
        // Disabling a NON-protected service via Start= stays allowed (GPU vendor
        // services, WSearch — these degrade/optimize, they never brick the shell).
        assert!(!is_protected_registry_target(
            r"SYSTEM\CurrentControlSet\Services\GpuEnergyDrv",
            "Start"
        ));
        assert!(!is_protected_registry_target(
            r"SYSTEM\CurrentControlSet\Services\WSearch",
            "Start"
        ));
    }

    #[test]
    fn cortana_removal_is_not_shell_coupled() {
        // On current Windows (Win10 2004+ / Win11) Search is decoupled from
        // Cortana (SearchHost/SearchApp), so removing the Cortana app does NOT
        // break the search bar. appx.remove-cortana must stay allowed.
        assert!(!is_shell_coupled_package("Microsoft.549981C3F5F10"));
    }
}


#[cfg(test)]
mod native_tests {
    use super::*;
    use crate::registry::{read_value, write_value, Hive, RegData, RegKind, RegValue};

    /// Scratch key under HKCU\Software (real registry on Windows, mock elsewhere);
    /// removed on drop.
    struct ScratchKey(String);
    impl ScratchKey {
        fn new(tag: &str) -> Self {
            ScratchKey(format!("Software\\OudenOSTest-{}-{}", tag, uuid::Uuid::new_v4().simple()))
        }
        fn path(&self, sub: &str) -> String {
            if sub.is_empty() {
                self.0.clone()
            } else {
                format!("{}\\{}", self.0, sub)
            }
        }
    }
    impl Drop for ScratchKey {
        fn drop(&mut self) {
            // Best-effort recursive cleanup of the scratch tree.
            for sub in ["Sub\\Deep", "Sub", "New\\Deep", "New", ""] {
                let path = self.path(sub);
                for name in ["Keep", "New", "Style", "Gone", "V"] {
                    let _ = crate::registry::delete_value(Hive::Hkcu, &path, name);
                }
                let _ = crate::registry::delete_key_if_empty(Hive::Hkcu, &path);
            }
        }
    }

    fn action(id: &str, changes: Value) -> Value {
        serde_json::json!({
            "id": id,
            "name": id,
            "description": "test",
            "registryChanges": changes,
        })
    }

    fn snapshot_of(outcome: &Value) -> String {
        outcome["snapshotId"].as_str().expect("snapshot id").to_string()
    }

    #[test]
    fn write_does_not_wipe_existing_values_or_subkeys() {
        let db = Database::open_in_memory().unwrap();
        let key = ScratchKey::new("nowipe");
        write_value(Hive::Hkcu, &key.path(""), "Keep", &RegValue::dword(7)).unwrap();
        write_value(Hive::Hkcu, &key.path("Sub"), "V", &RegValue::string("x")).unwrap();

        let outcome = execute_action(
            &db,
            "test.nowipe",
            &action(
                "test.nowipe",
                serde_json::json!([{ "hive": "HKCU", "path": key.path(""), "valueName": "New", "value": 1, "valueType": "DWord" }]),
            ),
            None,
        )
        .unwrap();
        assert_eq!(outcome["status"], "success", "{outcome}");
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Keep").unwrap(), Some(RegValue::dword(7)));
        assert_eq!(read_value(Hive::Hkcu, &key.path("Sub"), "V").unwrap(), Some(RegValue::string("x")));
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "New").unwrap(), Some(RegValue::dword(1)));

        // Second run: already configured → skipped, no write, no snapshot.
        let again = execute_action(
            &db,
            "test.nowipe",
            &action(
                "test.nowipe",
                serde_json::json!([{ "hive": "HKCU", "path": key.path(""), "valueName": "New", "value": 1, "valueType": "DWord" }]),
            ),
            None,
        )
        .unwrap();
        assert_eq!(again["status"], "skipped", "{again}");
        assert_eq!(again["results"][0]["reason"], "already_configured");
        assert!(again["snapshotId"].is_null());
    }

    #[test]
    fn rollback_restores_original_type() {
        let db = Database::open_in_memory().unwrap();
        let key = ScratchKey::new("types");
        // REG_SZ "10" (like HKCU\Control Panel\Desktop\WallpaperStyle).
        write_value(Hive::Hkcu, &key.path(""), "Style", &RegValue::string("10")).unwrap();
        let expand = RegValue { kind: RegKind::ExpandString, data: RegData::Str("%SystemRoot%\\x".into()) };
        write_value(Hive::Hkcu, &key.path(""), "Keep", &expand).unwrap();

        let outcome = execute_action(
            &db,
            "test.types",
            &action(
                "test.types",
                serde_json::json!([
                    { "hive": "HKCU", "path": key.path(""), "valueName": "Style", "value": 0, "valueType": "DWord" },
                    { "hive": "HKCU", "path": key.path(""), "valueName": "Keep", "value": "plain", "valueType": "String" }
                ]),
            ),
            None,
        )
        .unwrap();
        assert_eq!(outcome["status"], "success", "{outcome}");
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Style").unwrap(), Some(RegValue::dword(0)));

        let restored = rollback::restore_snapshot(&db, &snapshot_of(&outcome)).unwrap();
        assert_eq!(restored["status"], "success", "{restored}");
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Style").unwrap(), Some(RegValue::string("10")));
        // Unexpanded REG_EXPAND_SZ comes back byte-identical.
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Keep").unwrap(), Some(expand));
    }

    #[test]
    fn rollback_deletes_created_value_and_created_keys_only() {
        let db = Database::open_in_memory().unwrap();
        let key = ScratchKey::new("created");
        write_value(Hive::Hkcu, &key.path(""), "Keep", &RegValue::dword(1)).unwrap();

        let outcome = execute_action(
            &db,
            "test.created",
            &action(
                "test.created",
                serde_json::json!([{ "hive": "HKCU", "path": key.path("New\\Deep"), "valueName": "New", "value": "v", "valueType": "String" }]),
            ),
            None,
        )
        .unwrap();
        assert_eq!(outcome["status"], "success", "{outcome}");
        assert!(crate::registry::key_exists(Hive::Hkcu, &key.path("New\\Deep")).unwrap());

        rollback::restore_snapshot(&db, &snapshot_of(&outcome)).unwrap();
        assert_eq!(read_value(Hive::Hkcu, &key.path("New\\Deep"), "New").unwrap(), None);
        assert!(!crate::registry::key_exists(Hive::Hkcu, &key.path("New\\Deep")).unwrap());
        assert!(!crate::registry::key_exists(Hive::Hkcu, &key.path("New")).unwrap());
        // The pre-existing key and its value survive.
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Keep").unwrap(), Some(RegValue::dword(1)));
    }

    #[test]
    fn delete_entries_delete_and_rollback_restores_with_type() {
        let db = Database::open_in_memory().unwrap();
        let key = ScratchKey::new("delete");
        let multi = RegValue { kind: RegKind::MultiString, data: RegData::Multi(vec!["a".into(), "b".into()]) };
        write_value(Hive::Hkcu, &key.path(""), "Gone", &multi).unwrap();

        let changes = serde_json::json!([{ "hive": "HKCU", "path": key.path(""), "valueName": "Gone", "delete": true }]);
        let outcome = execute_action(&db, "test.delete", &action("test.delete", changes.clone()), None).unwrap();
        assert_eq!(outcome["status"], "success", "{outcome}");
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Gone").unwrap(), None);

        // Absent value → skipped "already_configured".
        let again = execute_action(&db, "test.delete", &action("test.delete", changes), None).unwrap();
        assert_eq!(again["status"], "skipped");

        rollback::restore_snapshot(&db, &snapshot_of(&outcome)).unwrap();
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Gone").unwrap(), Some(multi));
    }

    /// Value-level ERROR_ACCESS_DENIED after a successful pre-flight (UCPD
    /// style, injected): that entry is skipped, the others apply, no rollback.
    #[test]
    fn value_level_access_denied_is_skipped_and_action_is_partial() {
        let db = Database::open_in_memory().unwrap();
        let key = ScratchKey::new("ucpd");
        crate::registry::test_hooks::deny_write(Hive::Hkcu, &key.path(""), "Style");
        let outcome = execute_action(
            &db,
            "test.ucpd",
            &action(
                "test.ucpd",
                serde_json::json!([
                    { "hive": "HKCU", "path": key.path(""), "valueName": "Style", "value": 0, "valueType": "DWord" },
                    { "hive": "HKCU", "path": key.path(""), "valueName": "New", "value": 1, "valueType": "DWord" }
                ]),
            ),
            None,
        )
        .unwrap();
        let only_denied = execute_action(
            &db,
            "test.ucpd-only",
            &action(
                "test.ucpd-only",
                serde_json::json!([{ "hive": "HKCU", "path": key.path(""), "valueName": "Style", "value": 0, "valueType": "DWord" }]),
            ),
            None,
        )
        .unwrap();
        crate::registry::test_hooks::allow_write(Hive::Hkcu, &key.path(""), "Style");

        assert_eq!(outcome["status"], "partial", "{outcome}");
        assert_eq!(outcome["failed"], 0);
        assert_eq!(outcome["succeeded"], 1);
        assert_eq!(outcome["skipped"], 1);
        let denied = outcome["results"]
            .as_array()
            .unwrap()
            .iter()
            .find(|r| r["valueName"] == "Style")
            .unwrap();
        assert_eq!(denied["status"], "skipped");
        assert_eq!(denied["reason"], "access_denied_protected");
        assert!(outcome["rollback"].is_null(), "no rollback for a protected value");
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "New").unwrap(), Some(RegValue::dword(1)));
        assert_eq!(read_value(Hive::Hkcu, &key.path(""), "Style").unwrap(), None);

        assert_eq!(only_denied["status"], "skipped", "{only_denied}");
        assert_eq!(only_denied["failed"], 0);
    }

    #[test]
    fn invalid_hive_fails_preflight_without_changes() {
        let db = Database::open_in_memory().unwrap();
        let outcome = execute_action(
            &db,
            "test.badhive",
            &action(
                "test.badhive",
                serde_json::json!([{ "hive": "HKCU'; calc; '", "path": "Software\\X", "valueName": "V", "value": 1, "valueType": "DWord" }]),
            ),
            None,
        )
        .unwrap();
        assert_eq!(outcome["status"], "failed");
        assert_eq!(outcome["nothingChanged"], true);
        assert!(outcome["snapshotId"].is_null());
    }

    /// Measures a registry-only action through the native path versus the old
    /// PowerShell path (read spawn + write spawn). Run with --nocapture to see
    /// the numbers.
    #[cfg(windows)]
    #[test]
    fn registry_only_action_timing_native_vs_powershell() {
        let db = Database::open_in_memory().unwrap();
        let key = ScratchKey::new("timing");
        let runs = 5u32;
        let started = std::time::Instant::now();
        for i in 0..runs {
            let outcome = execute_action(
                &db,
                "test.timing",
                &action(
                    "test.timing",
                    serde_json::json!([{ "hive": "HKCU", "path": key.path(""), "valueName": "New", "value": i, "valueType": "DWord" }]),
                ),
                None,
            )
            .unwrap();
            assert!(outcome["status"] == "success" || outcome["status"] == "skipped");
        }
        let native_ms = started.elapsed().as_secs_f64() * 1000.0 / runs as f64;

        // Old path: one PowerShell spawn to read, one to write (without the
        // destructive New-Item -Force), plus the old per-action health spawn.
        let ps_path = format!("Registry::HKCU\\{}", key.path(""));
        let started = std::time::Instant::now();
        for i in 0..2u32 {
            let _ = powershell::execute(&format!("(Get-ItemProperty -Path '{}' -Name 'New' -ErrorAction SilentlyContinue).New", ps_path));
            let _ = powershell::execute(&format!("Set-ItemProperty -Path '{}' -Name 'New' -Value {} -Type DWord -Force", ps_path, i + 100));
            let _ = powershell::execute("Get-Service -Name Themes,AppXSvc,RpcSs,DcomLaunch,ProfSvc,Winmgmt,StateRepository,UserManager -ErrorAction SilentlyContinue | Out-Null");
        }
        let ps_ms = started.elapsed().as_secs_f64() * 1000.0 / 2.0;
        println!("TIMING registry-only action: native {:.1} ms/action, old PowerShell path {:.1} ms/action", native_ms, ps_ms);
        assert!(native_ms < ps_ms, "native path should be faster ({native_ms} vs {ps_ms})");
    }

    #[test]
    fn status_helpers() {
        assert_eq!(compute_status(2, 0, 0), "success");
        assert_eq!(compute_status(0, 3, 0), "skipped");
        assert_eq!(compute_status(1, 1, 0), "partial");
        assert_eq!(compute_status(1, 0, 1), "failed");
        let ok: anyhow::Result<Value> = Ok(serde_json::json!({ "status": "success" }));
        let partial: anyhow::Result<Value> = Ok(serde_json::json!({ "status": "partial" }));
        let failed: anyhow::Result<Value> = Ok(serde_json::json!({ "status": "failed" }));
        let err: anyhow::Result<Value> = Err(anyhow::anyhow!("db"));
        assert_eq!(status_after_rollback(&ok), "rolled_back");
        assert_eq!(status_after_rollback(&partial), "rollback_failed");
        assert_eq!(status_after_rollback(&failed), "rollback_failed");
        assert_eq!(status_after_rollback(&err), "rollback_failed");
    }

    #[test]
    fn task_planning_uses_real_state() {
        assert_eq!(plan_task("disable", "Ready"), TaskOutcome::Disabled);
        assert_eq!(plan_task("disable", "Disabled"), TaskOutcome::AlreadyDisabled);
        assert_eq!(plan_task("disable", "Missing"), TaskOutcome::Missing);
        assert_eq!(plan_task("enable", "Disabled"), TaskOutcome::Enabled);
        assert_eq!(plan_task("enable", "Ready"), TaskOutcome::AlreadyEnabled);
    }

    #[test]
    fn bcd_values_are_locale_normalized() {
        assert_eq!(normalize_bcd_value("Evet"), "Yes");
        assert_eq!(normalize_bcd_value("Hayır"), "No");
        assert_eq!(normalize_bcd_value("Ja"), "Yes");
        assert_eq!(normalize_bcd_value("OptOut"), "OptOut");
        let output = "Windows Boot Loader\n-------------------\nidentifier              {current}\nuseplatformtick         Evet\nuseplatformclock        Hayır\n";
        assert_eq!(parse_bcd_element(output, "useplatformclock").as_deref(), Some("No"));
        assert_eq!(parse_bcd_element(output, "useplatformtick").as_deref(), Some("Yes"));
        assert_eq!(parse_bcd_element(output, "useplatform"), None);
    }

    #[test]
    fn power_paths_parse_in_both_forms() {
        assert_eq!(
            split_power_path("54533251-82be-4824-96c1-47b60b740d00/0cc5b647-c1df-4637-891a-dec35c318583"),
            Some(("54533251-82be-4824-96c1-47b60b740d00".into(), "0cc5b647-c1df-4637-891a-dec35c318583".into()))
        );
        assert_eq!(
            split_power_path("SCHEME_CURRENT\\SUB_PROCESSOR\\PROCTHROTTLEMIN"),
            Some(("SUB_PROCESSOR".into(), "PROCTHROTTLEMIN".into()))
        );
        assert_eq!(split_power_path("device_power_management"), None);
        assert_eq!(split_power_path("a;b/c"), None);
    }

    #[test]
    fn cpu_vendor_gate_for_renames() {
        assert!(rename_vendor_applies(None, None));
        assert!(rename_vendor_applies(Some("AMD"), Some("amd")));
        assert!(!rename_vendor_applies(Some("Intel"), Some("amd")));
        assert!(!rename_vendor_applies(Some("Intel"), None));
    }

    #[test]
    fn retired_list_covers_known_unsafe_actions() {
        assert!(is_retired_unsafe_action("memory.disable-compression"));
        assert!(is_retired_unsafe_action("perf.svchost-split-threshold"));
        assert!(!is_retired_unsafe_action("perf.disable-game-dvr"));
    }
}
