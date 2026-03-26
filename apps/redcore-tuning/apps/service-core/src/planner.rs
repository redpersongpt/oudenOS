// ---- Tuning Planner ---------------------------------------------------------
// Generates machine-specific tuning plans based on device profile and preset.
// Embeds the v1 action definitions directly and filters by compatibility
// and risk tolerance.

use crate::compatibility;

/// All v1 embedded action definitions, returned as serde_json::Value objects.
/// These match the TypeScript definitions in packages/tuning-modules/src/ exactly.
pub fn embedded_actions() -> Vec<serde_json::Value> {
    vec![
        // ---- privacy.disable-advertising-id ---------------------------------
        serde_json::json!({
            "id": "privacy.disable-advertising-id",
            "name": "Disable Advertising ID",
            "category": "privacy",
            "description": "Prevent apps from using your advertising ID for cross-app personalized advertising.",
            "rationale": "The advertising ID tracks user behavior across apps. Disabling it reduces profiling without any performance impact.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo",
                    "valueName": "Enabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [],
            "tags": ["privacy"]
        }),

        // ---- privacy.disable-telemetry --------------------------------------
        serde_json::json!({
            "id": "privacy.disable-telemetry",
            "name": "Disable Windows Telemetry",
            "category": "privacy",
            "description": "Set telemetry level to Security (0) and disable Connected User Experiences and Telemetry service.",
            "rationale": "Windows telemetry collects diagnostic data and sends it to Microsoft. Disabling it reduces background network activity and improves privacy.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "background_network_activity",
                "directionBetter": "lower",
                "estimatedDelta": "Reduced background data transmission",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection",
                    "valueName": "AllowTelemetry",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection",
                    "valueName": "AllowTelemetry",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [
                { "serviceName": "DiagTrack", "newStartType": "Disabled" },
                { "serviceName": "dmwappushservice", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Windows diagnostic reports won't be collected",
                "Some Microsoft feedback features may not work"
            ],
            "tags": ["privacy", "telemetry", "debloat"]
        }),

        // ---- privacy.disable-ceip -------------------------------------------
        serde_json::json!({
            "id": "privacy.disable-ceip",
            "name": "Disable Customer Experience Improvement Program",
            "category": "privacy",
            "description": "Opt out of the Windows Customer Experience Improvement Program data collection.",
            "rationale": "CEIP collects usage data for Microsoft. Disabling it reduces background data collection tasks.",
            "tier": "free",
            "risk": "safe",
            "compatibility": {},
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows",
                    "valueName": "CEIPEnable",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [],
            "tags": ["privacy", "telemetry"]
        }),

        // ---- privacy.disable-cloud-content ----------------------------------
        serde_json::json!({
            "id": "privacy.disable-cloud-content",
            "name": "Disable Cloud Content & Suggestions",
            "category": "privacy",
            "description": "Disable Windows Spotlight, suggested apps, tips, and cloud-delivered content.",
            "rationale": "Cloud content features download and display promotional material, consuming bandwidth and creating visual noise.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent",
                    "valueName": "DisableWindowsConsumerFeatures",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent",
                    "valueName": "DisableSoftLanding",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SilentInstalledAppsEnabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SystemPaneSuggestionsEnabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "No more app suggestions on Start menu",
                "No Windows Spotlight on lock screen"
            ],
            "tags": ["privacy", "debloat", "cleanup"]
        }),

        // ---- privacy.disable-error-reporting --------------------------------
        serde_json::json!({
            "id": "privacy.disable-error-reporting",
            "name": "Disable Windows Error Reporting",
            "category": "privacy",
            "description": "Disable automatic error reporting to Microsoft.",
            "rationale": "Error reporting sends crash dumps to Microsoft. Disabling reduces background uploads. Note: this may make debugging harder if you encounter system issues.",
            "tier": "free",
            "risk": "safe",
            "compatibility": {},
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting",
                    "valueName": "Disabled",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting",
                    "valueName": "Disabled",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [
                { "serviceName": "WerSvc", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Crash reports won't be sent to Microsoft",
                "Some automatic fixes may not be applied"
            ],
            "tags": ["privacy", "telemetry"]
        }),

        // ---- power.disable-fast-startup -------------------------------------
        serde_json::json!({
            "id": "power.disable-fast-startup",
            "name": "Disable Fast Startup (Hybrid Shutdown)",
            "category": "power",
            "description": "Disable Windows Fast Startup (hybrid shutdown) which hibernates the kernel session instead of performing a full shutdown.",
            "rationale": "Fast Startup saves the kernel session to the hibernation file on shutdown, then restores it on boot. This causes stale driver state, prevents clean driver reinitialization, and can lead to hardware initialization issues. A full cold boot ensures all drivers and hardware are cleanly initialized every time.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "driver_initialization_reliability",
                "directionBetter": "higher",
                "estimatedDelta": "Eliminates stale driver state from hybrid shutdown",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power",
                    "valueName": "HiberbootEnabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Boot time will be slightly longer (full cold boot instead of hybrid resume)"
            ],
            "tags": ["power", "stability", "boot"]
        }),

        // ---- storage.disable-last-access ------------------------------------
        serde_json::json!({
            "id": "storage.disable-last-access",
            "name": "Disable NTFS Last Access Timestamp",
            "category": "storage",
            "description": "Disable updating the last access timestamp on files and directories, reducing write I/O for every file read operation.",
            "rationale": "By default, NTFS updates the LastAccessTime metadata on every file read. For gaming workloads that read thousands of asset files, this generates substantial unnecessary write I/O. Windows 10 1803+ defaults to 'User Managed' (disabled for user-mode reads) but this ensures it is explicitly disabled system-wide via NtfsDisableLastAccessUpdate.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "filesystem_write_io",
                "directionBetter": "lower",
                "estimatedDelta": "Reduces metadata write I/O on every file read",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\FileSystem",
                    "valueName": "NtfsDisableLastAccessUpdate",
                    "valueType": "REG_DWORD",
                    "newValue": 2_147_483_651_i64
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Backup software relying on last access time may not detect accessed files"
            ],
            "tags": ["storage", "filesystem", "ntfs", "performance"]
        }),

        // ---- cpu.reduce-parking-aggressiveness --------------------------------
        serde_json::json!({
            "id": "cpu.reduce-parking-aggressiveness",
            "name": "Reduce CPU Core Parking Aggressiveness",
            "category": "cpu",
            "description": "Set minimum processor cores to 100% on AC power, preventing Windows from parking cores during low load. Parked cores introduce 1-5ms wake latency.",
            "rationale": "Core parking saves power by powering down unused cores, but causes micro-stutter when a game suddenly needs more threads. On a desktop gaming PC plugged into AC power, core parking provides no useful benefit and only adds latency jitter.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "core_wake_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates 1-5ms parking wake latency",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/0cc5b647-c1df-4637-891a-dec35c318583", "newValue": "100" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Higher idle power consumption (~5-15W on desktop)",
                "All CPU cores remain active even when idle",
                "Not recommended for laptops on battery"
            ],
            "tags": ["cpu", "parking", "latency", "gaming"]
        }),

        // ---- cpu.aggressive-boost-mode ----------------------------------------
        serde_json::json!({
            "id": "cpu.aggressive-boost-mode",
            "name": "Aggressive Processor Boost Mode",
            "category": "cpu",
            "description": "Set processor performance boost policy to Aggressive (mode 2). This prioritizes sustained maximum turbo frequency over power efficiency.",
            "rationale": "Default boost mode (Efficient Aggressive or Enabled) may downscale frequency under sustained load to save power. Aggressive mode tells the OS to keep boosting as long as thermal and power limits allow, improving sustained frame rates.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "sustained_clock_speed",
                "directionBetter": "higher",
                "estimatedDelta": "~100-300 MHz higher sustained boost",
                "confidence": "estimated"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/be337238-0d82-4146-a960-4f3749d470c7", "newValue": "2" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Higher temperatures under sustained load",
                "Increased power consumption",
                "May cause thermal throttling on inadequate cooling"
            ],
            "tags": ["cpu", "performance", "boost", "gaming"]
        }),

        // ---- cpu.min-processor-state-100 --------------------------------------
        serde_json::json!({
            "id": "cpu.min-processor-state-100",
            "name": "Set Minimum Processor State to 100%",
            "category": "cpu",
            "description": "Prevent the CPU from throttling below maximum frequency. Sets both minimum and maximum processor state to 100%.",
            "rationale": "When min processor state is below 100%, the CPU may reduce its frequency during brief idle moments in a game loop, causing frame time spikes when it needs to ramp back up. Setting minimum to 100% keeps the CPU at full speed.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "cpu_frequency_consistency",
                "directionBetter": "higher",
                "estimatedDelta": "Eliminates frequency scaling latency",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/893dee8e-2bef-41e0-89c6-b55d0929964c", "newValue": "100" },
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/bc5038f7-23e0-4960-96da-33abaf5935ec", "newValue": "100" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "CPU runs at maximum frequency at all times",
                "Significantly higher idle power and heat",
                "Not recommended for laptops"
            ],
            "tags": ["cpu", "power", "frequency", "gaming"]
        }),

        // ---- security.analyze-mitigations -------------------------------------
        serde_json::json!({
            "id": "security.analyze-mitigations",
            "name": "Analyze Speculative Execution Mitigations",
            "category": "security",
            "description": "Detect and report the current state of CPU speculative execution mitigations (Spectre, Meltdown, SSBD, MDS). No changes are made — analysis only.",
            "rationale": "Understanding which mitigations are active and their estimated performance overhead helps informed decision-making. AMD CPUs are not vulnerable to Meltdown and have hardware Spectre v2 mitigations, so disabling software mitigations provides minimal gain. Intel pre-10th gen CPUs see the largest overhead from KPTI (Meltdown mitigation).",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 16299 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [],
            "tags": ["security", "spectre", "meltdown", "analysis"]
        }),

        // ---- security.reduce-ssbd-mitigation ----------------------------------
        // NOTE: "high" risk — this action is NEVER included in any preset plan.
        // It can only be applied via direct manual expert action through
        // tuning.applyAction called by the user. No preset (conservative,
        // balanced, or aggressive) includes "high" in its allowed risk set.
        serde_json::json!({
            "id": "security.reduce-ssbd-mitigation",
            "name": "Reduce Speculative Store Bypass (SSBD) Mitigation",
            "category": "security",
            "description": "Disable the Speculative Store Bypass Disable (SSBD) mitigation via the FeatureSettingsOverride registry keys. This reduces a 2-8% performance overhead on syscall-heavy workloads but exposes the system to CVE-2018-3639.",
            "rationale": "SSBD mitigates Spectre Variant 4 (speculative store bypass). On dedicated gaming PCs not used for sensitive operations, the 2-8% overhead may not justify the protection. This is the lowest-risk mitigation to disable because Spectre v4 attacks require local code execution.",
            "tier": "premium",
            "risk": "high",
            "compatibility": { "minBuild": 17134 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "syscall_throughput",
                "directionBetter": "higher",
                "estimatedDelta": "2-8% improvement in syscall-heavy workloads",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
                    "valueName": "FeatureSettingsOverride",
                    "valueType": "REG_DWORD",
                    "newValue": 8
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
                    "valueName": "FeatureSettingsOverrideMask",
                    "valueType": "REG_DWORD",
                    "newValue": 3
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": [
                "SECURITY WARNING: Disables protection against CVE-2018-3639 (Spectre Variant 4)",
                "System is exposed to speculative store bypass side-channel attacks",
                "Do NOT use on systems handling sensitive data, banking, or personal information",
                "Only recommended for isolated gaming rigs or offline benchmark systems",
                "Requires reboot to take effect",
                "AMD CPUs may see minimal gain — they have hardware SSBD support"
            ],
            "tags": ["security", "spectre", "mitigation", "expert", "high-risk"]
        }),

        // ---- privacy.disable-clipboard-history --------------------------------
        serde_json::json!({
            "id": "privacy.disable-clipboard-history",
            "name": "Disable Clipboard History & Cloud Sync",
            "category": "privacy",
            "description": "Disable Windows clipboard history and cross-device clipboard synchronization.",
            "rationale": "Clipboard history stores copied content and can sync it across devices via Microsoft account. Disabling prevents clipboard data from being stored beyond the current copy.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 17763 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System", "valueName": "AllowClipboardHistory", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System", "valueName": "AllowCrossDeviceClipboard", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Win+V clipboard history panel will be empty", "Cloud clipboard sync will stop"],
            "tags": ["privacy", "clipboard", "sync"]
        }),

        // ---- privacy.disable-activity-feed ------------------------------------
        serde_json::json!({
            "id": "privacy.disable-activity-feed",
            "name": "Disable Activity History & Timeline",
            "category": "privacy",
            "description": "Disable Windows activity feed, timeline, and activity data uploads.",
            "rationale": "Windows Activity History tracks app usage, file opens, and browsing history. Disabling prevents local collection and cloud upload of activity data.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 17134 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System", "valueName": "EnableActivityFeed", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System", "valueName": "PublishUserActivities", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System", "valueName": "UploadUserActivities", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Windows Timeline will be empty"],
            "tags": ["privacy", "telemetry", "timeline"]
        }),

        // ---- privacy.disable-typing-insights ----------------------------------
        serde_json::json!({
            "id": "privacy.disable-typing-insights",
            "name": "Disable Typing Insights & Inking Data",
            "category": "privacy",
            "description": "Disable collection of typing patterns and linguistic data sent to Microsoft.",
            "rationale": "Windows collects typing patterns and handwriting data for input prediction. Disabling prevents this data from being transmitted.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 17134 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_CURRENT_USER", "path": "SOFTWARE\\Microsoft\\input\\Settings", "valueName": "InsightsEnabled", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\TextInput", "valueName": "AllowLinguisticDataCollection", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Typing prediction accuracy may be slightly reduced"],
            "tags": ["privacy", "telemetry", "typing"]
        }),

        // ---- privacy.disable-search-suggestions -------------------------------
        serde_json::json!({
            "id": "privacy.disable-search-suggestions",
            "name": "Disable Search Suggestions & Web Results",
            "category": "privacy",
            "description": "Disable Cortana and web search suggestions in Windows Search.",
            "rationale": "Windows Search sends keystrokes to Bing for web suggestions. Disabling makes search local-only.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search", "valueName": "AllowCortana", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_CURRENT_USER", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer", "valueName": "DisableSearchBoxSuggestions", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["No web results in Start menu search", "Cortana features will be disabled"],
            "tags": ["privacy", "search", "cortana"]
        }),

        // ---- display.disable-sticky-keys --------------------------------------
        serde_json::json!({
            "id": "display.disable-sticky-keys",
            "name": "Disable Sticky Keys Prompt",
            "category": "display",
            "description": "Disable the Sticky Keys prompt triggered by pressing Shift 5 times.",
            "rationale": "The Sticky Keys shortcut activates during gaming when Shift is pressed rapidly, stealing focus from the game.",
            "tier": "free",
            "risk": "safe",
            "compatibility": {},
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_CURRENT_USER", "path": "Control Panel\\Accessibility\\StickyKeys", "valueName": "Flags", "valueType": "REG_SZ", "newValue": "506" }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Sticky Keys shortcut (5x Shift) will no longer work"],
            "tags": ["display", "gaming", "accessibility", "input"]
        }),

        // ---- startup.disable-gamebar-presence ---------------------------------
        serde_json::json!({
            "id": "startup.disable-gamebar-presence",
            "name": "Disable GameBarPresenceWriter",
            "category": "startup",
            "description": "Disable the GameBarPresenceWriter background process that monitors game presence for Xbox social features.",
            "rationale": "GameBarPresenceWriter is COM-activated for every DirectX application regardless of Game Bar usage, consuming CPU cycles.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_process_count", "directionBetter": "lower", "estimatedDelta": "Eliminates 1 background process per game session", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Microsoft\\WindowsRuntime\\ActivatableClassId\\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter", "valueName": "ActivationType", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Xbox social presence will not show 'Currently Playing' status"],
            "tags": ["startup", "gaming", "debloat", "performance"]
        }),

        // ---- startup.disable-cloud-notifications ------------------------------
        serde_json::json!({
            "id": "startup.disable-cloud-notifications",
            "name": "Disable Cloud Notification Network Usage",
            "category": "startup",
            "description": "Block Windows Push Notification System from making network calls to Microsoft cloud servers.",
            "rationale": "WNS maintains persistent connections to Microsoft servers. Blocking eliminates background traffic while local notifications continue.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 9200 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_network_connections", "directionBetter": "lower", "estimatedDelta": "Eliminates persistent WNS cloud connection", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications", "valueName": "NoCloudApplicationNotification", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Cloud-delivered notifications will not appear"],
            "tags": ["startup", "privacy", "network", "debloat"]
        }),

        // ---- startup.disable-fault-tolerant-heap ------------------------------
        serde_json::json!({
            "id": "startup.disable-fault-tolerant-heap",
            "name": "Disable Fault Tolerant Heap",
            "category": "startup",
            "description": "Disable the Fault Tolerant Heap which automatically applies runtime mitigations to crashing applications.",
            "rationale": "FTH adds heap overhead to applications it mitigates. For tuned systems, this overhead is unnecessary and masks real bugs.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "heap_allocation_overhead", "directionBetter": "lower", "estimatedDelta": "Eliminates FTH guard page overhead", "confidence": "estimated" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Microsoft\\FTH", "valueName": "Enabled", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": ["Applications that previously crashed may crash again instead of being silently mitigated"],
            "tags": ["startup", "performance", "memory", "advanced"]
        }),

        // ---- cpu.disable-dynamic-tick -----------------------------------------
        serde_json::json!({
            "id": "cpu.disable-dynamic-tick",
            "name": "Disable Dynamic Tick (Fixed Timer Interval)",
            "category": "cpu",
            "description": "Disable Windows dynamic tick via BCD, forcing fixed timer interrupt interval.",
            "rationale": "Dynamic tick allows Windows to skip timer interrupts during idle, creating variable resolution that can cause micro-stutter. Disabling forces consistent timer behavior.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "timer_consistency", "directionBetter": "higher", "estimatedDelta": "Eliminates timer coalescing jitter", "confidence": "measured" },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [
                { "element": "disabledynamictick", "newValue": "yes" }
            ],
            "requiresReboot": true,
            "sideEffects": ["Higher idle power consumption", "CPU never enters deepest idle states"],
            "tags": ["cpu", "timer", "latency", "gaming", "bcd"]
        }),

        // ---- cpu.global-timer-resolution --------------------------------------
        serde_json::json!({
            "id": "cpu.global-timer-resolution",
            "name": "Enable Global Timer Resolution Requests",
            "category": "cpu",
            "description": "Set GlobalTimerResolutionRequests to restore system-wide timer resolution behavior on Windows 11+.",
            "rationale": "Starting with Windows 10 2004, timer resolution became per-process. This key restores global behavior on Windows 11+, allowing one app's timer request to benefit all processes.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 22000 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "system_timer_precision", "directionBetter": "higher", "estimatedDelta": "Sleep(1) achieves ~1.5ms vs ~15.6ms", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel", "valueName": "GlobalTimerResolutionRequests", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": ["Any process requesting high timer resolution affects all processes system-wide"],
            "tags": ["cpu", "timer", "latency", "gaming", "windows11"]
        }),

        // ---- gpu.nvidia-disable-dynamic-pstate --------------------------------
        serde_json::json!({
            "id": "gpu.nvidia-disable-dynamic-pstate",
            "name": "Lock NVIDIA GPU to P-State 0",
            "category": "gpu",
            "description": "Disable dynamic P-State switching on NVIDIA GPUs, forcing maximum clocks at all times.",
            "rationale": "NVIDIA GPUs transition between power states introducing 5-50ms latency spikes. Locking to P-State 0 eliminates transition latency.",
            "tier": "premium",
            "risk": "medium",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "gpu_clock_transition_latency", "directionBetter": "lower", "estimatedDelta": "Eliminates 5-50ms P-State transitions", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000", "valueName": "DisableDynamicPstate", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": [
                "GPU runs at max clocks even at desktop idle",
                "Higher idle power and temperature",
                "NVIDIA-only; path assumes adapter index 0000"
            ],
            "tags": ["gpu", "nvidia", "latency", "pstate", "gaming"]
        }),

        // ---- storage.disable-8dot3-filenames ----------------------------------
        serde_json::json!({
            "id": "storage.disable-8dot3-filenames",
            "name": "Disable 8.3 Short Filename Creation",
            "category": "storage",
            "description": "Disable creation of legacy DOS-compatible 8.3 short filenames on NTFS volumes.",
            "rationale": "NTFS creates a legacy 8.3 entry for every file, doubling directory entries and slowing enumeration. Disabling reduces overhead for file-heavy workloads.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "directory_enumeration_speed", "directionBetter": "higher", "estimatedDelta": "Reduces directory entry count by ~50%", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SYSTEM\\CurrentControlSet\\Control\\FileSystem", "valueName": "NtfsDisable8dot3NameCreation", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": ["Very old applications expecting 8.3 filenames may fail (extremely rare)"],
            "tags": ["storage", "filesystem", "ntfs", "performance"]
        }),

        // ---- services.disable-sysmain -----------------------------------------
        serde_json::json!({
            "id": "services.disable-sysmain",
            "name": "Disable SysMain (Superfetch)",
            "category": "services",
            "description": "Disable the SysMain service which preloads frequently used applications into memory.",
            "rationale": "SysMain uses background I/O to preload data. On SSD systems, this offers negligible benefit and creates disk contention during gaming.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_disk_io", "directionBetter": "lower", "estimatedDelta": "Eliminates Superfetch I/O spikes", "confidence": "measured" },
            "registryChanges": [],
            "serviceChanges": [
                { "serviceName": "SysMain", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["App cold-start slightly slower on HDD systems", "Memory compression disabled"],
            "tags": ["services", "performance", "disk", "memory"]
        }),

        // ---- services.disable-xbox-services -----------------------------------
        serde_json::json!({
            "id": "services.disable-xbox-services",
            "name": "Disable Xbox Background Services",
            "category": "services",
            "description": "Disable Xbox Auth, Game Save, Networking, and Accessory Management services.",
            "rationale": "Xbox services run in background even without Xbox usage, maintaining network connections and handling save sync.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_service_count", "directionBetter": "lower", "estimatedDelta": "Eliminates 4 background services", "confidence": "measured" },
            "registryChanges": [],
            "serviceChanges": [
                { "serviceName": "XblAuthManager", "newStartType": "Disabled" },
                { "serviceName": "XblGameSave", "newStartType": "Disabled" },
                { "serviceName": "XboxNetApiSvc", "newStartType": "Disabled" },
                { "serviceName": "XboxGipSvc", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Xbox Game Pass cloud saves will not sync", "Xbox controller may lose features"],
            "tags": ["services", "debloat", "xbox", "gaming"]
        }),

        // ---- services.disable-print-spooler -----------------------------------
        serde_json::json!({
            "id": "services.disable-print-spooler",
            "name": "Disable Print Spooler",
            "category": "services",
            "description": "Disable the Print Spooler service. Safe on gaming systems with no printers.",
            "rationale": "Print Spooler loads DLLs and runs threads even without printers. It has been the target of critical CVEs (PrintNightmare). Disabling eliminates attack surface and background overhead.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "attack_surface_reduction", "directionBetter": "lower", "estimatedDelta": "Eliminates PrintNightmare attack vector", "confidence": "measured" },
            "registryChanges": [],
            "serviceChanges": [
                { "serviceName": "Spooler", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Cannot print — re-enable if printer connected", "Print-to-PDF will not work"],
            "tags": ["services", "security", "debloat"]
        }),

        // ---- services.disable-remote-services ---------------------------------
        serde_json::json!({
            "id": "services.disable-remote-services",
            "name": "Disable Remote Access Services",
            "category": "services",
            "description": "Disable Remote Desktop, Remote Registry, and Remote Assistance.",
            "rationale": "Remote access services listen for incoming connections. On a gaming PC, these are unnecessary attack surface.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SYSTEM\\CurrentControlSet\\Control\\Remote Assistance", "valueName": "fAllowToGetHelp", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [
                { "serviceName": "RemoteRegistry", "newStartType": "Disabled" },
                { "serviceName": "TermService", "newStartType": "Disabled" },
                { "serviceName": "SessionEnv", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Cannot use Remote Desktop to connect to this PC", "Remote Registry access denied"],
            "tags": ["services", "security", "hardening"]
        }),

        // ---- services.disable-indexing ----------------------------------------
        serde_json::json!({
            "id": "services.disable-indexing-service",
            "name": "Disable Windows Search Indexing Service",
            "category": "services",
            "description": "Disable the Windows Search indexing service which continuously crawls files.",
            "rationale": "The indexer consumes disk I/O, CPU, and memory by scanning files. On gaming systems, disabling eliminates background I/O contention during gameplay.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_disk_io", "directionBetter": "lower", "estimatedDelta": "Eliminates indexer I/O spikes", "confidence": "measured" },
            "registryChanges": [],
            "serviceChanges": [
                { "serviceName": "WSearch", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Windows Search and Start menu search will be significantly slower", "Outlook search requires indexing"],
            "tags": ["services", "performance", "disk", "debloat"]
        }),

        // ---- system.defer-feature-updates -------------------------------------
        serde_json::json!({
            "id": "system.defer-feature-updates",
            "name": "Defer Feature Updates by 365 Days",
            "category": "security",
            "description": "Configure WUfB to defer feature updates by 365 days. Security patches continue normally.",
            "rationale": "Feature updates often introduce bugs and driver issues. Deferring lets early adopters find problems first.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 15063, "editions": ["Pro", "Professional", "Enterprise", "Education"] },
            "dependencies": [],
            "conflicts": ["system.disable-windows-update"],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "DeferFeatureUpdates", "valueType": "REG_DWORD", "newValue": 1 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "DeferFeatureUpdatesPeriodInDays", "valueType": "REG_DWORD", "newValue": 365 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "BranchReadinessLevel", "valueType": "REG_DWORD", "newValue": 32 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Feature updates delayed by 1 year", "Only works on Pro/Enterprise/Education"],
            "tags": ["security", "updates", "wufb"]
        }),

        // ---- system.defer-quality-updates -------------------------------------
        serde_json::json!({
            "id": "system.defer-quality-updates",
            "name": "Defer Quality Updates by 7 Days",
            "category": "security",
            "description": "Defer quality/security updates by 7 days to avoid day-one patch issues.",
            "rationale": "Quality updates occasionally cause boot loops or driver failures. A 7-day deferral provides a safety buffer.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 15063, "editions": ["Pro", "Professional", "Enterprise", "Education"] },
            "dependencies": [],
            "conflicts": ["system.disable-windows-update"],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "DeferQualityUpdates", "valueType": "REG_DWORD", "newValue": 1 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "DeferQualityUpdatesPeriodInDays", "valueType": "REG_DWORD", "newValue": 7 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Security patches delayed by 7 days", "Only works on Pro/Enterprise/Education"],
            "tags": ["security", "updates", "wufb"]
        }),

        // ---- system.disable-driver-updates-via-wu -----------------------------
        serde_json::json!({
            "id": "system.disable-driver-updates-via-wu",
            "name": "Disable Driver Installation via Windows Update",
            "category": "security",
            "description": "Prevent Windows Update from installing device drivers. You must install drivers manually from vendor websites.",
            "rationale": "WU-delivered drivers are often outdated or generic. Installing vendor drivers directly ensures optimal performance and compatibility.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "ExcludeWUDriversInQualityUpdate", "valueType": "REG_DWORD", "newValue": 1 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DriverSearching", "valueName": "SearchOrderConfig", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\DriverSearching", "valueName": "DontSearchWindowsUpdate", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Must install drivers manually", "New hardware may require manual driver download"],
            "tags": ["security", "drivers", "updates"]
        }),

        // ---- system.disable-windows-update ------------------------------------
        // EXTREME risk — never included in any preset plan
        serde_json::json!({
            "id": "system.disable-windows-update",
            "name": "Disable Windows Update Completely",
            "category": "security",
            "description": "Completely disable Windows Update service and block all update connections.",
            "rationale": "Expert-only. Removes all automatic patching for isolated benchmark/gaming systems.",
            "tier": "premium",
            "risk": "extreme",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": ["system.defer-feature-updates", "system.defer-quality-updates"],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU", "valueName": "NoAutoUpdate", "valueType": "REG_DWORD", "newValue": 1 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "DisableWindowsUpdateAccess", "valueType": "REG_DWORD", "newValue": 1 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate", "valueName": "SetDisableUXWUAccess", "valueType": "REG_DWORD", "newValue": 1 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": [
                "CRITICAL: System will no longer receive security patches",
                "System is exposed to all future discovered vulnerabilities",
                "Microsoft Store will stop functioning",
                "Expert-only: Only for isolated benchmark/gaming systems",
                "Cannot be undone remotely if system is compromised",
                "Windows may display persistent 'update needed' warnings",
                "Some applications may refuse to run on unpatched systems"
            ],
            "tags": ["security", "updates", "expert", "extreme-risk"]
        }),

        // ---- system.disable-defender-sample-submission -------------------------
        serde_json::json!({
            "id": "system.disable-defender-sample-submission",
            "name": "Disable Defender Automatic Sample Submission",
            "category": "security",
            "description": "Disable automatic submission of suspicious file samples to Microsoft for analysis.",
            "rationale": "Sample submission sends suspicious files to Microsoft cloud for analysis. Disabling prevents files from leaving the system while keeping real-time protection active.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Microsoft\\Windows Defender\\Spynet", "valueName": "SubmitSamplesConsent", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Microsoft\\Windows Defender\\Spynet", "valueName": "SpyNetReporting", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Cloud-based threat analysis will be reduced", "Tamper Protection may block this change if enabled"],
            "tags": ["security", "defender", "privacy"]
        }),

        // ---- system.disable-edge-startup --------------------------------------
        serde_json::json!({
            "id": "system.disable-edge-startup",
            "name": "Disable Edge Auto-Startup & Background",
            "category": "startup",
            "description": "Disable Microsoft Edge startup boost, background mode, pre-launch, and sidebar.",
            "rationale": "Edge runs background processes even when not in use, consuming memory and CPU. Disabling these behaviors frees resources without uninstalling Edge.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 17763 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_process_count", "directionBetter": "lower", "estimatedDelta": "Eliminates 2-4 Edge background processes", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Edge", "valueName": "StartupBoostEnabled", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Edge", "valueName": "BackgroundModeEnabled", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Edge", "valueName": "PrelaunchEnabled", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\Edge", "valueName": "HubsSidebarEnabled", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Edge will start slower when launched manually", "Edge sidebar features will be disabled"],
            "tags": ["startup", "edge", "debloat", "performance"]
        }),

        // ---- system.disable-edge-updates --------------------------------------
        serde_json::json!({
            "id": "system.disable-edge-updates",
            "name": "Disable Microsoft Edge Auto-Updates",
            "category": "startup",
            "description": "Disable Microsoft Edge automatic update services and scheduled tasks.",
            "rationale": "Edge auto-updates run background services that consume CPU and network. Disabling prevents automatic updates while allowing manual updates when desired.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 17763 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": { "metric": "background_service_count", "directionBetter": "lower", "estimatedDelta": "Eliminates Edge update service and scheduled tasks", "confidence": "measured" },
            "registryChanges": [
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\EdgeUpdate", "valueName": "UpdateDefault", "valueType": "REG_DWORD", "newValue": 0 },
                { "hive": "HKEY_LOCAL_MACHINE", "path": "SOFTWARE\\Policies\\Microsoft\\EdgeUpdate", "valueName": "AutoUpdateCheckPeriodMinutes", "valueType": "REG_DWORD", "newValue": 0 }
            ],
            "serviceChanges": [
                { "serviceName": "edgeupdate", "newStartType": "Disabled" },
                { "serviceName": "edgeupdatem", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Edge will not auto-update; must update manually", "Edge may show update warnings"],
            "tags": ["startup", "edge", "debloat", "updates"]
        }),

        // ---- cpu.scheduler-quantum-gaming -------------------------------------
        serde_json::json!({
            "id": "cpu.scheduler-quantum-gaming",
            "name": "Optimise Scheduler Quantum for Gaming",
            "category": "cpu",
            "description": "Set Win32PrioritySeparation to 0x26 (decimal 38) — short variable quantums with maximum foreground boost — the optimal Windows scheduler configuration for gaming and interactive desktop workloads.",
            "rationale": "Win32PrioritySeparation controls two independent scheduler behaviours: quantum length (how long a thread runs before yielding) and foreground priority boost (how aggressively the OS prioritises the active window). Value 0x26 selects short variable quantums for fast context switching combined with maximum foreground boost, keeping the game thread ahead of background work. This is Windows' own Balanced plan default and has no downside for gaming systems.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "foreground_thread_scheduling_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Game thread preempted less by background processes",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
                    "valueName": "Win32PrioritySeparation",
                    "valueType": "REG_DWORD",
                    "newValue": 38
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Background applications may receive slightly less CPU time while a game is in the foreground"
            ],
            "tags": ["cpu", "scheduler", "gaming", "latency"]
        }),

        // ---- cpu.disable-idle-states ------------------------------------------
        // EXPERT-ONLY: Multiple hard hardware gates apply (see check_hardware_gates).
        // Never surfaces in preset plans — only via direct tuning.applyAction.
        serde_json::json!({
            "id": "cpu.disable-idle-states",
            "name": "Disable CPU Idle States (C-States)",
            "category": "cpu",
            "description": "Force the CPU to remain in C0 (fully active) at all times by disabling idle-state entry via the active power plan. Eliminates C-state transition latency at the cost of continuous full-power operation.",
            "rationale": "C-state entry and exit introduces sub-millisecond latency. For latency-critical workloads running a static all-core overclock with SMT disabled, locking the CPU in C0 eliminates this jitter entirely. Effective only when turbo/dynamic boost is disabled — if the system relies on PBO or Turbo Boost, C-states provide the thermal headroom required for boost clocks and must remain enabled.",
            "tier": "expert",
            "risk": "medium",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "cpu_wakeup_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates C1–C3 exit latency (~1–100 µs depending on depth)",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                {
                    "settingPath": "54533251-82be-4824-96c1-47b60b740d00/5d76a2ca-e8c0-402f-a133-2158492d58ad",
                    "newValue": "1"
                }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "CPU runs at full power continuously — significantly elevated idle temperatures",
                "Eliminates thermal headroom for dynamic boost; pair with static all-core OC only",
                "GATE: incompatible with Hyper-Threading / SMT enabled",
                "GATE: incompatible with hybrid CPU architectures (Intel 12th gen+, AMD X3D)",
                "GATE: not applicable to laptops or battery-powered systems",
                "GATE: requires at least 4 physical CPU cores to be meaningful"
            ],
            "tags": ["cpu", "idle", "latency", "expert", "cstates"]
        }),

        // ---- audio.disable-enhancements ------------------------------------------
        serde_json::json!({
            "id": "audio.disable-enhancements",
            "name": "Disable Audio Enhancements",
            "category": "audio",
            "description": "Disable Windows audio enhancements (spatial audio, equalizer, virtual surround, loudness equalization) to reduce audio processing overhead and DPC latency.",
            "rationale": "Audio enhancements add DSP processing stages in the audio pipeline, increasing DPC latency. Disabling provides the shortest audio processing path.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "audio_dpc_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Reduces audio driver DPC time by ~50-200 us per buffer",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
                    "valueName": "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Spatial audio (Windows Sonic, Dolby Atmos for Headphones) will be disabled",
                "Any configured equalizer or loudness normalization will stop working"
            ],
            "tags": ["audio", "latency", "dpc", "gaming"]
        }),

        // ---- audio.exclusive-mode ------------------------------------------------
        serde_json::json!({
            "id": "audio.exclusive-mode",
            "name": "Configure WASAPI Exclusive Mode Priority",
            "category": "audio",
            "description": "Ensure WASAPI exclusive mode is enabled for audio endpoints, allowing games and applications to bypass the Windows audio mixer for direct hardware access with lowest latency.",
            "rationale": "WASAPI exclusive mode gives direct access to audio hardware, bypassing the shared mode mixer. This eliminates resampling and mixing latency.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "audio_pipeline_latency",
                "directionBetter": "lower",
                "estimatedDelta": "~3-10ms reduction in end-to-end audio latency",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
                    "valueName": "{b3f8fa53-0004-438e-9003-51a46e139bfc},3",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
                    "valueName": "{b3f8fa53-0004-438e-9003-51a46e139bfc},4",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "When an application uses exclusive mode, all other applications lose audio output",
                "Discord, Spotify, and other audio sources will be muted while exclusive mode is active"
            ],
            "tags": ["audio", "latency", "wasapi", "gaming"]
        }),

        // ---- cpu.disable-core-parking --------------------------------------------
        serde_json::json!({
            "id": "cpu.disable-core-parking",
            "name": "Disable CPU Core Parking",
            "category": "cpu",
            "description": "Set minimum processor cores to 100% on AC power, preventing Windows from parking cores during low load.",
            "rationale": "Core parking powers down unused cores to save energy but causes 1-5 ms wake latency when threads need more cores. On a desktop this only adds latency jitter.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "core_wake_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates 1-5 ms parking wake latency",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/0cc5b647-c1df-4637-891a-dec35c318583", "newValue": "100" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Higher idle power consumption (~5-15 W on a desktop system)",
                "All CPU cores remain active even during idle periods",
                "Not recommended for laptops on battery power"
            ],
            "tags": ["cpu", "parking", "latency", "gaming"]
        }),

        // ---- cpu.win32-priority-separation ---------------------------------------
        serde_json::json!({
            "id": "cpu.win32-priority-separation",
            "name": "Win32PrioritySeparation -> 0x26 (Gaming)",
            "category": "cpu",
            "description": "Set scheduler to Short, Variable quantum with 2:1 foreground boost for optimal gaming responsiveness.",
            "rationale": "Windows default is 0x02. Value 0x26 (38 decimal) provides optimal gaming responsiveness per kernel debugger analysis, affecting wait completion priority boosts.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "scheduler_responsiveness",
                "directionBetter": "higher",
                "estimatedDelta": "Measurable in frame-time consistency",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
                    "valueName": "Win32PrioritySeparation",
                    "valueType": "REG_DWORD",
                    "newValue": 38
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Background tasks get relatively less CPU time"],
            "tags": ["scheduler", "gaming", "latency"]
        }),

        // ---- display.disable-game-bar --------------------------------------------
        serde_json::json!({
            "id": "display.disable-game-bar",
            "name": "Disable Game Bar and Game DVR",
            "category": "display",
            "description": "Disable the Xbox Game Bar overlay and Game DVR background recording, removing the capture pipeline from the display path.",
            "rationale": "Game Bar injects a capture hook into every DirectX application and Game DVR maintains a background recording buffer. Disabling both removes overlay injection and stops background encoding.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "gpu_encode_overhead",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates background DVR encoding (~2-5% GPU on supported hardware)",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR",
                    "valueName": "AppCaptureEnabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR",
                    "valueName": "AllowGameDVR",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "System\\GameConfigStore",
                    "valueName": "GameDVR_Enabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Cannot use Game Bar overlay (Win+G) for screenshots or recording",
                "Game Bar FPS counter and performance overlay will not be available"
            ],
            "tags": ["display", "gaming", "debloat", "performance"]
        }),

        // ---- display.disable-pointer-acceleration --------------------------------
        serde_json::json!({
            "id": "display.disable-pointer-acceleration",
            "name": "Disable Mouse Pointer Acceleration",
            "category": "display",
            "description": "Disable Windows pointer acceleration (Enhance Pointer Precision) by setting MouseSpeed, MouseThreshold1, and MouseThreshold2 to 0.",
            "rationale": "Pointer acceleration applies a non-linear multiplier to mouse movement, making precise aiming inconsistent. Setting thresholds to 0 creates a 1:1 mapping for consistent muscle memory.",
            "tier": "free",
            "risk": "safe",
            "compatibility": {},
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "mouse_input_linearity",
                "directionBetter": "higher",
                "estimatedDelta": "1:1 mouse movement (eliminates variable acceleration curve)",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "Control Panel\\Mouse",
                    "valueName": "MouseSpeed",
                    "valueType": "REG_SZ",
                    "newValue": "0"
                },
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "Control Panel\\Mouse",
                    "valueName": "MouseThreshold1",
                    "valueType": "REG_SZ",
                    "newValue": "0"
                },
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "Control Panel\\Mouse",
                    "valueName": "MouseThreshold2",
                    "valueType": "REG_SZ",
                    "newValue": "0"
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Desktop mouse movement may feel different if previously relying on acceleration"],
            "tags": ["input", "mouse", "gaming", "latency"]
        }),

        // ---- display.disable-transparency ----------------------------------------
        serde_json::json!({
            "id": "display.disable-transparency",
            "name": "Disable Transparency Effects",
            "category": "display",
            "description": "Disable Windows transparency and blur effects (acrylic, Mica) in the desktop compositor.",
            "rationale": "Transparency effects require additional DWM compositor blending passes. Disabling eliminates these GPU cycles, freeing resources for games.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "dwm_compositor_overhead",
                "directionBetter": "lower",
                "estimatedDelta": "Reduces DWM GPU usage by ~1-3%",
                "confidence": "estimated"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
                    "valueName": "EnableTransparency",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Taskbar, Start menu, and window chrome will appear opaque"],
            "tags": ["display", "compositor", "performance", "visual"]
        }),

        // ---- gaming.enable-game-mode ---------------------------------------------
        serde_json::json!({
            "id": "gaming.enable-game-mode",
            "name": "Enable Windows Game Mode",
            "category": "gaming",
            "description": "Enable Windows Game Mode, which adjusts OS resource allocation to favor the active game process  -  reducing background task interference.",
            "rationale": "Game Mode suppresses background Windows Update activity, reduces background CPU allocation, and signals the GPU scheduler to prioritize the game process.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 15063 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "background_interference",
                "directionBetter": "lower",
                "estimatedDelta": "Reduces background CPU contention during active game sessions",
                "confidence": "estimated"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "Software\\Microsoft\\GameBar",
                    "valueName": "AutoGameModeEnabled",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_CURRENT_USER",
                    "path": "Software\\Microsoft\\GameBar",
                    "valueName": "AllowAutoGameMode",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Windows Update installations may be deferred while a game is running",
                "Background recording features may be affected when Game DVR is active"
            ],
            "tags": ["gaming", "game-mode", "scheduling", "free"]
        }),

        // ---- gpu.disable-hags ----------------------------------------------------
        serde_json::json!({
            "id": "gpu.disable-hags",
            "name": "Disable Hardware-Accelerated GPU Scheduling (HAGS)",
            "category": "gpu",
            "description": "Disable HAGS by setting HwSchMode to 1. HAGS can hurt frame time consistency on many systems.",
            "rationale": "HAGS improves frame time consistency on some systems but worsens it on others. Disabling provides more predictable behavior.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 19041 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "frame_time_consistency",
                "directionBetter": "higher",
                "estimatedDelta": "System-dependent; eliminates HAGS-induced stutter on affected systems",
                "confidence": "estimated"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
                    "valueName": "HwSchMode",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": ["Games that benefit from HAGS may see slightly higher CPU overhead"],
            "tags": ["gpu", "latency", "gaming", "hags"]
        }),

        // ---- gpu.msi-mode --------------------------------------------------------
        serde_json::json!({
            "id": "gpu.msi-mode",
            "name": "Enable GPU MSI (Message Signaled Interrupts) Mode",
            "category": "gpu",
            "description": "Enable Message Signaled Interrupts for the GPU, replacing legacy line-based interrupts with in-band PCIe messages for lower interrupt latency.",
            "rationale": "MSI mode eliminates shared IRQ lines. MSI writes interrupt data directly to memory via PCIe, reducing DPC latency for GPU interrupts.",
            "tier": "premium",
            "risk": "medium",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "gpu_interrupt_latency",
                "directionBetter": "lower",
                "estimatedDelta": "~5-15 us reduction in GPU DPC latency",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Enum\\PCI\\<GPU Device ID>\\<Instance>\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties",
                    "valueName": "MSISupported",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": ["Requires identifying GPU PCI device path; incorrect path has no effect", "Some older GPUs may not support MSI properly"],
            "tags": ["gpu", "latency", "interrupt", "msi"]
        }),

        // ---- gpu.tdr-delay -------------------------------------------------------
        serde_json::json!({
            "id": "gpu.tdr-delay",
            "name": "Increase TDR Timeout to 10 Seconds",
            "category": "gpu",
            "description": "Increase the Timeout Detection and Recovery (TDR) delay from 2 to 10 seconds, preventing false GPU resets during heavy load spikes.",
            "rationale": "The default 2-second TDR timeout causes false GPU resets during shader compilation and heavy compute loads. Increasing to 10 seconds prevents unnecessary recovery cycles.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "gpu_reset_frequency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates false TDR resets during load spikes",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
                    "valueName": "TdrDelay",
                    "valueType": "REG_DWORD",
                    "newValue": 10
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
                    "valueName": "TdrDdiDelay",
                    "valueType": "REG_DWORD",
                    "newValue": 10
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Genuine GPU hangs will take longer to recover from"],
            "tags": ["gpu", "stability", "tdr"]
        }),

        // ---- memory.disable-compression ------------------------------------------
        serde_json::json!({
            "id": "memory.disable-compression",
            "name": "Disable Memory Compression",
            "category": "memory",
            "description": "Disable the Windows memory compression agent that compresses in-memory pages, trading CPU cycles for capacity.",
            "rationale": "Memory compression uses CPU cycles to compress pages. On systems with ample RAM (16 GB+), the overhead is unnecessary and can cause micro-stutter.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "cpu_overhead",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates compression CPU spikes (~1-3% CPU reduction under memory pressure)",
                "confidence": "estimated"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": [
                "Higher physical memory usage since pages are stored uncompressed",
                "Systems with less than 16 GB RAM may hit memory pressure sooner"
            ],
            "tags": ["memory", "cpu", "latency", "gaming"]
        }),

        // ---- memory.disable-pagefile ---------------------------------------------
        serde_json::json!({
            "id": "memory.disable-pagefile",
            "name": "Disable Paging File (32 GB+ Systems)",
            "category": "memory",
            "description": "Disable the Windows paging file entirely. Only safe on systems with 32 GB+ RAM.",
            "rationale": "The paging file causes random I/O when memory pressure triggers page-outs. On systems with 32 GB+ RAM, disabling eliminates paging I/O entirely.",
            "tier": "premium",
            "risk": "medium",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "paging_io_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates page-out I/O stalls completely",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
                    "valueName": "PagingFiles",
                    "valueType": "REG_MULTI_SZ",
                    "newValue": []
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": [
                "Kernel crash dumps (BSOD analysis) will not be available",
                "Applications that require a pagefile may fail to launch",
                "Systems with less than 32 GB RAM may become unstable under heavy load"
            ],
            "tags": ["memory", "latency", "gaming", "advanced"]
        }),

        // ---- memory.large-pages --------------------------------------------------
        serde_json::json!({
            "id": "memory.large-pages",
            "name": "Enable Large Pages (SeLockMemoryPrivilege)",
            "category": "memory",
            "description": "Grant the current user the SeLockMemoryPrivilege, enabling applications to request 2 MB large pages instead of 4 KB standard pages.",
            "rationale": "Large pages reduce TLB misses significantly for memory-intensive games, improving frame times.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "tlb_miss_rate",
                "directionBetter": "lower",
                "estimatedDelta": "Up to 10-30% fewer TLB misses in supported applications",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": true,
            "sideEffects": [
                "Requires user to be added to 'Lock pages in memory' security policy",
                "Applications must explicitly request large pages to benefit",
                "Memory fragmentation over time may reduce large page availability"
            ],
            "tags": ["memory", "latency", "gaming", "tlb"]
        }),

        // ---- network.disable-nagle -----------------------------------------------
        serde_json::json!({
            "id": "network.disable-nagle",
            "name": "Disable Nagle's Algorithm (TCPNoDelay)",
            "category": "network",
            "description": "Disable Nagle's algorithm and set TCP acknowledgement frequency to 1, sending small packets immediately instead of buffering.",
            "rationale": "Nagle's algorithm buffers small TCP packets, introducing up to 200ms delay for game packets. Disabling ensures immediate transmission.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "tcp_packet_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Up to 200ms reduction in small packet delivery time",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\<Interface GUID>",
                    "valueName": "TcpAckFrequency",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\<Interface GUID>",
                    "valueName": "TCPNoDelay",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Slightly higher network overhead from more frequent small packets"],
            "tags": ["network", "latency", "tcp", "gaming"]
        }),

        // ---- network.rss-queues-2 ------------------------------------------------
        serde_json::json!({
            "id": "network.rss-queues-2",
            "name": "Set RSS Queues to 2",
            "category": "network",
            "description": "Configure Receive Side Scaling to use 2 RSS queues, distributing NIC interrupt processing across 2 CPU cores without over-allocating.",
            "rationale": "For typical online gaming traffic, 1-2 RSS queues is sufficient. Over-allocating wastes CPU resources that could serve game DPCs.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "network_interrupt_distribution",
                "directionBetter": "higher",
                "estimatedDelta": "Optimal interrupt distribution without CPU waste",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}\\<Adapter Index>",
                    "valueName": "*NumRssQueues",
                    "valueType": "REG_DWORD",
                    "newValue": 2
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["High-bandwidth transfers (downloads) may be slightly slower than with more queues"],
            "tags": ["network", "rss", "latency", "gaming"]
        }),

        // ---- network.tcp-autotuning-normal ---------------------------------------
        serde_json::json!({
            "id": "network.tcp-autotuning-normal",
            "name": "Set TCP Auto-Tuning to Normal",
            "category": "network",
            "description": "Ensure TCP receive window auto-tuning is active and window scaling (RFC 1323) is enabled for optimal throughput.",
            "rationale": "Some guides wrongly disable TCP window scaling, which caps the receive window at 64 KB. Ensuring Tcp1323Opts=1 keeps RFC 1323 active for full capacity.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "tcp_throughput",
                "directionBetter": "higher",
                "estimatedDelta": "Ensures optimal TCP window scaling (vs disabled which caps at 64KB)",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters",
                    "valueName": "Tcp1323Opts",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [],
            "tags": ["network", "tcp", "throughput"]
        }),

        // ---- power.disable-hibernation -------------------------------------------
        serde_json::json!({
            "id": "power.disable-hibernation",
            "name": "Disable Hibernation",
            "category": "power",
            "description": "Disable Windows hibernation, removing hiberfil.sys and freeing disk space equal to ~75% of installed RAM.",
            "rationale": "With Fast Startup disabled, hibernation provides no benefit and consumes significant disk space. Cold boot on NVMe is fast enough.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": ["power.disable-fast-startup"],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "available_disk_space",
                "directionBetter": "higher",
                "estimatedDelta": "Frees ~75% of RAM capacity in disk space (e.g., ~24 GB on a 32 GB system)",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Power",
                    "valueName": "HibernateEnabled",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Hibernate option is removed from the Power menu",
                "Fast Startup will also be disabled as a side effect (both rely on hiberfil.sys)",
                "hiberfil.sys is deleted, freeing significant disk space"
            ],
            "tags": ["power", "disk", "boot", "free"]
        }),

        // ---- power.disable-pcie-link-state-pm ------------------------------------
        serde_json::json!({
            "id": "power.disable-pcie-link-state-pm",
            "name": "Disable PCIe Link State Power Management",
            "category": "power",
            "description": "Disable ASPM transitions on PCIe devices, preventing low-power link states (L0s, L1) during idle periods.",
            "rationale": "PCIe ASPM transitions add latency when re-entering the active state. Disabling eliminates intermittent latency spikes on GPU and NVMe paths.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "pcie_transition_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates PCIe link state re-entry latency (1-10 us typical, up to several ms)",
                "confidence": "estimated"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "501a4d13-42af-4429-9fd1-a8218c268e20/ee12f906-d277-404b-b6da-e5fa1a576df5", "newValue": "0" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "PCIe devices remain in full-power state at all times, increasing system power draw",
                "Not recommended for laptops where battery life is a priority"
            ],
            "tags": ["power", "pcie", "latency", "gaming"]
        }),

        // ---- power.disable-usb-selective-suspend ---------------------------------
        serde_json::json!({
            "id": "power.disable-usb-selective-suspend",
            "name": "Disable USB Selective Suspend",
            "category": "power",
            "description": "Disable USB selective suspend, preventing Windows from powering down USB devices during idle periods.",
            "rationale": "USB selective suspend causes input latency spikes when mice, keyboards, and controllers must wake from suspended state.",
            "tier": "premium",
            "risk": "safe",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "usb_input_latency",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates USB wake latency spikes (~5-50ms per event)",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "2a737441-1930-4402-8d77-b2bebba308a3/48e6b7a6-50f5-4782-a5d4-53bb8f07e226", "newValue": "0" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["USB devices remain powered at all times, increasing power draw slightly"],
            "tags": ["power", "usb", "input", "latency", "gaming"]
        }),

        // ---- power.high-performance-plan -----------------------------------------
        serde_json::json!({
            "id": "power.high-performance-plan",
            "name": "Activate High Performance Power Plan",
            "category": "power",
            "description": "Set the active power plan to Windows High Performance, preventing CPU frequency scaling and sleep transitions.",
            "rationale": "The Balanced plan dynamically scales CPU frequency and allows C-state transitions. High Performance keeps CPU at max frequency for consistent frame times.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "cpu_frequency_consistency",
                "directionBetter": "higher",
                "estimatedDelta": "Eliminates frequency scaling latency (~1-5ms wake from C-states)",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [],
            "powerChanges": [
                { "settingPath": "SCHEME_CURRENT\\SUB_PROCESSOR\\PROCTHROTTLEMIN", "newValue": "100" },
                { "settingPath": "SCHEME_CURRENT\\SUB_PROCESSOR\\PROCTHROTTLEMAX", "newValue": "100" }
            ],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Higher idle power consumption and heat output", "Laptop battery life significantly reduced"],
            "tags": ["power", "performance", "gaming", "latency"]
        }),

        // ---- scheduler.mmcss-gaming-profile --------------------------------------
        serde_json::json!({
            "id": "scheduler.mmcss-gaming-profile",
            "name": "MMCSS Gaming Profile  -  Maximum Priority",
            "category": "scheduler",
            "description": "Configure the MMCSS Games task profile with maximum GPU priority (8), elevated CPU priority (6), High scheduling category, and 1 ms clock rate. Removes network throttle and dedicates full MMCSS resources to the foreground application.",
            "rationale": "MMCSS manages thread priorities for multimedia applications. This bundle provides the highest-value registry configuration for consistent frame times and low-latency gameplay.",
            "tier": "premium",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "frame_time_consistency",
                "directionBetter": "higher",
                "estimatedDelta": "Measurable reduction in frame time variance and network latency for online games",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "GPU Priority",
                    "valueType": "REG_DWORD",
                    "newValue": 8
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Priority",
                    "valueType": "REG_DWORD",
                    "newValue": 6
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Scheduling Category",
                    "valueType": "REG_SZ",
                    "newValue": "High"
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Clock Rate",
                    "valueType": "REG_DWORD",
                    "newValue": 10000
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Affinity",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Background Only",
                    "valueType": "REG_SZ",
                    "newValue": "False"
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
                    "valueName": "NetworkThrottlingIndex",
                    "valueType": "REG_DWORD",
                    "newValue": 4294967295_u64
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
                    "valueName": "SystemResponsiveness",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Background applications receive less CPU time when a game is running",
                "Network throttling removal increases CPU interrupt rate from NIC for all applications"
            ],
            "tags": ["scheduler", "mmcss", "latency", "gaming", "network"]
        }),

        // ---- startup.disable-automatic-maintenance --------------------------------
        serde_json::json!({
            "id": "startup.disable-automatic-maintenance",
            "name": "Disable Automatic Maintenance",
            "category": "startup",
            "description": "Disable Windows Automatic Maintenance which runs scheduled tasks during idle periods including disk defragmentation, update checks, and security scans.",
            "rationale": "Automatic Maintenance can activate during gaming sessions (loading screens, low-GPU moments), causing sudden CPU, disk, and network spikes.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "background_task_interference",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates maintenance-induced I/O and CPU spikes",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance",
                    "valueName": "MaintenanceDisabled",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Disk optimization (TRIM for SSDs) must be run manually",
                "Windows Defender scheduled scans will not run automatically"
            ],
            "tags": ["startup", "maintenance", "debloat", "performance"]
        }),

        // ---- startup.disable-autoplay --------------------------------------------
        serde_json::json!({
            "id": "startup.disable-autoplay",
            "name": "Disable AutoPlay and AutoRun",
            "category": "startup",
            "description": "Disable AutoPlay for all drive types and AutoRun, preventing automatic program execution when media is inserted.",
            "rationale": "AutoPlay/AutoRun is a security risk (malware autorun vectors) and a source of unwanted background activity. Disabling hardens the system.",
            "tier": "free",
            "risk": "safe",
            "compatibility": {},
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": null,
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer",
                    "valueName": "NoDriveTypeAutoRun",
                    "valueType": "REG_DWORD",
                    "newValue": 255
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer",
                    "valueName": "NoAutorun",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer",
                    "valueName": "NoAutoplayfornonVolume",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["USB drives and optical discs will not automatically open when inserted"],
            "tags": ["startup", "security", "autoplay"]
        }),

        // ---- startup.disable-background-apps -------------------------------------
        serde_json::json!({
            "id": "startup.disable-background-apps",
            "name": "Disable Background Apps",
            "category": "startup",
            "description": "Prevent UWP/Store apps from running in the background by setting LetAppsRunInBackground to 2 (force deny).",
            "rationale": "UWP apps execute background tasks for notifications, updates, and tile refreshes. Disabling frees CPU, memory, and network resources for gaming.",
            "tier": "free",
            "risk": "safe",
            "compatibility": { "minBuild": 10240 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "background_cpu_usage",
                "directionBetter": "lower",
                "estimatedDelta": "Reduces idle CPU usage by ~1-5%",
                "confidence": "estimated"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy",
                    "valueName": "LetAppsRunInBackground",
                    "valueType": "REG_DWORD",
                    "newValue": 2
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "UWP app notifications may be delayed or not received",
                "Store apps will not update live tiles",
                "Alarms & Clock app background alarms may not fire"
            ],
            "tags": ["startup", "debloat", "performance", "uwp"]
        }),

        // ---- storage.disable-indexing --------------------------------------------
        serde_json::json!({
            "id": "storage.disable-indexing",
            "name": "Disable Windows Search Indexing Service",
            "category": "storage",
            "description": "Disable the Windows Search indexing service (WSearch) which continuously scans and indexes file contents in the background.",
            "rationale": "The indexer consumes disk I/O, CPU, and memory. For gaming systems, disabling eliminates background I/O contention that can cause micro-stutter.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "background_disk_io",
                "directionBetter": "lower",
                "estimatedDelta": "Eliminates indexer I/O spikes (can be 10-50 MB/s during indexing)",
                "confidence": "measured"
            },
            "registryChanges": [],
            "serviceChanges": [
                { "serviceName": "WSearch", "newStartType": "Disabled" }
            ],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Windows Search and Start menu file search will be significantly slower",
                "Outlook desktop search will not work without indexing"
            ],
            "tags": ["storage", "debloat", "performance", "service"]
        }),

        // ---- storage.enable-write-caching ----------------------------------------
        serde_json::json!({
            "id": "storage.enable-write-caching",
            "name": "Enable Disk Write Caching",
            "category": "storage",
            "description": "Enable write caching on storage devices, allowing the OS to buffer writes in RAM before flushing to disk.",
            "rationale": "Write caching allows the storage driver to acknowledge writes before reaching physical media, improving random write performance for shader caches and save files.",
            "tier": "free",
            "risk": "low",
            "compatibility": { "minBuild": 7600 },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "random_write_latency",
                "directionBetter": "lower",
                "estimatedDelta": "2-10x improvement in random write throughput",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Enum\\SCSI\\<device>\\<instance>\\Device Parameters\\Disk",
                    "valueName": "UserWriteCacheSetting",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SYSTEM\\CurrentControlSet\\Enum\\SCSI\\<device>\\<instance>\\Device Parameters\\Disk",
                    "valueName": "CacheIsPowerProtected",
                    "valueType": "REG_DWORD",
                    "newValue": 1
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": ["Risk of data loss if power is lost during a write (mitigated by UPS or SSD capacitors)"],
            "tags": ["storage", "write-cache", "performance"]
        }),

        // ---- system.defender-add-game-exclusions ---------------------------------
        serde_json::json!({
            "id": "system.defender-add-game-exclusions",
            "name": "Add Game Directory Exclusions to Windows Defender",
            "category": "security",
            "description": "Analyze installed game directories (Steam, Epic, GOG, etc.) and add them to Windows Defender's real-time protection exclusion list.",
            "rationale": "Defender real-time scanning intercepts every file read, adding 1-5ms per I/O. Adding game directories to exclusions eliminates this overhead during level loads.",
            "tier": "free",
            "risk": "low",
            "compatibility": {
                "minBuild": 10240,
                "requiresAdmin": true
            },
            "dependencies": [],
            "conflicts": [],
            "estimatedImpact": {
                "metric": "game_load_time",
                "directionBetter": "lower",
                "estimatedDelta": "~5-20% faster level/asset loading",
                "confidence": "measured"
            },
            "registryChanges": [
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths",
                    "valueName": "{dynamic:steam_library}",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths",
                    "valueName": "{dynamic:epic_vault}",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                },
                {
                    "hive": "HKEY_LOCAL_MACHINE",
                    "path": "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths",
                    "valueName": "{dynamic:gog_library}",
                    "valueType": "REG_DWORD",
                    "newValue": 0
                }
            ],
            "serviceChanges": [],
            "powerChanges": [],
            "bcdChanges": [],
            "requiresReboot": false,
            "sideEffects": [
                "Files in excluded directories will not be scanned by real-time protection",
                "If a game mod or download contains malware, Defender will not catch it in these folders",
                "Tamper Protection may block registry-based exclusion changes  -  use PowerShell Add-MpPreference as fallback",
                "Exclusion paths are dynamically detected at execution time based on installed launchers"
            ],
            "tags": ["defender", "gaming", "performance", "exclusions"]
        }),
    ]
}

