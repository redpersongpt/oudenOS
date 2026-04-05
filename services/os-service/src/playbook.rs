// ─── Playbook System ────────────────────────────────────────────────────────
// Loads, parses, validates, and merges YAML playbook files into an executable
// transformation plan. This replaces the hardcoded embedded_actions() approach.
//
// Architecture:
//   manifest.yaml → phases → modules (*.yaml) → actions
//   profiles/*.yaml → blockedActions, optionalActions, preservationFlags
//   The loader produces a PlaybookPlan that the executor consumes.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};

// ─── Schema types ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    #[serde(rename = "wizardConfig")]
    pub wizard_config: Option<String>,
    #[serde(default = "default_min_build")]
    #[serde(rename = "minWindowsBuild")]
    pub min_windows_build: u32,
    #[serde(default = "default_max_build")]
    #[serde(rename = "maxWindowsBuild")]
    pub max_windows_build: u32,
    pub phases: Vec<Phase>,
    #[serde(default)]
    pub profiles: std::collections::HashMap<String, ProfileRef>,
}

fn default_min_build() -> u32 {
    19041
}
fn default_max_build() -> u32 {
    99999
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Phase {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    #[serde(rename = "type")]
    pub phase_type: Option<String>,
    #[serde(default)]
    pub modules: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileRef {
    pub label: String,
    #[serde(default)]
    pub preset: Option<String>,
    #[serde(default)]
    pub overrides: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookModule {
    pub module: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub actions: Vec<PlaybookAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookAction {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub rationale: String,
    #[serde(default = "default_risk")]
    pub risk: String,
    #[serde(default = "default_tier")]
    pub tier: String,
    #[serde(default = "default_true")]
    pub default: bool,
    #[serde(default)]
    #[serde(rename = "expertOnly")]
    pub expert_only: bool,
    #[serde(default)]
    #[serde(rename = "requiresReboot")]
    pub requires_reboot: bool,
    #[serde(default = "default_true")]
    pub reversible: bool,
    #[serde(default = "default_seconds")]
    #[serde(rename = "estimatedSeconds")]
    pub estimated_seconds: u32,
    #[serde(default)]
    #[serde(rename = "blockedProfiles")]
    pub blocked_profiles: Vec<String>,
    #[serde(default)]
    #[serde(rename = "minWindowsBuild")]
    pub min_windows_build: Option<u32>,
    #[serde(default)]
    #[serde(rename = "registryChanges")]
    pub registry_changes: Vec<RegistryChange>,
    #[serde(default)]
    #[serde(rename = "serviceChanges")]
    pub service_changes: Vec<ServiceChange>,
    #[serde(default)]
    #[serde(rename = "bcdChanges")]
    pub bcd_changes: Vec<BcdChange>,
    #[serde(default)]
    #[serde(rename = "powerChanges")]
    pub power_changes: Vec<PowerChange>,
    #[serde(default)]
    #[serde(rename = "powerShellCommands")]
    pub powershell_commands: Vec<String>,
    #[serde(default)]
    pub packages: Vec<String>,
    #[serde(default)]
    pub tasks: Vec<TaskChange>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    #[serde(rename = "warningMessage")]
    pub warning_message: Option<String>,
}

fn default_risk() -> String {
    "safe".into()
}
fn default_tier() -> String {
    "free".into()
}
fn default_true() -> bool {
    true
}
fn default_seconds() -> u32 {
    2
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryChange {
    pub hive: String,
    pub path: String,
    #[serde(rename = "valueName")]
    pub value_name: String,
    pub value: serde_json::Value,
    #[serde(rename = "valueType")]
    pub value_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceChange {
    pub name: String,
    #[serde(rename = "startupType")]
    pub startup_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BcdChange {
    pub element: String,
    #[serde(rename = "newValue")]
    pub new_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerChange {
    #[serde(rename = "settingPath")]
    pub setting_path: String,
    #[serde(rename = "newValue")]
    pub new_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskChange {
    pub name: String,
    pub path: String,
    #[serde(default = "default_disable")]
    pub action: String,
}

fn default_disable() -> String {
    "disable".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileOverride {
    pub profile: String,
    pub label: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub preset: Option<String>,
    #[serde(default)]
    #[serde(rename = "blockedActions")]
    pub blocked_actions: Vec<String>,
    #[serde(default)]
    #[serde(rename = "optionalActions")]
    pub optional_actions: Vec<String>,
    #[serde(default)]
    #[serde(rename = "preservationFlags")]
    pub preservation_flags: Vec<String>,
}

// ─── Loaded playbook (merged result) ────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct LoadedPlaybook {
    pub manifest: PlaybookManifest,
    pub phases: Vec<LoadedPhase>,
    pub total_actions: usize,
    pub profiles: Vec<ProfileOverride>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoadedPhase {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_builtin: bool,
    pub actions: Vec<PlaybookAction>,
}

// ─── Resolved plan (after profile + preset filtering) ───────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedPlan {
    pub profile: String,
    pub preset: String,
    pub phases: Vec<ResolvedPhase>,
    pub total_included: usize,
    pub total_blocked: usize,
    pub total_optional: usize,
    pub total_expert_only: usize,
    pub blocked_reasons: Vec<BlockedAction>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedPhase {
    pub id: String,
    pub name: String,
    pub actions: Vec<ResolvedAction>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResolvedAction {
    pub action: PlaybookAction,
    pub status: ActionStatus,
    pub blocked_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum ActionStatus {
    Included,   // Will be applied
    Optional,   // Available but not selected by default
    ExpertOnly, // Hidden unless expert mode
    Blocked,    // Blocked by profile
    BuildGated, // Windows version incompatible
}

#[derive(Debug, Clone, Serialize)]
pub struct BlockedAction {
    pub action_id: String,
    pub reason: String,
}

// ─── Loader ─────────────────────────────────────────────────────────────────

/// Load the playbook from a directory containing manifest.yaml + module files.
pub fn load_playbook(playbook_dir: &Path) -> anyhow::Result<LoadedPlaybook> {
    let manifest_path = playbook_dir.join("manifest.yaml");
    let manifest_text = std::fs::read_to_string(&manifest_path)
        .map_err(|e| anyhow::anyhow!("Failed to read manifest.yaml: {}", e))?;
    let manifest: PlaybookManifest = serde_yaml::from_str(&manifest_text)
        .map_err(|e| anyhow::anyhow!("Failed to parse manifest.yaml: {}", e))?;

    tracing::info!(
        name = manifest.name.as_str(),
        version = manifest.version.as_str(),
        phases = manifest.phases.len(),
        "Loading playbook"
    );

    let mut phases: Vec<LoadedPhase> = Vec::new();
    let mut total_actions = 0usize;

    for phase in &manifest.phases {
        let is_builtin = phase.phase_type.as_deref() == Some("builtin");
        let mut phase_actions: Vec<PlaybookAction> = Vec::new();

        if !is_builtin {
            for module_path in &phase.modules {
                // Guard against path traversal (e.g. "../../etc/passwd")
                if module_path.contains("..") {
                    tracing::error!(
                        path = module_path.as_str(),
                        "Playbook module path contains '..', skipping (possible path traversal)"
                    );
                    continue;
                }
                let full_path = playbook_dir.join(module_path);
                match load_module(&full_path) {
                    Ok(module) => {
                        tracing::debug!(
                            module = module.module.as_str(),
                            actions = module.actions.len(),
                            "Loaded playbook module"
                        );
                        phase_actions.extend(module.actions);
                    }
                    Err(e) => {
                        tracing::warn!(
                            path = module_path.as_str(),
                            error = %e,
                            "Failed to load playbook module — skipping"
                        );
                    }
                }
            }
        }

        total_actions += phase_actions.len();
        phases.push(LoadedPhase {
            id: phase.id.clone(),
            name: phase.name.clone(),
            description: phase.description.clone(),
            is_builtin,
            actions: phase_actions,
        });
    }

    // Load profile overrides
    let mut profiles: Vec<ProfileOverride> = Vec::new();
    for (profile_id, profile_ref) in &manifest.profiles {
        if let Some(override_path) = &profile_ref.overrides {
            let full_path = playbook_dir.join(override_path);
            match load_profile_override(&full_path) {
                Ok(mut po) => {
                    po.profile = profile_id.clone();
                    profiles.push(po);
                }
                Err(e) => {
                    tracing::warn!(
                        profile = profile_id.as_str(),
                        error = %e,
                        "Failed to load profile override"
                    );
                }
            }
        }
    }

    tracing::info!(
        total_actions = total_actions,
        phases = phases.len(),
        profiles = profiles.len(),
        "Playbook loaded"
    );

    Ok(LoadedPlaybook {
        manifest,
        phases,
        total_actions,
        profiles,
    })
}

pub fn default_playbook_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .parent()
        .unwrap()
        .join("playbooks")
}

pub fn find_action_definition(
    playbook_dir: &Path,
    action_id: &str,
) -> anyhow::Result<Option<serde_json::Value>> {
    let playbook = load_playbook(playbook_dir)?;
    let playbook_match = playbook
        .phases
        .iter()
        .flat_map(|phase| phase.actions.iter())
        .find(|action| action.id == action_id)
        .map(playbook_action_to_execution_json);

    if playbook_match.is_some() {
        return Ok(playbook_match);
    }

    Ok(guide_action_catalog()
        .into_iter()
        .find(|action| action.id == action_id)
        .map(|action| playbook_action_to_execution_json(&action)))
}

pub fn playbook_action_to_execution_json(action: &PlaybookAction) -> serde_json::Value {
    let manual_only = action.tags.iter().any(|tag| tag == "manual-only");
    let benchmark_required = action.tags.iter().any(|tag| tag == "benchmark-required");
    let source_chapter = action
        .tags
        .iter()
        .find_map(|tag| tag.strip_prefix("chapter:"))
        .map(str::to_string);

    serde_json::json!({
        "id": action.id,
        "name": action.name,
        "description": action.description,
        "rationale": action.rationale,
        "risk": action.risk,
        "tier": action.tier,
        "default": action.default,
        "expertOnly": action.expert_only,
        "requiresReboot": action.requires_reboot,
        "reversible": action.reversible,
        "estimatedSeconds": action.estimated_seconds,
        "blockedProfiles": action.blocked_profiles,
        "minWindowsBuild": action.min_windows_build,
        "registryChanges": action.registry_changes.iter().map(|change| {
            serde_json::json!({
                "hive": change.hive,
                "path": change.path,
                "valueName": change.value_name,
                "value": change.value,
                "valueType": change.value_type,
            })
        }).collect::<Vec<_>>(),
        "serviceChanges": action.service_changes.iter().map(|change| {
            serde_json::json!({
                "name": change.name,
                "startupType": change.startup_type,
            })
        }).collect::<Vec<_>>(),
        "bcdChanges": action.bcd_changes.iter().map(|change| {
            serde_json::json!({
                "element": change.element,
                "newValue": change.new_value,
            })
        }).collect::<Vec<_>>(),
        "powerChanges": action.power_changes.iter().map(|change| {
            serde_json::json!({
                "settingPath": change.setting_path,
                "newValue": change.new_value,
            })
        }).collect::<Vec<_>>(),
        "powerShellCommands": action.powershell_commands,
        "packages": action.packages,
        "tasks": action.tasks.iter().map(|task| {
            serde_json::json!({
                "name": task.name,
                "path": task.path,
                "action": task.action,
            })
        }).collect::<Vec<_>>(),
        "tags": action.tags,
        "warningMessage": action.warning_message,
        "manualOnly": manual_only,
        "benchmarkRequired": benchmark_required,
        "sourceChapter": source_chapter,
        "executionMode": if manual_only { "manual" } else { "automatic" },
    })
}

fn load_module(path: &Path) -> anyhow::Result<PlaybookModule> {
    let text = std::fs::read_to_string(path)?;
    let module: PlaybookModule = serde_yaml::from_str(&text)?;
    Ok(module)
}

fn load_profile_override(path: &Path) -> anyhow::Result<ProfileOverride> {
    let text = std::fs::read_to_string(path)?;
    let po: ProfileOverride = serde_yaml::from_str(&text)?;
    Ok(po)
}

// ─── Guide-Driven Planning Layer ────────────────────────────────────────────

#[derive(Debug, Clone)]
struct GuidePhaseBlueprint {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    chapter: &'static str,
    loaded_phase_ids: Vec<&'static str>,
    advisory_actions: Vec<GuideAdvisoryAction>,
}

#[derive(Debug, Clone)]
struct GuideAdvisoryAction {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    risk: &'static str,
    warning_message: Option<&'static str>,
    benchmark_required: bool,
    expert_only: bool,
    requires_reboot: bool,
}

fn guide_phase_blueprints() -> Vec<GuidePhaseBlueprint> {
    vec![
        GuidePhaseBlueprint {
            id: "benchmarking",
            name: "Benchmarking & Validation",
            description: "Establish a repeatable baseline before tuning anything.",
            chapter: "3",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.benchmark.capture-baseline",
                    name: "Capture a baseline before changes",
                    description: "Measure frametime, latency, storage, and thermal behavior first so every later change can be justified.",
                    risk: "safe",
                    warning_message: Some("Do not rely on placebo. Record before/after results for every meaningful change."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.benchmark.select-tooling",
                    name: "Select evidence-oriented tooling",
                    description: "Use PresentMon, FrameView, Windows Performance Toolkit, Mouse Tester, and related tools based on the subsystem you are tuning.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "hardware-foundation",
            name: "Physical Setup & Cooling",
            description: "Validate the machine, cabling, airflow, and topology before OS changes.",
            chapter: "4-5",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.hardware.validate-topology",
                    name: "Validate storage, PCIe, and device topology",
                    description: "Confirm the GPU/display path, PCIe link width, CPU-attached slots, SSD health, and removal of unused or noisy devices.",
                    risk: "safe",
                    warning_message: Some("Physical changes can improve or degrade latency depending on the board layout. Benchmark after each material change."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.hardware.cooling-headroom",
                    name: "Create cooling headroom before tuning",
                    description: "Verify airflow, fan curves, heatsink contact, thermal interface quality, and avoid thermal throttling before aggressive tuning.",
                    risk: "mixed",
                    warning_message: Some("Delidding, liquid metal, lapping, and other hardware mods are high-risk manual steps and should never be automated."),
                    benchmark_required: true,
                    expert_only: true,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.hardware.measure-bufferbloat",
                    name: "Measure bufferbloat and link quality",
                    description: "Check for network queueing issues and favor wired, shielded, low-interference connections before blaming OS settings.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "bios-uefi",
            name: "BIOS / UEFI Readiness",
            description: "Treat firmware as a first-class dependency and validate security tradeoffs explicitly.",
            chapter: "6",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.bios.verify-recovery-path",
                    name: "Verify BIOS recovery before experimentation",
                    description: "Confirm USB flashback, stock BIOS media, or hardware programmer recovery before changing hidden or risky firmware settings.",
                    risk: "safe",
                    warning_message: Some("Firmware changes can brick systems. Always confirm a recovery path first."),
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.bios.review-security-sensitive-toggles",
                    name: "Review security-sensitive BIOS toggles",
                    description: "Assess ReBAR, virtualization, TPM, Secure Boot, CSM, legacy USB, and power-saving settings against your workload and anticheat requirements.",
                    risk: "mixed",
                    warning_message: Some("Disabling TPM, Secure Boot, virtualization, or mitigations can improve latency but materially weakens security and compatibility."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: true,
                },
                GuideAdvisoryAction {
                    id: "guide.bios.track-profiles-and-nvram",
                    name: "Track BIOS profiles and NVRAM diffs",
                    description: "Persist BIOS profiles and compare exported settings so clear-CMOS recovery does not silently drop critical options.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: true,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "usb-layout",
            name: "USB Port Layout",
            description: "Map physical ports to controllers and isolate time-sensitive devices deliberately.",
            chapter: "7",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.usb.map-controllers",
                    name: "Map physical ports to USB controllers",
                    description: "Use USB Device Tree Viewer to learn which connectors and companion ports belong to which controller before rearranging devices.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.usb.isolate-polling-devices",
                    name: "Isolate polling-sensitive devices",
                    description: "Separate mouse, keyboard, and audio devices across controllers when possible and avoid unnecessary internal hubs.",
                    risk: "safe",
                    warning_message: Some("Polling stability should be validated after each layout change instead of assumed."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "peripherals",
            name: "Peripherals & Display",
            description: "Tune devices at the hardware/profile layer before installing bloat-heavy utilities.",
            chapter: "8",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.peripherals.onboard-profiles",
                    name: "Store peripheral settings in onboard memory",
                    description: "Set DPI, report rate, and keyboard/mouse profiles on-device so vendor software does not need to remain installed.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.peripherals.validate-polling",
                    name: "Validate DPI, report rate, and polling stability",
                    description: "Benchmark higher DPI and polling rates, then verify they improve responsiveness without introducing stutter or missed polls.",
                    risk: "mixed",
                    warning_message: Some("Higher polling rates can reduce latency or harm performance depending on hardware and USB topology."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.peripherals.monitor-refresh",
                    name: "Verify monitor overdrive and exact refresh",
                    description: "Confirm refresh is an exact integer rate, check for frame skipping, and tune display overdrive without excessive overshoot.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "stability-and-clocking",
            name: "Stability, Clocks & Thermals",
            description: "Do not build an optimized OS on unstable hardware.",
            chapter: "9",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.stability.use-temporary-os",
                    name: "Use a temporary test environment",
                    description: "Stress-test and overclock from a temporary Windows install or Windows To Go environment to avoid corrupting the main system.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.stability.prove-error-free",
                    name: "Prove stability before optimization",
                    description: "Use multiple CPU, RAM, GPU, and storage stress tools. One error, crash, or WHEA is enough to reject the configuration.",
                    risk: "safe",
                    warning_message: Some("Latency tweaks do not matter on unstable hardware. Reject unstable clocks before proceeding."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "windows-install",
            name: "Windows Installation Strategy",
            description: "Pick a supported build and install offline-first.",
            chapter: "10",
            loaded_phase_ids: vec![],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.install.choose-supported-build",
                    name: "Choose a Windows build for the target workload",
                    description: "Select the Windows edition and build based on scheduler behavior, HAGS, DirectStorage, driver support, and anticheat constraints.",
                    risk: "safe",
                    warning_message: Some("Do not assume the newest build is best for every workload. Validate the exact version against the features you need."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.install.offline-oobe",
                    name: "Install offline and complete OOBE with a local account",
                    description: "Prepare drivers and required files in advance, install without a network, and defer Microsoft account or update churn until policies are in place.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "windows-baseline",
            name: "Windows Baseline & Debloat",
            description: "Apply reversible system cleanup only after the install path is established.",
            chapter: "11.2-11.24",
            loaded_phase_ids: vec!["cleanup", "services", "tasks"],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.windows.baseline-guardrails",
                    name: "Treat OS cleanup as review-first",
                    description: "Favor reversible debloat, verify dependencies before disabling services, and avoid blind scripts that remove unknown components.",
                    risk: "safe",
                    warning_message: Some("Never remove shell-critical packages or disable services without checking downstream dependencies."),
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
                GuideAdvisoryAction {
                    id: "guide.windows.driver-strategy",
                    name: "Prefer vendor drivers over Windows Update",
                    description: "Install chipset, NIC, storage, and other drivers deliberately from the vendor path instead of accepting generic Windows Update defaults.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "windows-privacy",
            name: "Windows Privacy Controls",
            description: "Disable telemetry and tracking without pretending every security feature is disposable.",
            chapter: "11.6-11.14",
            loaded_phase_ids: vec!["privacy"],
            advisory_actions: vec![],
        },
        GuidePhaseBlueprint {
            id: "windows-performance",
            name: "Windows Performance & Latency",
            description: "Apply latency and scheduling changes only after evidence says they help this machine.",
            chapter: "11.17-11.18, 11.31-11.52",
            loaded_phase_ids: vec!["performance"],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.windows.latency-guardrails",
                    name: "Benchmark every latency-sensitive OS change",
                    description: "Timer resolution, idle states, memory compression, paging, interrupt moderation, and CPU affinity changes all need before/after validation.",
                    risk: "mixed",
                    warning_message: Some("Latency knobs can improve a benchmark while degrading real gameplay, stability, or security."),
                    benchmark_required: true,
                    expert_only: false,
                    requires_reboot: true,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "windows-shell",
            name: "Shell, Startup & User Experience",
            description: "Trim shell overhead without breaking the desktop experience.",
            chapter: "11.16-11.21, 11.29",
            loaded_phase_ids: vec!["shell", "startup-shutdown"],
            advisory_actions: vec![],
        },
        GuidePhaseBlueprint {
            id: "windows-networking",
            name: "Drivers, Networking & Devices",
            description: "Harden and tune the machine per device after core OS policy is in place.",
            chapter: "11.8, 11.34-11.39, 11.41.7",
            loaded_phase_ids: vec!["networking"],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.windows.device-layout",
                    name: "Validate IRQ, MSI, IMOD, and device power settings",
                    description: "Check IRQ sharing, MSI availability, XHCI moderation, and device power management on the actual hardware before enforcing aggressive device-level tweaks.",
                    risk: "mixed",
                    warning_message: Some("Incorrect device-level interrupt tuning can break input, networking, storage, or cause BSODs."),
                    benchmark_required: true,
                    expert_only: true,
                    requires_reboot: true,
                },
            ],
        },
        GuidePhaseBlueprint {
            id: "windows-security",
            name: "Security, Mitigations & Maintenance",
            description: "Make security tradeoffs explicit and preserve a path back.",
            chapter: "11.30, 11.47-11.53",
            loaded_phase_ids: vec!["security"],
            advisory_actions: vec![
                GuideAdvisoryAction {
                    id: "guide.windows.maintenance-routine",
                    name: "Schedule recurring maintenance and proof checks",
                    description: "Manually review updates, autoruns, runtime dependencies, cleanup tasks, and rollback assets on a regular cadence.",
                    risk: "safe",
                    warning_message: None,
                    benchmark_required: false,
                    expert_only: false,
                    requires_reboot: false,
                },
            ],
        },
    ]
}

fn advisory_action_to_playbook_action(
    chapter: &str,
    phase_id: &str,
    action: &GuideAdvisoryAction,
) -> PlaybookAction {
    let mut tags = vec![
        "guide".to_string(),
        "manual-only".to_string(),
        format!("chapter:{}", chapter),
        format!("guide-phase:{}", phase_id),
    ];

    if action.benchmark_required {
        tags.push("benchmark-required".to_string());
    }

    PlaybookAction {
        id: action.id.to_string(),
        name: action.name.to_string(),
        description: action.description.to_string(),
        rationale: format!(
            "Guide chapter {} advisory. Manual evidence-first step; not executed automatically.",
            chapter
        ),
        risk: action.risk.to_string(),
        tier: "free".to_string(),
        default: false,
        expert_only: action.expert_only,
        requires_reboot: action.requires_reboot,
        reversible: true,
        estimated_seconds: 0,
        blocked_profiles: Vec::new(),
        min_windows_build: None,
        registry_changes: Vec::new(),
        service_changes: Vec::new(),
        bcd_changes: Vec::new(),
        power_changes: Vec::new(),
        powershell_commands: Vec::new(),
        packages: Vec::new(),
        tasks: Vec::new(),
        tags,
        warning_message: action.warning_message.map(str::to_string),
    }
}

fn guide_action_catalog() -> Vec<PlaybookAction> {
    guide_phase_blueprints()
        .into_iter()
        .flat_map(|phase| {
            phase
                .advisory_actions
                .into_iter()
                .map(move |action| advisory_action_to_playbook_action(phase.chapter, phase.id, &action))
        })
        .collect()
}

fn find_loaded_phase<'a>(playbook: &'a LoadedPlaybook, phase_id: &str) -> Option<&'a LoadedPhase> {
    playbook.phases.iter().find(|phase| phase.id == phase_id)
}

fn resolve_action_status(
    action: &PlaybookAction,
    profile: &str,
    preset: &str,
    build: u32,
    blocked_set: &HashSet<&str>,
    optional_set: &HashSet<&str>,
) -> ResolvedAction {
    let is_wildcard_blocked = blocked_set.iter().any(|pattern| {
        pattern.ends_with(".*") && action.id.starts_with(&pattern[..pattern.len() - 2])
    });

    let (status, reason) = if is_wildcard_blocked
        || blocked_set.contains(action.id.as_str())
        || action.blocked_profiles.contains(&profile.to_string())
    {
        (
            ActionStatus::Blocked,
            Some(format!("Blocked for {} profile", profile)),
        )
    } else if let Some(min_build) = action.min_windows_build {
        if build < min_build {
            (
                ActionStatus::BuildGated,
                Some(format!("Requires Windows build {} or later", min_build)),
            )
        } else {
            determine_inclusion(action, optional_set)
        }
    } else {
        determine_inclusion(action, optional_set)
    };

    let risk_allowed = match preset {
        "conservative" => action.risk == "safe" || action.risk == "low",
        "balanced" => action.risk != "high" && action.risk != "extreme",
        "aggressive" => true,
        _ => action.risk == "safe" || action.risk == "low",
    };

    let mut final_status = if status == ActionStatus::Included && !risk_allowed {
        ActionStatus::Optional
    } else {
        status
    };

    if action.tags.iter().any(|tag| tag == "manual-only") && final_status == ActionStatus::Included
    {
        final_status = ActionStatus::Optional;
    }

    ResolvedAction {
        action: action.clone(),
        status: final_status,
        blocked_reason: reason,
    }
}

// ─── Resolver ───────────────────────────────────────────────────────────────

/// Resolve a loaded playbook into an executable plan for a specific profile and preset.
pub fn resolve_plan(
    playbook: &LoadedPlaybook,
    profile: &str,
    preset: &str,
    windows_build: Option<u32>,
) -> ResolvedPlan {
    // Find profile override
    let profile_override = playbook.profiles.iter().find(|p| p.profile == profile);
    let blocked_set: HashSet<&str> = profile_override
        .map(|po| po.blocked_actions.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();
    let optional_set: HashSet<&str> = profile_override
        .map(|po| po.optional_actions.iter().map(|s| s.as_str()).collect())
        .unwrap_or_default();

    let build = windows_build.unwrap_or(22631); // Default to 23H2

    let mut resolved_phases: Vec<ResolvedPhase> = Vec::new();
    let mut total_included = 0;
    let mut total_blocked = 0;
    let mut total_optional = 0;
    let mut total_expert = 0;
    let mut blocked_reasons: Vec<BlockedAction> = Vec::new();

    for phase in guide_phase_blueprints() {
        let mut resolved_actions: Vec<ResolvedAction> = Vec::new();

        for advisory_action in &phase.advisory_actions {
            resolved_actions.push(resolve_action_status(
                &advisory_action_to_playbook_action(phase.chapter, phase.id, advisory_action),
                profile,
                preset,
                build,
                &blocked_set,
                &optional_set,
            ));
        }

        for loaded_phase_id in &phase.loaded_phase_ids {
            if let Some(loaded_phase) = find_loaded_phase(playbook, loaded_phase_id) {
                if loaded_phase.is_builtin {
                    continue;
                }

                for action in &loaded_phase.actions {
                    resolved_actions.push(resolve_action_status(
                        action,
                        profile,
                        preset,
                        build,
                        &blocked_set,
                        &optional_set,
                    ));
                }
            }
        }

        for action in &resolved_actions {
            match &action.status {
                ActionStatus::Included => total_included += 1,
                ActionStatus::Blocked | ActionStatus::BuildGated => {
                    total_blocked += 1;
                    if let Some(reason) = &action.blocked_reason {
                        blocked_reasons.push(BlockedAction {
                            action_id: action.action.id.clone(),
                            reason: reason.clone(),
                        });
                    }
                }
                ActionStatus::Optional => total_optional += 1,
                ActionStatus::ExpertOnly => total_expert += 1,
            }
        }

        if !resolved_actions.is_empty() {
            resolved_phases.push(ResolvedPhase {
                id: phase.id.to_string(),
                name: phase.name.to_string(),
                actions: resolved_actions,
            });
        }
    }

    ResolvedPlan {
        profile: profile.to_string(),
        preset: preset.to_string(),
        phases: resolved_phases,
        total_included,
        total_blocked,
        total_optional,
        total_expert_only: total_expert,
        blocked_reasons,
    }
}

fn determine_inclusion(
    action: &PlaybookAction,
    optional_set: &HashSet<&str>,
) -> (ActionStatus, Option<String>) {
    if action.expert_only {
        (ActionStatus::ExpertOnly, Some("Expert-only action".into()))
    } else if optional_set.contains(action.id.as_str()) || !action.default {
        (ActionStatus::Optional, None)
    } else {
        (ActionStatus::Included, None)
    }
}

// ─── JSON serialization for IPC ─────────────────────────────────────────────

impl ResolvedPlan {
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "profile": self.profile,
            "preset": self.preset,
            "totalIncluded": self.total_included,
            "totalBlocked": self.total_blocked,
            "totalOptional": self.total_optional,
            "totalExpertOnly": self.total_expert_only,
            "phases": self.phases.iter().map(|p| {
                serde_json::json!({
                    "id": p.id,
                    "name": p.name,
                    "actions": p.actions.iter().map(|a| {
                        let manual_only = a.action.tags.iter().any(|tag| tag == "manual-only");
                        let benchmark_required = a.action.tags.iter().any(|tag| tag == "benchmark-required");
                        let source_chapter = a
                            .action
                            .tags
                            .iter()
                            .find_map(|tag| tag.strip_prefix("chapter:"))
                            .unwrap_or_default();

                        serde_json::json!({
                            "id": a.action.id,
                            "name": a.action.name,
                            "description": a.action.description,
                            "category": a.action.tags.first().unwrap_or(&a.action.risk),
                            "risk": a.action.risk,
                            "status": format!("{:?}", a.status),
                            "default": a.action.default,
                            "expertOnly": a.action.expert_only,
                            "blockedReason": a.blocked_reason,
                            "requiresReboot": a.action.requires_reboot,
                            "warningMessage": a.action.warning_message,
                            "executionMode": if manual_only { "manual" } else { "automatic" },
                            "manualOnly": manual_only,
                            "benchmarkRequired": benchmark_required,
                            "sourceChapter": source_chapter,
                        })
                    }).collect::<Vec<_>>(),
                })
            }).collect::<Vec<_>>(),
            "blockedReasons": self.blocked_reasons.iter().map(|b| {
                serde_json::json!({
                    "actionId": b.action_id,
                    "reason": b.reason,
                })
            }).collect::<Vec<_>>(),
        })
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;

    fn playbook_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("playbooks")
    }

    #[test]
    fn test_load_manifest() {
        let dir = playbook_dir();
        if !dir.exists() {
            eprintln!("Playbook dir not found at {:?} — skipping", dir);
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        assert!(!playbook.manifest.name.is_empty());
        assert!(playbook.manifest.phases.len() >= 5);
        println!(
            "Loaded playbook: {} actions across {} phases",
            playbook.total_actions,
            playbook.phases.len()
        );
    }

    #[test]
    fn test_resolve_plan_gaming() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(22631));
        assert!(plan.total_included > 0);
        println!(
            "Gaming aggressive: {} included, {} blocked, {} optional",
            plan.total_included, plan.total_blocked, plan.total_optional
        );
    }

    #[test]
    fn test_resolve_plan_work_pc_blocks() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }
        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "work_pc", "conservative", Some(22631));

        // Verify work_pc blocks are applied
        let included_ids: HashSet<String> = plan
            .phases
            .iter()
            .flat_map(|p| p.actions.iter())
            .filter(|a| a.status == ActionStatus::Included)
            .map(|a| a.action.id.clone())
            .collect();

        assert!(
            !included_ids.contains("perf.mmcss-system-responsiveness"),
            "MMCSS must be blocked for work_pc"
        );
        assert!(
            !included_ids.contains("shell.reduce-search-box"),
            "Search box reduction must be blocked for work_pc"
        );

        // But safe privacy actions should be included
        assert!(
            included_ids.contains("privacy.disable-advertising-id"),
            "Advertising ID disable should be included for work_pc"
        );

        println!(
            "Work PC: {} included, {} blocked",
            plan.total_included, plan.total_blocked
        );
    }

    #[test]
    fn test_all_actions_have_unique_ids_and_payloads() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let mut seen_ids: HashSet<String> = HashSet::new();

        for phase in &playbook.phases {
            for action in &phase.actions {
                assert!(
                    seen_ids.insert(action.id.clone()),
                    "Duplicate playbook action id: {}",
                    action.id
                );

                let has_payload = !action.registry_changes.is_empty()
                    || !action.service_changes.is_empty()
                    || !action.bcd_changes.is_empty()
                    || !action.power_changes.is_empty()
                    || !action.powershell_commands.is_empty()
                    || !action.packages.is_empty()
                    || !action.tasks.is_empty();

                assert!(
                    has_payload,
                    "Playbook action '{}' has no executable payload",
                    action.id
                );
            }
        }
    }

    #[test]
    fn test_build_gated_actions_resolve_by_windows_build() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let old_build = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(22631));
        let new_build = resolve_plan(&playbook, "gaming_desktop", "aggressive", Some(26100));

        let old_actions: HashMap<String, ActionStatus> = old_build
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .map(|action| (action.action.id.clone(), action.status.clone()))
            .collect();

        let new_actions: HashMap<String, ActionStatus> = new_build
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .map(|action| (action.action.id.clone(), action.status.clone()))
            .collect();

        assert_eq!(
            old_actions.get("privacy.disable-recall"),
            Some(&ActionStatus::BuildGated),
            "Recall should be gated on older Windows builds",
        );
        assert_eq!(
            old_actions.get("privacy.disable-click-to-do"),
            Some(&ActionStatus::BuildGated),
            "Click to Do should be gated on older Windows builds",
        );
        assert_eq!(
            old_actions.get("shell.enable-end-task"),
            Some(&ActionStatus::Included),
            "End Task should be available on Windows 11 23H2 builds",
        );

        assert_eq!(
            new_actions.get("privacy.disable-recall"),
            Some(&ActionStatus::Included),
            "Recall should resolve on supported Windows builds",
        );
        assert_eq!(
            new_actions.get("privacy.disable-click-to-do"),
            Some(&ActionStatus::Included),
            "Click to Do should resolve on supported Windows builds",
        );
    }

    #[test]
    fn test_guide_phases_lead_with_evidence_and_hardware() {
        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));
        let phase_ids: Vec<&str> = plan.phases.iter().map(|phase| phase.id.as_str()).collect();

        assert!(phase_ids.starts_with(&[
            "benchmarking",
            "hardware-foundation",
            "bios-uefi",
            "usb-layout",
            "peripherals",
            "stability-and-clocking",
            "windows-install",
        ]));
        assert!(phase_ids.contains(&"windows-baseline"));
        assert!(phase_ids.contains(&"windows-performance"));
        assert!(phase_ids.contains(&"windows-security"));
    }

    #[test]
    fn test_guide_advisories_are_optional_and_manual() {
        let guide_json = guide_action_catalog()
            .into_iter()
            .find(|action| action.id == "guide.benchmark.capture-baseline")
            .map(|action| playbook_action_to_execution_json(&action))
            .expect("guide benchmark action should exist");

        assert_eq!(guide_json.get("manualOnly").and_then(|value| value.as_bool()), Some(true));
        assert_eq!(
            guide_json
                .get("executionMode")
                .and_then(|value| value.as_str()),
            Some("manual")
        );
        assert_eq!(
            guide_json
                .get("benchmarkRequired")
                .and_then(|value| value.as_bool()),
            Some(true)
        );

        let dir = playbook_dir();
        if !dir.exists() {
            return;
        }

        let playbook = load_playbook(&dir).unwrap();
        let plan = resolve_plan(&playbook, "gaming_desktop", "balanced", Some(22631));
        let action = plan
            .phases
            .iter()
            .flat_map(|phase| phase.actions.iter())
            .find(|action| action.action.id == "guide.benchmark.capture-baseline")
            .expect("resolved guide benchmark action should exist");

        assert_eq!(action.status, ActionStatus::Optional);
    }

    #[test]
    fn test_find_action_definition_supports_guide_actions() {
        let guide_action = guide_action_catalog()
            .into_iter()
            .find(|action| action.id == "guide.windows.device-layout")
            .expect("guide action should exist");

        let json = playbook_action_to_execution_json(&guide_action);

        assert_eq!(json.get("manualOnly").and_then(|value| value.as_bool()), Some(true));
        assert_eq!(
            json.get("sourceChapter").and_then(|value| value.as_str()),
            Some("11.8, 11.34-11.39, 11.41.7")
        );
    }
}
