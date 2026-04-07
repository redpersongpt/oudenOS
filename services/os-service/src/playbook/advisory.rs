use super::PlaybookAction;

#[derive(Debug, Clone)]
pub(crate) struct GuidePhaseBlueprint {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub chapter: &'static str,
    pub loaded_phase_ids: Vec<&'static str>,
    pub advisory_actions: Vec<GuideAdvisoryAction>,
}

#[derive(Debug, Clone)]
pub(crate) struct GuideAdvisoryAction {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub risk: &'static str,
    pub warning_message: Option<&'static str>,
    pub benchmark_required: bool,
    pub expert_only: bool,
    pub requires_reboot: bool,
}

pub(crate) fn guide_phase_blueprints() -> Vec<GuidePhaseBlueprint> {
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
            advisory_actions: vec![GuideAdvisoryAction {
                id: "guide.windows.latency-guardrails",
                name: "Benchmark every latency-sensitive OS change",
                description: "Timer resolution, idle states, memory compression, paging, interrupt moderation, and CPU affinity changes all need before/after validation.",
                risk: "mixed",
                warning_message: Some("Latency knobs can improve a benchmark while degrading real gameplay, stability, or security."),
                benchmark_required: true,
                expert_only: false,
                requires_reboot: true,
            }],
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
            advisory_actions: vec![GuideAdvisoryAction {
                id: "guide.windows.device-layout",
                name: "Validate IRQ, MSI, IMOD, and device power settings",
                description: "Check IRQ sharing, MSI availability, XHCI moderation, and device power management on the actual hardware before enforcing aggressive device-level tweaks.",
                risk: "mixed",
                warning_message: Some("Incorrect device-level interrupt tuning can break input, networking, storage, or cause BSODs."),
                benchmark_required: true,
                expert_only: true,
                requires_reboot: true,
            }],
        },
        GuidePhaseBlueprint {
            id: "windows-security",
            name: "Security, Mitigations & Maintenance",
            description: "Make security tradeoffs explicit and preserve a path back.",
            chapter: "11.30, 11.47-11.53",
            loaded_phase_ids: vec!["security"],
            advisory_actions: vec![GuideAdvisoryAction {
                id: "guide.windows.maintenance-routine",
                name: "Schedule recurring maintenance and proof checks",
                description: "Manually review updates, autoruns, runtime dependencies, cleanup tasks, and rollback assets on a regular cadence.",
                risk: "safe",
                warning_message: None,
                benchmark_required: false,
                expert_only: false,
                requires_reboot: false,
            }],
        },
    ]
}

pub(crate) fn advisory_action_to_playbook_action(
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
        file_renames: Vec::new(),
        tags,
        warning_message: action.warning_message.map(str::to_string),
    }
}

pub(crate) fn guide_action_catalog() -> Vec<PlaybookAction> {
    guide_phase_blueprints()
        .into_iter()
        .flat_map(|phase| {
            phase.advisory_actions.into_iter().map(move |action| {
                advisory_action_to_playbook_action(phase.chapter, phase.id, &action)
            })
        })
        .collect()
}