/// Return all embedded action definitions, optionally filtered by category.
pub fn get_actions(category: Option<&str>) -> Vec<serde_json::Value> {
    let all = embedded_actions();
    match category {
        Some(cat) => all
            .into_iter()
            .filter(|a| a.get("category").and_then(|v| v.as_str()) == Some(cat))
            .collect(),
        None => all,
    }
}

// ---- Hardware Gate -----------------------------------------------------------
//
// Fourteen gate rules that suppress actions when the device profile indicates
// the tweak would be unsafe, ineffective, or actively harmful on this hardware.
//
// Every rule defaults to PASS when the required scanner field is absent — we
// never block an action solely because the profile is incomplete.

/// Outcome of evaluating hardware gate rules for a single action.
///
/// `gate_hit` is `Some(reason)` when the action is suppressed.  `None` means
/// all applicable rules passed and the action is appropriate for this hardware.
pub struct HardwareGateOutcome {
    pub gate_hit: Option<String>,
}

impl HardwareGateOutcome {
    pub fn pass() -> Self {
        Self { gate_hit: None }
    }
    pub fn block(reason: impl Into<String>) -> Self {
        Self {
            gate_hit: Some(reason.into()),
        }
    }
}

/// Evaluate all 14 hardware-aware gate rules for `action_id`.
///
/// Rules
/// ─────
///  1. cpu.disable-idle-states   — SMT / Hyper-Threading gate
///  2. cpu.disable-idle-states   — Hybrid CPU architecture gate (Intel 12th gen+, AMD X3D)
///  3. cpu.disable-idle-states   — Laptop / battery-powered device gate
///  4. cpu.disable-idle-states   — Insufficient physical core count gate (< 4 cores)
///  5. services.disable-sysmain  — HDD presence gate (SSD-only systems only)
///  6. cpu.global-timer-resolution — Strict Windows 11 22H2 build 22621 gate
///  7. cpu.reduce-parking-aggressiveness — Laptop / mobile device gate
///  8. cpu.min-processor-state-100 — Laptop / mobile device gate
///  9. cpu.aggressive-boost-mode — Laptop / mobile device gate
/// 10. cpu.disable-dynamic-tick  — Laptop / mobile device gate
/// 11. gpu.nvidia-disable-dynamic-pstate — NVIDIA-only vendor gate
/// 12. security.reduce-ssbd-mitigation — AMD hardware-SSBD gate (no software benefit on AMD)
/// 13. cpu.disable-idle-states   — AMD X3D V-Cache boost-state dependency gate
///                                 (handled via Rule 2 hybrid-CPU check)
/// 14. cpu.scheduler-quantum-gaming — No gate; universally applicable on all hardware
pub fn check_hardware_gates(action_id: &str, profile: &serde_json::Value) -> HardwareGateOutcome {
    // ---- Extract profile fields (all with safe permissive defaults) ----------

    let device_class = profile
        .get("deviceClass")
        .and_then(|v| v.as_str())
        .unwrap_or("desktop");

    let power_source = profile
        .get("power")
        .and_then(|p| p.get("source"))
        .and_then(|v| v.as_str())
        .unwrap_or("ac");

    // "Mobile" = laptop chassis or currently on battery.
    // Both conditions are checked so a desktop temporarily on UPS that shows
    // "battery" is not wrongly gated; only true laptops and tablets are.
    let is_mobile = matches!(device_class, "laptop" | "tablet" | "notebook")
        || power_source == "battery";

    let cpu = profile.get("cpu");

    let cpu_vendor = cpu
        .and_then(|c| c.get("vendor"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let cpu_brand = cpu
        .and_then(|c| c.get("brand"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // smt_enabled is Option<bool>: None means "not scanned" → don't gate.
    let smt_enabled: Option<bool> = cpu
        .and_then(|c| c.get("smtEnabled"))
        .and_then(|v| v.as_bool());

    let physical_cores: Option<u64> = cpu
        .and_then(|c| c.get("physicalCores"))
        .and_then(|v| v.as_u64());

    let logical_cores: Option<u64> = cpu
        .and_then(|c| c.get("logicalCores"))
        .and_then(|v| v.as_u64());

    let windows_build: Option<u32> = profile
        .get("windows")
        .and_then(|w| w.get("build"))
        .and_then(|v| v.as_u64())
        .map(|b| b as u32);

    // gpu_vendor: empty string → "not scanned"; only gate if we have real data.
    let gpu_vendor = profile
        .get("gpus")
        .and_then(|g| g.as_array())
        .and_then(|arr| arr.first())
        .and_then(|g| g.get("vendor"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let has_hdd = profile
        .get("storage")
        .and_then(|s| s.as_array())
        .map(|drives| {
            drives.iter().any(|d| {
                d.get("type")
                    .and_then(|v| v.as_str())
                    .map(|t| t.eq_ignore_ascii_case("HDD"))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false); // missing storage data → assume SSD (don't gate)

    // ---- Hybrid CPU detection -----------------------------------------------
    //
    // Intel 12th gen (Alder Lake) and later pair Performance cores with
    // Efficiency cores.  The Windows heterogeneous thread scheduler relies on
    // idle-state signalling between core types; disabling C-states on these
    // CPUs disrupts inter-core frequency coordination.
    //
    // AMD X3D (3D V-Cache) CPUs use asymmetric boost states where the cache
    // die's thermal state is coupled to C-state management.  Disabling idle
    // states can prevent the boost algorithm from accessing full V-Cache
    // bandwidth.
    //
    // Detection heuristics (all defaulting to false when data is absent):
    //   H1: Intel brand string contains generation marker
    //   H2: Logical/physical core ratio is neither 1:1 nor 2:1 (e.g. 24C/32T
    //       Intel hybrid) — abnormal ratio strongly implies hybrid topology
    //   H3: AMD X3D brand marker
    let brand_lower = cpu_brand.to_ascii_lowercase();
    let is_intel_hybrid = cpu_vendor == "Intel"
        && (brand_lower.contains("12th gen")
            || brand_lower.contains("13th gen")
            || brand_lower.contains("14th gen")
            || brand_lower.contains("core ultra")
            || brand_lower.contains("meteor lake")
            || brand_lower.contains("lunar lake")
            || brand_lower.contains("raptor lake")
            || brand_lower.contains("alder lake"));
    let is_amd_x3d = cpu_vendor == "AMD" && brand_lower.contains("x3d");
    let has_abnormal_core_ratio = match (physical_cores, logical_cores) {
        (Some(p), Some(l)) if p > 0 && l > 0 => l != p && l != p * 2,
        _ => false,
    };
    let is_hybrid_cpu = is_intel_hybrid || is_amd_x3d || has_abnormal_core_ratio;

    // ---- Gate rules ---------------------------------------------------------

    match action_id {
        // ───────────────────────────────────────── Rules 1, 2, 3, 4, 13
        // cpu.disable-idle-states
        //
        // Disabling C-states forces all cores into C0 (fully active) at all
        // times.  This tweak is only safe and beneficial in a narrow operating
        // envelope: desktop system, SMT disabled, non-hybrid CPU, static
        // all-core OC, at least 4 physical cores.  Multiple independent gates
        // guard this action.
        "cpu.disable-idle-states" => {
            // Rule 1: SMT / Hyper-Threading gate ──────────────────────────────
            // HT sibling threads use C-state transitions to donate thermal
            // budget to the active thread, enabling sustained turbo clocks.
            // Disabling idle states with SMT on causes a net single-threaded
            // regression — the active core gets no thermal headroom from its
            // sibling, so boost collapses earlier.
            if smt_enabled == Some(true) {
                return HardwareGateOutcome::block(
                    "Hyper-Threading / SMT is enabled on this CPU. C-state transitions on \
                     sibling threads provide the thermal headroom that sustains turbo boost. \
                     Disabling idle states with SMT active reduces single-threaded \
                     performance. Disable SMT in BIOS first.",
                );
            }

            // Rule 2 & 13: Hybrid CPU architecture gate (Intel) + AMD X3D gate
            // Intel 12th gen+ P+E core topology and AMD X3D V-Cache both rely
            // on OS-coordinated idle-state management.  Forcing C0-only breaks
            // the heterogeneous scheduler and V-Cache boost algorithm.
            if is_hybrid_cpu {
                return HardwareGateOutcome::block(
                    "Hybrid CPU architecture detected (Intel 12th gen+ P+E cores or AMD \
                     X3D V-Cache). These processors depend on idle-state transitions for \
                     inter-core frequency coordination and cache-tier boost management. \
                     Disabling C-states causes frequency instability and defeats the \
                     V-Cache access optimisation on X3D variants.",
                );
            }

            // Rule 3: Laptop / battery device gate ────────────────────────────
            // Forcing C0-only prevents any power-saving state on mobile
            // hardware, causing continuous full-power dissipation, rapid battery
            // drain, and thermal throttling on systems not designed for it.
            if is_mobile {
                return HardwareGateOutcome::block(
                    "Laptop or battery-powered device detected. Disabling idle states \
                     prevents the CPU from entering any power-saving state, causing \
                     continuous full-power operation, dramatically increased heat, and \
                     severe battery drain. This optimisation is strictly for desktop \
                     systems with adequate active cooling.",
                );
            }

            // Rule 4: Insufficient physical core count gate ───────────────────
            // With fewer than 4 physical cores the latency reduction is
            // marginal (fewer context switches compete) while the thermal cost
            // is severe — the single/dual core loses all thermal headroom for
            // boost clocks.
            if physical_cores.map(|p| p < 4).unwrap_or(false) {
                return HardwareGateOutcome::block(
                    "CPU has fewer than 4 physical cores. With a low core count, \
                     disabling idle states eliminates the thermal headroom required for \
                     sustained boost clocks, negating any latency benefit and reducing \
                     overall performance.",
                );
            }

            HardwareGateOutcome::pass()
        }

        // ──────────────────────────────────────────────────────────── Rule 5
        // services.disable-sysmain
        //
        // SysMain (Superfetch) pre-loads frequently accessed data during idle
        // periods.  On mechanical disks (random read ~5 ms) it provides a
        // meaningful reduction in perceived application load times.  On NVMe
        // SSDs (random read ~50 µs) the prefetch overhead outweighs the
        // benefit — the drive is fast enough that pre-loading is unnecessary.
        "services.disable-sysmain" => {
            if has_hdd {
                return HardwareGateOutcome::block(
                    "One or more mechanical hard drives (HDD) detected. SysMain provides \
                     meaningful prefetch benefit on spinning-disk systems by amortising \
                     high rotational seek latency across idle periods. Disabling it on an \
                     HDD system will increase application cold-start times.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // ──────────────────────────────────────────────────────────── Rule 6
        // cpu.global-timer-resolution
        //
        // GlobalTimerResolutionRequests restores the pre-Windows 10 2004
        // behaviour where any process calling timeBeginPeriod(1) raises the
        // system-wide timer resolution.  The feature is only implemented in
        // Windows 11 22H2 (build 22621+); on earlier builds the registry key
        // is silently ignored.
        "cpu.global-timer-resolution" => {
            if let Some(build) = windows_build {
                if build < 22621 {
                    return HardwareGateOutcome::block(
                        "GlobalTimerResolutionRequests requires Windows 11 22H2 (build \
                         22621+). Earlier builds — including all Windows 10 releases and \
                         Windows 11 21H2/22H1 — silently ignore this registry value. \
                         Applying it on this system has no effect.",
                    );
                }
            }
            HardwareGateOutcome::pass()
        }

        // ──────────────────────────────────────────────── Rules 7, 8, 9, 10
        // Laptop gate for high-power CPU tweaks.
        //
        // Keeping all CPU cores unparked (Rule 7), pinning frequency at 100%
        // minimum (Rule 8), maximising boost aggressiveness (Rule 9), or
        // disabling the dynamic tick (Rule 10) all prevent the power governor
        // from throttling down during light workloads.  On desktop AC systems
        // this is desirable; on battery-powered hardware it causes
        // disproportionate drain and thermal problems.

        // Rule 7: Core parking — laptop gate
        "cpu.reduce-parking-aggressiveness" => {
            if is_mobile {
                return HardwareGateOutcome::block(
                    "Laptop or mobile device detected. Disabling core parking forces all \
                     CPU cores to remain fully active, preventing the power governor from \
                     spinning down idle cores. On battery, this causes disproportionate \
                     drain and elevated chassis temperatures.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // Rule 8: Min processor state — laptop gate
        "cpu.min-processor-state-100" => {
            if is_mobile {
                return HardwareGateOutcome::block(
                    "Laptop or mobile device detected. Pinning the minimum processor \
                     state to 100% prevents any frequency scaling, keeping the CPU at \
                     full speed even during idle periods. On a laptop this results in \
                     significantly reduced battery life and increased chassis temperatures.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // Rule 9: Aggressive boost mode — laptop gate
        "cpu.aggressive-boost-mode" => {
            if is_mobile {
                return HardwareGateOutcome::block(
                    "Laptop or mobile device detected. Aggressive boost mode instructs \
                     the CPU to sustain maximum turbo clocks under load. On \
                     thermally-constrained mobile hardware this typically causes \
                     sustained thermal throttling rather than improved performance.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // Rule 10: Dynamic tick disable — laptop gate
        "cpu.disable-dynamic-tick" => {
            if is_mobile {
                return HardwareGateOutcome::block(
                    "Laptop or mobile device detected. Disabling the dynamic tick forces \
                     a fixed timer interrupt at all times, preventing the CPU from \
                     entering deep C-states during idle and causing continuous battery \
                     drain. This optimisation is desktop-only.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // ──────────────────────────────────────────────────────────── Rule 11
        // gpu.nvidia-disable-dynamic-pstate
        //
        // DisableDynamicPstate is an NVIDIA display-driver registry key.  It
        // has no meaning to AMD or Intel drivers and applying it on non-NVIDIA
        // hardware clutters the registry with no effect.  Only gate when we
        // have real GPU vendor data (empty string = not scanned).
        "gpu.nvidia-disable-dynamic-pstate" => {
            if !gpu_vendor.is_empty() && gpu_vendor != "NVIDIA" {
                return HardwareGateOutcome::block(
                    "No NVIDIA GPU detected. DisableDynamicPstate is an NVIDIA \
                     driver-specific key with no effect on AMD Radeon or Intel Arc \
                     adapters. This action only applies to systems with an NVIDIA \
                     GeForce or Quadro GPU.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // ──────────────────────────────────────────────────────────── Rule 12
        // security.reduce-ssbd-mitigation
        //
        // SSBD (Speculative Store Bypass Disable) mitigates CVE-2018-3639.
        // AMD CPUs implement SSBD in hardware (CPUID leaf 8000_0008h,
        // IBRS_ALL bit).  The Windows software override is effectively a
        // no-op on AMD — it changes a model-specific register that has no
        // architectural effect when hardware SSBD is present.  Disabling the
        // software mitigation on AMD carries the same security trade-off as
        // on Intel but delivers zero performance benefit.
        "security.reduce-ssbd-mitigation" => {
            if !cpu_vendor.is_empty() && cpu_vendor == "AMD" {
                return HardwareGateOutcome::block(
                    "AMD CPU detected. AMD processors implement Speculative Store Bypass \
                     Disable (SSBD) in hardware. The Windows software mitigation for \
                     CVE-2018-3639 is a near-no-op on AMD — disabling it carries the \
                     same security trade-off as on Intel with no measurable performance \
                     gain on AMD hardware.",
                );
            }
            HardwareGateOutcome::pass()
        }

        // ──────────────────────────────────────────────────────────── Rule 14
        // cpu.scheduler-quantum-gaming — no hardware gate.
        // Win32PrioritySeparation 0x26 is Windows' own Balanced plan default
        // for desktop/gaming workloads.  It is universally applicable across
        // all CPU vendors, architectures, and form factors.
        "cpu.scheduler-quantum-gaming" => HardwareGateOutcome::pass(),

        // All other actions have no hardware-specific gate rules.
        _ => HardwareGateOutcome::pass(),
    }
}

/// Hardware-aware action recommendation engine.
///
/// Returns every known tuning action annotated with hardware gate results from
/// the 14 gate rules.  Unlike `generate_plan` this function:
///
/// - Returns **all tiers** (free / premium / expert), not just free-tier
/// - Does **not** filter by preset risk tolerance
/// - Includes gated actions with `"gated": true` so the UI can display
///   greyed-out cards explaining why an action is unavailable on this hardware
///
/// Callers should use `"gated"` to decide whether to offer the action.
/// `"gateReason"` provides premium-quality explanatory copy ready for display.
pub fn recommend_actions(device_profile: &serde_json::Value) -> Vec<serde_json::Value> {
    embedded_actions()
        .into_iter()
        .map(|action| {
            let action_id = action
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let outcome = check_hardware_gates(action_id, device_profile);
            let (gated, gate_reason) = match outcome.gate_hit {
                Some(reason) => (
                    serde_json::Value::Bool(true),
                    serde_json::Value::String(reason),
                ),
                None => (serde_json::Value::Bool(false), serde_json::Value::Null),
            };
            serde_json::json!({
                "action": action,
                "gated": gated,
                "gateReason": gate_reason
            })
        })
        .collect()
}

/// Maximum risk level allowed per preset.
///
/// NOTE: "high" risk actions are intentionally excluded from ALL presets.
/// They are expert-only actions that can only be applied via direct manual
/// invocation through `tuning.applyAction`. Even the most aggressive preset
/// caps at "medium" risk. This is a deliberate safety boundary — actions like
/// disabling speculative execution mitigations carry security implications
/// that require explicit informed user consent, not automated plan inclusion.
fn max_risk_for_preset(preset: &str) -> &'static [&'static str] {
    match preset {
        "conservative" | "privacy_focused" | "quiet_cool" | "laptop_balanced" => &["safe"],
        "balanced" | "clean_lean" | "aaa_smoothness" | "streaming" | "creator_workstation" => {
            &["safe", "low"]
        }
        "aggressive" | "competitive_fps" | "low_latency" | "benchmark_mode" => {
            &["safe", "low", "medium"]
        }
        _ => &["safe"],
    }
}

/// Generate a tuning plan for the given device profile and preset.
///
/// Steps:
/// 1. Extract build number from device_profile["windows"]["build"]
/// 2. Filter actions by minBuild/maxBuild compatibility
/// 3. Filter by preset risk tolerance (conservative=safe, balanced=safe+low, aggressive=safe+low+medium)
/// 4. Build plan JSON with id, preset, actions, phases, estimatedRisk, rebootsRequired
/// 5. Group all actions into a single "Registry & Services" phase for v1
pub fn generate_plan(
    device_profile: &serde_json::Value,
    preset: &str,
) -> anyhow::Result<serde_json::Value> {
    tracing::info!("Generating tuning plan for preset: {}", preset);

    let allowed_risks = max_risk_for_preset(preset);
    let all_actions = embedded_actions();

    // Extract build number and edition from profile
    let current_build = device_profile
        .get("windows")
        .and_then(|w| w.get("build"))
        .and_then(|b| b.as_u64())
        .unwrap_or(22631) as u32;
    let current_edition = device_profile
        .get("windows")
        .and_then(|w| w.get("edition"))
        .and_then(|e| e.as_str())
        .unwrap_or("Professional");
    let profile_id = device_profile
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let mut plan_actions = Vec::new();
    let mut reboots_required = 0u32;
    let mut highest_risk = "safe";

    for action in &all_actions {
        let action_id = action
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let risk = action
            .get("risk")
            .and_then(|v| v.as_str())
            .unwrap_or("safe");
        let tier = action
            .get("tier")
            .and_then(|v| v.as_str())
            .unwrap_or("free");

        // Filter by risk tolerance
        if !allowed_risks.contains(&risk) {
            tracing::debug!(
                "Skipping {} -- risk '{}' exceeds preset '{}'",
                action_id,
                risk,
                preset
            );
            continue;
        }

        // Filter by tier (only include free-tier actions in the plan for now)
        if tier != "free" {
            tracing::debug!("Skipping {} -- requires '{}' tier", action_id, tier);
            continue;
        }

        // Check compatibility via minBuild/maxBuild and edition constraints
        let compat = action
            .get("compatibility")
            .cloned()
            .unwrap_or(serde_json::json!({}));
        let min_build = compat
            .get("minBuild")
            .and_then(|v| v.as_u64())
            .map(|v| v as u32);
        let max_build = compat
            .get("maxBuild")
            .and_then(|v| v.as_u64())
            .map(|v| v as u32);
        let editions = compat.get("editions").and_then(|v| v.as_array()).map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(String::from))
                .collect::<Vec<_>>()
        });

        let check = compatibility::check_action(
            action_id,
            min_build,
            max_build,
            current_build,
            current_edition,
            editions.as_deref(),
        );

        if !check.compatible {
            tracing::info!(
                "Skipping {} -- incompatible: {:?}",
                action_id,
                check.reasons
            );
            continue;
        }

        // Apply hardware-aware gate rules
        let gate = check_hardware_gates(action_id, device_profile);
        if let Some(ref reason) = gate.gate_hit {
            tracing::info!(
                "Hardware gate blocked {} -- {}",
                action_id,
                &reason[..reason.len().min(120)]
            );
            continue;
        }

        // Track reboot requirement
        if action
            .get("requiresReboot")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            reboots_required += 1;
        }

        // Track highest risk
        highest_risk = higher_risk(highest_risk, risk);

        plan_actions.push(serde_json::json!({
            "actionId": action_id,
            "action": action,
            "status": "pending",
            "userOverride": null,
            "appliedAt": null,
            "validatedAt": null,
            "outcome": null
        }));
    }

    let plan_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Build action ID list for the single phase
    let action_ids: Vec<String> = plan_actions
        .iter()
        .filter_map(|a| {
            a.get("actionId")
                .and_then(|v| v.as_str())
                .map(String::from)
        })
        .collect();

    let phase = serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "name": "Registry & Services",
        "order": 0,
        "actionIds": action_ids,
        "requiresReboot": reboots_required > 0,
        "requiresBiosVisit": false,
        "description": "Apply registry and service configuration changes"
    });

    let plan = serde_json::json!({
        "id": plan_id,
        "deviceProfileId": profile_id,
        "preset": preset,
        "createdAt": now,
        "estimatedRisk": highest_risk,
        "rebootsRequired": reboots_required,
        "actions": plan_actions,
        "phases": [phase]
    });

    tracing::info!(
        "Plan generated: {} actions, risk={}, reboots={}",
        plan_actions.len(),
        highest_risk,
        reboots_required
    );

    Ok(plan)
}

/// Compare two risk levels and return the higher one.
fn higher_risk<'a>(a: &'a str, b: &'a str) -> &'a str {
    let order = |r: &str| -> u8 {
        match r {
            "safe" => 0,
            "low" => 1,
            "medium" => 2,
            "high" => 3,
            "extreme" => 4,
            _ => 0,
        }
    };
    if order(b) > order(a) {
        b
    } else {
        a
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conservative_plan_only_safe() {
        let profile = serde_json::json!({
            "id": "test-profile",
            "windows": { "build": 22631, "edition": "Professional" }
        });
        let plan = generate_plan(&profile, "conservative").unwrap();
        let actions = plan.get("actions").unwrap().as_array().unwrap();

        for action in actions {
            let risk = action
                .get("action")
                .and_then(|a| a.get("risk"))
                .and_then(|v| v.as_str())
                .unwrap();
            assert_eq!(
                risk, "safe",
                "Conservative plan should only contain safe-risk actions"
            );
        }

        assert!(
            !actions.is_empty(),
            "Plan should contain at least one action"
        );
    }

    #[test]
    fn test_all_seven_actions_present() {
        let profile = serde_json::json!({
            "id": "test-profile",
            "windows": { "build": 22631, "edition": "Professional" }
        });
        let plan = generate_plan(&profile, "conservative").unwrap();
        let actions = plan.get("actions").unwrap().as_array().unwrap();

        // 31 free+safe actions should appear in conservative plan
        // (includes cpu.scheduler-quantum-gaming added in planner v2,
        //  plus 9 new free+safe actions from tuning-modules sync)
        assert_eq!(actions.len(), 31, "All 31 free safe actions should be in plan");

        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a.get("actionId").and_then(|v| v.as_str()))
            .collect();

        assert!(action_ids.contains(&"privacy.disable-advertising-id"));
        assert!(action_ids.contains(&"privacy.disable-telemetry"));
        assert!(action_ids.contains(&"privacy.disable-ceip"));
        assert!(action_ids.contains(&"privacy.disable-cloud-content"));
        assert!(action_ids.contains(&"privacy.disable-error-reporting"));
        assert!(action_ids.contains(&"power.disable-fast-startup"));
        assert!(action_ids.contains(&"storage.disable-last-access"));
        assert!(action_ids.contains(&"security.analyze-mitigations"));
    }

    #[test]
    fn test_old_build_filters_actions() {
        let profile = serde_json::json!({
            "id": "test-profile",
            "windows": { "build": 7600, "edition": "Professional" }
        });
        let plan = generate_plan(&profile, "conservative").unwrap();
        let actions = plan.get("actions").unwrap().as_array().unwrap();

        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a.get("actionId").and_then(|v| v.as_str()))
            .collect();

        // Actions with minBuild: 10240 should be excluded on build 7600
        assert!(
            !action_ids.contains(&"privacy.disable-advertising-id"),
            "advertising-id requires build 10240+"
        );
        assert!(
            !action_ids.contains(&"privacy.disable-telemetry"),
            "telemetry requires build 10240+"
        );

        // Actions with no minBuild or minBuild: 7600 should remain
        assert!(action_ids.contains(&"privacy.disable-ceip"));
        assert!(action_ids.contains(&"privacy.disable-error-reporting"));
        assert!(action_ids.contains(&"power.disable-fast-startup"));
        assert!(action_ids.contains(&"storage.disable-last-access"));
    }

    #[test]
    fn test_plan_has_single_phase() {
        let profile = serde_json::json!({
            "id": "test-profile",
            "windows": { "build": 22631, "edition": "Professional" }
        });
        let plan = generate_plan(&profile, "balanced").unwrap();
        let phases = plan.get("phases").unwrap().as_array().unwrap();

        assert_eq!(phases.len(), 1, "v1 plan should have exactly one phase");
        assert_eq!(
            phases[0].get("name").and_then(|v| v.as_str()).unwrap(),
            "Registry & Services"
        );
    }

    #[test]
    fn test_get_actions_filter() {
        let privacy = get_actions(Some("privacy"));
        assert_eq!(privacy.len(), 9);
        let power = get_actions(Some("power"));
        assert_eq!(power.len(), 5); // +4: hibernation, pcie-link-state-pm, usb-selective-suspend, high-performance-plan
        let storage = get_actions(Some("storage"));
        assert_eq!(storage.len(), 4); // +2: disable-indexing, enable-write-caching
        let cpu = get_actions(Some("cpu"));
        assert_eq!(cpu.len(), 9); // +2: disable-core-parking, win32-priority-separation
        let security = get_actions(Some("security"));
        assert_eq!(security.len(), 8); // +1: defender-add-game-exclusions
        let display = get_actions(Some("display"));
        assert_eq!(display.len(), 4); // +3: disable-game-bar, disable-pointer-acceleration, disable-transparency
        let startup = get_actions(Some("startup"));
        assert_eq!(startup.len(), 8); // +3: disable-automatic-maintenance, disable-autoplay, disable-background-apps
        let gpu = get_actions(Some("gpu"));
        assert_eq!(gpu.len(), 4); // +3: disable-hags, msi-mode, tdr-delay
        let services = get_actions(Some("services"));
        assert_eq!(services.len(), 5);
        let audio = get_actions(Some("audio"));
        assert_eq!(audio.len(), 2); // new: disable-enhancements, exclusive-mode
        let gaming = get_actions(Some("gaming"));
        assert_eq!(gaming.len(), 1); // new: enable-game-mode
        let network = get_actions(Some("network"));
        assert_eq!(network.len(), 3); // new: disable-nagle, rss-queues-2, tcp-autotuning-normal
        let memory = get_actions(Some("memory"));
        assert_eq!(memory.len(), 3); // new: disable-compression, disable-pagefile, large-pages
        let scheduler = get_actions(Some("scheduler"));
        assert_eq!(scheduler.len(), 1); // new: mmcss-gaming-profile
        let all = get_actions(None);
        assert_eq!(all.len(), 66); // 38 + 28 new actions from tuning-modules sync
    }

    #[test]
    fn test_plan_structure_fields() {
        let profile = serde_json::json!({
            "id": "device-123",
            "windows": { "build": 22631, "edition": "Professional" }
        });
        let plan = generate_plan(&profile, "balanced").unwrap();

        assert!(plan.get("id").is_some());
        assert_eq!(
            plan.get("deviceProfileId")
                .and_then(|v| v.as_str())
                .unwrap(),
            "device-123"
        );
        assert_eq!(
            plan.get("preset").and_then(|v| v.as_str()).unwrap(),
            "balanced"
        );
        assert!(plan.get("createdAt").is_some());
        assert!(plan.get("estimatedRisk").is_some());
        assert!(plan.get("rebootsRequired").is_some());
        assert!(plan.get("actions").is_some());
        assert!(plan.get("phases").is_some());
    }

    #[test]
    fn test_storage_action_newvalue() {
        let all = get_actions(Some("storage"));
        let last_access = &all[0];
        let reg = last_access
            .get("registryChanges")
            .unwrap()
            .as_array()
            .unwrap();
        // 0x80000003 = 2147483651
        assert_eq!(
            reg[0].get("newValue").and_then(|v| v.as_u64()).unwrap(),
            2147483651,
            "NtfsDisableLastAccessUpdate should be 0x80000003"
        );
    }

    #[test]
    fn test_expert_actions_excluded_from_plans() {
        let profile = serde_json::json!({
            "id": "test-profile",
            "windows": { "build": 22631, "edition": "Professional" }
        });

        // High-risk actions must never appear in any preset plan.
        // They are expert-only and can only be applied via tuning.applyAction.
        for preset in &[
            "conservative",
            "balanced",
            "aggressive",
            "privacy_focused",
            "quiet_cool",
            "laptop_balanced",
            "clean_lean",
            "aaa_smoothness",
            "streaming",
            "creator_workstation",
            "competitive_fps",
            "low_latency",
            "benchmark_mode",
        ] {
            let plan = generate_plan(&profile, preset).unwrap();
            let actions = plan.get("actions").unwrap().as_array().unwrap();

            for action in actions {
                let risk = action
                    .get("action")
                    .and_then(|a| a.get("risk"))
                    .and_then(|v| v.as_str())
                    .unwrap();
                assert_ne!(
                    risk, "high",
                    "Preset '{}' must not include high-risk actions, but found one",
                    preset
                );
                assert_ne!(
                    risk, "extreme",
                    "Preset '{}' must not include extreme-risk actions, but found one",
                    preset
                );
            }
        }
    }

    #[test]
    fn test_premium_actions_excluded_from_free_plans() {
        let profile = serde_json::json!({
            "id": "test-profile",
            "windows": { "build": 22631, "edition": "Professional" }
        });

        // Premium-tier actions must not appear in generated plans (which only
        // include free-tier actions). Premium actions are applied individually
        // after license validation.
        for preset in &["conservative", "balanced", "aggressive"] {
            let plan = generate_plan(&profile, preset).unwrap();
            let actions = plan.get("actions").unwrap().as_array().unwrap();

            for action in actions {
                let tier = action
                    .get("action")
                    .and_then(|a| a.get("tier"))
                    .and_then(|v| v.as_str())
                    .unwrap();
                assert_eq!(
                    tier, "free",
                    "Preset '{}' plan should only contain free-tier actions, but found '{}'",
                    preset, tier
                );
            }
        }

        // Verify that premium actions DO exist in the full action set
        let all = get_actions(None);
        let premium_count = all
            .iter()
            .filter(|a| a.get("tier").and_then(|v| v.as_str()) == Some("premium"))
            .count();
        assert_eq!(
            premium_count, 26,
            "Should have 26 premium actions in the full action set"
        );
    }

    // ---- Hardware gate rule tests -------------------------------------------

    #[test]
    fn test_hardware_gate_rule1_smt_blocks_idle_states() {
        // Rule 1: SMT enabled → cpu.disable-idle-states must be blocked
        let gate = check_hardware_gates(
            "cpu.disable-idle-states",
            &serde_json::json!({
                "cpu": { "vendor": "Intel", "brand": "Core i9-9900K", "smtEnabled": true,
                         "physicalCores": 8, "logicalCores": 16 },
                "deviceClass": "desktop",
                "power": { "source": "ac" },
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate.gate_hit.is_some(),
            "SMT-enabled CPU must block cpu.disable-idle-states (Rule 1)"
        );
    }

    #[test]
    fn test_hardware_gate_rule2_hybrid_cpu_blocks_idle_states() {
        // Rule 2: Intel 12th gen hybrid → block
        let gate_intel = check_hardware_gates(
            "cpu.disable-idle-states",
            &serde_json::json!({
                "cpu": { "vendor": "Intel", "brand": "Intel Core i9-12900K",
                         "smtEnabled": false, "physicalCores": 16, "logicalCores": 24 },
                "deviceClass": "desktop",
                "power": { "source": "ac" },
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate_intel.gate_hit.is_some(),
            "Intel 12th gen hybrid CPU must block cpu.disable-idle-states (Rule 2)"
        );

        // Rule 13 (via Rule 2): AMD X3D → block
        let gate_x3d = check_hardware_gates(
            "cpu.disable-idle-states",
            &serde_json::json!({
                "cpu": { "vendor": "AMD", "brand": "AMD Ryzen 7 7800X3D",
                         "smtEnabled": false, "physicalCores": 8, "logicalCores": 8 },
                "deviceClass": "desktop",
                "power": { "source": "ac" },
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate_x3d.gate_hit.is_some(),
            "AMD X3D CPU must block cpu.disable-idle-states (Rule 13 via Rule 2)"
        );
    }

    #[test]
    fn test_hardware_gate_rule3_laptop_blocks_idle_states() {
        // Rule 3: laptop deviceClass → block idle states
        let gate = check_hardware_gates(
            "cpu.disable-idle-states",
            &serde_json::json!({
                "cpu": { "vendor": "Intel", "brand": "Core i9-9900K",
                         "smtEnabled": false, "physicalCores": 8, "logicalCores": 8 },
                "deviceClass": "laptop",
                "power": { "source": "ac" },
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate.gate_hit.is_some(),
            "Laptop must block cpu.disable-idle-states (Rule 3)"
        );
    }

    #[test]
    fn test_hardware_gate_rule4_low_core_count_blocks_idle_states() {
        // Rule 4: fewer than 4 physical cores → block
        let gate = check_hardware_gates(
            "cpu.disable-idle-states",
            &serde_json::json!({
                "cpu": { "vendor": "Intel", "brand": "Core i3-9100",
                         "smtEnabled": false, "physicalCores": 3, "logicalCores": 3 },
                "deviceClass": "desktop",
                "power": { "source": "ac" },
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate.gate_hit.is_some(),
            "< 4 physical cores must block cpu.disable-idle-states (Rule 4)"
        );
    }

    #[test]
    fn test_hardware_gate_idle_states_passes_on_valid_hardware() {
        // All gates clear: desktop, non-hybrid Intel, SMT off, 8 cores
        let gate = check_hardware_gates(
            "cpu.disable-idle-states",
            &serde_json::json!({
                "cpu": { "vendor": "Intel", "brand": "Core i9-9900K",
                         "smtEnabled": false, "physicalCores": 8, "logicalCores": 8 },
                "deviceClass": "desktop",
                "power": { "source": "ac" },
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate.gate_hit.is_none(),
            "Valid desktop with SMT off, 8 cores, non-hybrid should pass idle-state gates"
        );
    }

    #[test]
    fn test_hardware_gate_rule5_hdd_blocks_sysmain_disable() {
        // Rule 5: HDD present → keep SysMain
        let gate = check_hardware_gates(
            "services.disable-sysmain",
            &serde_json::json!({
                "storage": [
                    { "model": "Samsung 990 Pro", "type": "SSD" },
                    { "model": "WD Blue 2TB", "type": "HDD" }
                ],
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate.gate_hit.is_some(),
            "HDD presence must block services.disable-sysmain (Rule 5)"
        );
    }

    #[test]
    fn test_hardware_gate_rule5_ssd_only_allows_sysmain_disable() {
        // Rule 5: SSD-only → sysmain disable is fine
        let gate = check_hardware_gates(
            "services.disable-sysmain",
            &serde_json::json!({
                "storage": [
                    { "model": "Samsung 990 Pro 2TB", "type": "SSD" },
                    { "model": "WD Black SN850X 1TB", "type": "SSD" }
                ],
                "windows": { "build": 22631 }
            }),
        );
        assert!(
            gate.gate_hit.is_none(),
            "SSD-only system should pass the SysMain gate (Rule 5)"
        );
    }

    #[test]
    fn test_hardware_gate_rule6_build_22621_timer_resolution() {
        // Rule 6: build < 22621 → block GlobalTimerResolutionRequests
        let gate_old = check_hardware_gates(
            "cpu.global-timer-resolution",
            &serde_json::json!({ "windows": { "build": 22000 } }),
        );
        assert!(
            gate_old.gate_hit.is_some(),
            "Build 22000 (Win11 21H2) must block cpu.global-timer-resolution (Rule 6)"
        );

        // build 22621 → pass
        let gate_new = check_hardware_gates(
            "cpu.global-timer-resolution",
            &serde_json::json!({ "windows": { "build": 22621 } }),
        );
        assert!(
            gate_new.gate_hit.is_none(),
            "Build 22621 (Win11 22H2) should pass the timer resolution gate (Rule 6)"
        );
    }

    #[test]
    fn test_hardware_gate_rules_7_to_10_laptop_blocks_cpu_tweaks() {
        let laptop_profile = serde_json::json!({
            "deviceClass": "laptop",
            "power": { "source": "ac" },
            "windows": { "build": 22631 }
        });

        for action_id in &[
            "cpu.reduce-parking-aggressiveness", // Rule 7
            "cpu.min-processor-state-100",       // Rule 8
            "cpu.aggressive-boost-mode",          // Rule 9
            "cpu.disable-dynamic-tick",           // Rule 10
        ] {
            let gate = check_hardware_gates(action_id, &laptop_profile);
            assert!(
                gate.gate_hit.is_some(),
                "Laptop must block {} (Rules 7-10)",
                action_id
            );
        }
    }

    #[test]
    fn test_hardware_gate_rule11_nvidia_vendor_gate() {
        // Rule 11: non-NVIDIA GPU → block pstate lock
        let gate_amd = check_hardware_gates(
            "gpu.nvidia-disable-dynamic-pstate",
            &serde_json::json!({ "gpus": [{ "vendor": "AMD" }] }),
        );
        assert!(
            gate_amd.gate_hit.is_some(),
            "AMD GPU must block gpu.nvidia-disable-dynamic-pstate (Rule 11)"
        );

        // NVIDIA → pass
        let gate_nvidia = check_hardware_gates(
            "gpu.nvidia-disable-dynamic-pstate",
            &serde_json::json!({ "gpus": [{ "vendor": "NVIDIA" }] }),
        );
        assert!(
            gate_nvidia.gate_hit.is_none(),
            "NVIDIA GPU should pass the pstate vendor gate (Rule 11)"
        );

        // Unknown (empty) → pass (don't gate on missing data)
        let gate_unknown = check_hardware_gates(
            "gpu.nvidia-disable-dynamic-pstate",
            &serde_json::json!({}),
        );
        assert!(
            gate_unknown.gate_hit.is_none(),
            "Missing GPU data should not block pstate action (fail open)"
        );
    }

    #[test]
    fn test_hardware_gate_rule12_amd_blocks_ssbd_reduction() {
        // Rule 12: AMD CPU → no benefit, block
        let gate_amd = check_hardware_gates(
            "security.reduce-ssbd-mitigation",
            &serde_json::json!({ "cpu": { "vendor": "AMD" } }),
        );
        assert!(
            gate_amd.gate_hit.is_some(),
            "AMD CPU must block security.reduce-ssbd-mitigation (Rule 12)"
        );

        // Intel → pass
        let gate_intel = check_hardware_gates(
            "security.reduce-ssbd-mitigation",
            &serde_json::json!({ "cpu": { "vendor": "Intel" } }),
        );
        assert!(
            gate_intel.gate_hit.is_none(),
            "Intel CPU should pass the SSBD gate (Rule 12)"
        );
    }

    #[test]
    fn test_hardware_gate_rule14_scheduler_quantum_always_passes() {
        // Rule 14: no gate — scheduler quantum tweak is universally applicable
        for profile in &[
            serde_json::json!({ "deviceClass": "laptop", "power": { "source": "battery" } }),
            serde_json::json!({ "cpu": { "vendor": "AMD", "smtEnabled": true } }),
            serde_json::json!({}),
        ] {
            let gate = check_hardware_gates("cpu.scheduler-quantum-gaming", profile);
            assert!(
                gate.gate_hit.is_none(),
                "cpu.scheduler-quantum-gaming must always pass (Rule 14)"
            );
        }
    }

    #[test]
    fn test_hardware_gate_missing_data_defaults_to_include() {
        // When the device profile has no hardware data, all gates must pass
        // (fail open) — we never block an action on missing information.
        let empty = serde_json::json!({ "windows": { "build": 22631 } });
        for action_id in &[
            "cpu.disable-idle-states",
            "services.disable-sysmain",
            "cpu.reduce-parking-aggressiveness",
            "cpu.aggressive-boost-mode",
            "cpu.min-processor-state-100",
            "cpu.disable-dynamic-tick",
            "gpu.nvidia-disable-dynamic-pstate",
            "security.reduce-ssbd-mitigation",
        ] {
            let gate = check_hardware_gates(action_id, &empty);
            assert!(
                gate.gate_hit.is_none(),
                "Missing scanner data must not block {} (fail-open principle)",
                action_id
            );
        }
    }

    #[test]
    fn test_recommend_actions_annotates_gated_actions() {
        // SSD-only laptop profile: sysmain should pass HDD gate but multiple
        // CPU tweaks should be gated by the laptop rule
        let profile = serde_json::json!({
            "id": "test-laptop",
            "deviceClass": "laptop",
            "power": { "source": "ac" },
            "storage": [{ "model": "Samsung 990 Pro", "type": "SSD" }],
            "cpu": { "vendor": "Intel", "brand": "Core i7-1270P", "smtEnabled": true,
                     "physicalCores": 12, "logicalCores": 16 },
            "gpus": [{ "vendor": "Intel" }],
            "windows": { "build": 22631 }
        });

        let recs = recommend_actions(&profile);
        assert!(!recs.is_empty(), "recommend_actions should return all actions");
        assert_eq!(
            recs.len(),
            embedded_actions().len(),
            "recommend_actions should return one entry per embedded action"
        );

        // Verify each entry has the expected fields
        for rec in &recs {
            assert!(rec.get("action").is_some(), "Each recommendation must have 'action'");
            assert!(rec.get("gated").is_some(), "Each recommendation must have 'gated'");
            assert!(rec.get("gateReason").is_some(), "Each recommendation must have 'gateReason'");
        }

        // Laptop gate should fire for cpu.reduce-parking-aggressiveness
        let parking = recs
            .iter()
            .find(|r| {
                r.get("action")
                    .and_then(|a| a.get("id"))
                    .and_then(|v| v.as_str())
                    == Some("cpu.reduce-parking-aggressiveness")
            })
            .expect("cpu.reduce-parking-aggressiveness must be in recommendations");
        assert_eq!(
            parking.get("gated").and_then(|v| v.as_bool()),
            Some(true),
            "cpu.reduce-parking-aggressiveness must be gated on laptop"
        );
        assert!(
            parking.get("gateReason").and_then(|v| v.as_str()).is_some(),
            "Gated action must have a non-null gateReason"
        );

        // Scheduler quantum should not be gated even on laptop
        let quantum = recs
            .iter()
            .find(|r| {
                r.get("action")
                    .and_then(|a| a.get("id"))
                    .and_then(|v| v.as_str())
                    == Some("cpu.scheduler-quantum-gaming")
            })
            .expect("cpu.scheduler-quantum-gaming must be in recommendations");
        assert_eq!(
            quantum.get("gated").and_then(|v| v.as_bool()),
            Some(false),
            "cpu.scheduler-quantum-gaming must not be gated on any hardware"
        );
    }

    #[test]
    fn test_hardware_gate_wired_into_generate_plan_hdd_excludes_sysmain() {
        // When the profile has an HDD, services.disable-sysmain is premium
        // tier and already excluded from free-tier plans — this verifies the
        // gate logic at the generate_plan level doesn't interfere with free
        // actions and that the HDD profile is handled without panicking.
        let profile_with_hdd = serde_json::json!({
            "id": "test-hdd",
            "deviceClass": "desktop",
            "power": { "source": "ac" },
            "storage": [{ "model": "Seagate Barracuda 2TB", "type": "HDD" }],
            "windows": { "build": 22631, "edition": "Professional" }
        });
        let plan = generate_plan(&profile_with_hdd, "conservative").unwrap();
        let actions = plan.get("actions").unwrap().as_array().unwrap();

        // Free-tier plan should still work and not include sysmain (premium + gated)
        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a.get("actionId").and_then(|v| v.as_str()))
            .collect();
        assert!(
            !action_ids.contains(&"services.disable-sysmain"),
            "SysMain must not appear in plan (premium tier, also HDD-gated)"
        );
        // Scheduler quantum is free+safe and has no hardware gate
        assert!(
            action_ids.contains(&"cpu.scheduler-quantum-gaming"),
            "Scheduler quantum must appear in plan regardless of storage type"
        );
    }

    #[test]
    fn test_gpu_gating_nvidia_vs_amd_vs_intel_igpu() {
        // NVIDIA desktop: pstate action should NOT be gated
        let nvidia_desktop = serde_json::json!({
            "deviceClass": "desktop",
            "gpus": [{ "vendor": "NVIDIA", "name": "NVIDIA GeForce RTX 4090" }],
            "cpu": { "vendor": "AMD", "brand": "Ryzen 9 7950X", "physicalCores": 16, "logicalCores": 32, "smtEnabled": true },
            "windows": { "build": 22631 }
        });
        let gate = check_hardware_gates("gpu.nvidia-disable-dynamic-pstate", &nvidia_desktop);
        assert!(gate.gate_hit.is_none(), "NVIDIA RTX 4090 should pass pstate gate");

        // AMD desktop: pstate action should be BLOCKED (not NVIDIA)
        let amd_desktop = serde_json::json!({
            "deviceClass": "desktop",
            "gpus": [{ "vendor": "AMD", "name": "AMD Radeon RX 7900 XTX" }],
            "cpu": { "vendor": "AMD", "brand": "Ryzen 9 7950X" },
            "windows": { "build": 22631 }
        });
        let gate = check_hardware_gates("gpu.nvidia-disable-dynamic-pstate", &amd_desktop);
        assert!(gate.gate_hit.is_some(), "AMD GPU must block NVIDIA pstate action");
        let reason = gate.gate_hit.unwrap();
        assert!(reason.contains("NVIDIA"), "Gate reason should mention NVIDIA: {}", reason);

        // Intel iGPU laptop: pstate action should be BLOCKED (not NVIDIA + laptop)
        let intel_laptop = serde_json::json!({
            "deviceClass": "laptop",
            "gpus": [{ "vendor": "Intel", "name": "Intel UHD Graphics 770" }],
            "cpu": { "vendor": "Intel", "brand": "Core i7-13700H" },
            "windows": { "build": 22631 }
        });
        let gate = check_hardware_gates("gpu.nvidia-disable-dynamic-pstate", &intel_laptop);
        assert!(gate.gate_hit.is_some(), "Intel iGPU must block NVIDIA pstate action");

        // Hyper-V video (CI environment): vendor is "Unknown" — this IS a known
        // non-NVIDIA vendor, so it CORRECTLY blocks. Fail-open only applies when
        // gpu_vendor is empty (truly missing data).
        let hyperv = serde_json::json!({
            "deviceClass": "desktop",
            "gpus": [{ "vendor": "Unknown", "name": "Microsoft Hyper-V Video" }],
            "windows": { "build": 26100 }
        });
        let gate = check_hardware_gates("gpu.nvidia-disable-dynamic-pstate", &hyperv);
        assert!(gate.gate_hit.is_some(),
            "Unknown vendor (Hyper-V) is non-NVIDIA — correctly blocked");

        // Truly missing GPU data (empty gpus array or no vendor field) → fail open
        let no_gpu_data = serde_json::json!({ "deviceClass": "desktop", "gpus": [] });
        let gate = check_hardware_gates("gpu.nvidia-disable-dynamic-pstate", &no_gpu_data);
        assert!(gate.gate_hit.is_none(),
            "Empty GPU array should pass (fail open, no data to gate on)");

        // Multi-GPU: first GPU is AMD (blocked), even if second is NVIDIA
        let multi_gpu = serde_json::json!({
            "deviceClass": "desktop",
            "gpus": [
                { "vendor": "AMD", "name": "AMD Radeon RX 7900 XTX" },
                { "vendor": "NVIDIA", "name": "NVIDIA RTX 4060" }
            ],
            "windows": { "build": 22631 }
        });
        let gate = check_hardware_gates("gpu.nvidia-disable-dynamic-pstate", &multi_gpu);
        assert!(gate.gate_hit.is_some(),
            "Primary GPU is AMD — pstate lock applies to adapter 0000, which is AMD");
    }

    #[test]
    fn test_gpu_gating_in_plan_generation() {
        // NVIDIA desktop profile should include gpu.nvidia-disable-dynamic-pstate in
        // an aggressive plan (premium+medium risk, allowed in aggressive preset)
        let nvidia_profile = serde_json::json!({
            "id": "test-nvidia",
            "deviceClass": "desktop",
            "gpus": [{ "vendor": "NVIDIA", "name": "GeForce RTX 3080" }],
            "cpu": { "vendor": "Intel", "brand": "Core i9-12900K", "physicalCores": 16, "logicalCores": 24, "smtEnabled": true },
            "windows": { "build": 22631, "edition": "Professional" },
            "power": { "source": "ac" },
            "storage": [{ "type": "SSD" }]
        });

        // Note: gpu.nvidia-disable-dynamic-pstate is premium+medium risk
        // It won't appear in free-tier plans (tier filter), but the gate should not block it
        let all_actions = get_actions(Some("gpu"));
        let pstate = all_actions.iter().find(|a| a.get("id").and_then(|v| v.as_str()) == Some("gpu.nvidia-disable-dynamic-pstate"));
        assert!(pstate.is_some(), "gpu.nvidia-disable-dynamic-pstate must exist in action catalog");

        // AMD profile: same plan, pstate should be gated by hardware check
        let amd_profile = serde_json::json!({
            "id": "test-amd-gpu",
            "deviceClass": "desktop",
            "gpus": [{ "vendor": "AMD", "name": "Radeon RX 7800 XT" }],
            "cpu": { "vendor": "AMD", "brand": "Ryzen 7 7800X3D" },
            "windows": { "build": 22631, "edition": "Professional" },
            "power": { "source": "ac" },
            "storage": [{ "type": "SSD" }]
        });

        let recs = recommend_actions(&amd_profile);
        let pstate_rec = recs.iter().find(|r| {
            r.get("action").and_then(|a| a.get("id")).and_then(|v| v.as_str()) == Some("gpu.nvidia-disable-dynamic-pstate")
        }).expect("pstate must appear in recommendations");
        assert_eq!(
            pstate_rec.get("gated").and_then(|v| v.as_bool()),
            Some(true),
            "gpu.nvidia-disable-dynamic-pstate must be gated on AMD GPU hardware"
        );
    }
}
