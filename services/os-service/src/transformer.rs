
use serde_json::Value;

pub fn generate_plan(classification: &Value, preset: &str) -> anyhow::Result<Value> {
    let profile = classification
        .get("primary")
        .and_then(|v| v.as_str())
        .unwrap_or("gaming_desktop");

    let preservation = classification
        .get("preservationFlags")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    tracing::info!(
        profile = profile,
        preset = preset,
        "Generating transformation plan"
    );

    let all_actions = embedded_actions();
    let mut plan_actions: Vec<Value> = Vec::new();

    for action in &all_actions {
        let action_id = action["id"].as_str().unwrap_or("");
        let category = action["category"].as_str().unwrap_or("");

        if is_blocked(action_id, profile, &preservation) {
            tracing::debug!(
                action_id = action_id,
                profile = profile,
                "Action blocked by profile preservation flags"
            );
            continue;
        }

        let risk = action["risk"].as_str().unwrap_or("low");
        let include = match preset {
            "conservative" => risk == "safe" || risk == "low",
            "balanced" => risk == "safe" || risk == "low" || risk == "medium",
            "aggressive" => true,
            _ => risk == "safe" || risk == "low" || risk == "medium",
        };

        if include {
            plan_actions.push(serde_json::json!({
                "id": action_id,
                "category": category,
                "name": action["name"],
                "description": action["description"],
                "risk": risk,
                "blocked": false,
                "blockedReason": null,
            }));
        }
    }

    let plan_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    Ok(serde_json::json!({
        "id": plan_id,
        "createdAt": now,
        "profile": profile,
        "preset": preset,
        "actionCount": plan_actions.len(),
        "actions": plan_actions,
    }))
}

pub fn get_actions(category: Option<&str>) -> Vec<Value> {
    let all = embedded_actions();
    match category {
        Some(cat) => all
            .into_iter()
            .filter(|a| a["category"].as_str() == Some(cat))
            .collect(),
        None => all,
    }
}

fn is_blocked(action_id: &str, profile: &str, preservation: &Value) -> bool {
    match action_id {
        "tasks.disable-onedrive-tasks" => {
            profile == "work_pc"
                || preservation
                    .get("preserveOneDrive")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        }
        "appx.remove-your-phone" => {
            profile == "work_pc"
                || profile == "vm_cautious"
                || preservation
                    .get("preserveAppxPackages")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        }
        id if id.starts_with("appx.") => {
            profile == "vm_cautious"
                || preservation
                    .get("preserveAppxPackages")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
        }
        "shell.reduce-search-box" => profile == "work_pc",
        "privacy.disable-location" => profile == "work_pc",
        "tasks.disable-update-orchestrator" => profile == "work_pc",

        "cpu.disable-dynamic-tick" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }
        "cpu.disable-core-parking" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }
        "cpu.aggressive-boost-mode" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }
        "cpu.min-processor-state-100" => {
            profile == "office_laptop" || profile == "low_spec_system"
        }

        "power.high-performance-plan" => profile == "office_laptop",
        "power.disable-usb-selective-suspend" => profile == "office_laptop",
        "power.disable-pcie-link-state-pm" => profile == "office_laptop",

        "gpu.nvidia-disable-dynamic-pstate" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }
        "gpu.msi-mode" => profile == "vm_cautious",

        "services.disable-sysmain" => profile == "work_pc",
        "services.disable-print-spooler" => profile == "work_pc",
        "services.disable-remote-services" => profile == "work_pc",

        "security.reduce-ssbd-mitigation" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }

        "system.disable-windows-update" => profile == "work_pc",

        "startup.disable-gamebar-presence" => profile == "vm_cautious",

        "perf.mmcss-system-responsiveness" => profile == "work_pc",

        "perf.gpu-energy-driver-disable" => profile == "vm_cautious",

        "privacy.disable-smartscreen" => {
            profile == "work_pc" || profile == "vm_cautious"
        }

        "security.disable-hvci" => {
            profile == "work_pc" || profile == "office_laptop" || profile == "vm_cautious"
        }

        "gpu.disable-nvidia-telemetry" => profile == "vm_cautious",

        "gpu.disable-amd-telemetry" => profile == "vm_cautious",

        "perf.disable-fullscreen-optimizations" => profile == "work_pc",

        "network.disable-ipv6" => profile == "work_pc",
        "network.disable-llmnr" => profile == "work_pc",
        "network.disable-netbios" => profile == "work_pc",

        "system.disable-update-auto-restart" => profile == "work_pc",
        "system.defer-feature-updates" => profile == "work_pc",

        _ => false,
    }
}

fn embedded_actions() -> Vec<Value> {
    vec![
        serde_json::json!({
            "id": "appx.remove-consumer-bloat",
            "category": "appx",
            "name": "Remove Consumer Bloat Apps",
            "description": "Remove pre-installed consumer apps: BingNews, BingWeather, Solitaire, People, Maps, FeedbackHub, GetHelp, Getstarted, Todos, Cortana, MixedReality, Skype",
            "risk": "low",
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.BingNews",
                "Microsoft.BingWeather",
                "Microsoft.MicrosoftSolitaireCollection",
                "Microsoft.People",
                "Microsoft.WindowsMaps",
                "Microsoft.WindowsFeedbackHub",
                "Microsoft.GetHelp",
                "Microsoft.Getstarted",
                "Microsoft.Todos",
                "Microsoft.549981C3F5F10",
                "Microsoft.MixedReality.Portal",
                "Microsoft.SkypeApp"
            ]
        }),
        serde_json::json!({
            "id": "appx.remove-widgets",
            "category": "appx",
            "name": "Remove Widgets",
            "description": "Remove Windows Widgets (WebExperience) and disable via registry",
            "risk": "low",
            "actionType": "appx_remove",
            "packages": [
                "MicrosoftWindows.Client.WebExperience"
            ],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Dsh",
                    "valueName": "AllowNewsAndInterests",
                    "value": 0,
                    "valueType": "DWord"
                }
            ]
        }),
        serde_json::json!({
            "id": "appx.remove-xbox-apps",
            "category": "appx",
            "name": "Remove Xbox Apps",
            "description": "Remove Xbox companion apps (XboxApp, GamingOverlay, Xbox.TCUI, XboxGameCallableUI, XboxSpeechToTextOverlay)",
            "risk": "low",
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.XboxApp",
                "Microsoft.XboxGamingOverlay",
                "Microsoft.Xbox.TCUI",
                "Microsoft.XboxGameCallableUI",
                "Microsoft.XboxSpeechToTextOverlay"
            ]
        }),

        serde_json::json!({
            "id": "tasks.disable-telemetry-tasks",
            "category": "tasks",
            "name": "Disable Telemetry Tasks",
            "description": "Disable Application Experience and Customer Experience Improvement Program scheduled tasks",
            "risk": "low",
            "actionType": "task_disable",
            "tasks": [
                { "name": "Microsoft Compatibility Appraiser", "path": "\\Microsoft\\Windows\\Application Experience\\" },
                { "name": "ProgramDataUpdater", "path": "\\Microsoft\\Windows\\Application Experience\\" },
                { "name": "Consolidator", "path": "\\Microsoft\\Windows\\Customer Experience Improvement Program\\" },
                { "name": "UsbCeip", "path": "\\Microsoft\\Windows\\Customer Experience Improvement Program\\" },
                { "name": "KernelCeipTask", "path": "\\Microsoft\\Windows\\Customer Experience Improvement Program\\" }
            ]
        }),
        serde_json::json!({
            "id": "tasks.disable-onedrive-tasks",
            "category": "tasks",
            "name": "Disable OneDrive Sync Tasks",
            "description": "Disable OneDrive automatic sync scheduled tasks (blocked on work_pc profile)",
            "risk": "medium",
            "actionType": "task_disable",
            "tasks": [
                { "name": "OneDrive Reporting Task", "path": "\\Microsoft\\Windows\\OneDrive\\" },
                { "name": "OneDrive Standalone Update Task", "path": "\\Microsoft\\Windows\\OneDrive\\" }
            ]
        }),

        serde_json::json!({
            "id": "privacy.disable-telemetry",
            "category": "privacy",
            "name": "Disable Windows Telemetry",
            "description": "Set telemetry to Security level via registry and disable DiagTrack service",
            "risk": "low",
            "actionType": "registry_and_service",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection",
                    "valueName": "AllowTelemetry",
                    "value": 0,
                    "valueType": "DWord"
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection",
                    "valueName": "MaxTelemetryAllowed",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [
                { "name": "DiagTrack", "startupType": "Disabled" },
                { "name": "dmwappushservice", "startupType": "Disabled" }
            ]
        }),
        serde_json::json!({
            "id": "privacy.disable-advertising-id",
            "category": "privacy",
            "name": "Disable Advertising ID",
            "description": "Disable the Windows Advertising ID used for cross-app tracking",
            "risk": "low",
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo",
                    "valueName": "DisabledByGroupPolicy",
                    "value": 1,
                    "valueType": "DWord"
                }
            ]
        }),

        serde_json::json!({
            "id": "startup.disable-background-apps",
            "category": "startup",
            "name": "Disable Background Apps",
            "description": "Prevent UWP apps from running in the background to reduce resource usage",
            "risk": "low",
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications",
                    "valueName": "GlobalUserDisabled",
                    "value": 1,
                    "valueType": "DWord"
                },
                {
                    "hive": "HKCU",
                    "path": "Software\\Microsoft\\Windows\\CurrentVersion\\Search",
                    "valueName": "BackgroundAppGlobalToggle",
                    "value": 0,
                    "valueType": "DWord"
                }
            ]
        }),

        serde_json::json!({
            "id": "shell.hide-task-view",
            "category": "shell",
            "name": "Hide Task View Button",
            "description": "Hide the Task View button from the taskbar for a cleaner look",
            "rationale": "Reduces taskbar clutter; Task View is still accessible via Win+Tab",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
                    "valueName": "ShowTaskViewButton",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "taskbar", "cosmetic"],
            "sideEffects": ["Task View button hidden from taskbar; Win+Tab still works"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "shell.reduce-search-box",
            "category": "shell",
            "name": "Reduce Search Box to Icon",
            "description": "Replace the full search bar with a compact search icon on the taskbar",
            "rationale": "Reclaims taskbar space without losing search functionality",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search",
                    "valueName": "SearchboxTaskbarMode",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "taskbar", "cosmetic"],
            "sideEffects": ["Search bar replaced with icon; Win+S still opens search"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "shell.hide-widgets-button",
            "category": "shell",
            "name": "Hide Widgets Button",
            "description": "Hide the Widgets button from the taskbar",
            "rationale": "Reduces taskbar clutter and prevents accidental widget panel opens",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
                    "valueName": "TaskbarDa",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "taskbar", "cosmetic"],
            "sideEffects": ["Widgets button hidden; widgets still accessible via Win+W"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "shell.show-file-extensions",
            "category": "shell",
            "name": "Show File Extensions",
            "description": "Show file extensions in File Explorer for all file types",
            "rationale": "Improves file identification and security awareness (hidden extensions can mask malware)",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
                    "valueName": "HideFileExt",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "explorer", "security"],
            "sideEffects": ["All file extensions become visible in Explorer"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-location",
            "category": "privacy",
            "name": "Disable Location Services",
            "description": "Disable Windows location services to prevent location tracking",
            "rationale": "Prevents apps and Windows from accessing device location data",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors",
                    "valueName": "DisableLocation",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "location", "tracking"],
            "sideEffects": ["Weather, Maps, and Find My Device will not have location data"],
            "warningMessage": "Location-dependent apps (Weather, Maps) will lose location functionality"
        }),
        serde_json::json!({
            "id": "privacy.disable-online-tips",
            "category": "privacy",
            "name": "Disable Online Tips in Settings",
            "description": "Disable online tips and suggestions in the Windows Settings app",
            "rationale": "Prevents Microsoft from serving promotional content in Settings",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer",
                    "valueName": "AllowOnlineTips",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "ads", "settings"],
            "sideEffects": ["No online tips or suggestions in Settings app"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "tasks.disable-update-orchestrator",
            "category": "tasks",
            "name": "Disable Update Orchestrator Tasks",
            "description": "Disable Windows Update Orchestrator scheduled tasks to reduce background update activity",
            "rationale": "Prevents unexpected update downloads and restarts during use",
            "risk": "medium",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 5,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "task_disable",
            "tasks": [
                { "name": "Schedule Scan", "path": "\\Microsoft\\Windows\\UpdateOrchestrator\\" },
                { "name": "Schedule Scan Static Task", "path": "\\Microsoft\\Windows\\UpdateOrchestrator\\" },
                { "name": "USO_UxBroker", "path": "\\Microsoft\\Windows\\UpdateOrchestrator\\" }
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["tasks", "updates", "performance"],
            "sideEffects": ["Windows Update background scans will not run automatically; manual updates still work"],
            "warningMessage": "Disabling update orchestrator may delay security patches. Use manual Windows Update periodically."
        }),
        serde_json::json!({
            "id": "startup.disable-cortana",
            "category": "startup",
            "name": "Disable Cortana Startup",
            "description": "Prevent Cortana from launching at Windows startup",
            "rationale": "Reduces startup time and background resource usage",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search",
                    "valueName": "AllowCortana",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["startup", "cortana", "performance"],
            "sideEffects": ["Cortana will not start automatically; voice assistant unavailable"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "appx.remove-cortana",
            "category": "appx",
            "name": "Remove Cortana App",
            "description": "Remove the Cortana UWP application",
            "rationale": "Frees resources and removes a rarely-used voice assistant",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 10,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.549981C3F5F10"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "cortana", "bloat"],
            "sideEffects": ["Cortana voice assistant removed; reinstall from Microsoft Store if needed"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-office-hub",
            "category": "appx",
            "name": "Remove Get Office Hub",
            "description": "Remove the 'Get Office' promotional app that advertises Office 365",
            "rationale": "Removes a pure advertising/upsell app with no functional value",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.MicrosoftOfficeHub"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "office", "bloat", "ads"],
            "sideEffects": ["'Get Office' promoter removed; does not affect installed Office apps"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-your-phone",
            "category": "appx",
            "name": "Remove Your Phone / Phone Link",
            "description": "Remove the Your Phone / Phone Link companion app",
            "rationale": "Removes background phone sync that most users do not use",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "low_spec_system"],
            "blockedProfiles": ["work_pc", "vm_cautious"],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.YourPhone"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "phone", "bloat"],
            "sideEffects": ["Phone Link integration removed; cannot sync phone notifications to PC"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),

        serde_json::json!({
            "id": "perf.disable-game-dvr",
            "category": "perf",
            "name": "Disable Game DVR",
            "description": "Disable Game DVR background recording to reduce GPU/CPU overhead during gaming",
            "rationale": "Game DVR silently records gameplay, consuming GPU resources and increasing frame times",
            "risk": "medium",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "System\\GameConfigStore",
                    "valueName": "GameDVR_Enabled",
                    "value": 0,
                    "valueType": "DWord"
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR",
                    "valueName": "AllowGameDVR",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "gaming", "gpu"],
            "sideEffects": ["Game DVR/Game Bar recording disabled; screenshots via Win+Alt+PrtSc unavailable"],
            "warningMessage": "Disabling Game DVR removes background recording and Game Bar capture features"
        }),

        serde_json::json!({
            "id": "cpu.disable-dynamic-tick",
            "name": "Disable Dynamic Tick and Enable Platform Timer",
            "category": "cpu",
            "description": "Disable the Windows dynamic tick mechanism via BCD, forcing a fixed timer interrupt interval. Enable the platform hardware timer (HPET/TSC) as the tick source to provide the lowest possible timer jitter.",
            "rationale": "Dynamic tick allows Windows to skip timer interrupts during idle periods to save power. This creates variable timer resolution that can cause micro-stutter in latency-sensitive workloads. Disabling dynamic tick forces consistent timer interrupts.",
            "risk": "medium",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 5,
            "allowedProfiles": ["gaming_desktop", "work_pc"],
            "blockedProfiles": ["office_laptop", "low_spec_system"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "bcdChanges": [
                { "element": "disabledynamictick", "newValue": "yes" },
                { "element": "useplatformtick", "newValue": "yes" }
            ],
            "tags": ["cpu", "timer", "latency", "gaming", "bcd"],
            "sideEffects": [
                "Higher idle power consumption due to fixed timer interrupts",
                "CPU never enters deepest idle C-states",
                "Not recommended for laptops on battery power"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "cpu.global-timer-resolution",
            "name": "Enable Global Timer Resolution Requests",
            "category": "cpu",
            "description": "Set the GlobalTimerResolutionRequests registry key to restore system-wide timer resolution behavior on Windows 11+.",
            "rationale": "Starting with Windows 10 2004, timer resolution requests became per-process instead of global. The GlobalTimerResolutionRequests registry key (Windows 11+ / Server 2022+) restores the pre-2004 global behavior, allowing one application's timer request to benefit all processes.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel",
                    "valueName": "GlobalTimerResolutionRequests",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["cpu", "timer", "latency", "gaming", "windows11"],
            "sideEffects": [
                "Any process requesting high timer resolution will affect all processes system-wide",
                "Slightly higher idle power consumption"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "cpu.win32-priority-separation",
            "name": "Win32PrioritySeparation -> 0x26 (Gaming)",
            "category": "cpu",
            "description": "Set scheduler to Short, Variable quantum with 2:1 foreground boost. Gives foreground threads (your game) short but frequent time slices with priority over background tasks.",
            "rationale": "Windows default is 0x02 (Short, Variable, 3:1 on client). 0x26 (38 decimal) provides optimal gaming responsiveness per kernel debugger analysis.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
                    "valueName": "Win32PrioritySeparation",
                    "valueType": "DWord",
                    "value": 38
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["scheduler", "gaming", "latency"],
            "sideEffects": ["Background tasks get relatively less CPU time"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "cpu.disable-core-parking",
            "name": "Disable CPU Core Parking",
            "category": "cpu",
            "description": "Set minimum processor cores to 100% on AC power, preventing Windows from parking cores during low load. Parked cores introduce 1-5 ms wake latency.",
            "rationale": "Core parking powers down unused cores to save energy, but causes micro-stutter when a game suddenly needs more threads and the OS must unpark them (1-5 ms wake latency).",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc"],
            "blockedProfiles": ["office_laptop", "low_spec_system"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/0cc5b647-c1df-4637-891a-dec35c318583", "newValue": "100" }
            ],
            "tags": ["cpu", "parking", "latency", "gaming"],
            "sideEffects": [
                "Higher idle power consumption (~5-15 W on a desktop system)",
                "All CPU cores remain active even during idle periods",
                "Not recommended for laptops on battery power"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "cpu.aggressive-boost-mode",
            "name": "Aggressive Processor Boost Mode",
            "category": "cpu",
            "description": "Set processor performance boost policy to Aggressive (mode 2). This prioritizes sustained maximum turbo frequency over power efficiency.",
            "rationale": "Default boost mode may downscale frequency under sustained load to save power. Aggressive mode tells the OS to keep boosting as long as thermal and power limits allow.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc"],
            "blockedProfiles": ["office_laptop", "low_spec_system"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/be337238-0d82-4146-a960-4f3749d470c7", "newValue": "2" }
            ],
            "tags": ["cpu", "performance", "boost", "gaming"],
            "sideEffects": [
                "Higher temperatures under sustained load",
                "Increased power consumption",
                "May cause thermal throttling on inadequate cooling"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "cpu.min-processor-state-100",
            "name": "Set Minimum Processor State to 100%",
            "category": "cpu",
            "description": "Prevent the CPU from throttling below maximum frequency. Sets both minimum and maximum processor state to 100%.",
            "rationale": "When min processor state is below 100%, the CPU may reduce its frequency during brief idle moments, causing frame time spikes. Setting to 100% keeps the CPU at full speed.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc"],
            "blockedProfiles": ["office_laptop", "low_spec_system"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "powerChanges": [
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/893dee8e-2bef-41e0-89c6-b55d0929964c", "newValue": "100" },
                { "settingPath": "54533251-82be-4824-96c1-47b60b740d00/bc5038f7-23e0-4960-96da-33abaf5935ec", "newValue": "100" }
            ],
            "tags": ["cpu", "power", "frequency", "gaming"],
            "sideEffects": [
                "CPU runs at maximum frequency at all times",
                "Significantly higher idle power and heat",
                "Not recommended for laptops"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "scheduler.mmcss-gaming-profile",
            "name": "MMCSS Gaming Profile - Maximum Priority",
            "category": "scheduler",
            "description": "Configure the Multimedia Class Scheduler Service (MMCSS) Games task profile with maximum GPU priority (8), elevated CPU scheduling priority (6), High scheduling category, and a 1 ms clock rate. Removes the network throttle and dedicates full MMCSS resources to the foreground application.",
            "rationale": "MMCSS manages thread priorities for multimedia applications. GPU Priority=8, Scheduling Category=High, Priority=6 places game threads above most background processes. NetworkThrottlingIndex=0xFFFFFFFF removes the 10-packets-per-interval throttle. SystemResponsiveness=0 dedicates 100% of resource budget to foreground.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 5,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "GPU Priority",
                    "valueType": "DWord",
                    "value": 8
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Priority",
                    "valueType": "DWord",
                    "value": 6
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Scheduling Category",
                    "valueType": "String",
                    "value": "High"
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Clock Rate",
                    "valueType": "DWord",
                    "value": 10000
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Affinity",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
                    "valueName": "Background Only",
                    "valueType": "String",
                    "value": "False"
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
                    "valueName": "NetworkThrottlingIndex",
                    "valueType": "DWord",
                    "value": 4294967295u64
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
                    "valueName": "SystemResponsiveness",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["scheduler", "mmcss", "latency", "gaming", "network"],
            "sideEffects": [
                "Background applications receive less CPU time when a game is running",
                "Network throttling removal increases CPU interrupt rate from NIC for all applications"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "power.high-performance-plan",
            "name": "Activate High Performance Power Plan",
            "category": "power",
            "description": "Set the active power plan to Windows High Performance (GUID: 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c), preventing CPU frequency scaling and sleep transitions.",
            "rationale": "The Balanced power plan dynamically scales CPU frequency and allows C-state transitions, introducing latency when the CPU must ramp up. High Performance keeps the CPU at maximum frequency.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["office_laptop"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "powerChanges": [
                { "settingPath": "SCHEME_CURRENT\\SUB_PROCESSOR\\PROCTHROTTLEMIN", "newValue": "100" },
                { "settingPath": "SCHEME_CURRENT\\SUB_PROCESSOR\\PROCTHROTTLEMAX", "newValue": "100" }
            ],
            "tags": ["power", "performance", "gaming", "latency"],
            "sideEffects": ["Higher idle power consumption and heat output", "Laptop battery life significantly reduced"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "power.disable-fast-startup",
            "name": "Disable Fast Startup (Hybrid Shutdown)",
            "category": "power",
            "description": "Disable Windows Fast Startup (hybrid shutdown) which hibernates the kernel session instead of performing a full shutdown.",
            "rationale": "Fast Startup saves the kernel session to the hibernation file on shutdown. This causes stale driver state, prevents clean driver reinitialization, and can lead to hardware initialization issues.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power",
                    "valueName": "HiberbootEnabled",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["power", "stability", "boot"],
            "sideEffects": ["Boot time will be slightly longer (full cold boot instead of hybrid resume)"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "power.disable-hibernation",
            "name": "Disable Hibernation",
            "category": "power",
            "description": "Disable Windows hibernation, which removes the hibernation file (hiberfil.sys) and frees disk space equal to approximately 75% of installed RAM.",
            "rationale": "On systems with Fast Startup already disabled, hibernation provides no benefit and consumes significant disk space. Disabling it ensures a clean kernel initialization on every boot.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Power",
                    "valueName": "HibernateEnabled",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["power", "disk", "boot", "free"],
            "sideEffects": [
                "Hibernate option is removed from the Power menu",
                "Fast Startup will also be disabled (both rely on hiberfil.sys)",
                "hiberfil.sys is deleted, freeing significant disk space"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "power.disable-usb-selective-suspend",
            "name": "Disable USB Selective Suspend",
            "category": "power",
            "description": "Disable USB selective suspend for both AC and DC power, preventing Windows from powering down USB devices during idle periods.",
            "rationale": "USB selective suspend saves power by suspending idle USB devices, but causes input latency spikes when mice, keyboards, and controllers must wake from suspended state.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["office_laptop"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "powerChanges": [
                { "settingPath": "2a737441-1930-4402-8d77-b2bebba308a3/48e6b7a6-50f5-4782-a5d4-53bb8f07e226", "newValue": "0" }
            ],
            "tags": ["power", "usb", "input", "latency", "gaming"],
            "sideEffects": ["USB devices remain powered at all times, increasing power draw slightly"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "power.disable-pcie-link-state-pm",
            "name": "Disable PCIe Link State Power Management",
            "category": "power",
            "description": "Disable Active State Power Management (ASPM) transitions on PCIe devices, preventing the system from placing the PCIe bus in low-power link states (L0s, L1).",
            "rationale": "PCIe ASPM transitions power down the PCIe link between the CPU and devices. Re-entering the active state adds latency (1-10 us typical, up to several ms). Disabling ASPM eliminates this class of intermittent latency spike.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["office_laptop"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "powerChanges": [
                { "settingPath": "501a4d13-42af-4429-9fd1-a8218c268e20/ee12f906-d277-404b-b6da-e5fa1a576df5", "newValue": "0" }
            ],
            "tags": ["power", "pcie", "latency", "gaming"],
            "sideEffects": [
                "PCIe devices remain in full-power state at all times",
                "Not recommended for laptops where battery life is a priority"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "gpu.disable-hags",
            "name": "Disable Hardware-Accelerated GPU Scheduling (HAGS)",
            "category": "gpu",
            "description": "Disable HAGS by setting HwSchMode to 1. HAGS moves GPU scheduling from the CPU to the GPU itself, but can hurt frame time consistency on many systems.",
            "rationale": "HAGS improves frame time consistency on some systems but worsens it on others. Disabling provides more predictable behavior.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
                    "valueName": "HwSchMode",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["gpu", "latency", "gaming", "hags"],
            "sideEffects": ["Games that benefit from HAGS may see slightly higher CPU overhead"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "gpu.nvidia-disable-dynamic-pstate",
            "name": "Lock NVIDIA GPU to P-State 0 (Maximum Performance)",
            "category": "gpu",
            "description": "Disable dynamic P-State switching on NVIDIA GPUs by setting DisableDynamicPstate=1, forcing the GPU to remain at maximum clocks at all times.",
            "rationale": "NVIDIA GPUs dynamically transition between power states. These transitions introduce latency spikes of 5-50ms as the GPU ramps clocks. Locking to P-State 0 eliminates transition latency.",
            "risk": "medium",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "low_spec_system"],
            "blockedProfiles": ["work_pc", "office_laptop", "vm_cautious"],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000",
                    "valueName": "DisableDynamicPstate",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["gpu", "nvidia", "latency", "pstate", "gaming", "advanced"],
            "sideEffects": [
                "GPU runs at maximum clocks even at desktop idle",
                "Significantly higher idle power consumption and GPU temperature",
                "Fan noise will increase at idle",
                "NVIDIA-only; AMD GPUs use a different P-State mechanism",
                "Registry path assumes GPU is at adapter index 0000"
            ],
            "warningMessage": "NVIDIA-only tweak. GPU will run at max clocks at all times, increasing power and temperature."
        }),

        serde_json::json!({
            "id": "gpu.tdr-delay",
            "name": "Increase TDR Timeout to 10 Seconds",
            "category": "gpu",
            "description": "Increase the Timeout Detection and Recovery (TDR) delay from the default 2 seconds to 10 seconds, preventing false GPU resets during heavy load spikes.",
            "rationale": "The default 2-second TDR timeout causes false GPU resets during shader compilation, heavy compute loads, or driver transitions.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
                    "valueName": "TdrDelay",
                    "valueType": "DWord",
                    "value": 10
                },
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
                    "valueName": "TdrDdiDelay",
                    "valueType": "DWord",
                    "value": 10
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["gpu", "stability", "tdr"],
            "sideEffects": ["Genuine GPU hangs will take longer to recover from"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "gpu.msi-mode",
            "name": "Enable GPU MSI (Message Signaled Interrupts) Mode",
            "category": "gpu",
            "description": "Enable Message Signaled Interrupts for the GPU, replacing legacy line-based interrupts with in-band PCIe messages for lower interrupt latency.",
            "rationale": "MSI mode eliminates the need for the GPU to use shared IRQ lines. MSI writes interrupt data directly to memory via PCIe, reducing DPC latency for GPU interrupts.",
            "risk": "medium",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "office_laptop"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Enum\\PCI\\<GPU Device ID>\\<Instance>\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties",
                    "valueName": "MSISupported",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["gpu", "latency", "interrupt", "msi"],
            "sideEffects": [
                "Requires identifying GPU PCI device path; incorrect path has no effect",
                "Some older GPUs may not support MSI properly"
            ],
            "warningMessage": "GPU PCI device path must be detected at runtime. Incorrect path has no effect."
        }),

        serde_json::json!({
            "id": "network.disable-nagle",
            "name": "Disable Nagle's Algorithm (TCPNoDelay)",
            "category": "network",
            "description": "Disable Nagle's algorithm and set TCP acknowledgement frequency to 1, sending small packets immediately instead of buffering them.",
            "rationale": "Nagle's algorithm buffers small TCP packets to reduce overhead, but introduces up to 200ms of delay for small game packets.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\<Interface GUID>",
                    "valueName": "TcpAckFrequency",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\<Interface GUID>",
                    "valueName": "TCPNoDelay",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["network", "latency", "tcp", "gaming"],
            "sideEffects": ["Slightly higher network overhead from more frequent small packets"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "network.rss-queues-2",
            "name": "Set RSS Queues to 2",
            "category": "network",
            "description": "Configure Receive Side Scaling to use 2 RSS queues, distributing NIC interrupt processing across 2 CPU cores without over-allocating.",
            "rationale": "For typical online gaming (~300 KB/s), 1-2 queues is sufficient. Over-allocating RSS queues wastes CPU resources that could serve DPCs for the game process.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}\\<Adapter Index>",
                    "valueName": "*NumRssQueues",
                    "valueType": "DWord",
                    "value": 2
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["network", "rss", "latency", "gaming"],
            "sideEffects": ["High-bandwidth transfers (downloads) may be slightly slower than with more queues"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "memory.disable-compression",
            "name": "Disable Memory Compression",
            "category": "memory",
            "description": "Disable the Windows memory compression agent that compresses in-memory pages to fit more data in RAM, trading CPU cycles for capacity.",
            "rationale": "Memory compression uses CPU cycles to compress and decompress pages. On systems with ample RAM (16 GB+), the compression overhead is unnecessary and can cause micro-stutter when the compression thread competes with game threads for CPU time.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 5,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": ["Disable-MMAgent -MemoryCompression"],
            "tags": ["memory", "cpu", "latency", "gaming"],
            "sideEffects": [
                "Higher physical memory usage since pages are stored uncompressed",
                "Systems with less than 16 GB RAM may hit memory pressure sooner"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "storage.disable-last-access",
            "name": "Disable NTFS Last Access Timestamp",
            "category": "storage",
            "description": "Disable updating the last access timestamp on files and directories, reducing write I/O for every file read operation.",
            "rationale": "By default, NTFS updates the LastAccessTime metadata on every file read. This generates substantial unnecessary write I/O for gaming workloads.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\FileSystem",
                    "valueName": "NtfsDisableLastAccessUpdate",
                    "valueType": "DWord",
                    "value": 2147483651u64
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["storage", "filesystem", "ntfs", "performance"],
            "sideEffects": ["Backup software relying on last access time may not detect accessed files"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "storage.disable-8dot3-filenames",
            "name": "Disable 8.3 Short Filename Creation",
            "category": "storage",
            "description": "Disable creation of legacy 8.3-character (DOS-compatible) short filenames on NTFS volumes, reducing directory enumeration overhead.",
            "rationale": "NTFS creates a legacy 8.3 short filename entry for every file for DOS compatibility. This doubles the number of directory entries, slowing file operations.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\FileSystem",
                    "valueName": "NtfsDisable8dot3NameCreation",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["storage", "filesystem", "ntfs", "performance"],
            "sideEffects": [
                "Very old applications expecting 8.3 filenames may fail (extremely rare)",
                "Only prevents creation of new 8.3 names; existing ones remain"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "storage.enable-write-caching",
            "name": "Enable Disk Write Caching",
            "category": "storage",
            "description": "Enable write caching on storage devices, allowing the OS to buffer writes in RAM before flushing to disk for improved I/O throughput.",
            "rationale": "Write caching allows the storage driver to acknowledge writes before they reach the physical media, dramatically improving random write performance.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Enum\\SCSI\\<device>\\<instance>\\Device Parameters\\Disk",
                    "valueName": "UserWriteCacheSetting",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Enum\\SCSI\\<device>\\<instance>\\Device Parameters\\Disk",
                    "valueName": "CacheIsPowerProtected",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["storage", "write-cache", "performance"],
            "sideEffects": ["Risk of data loss if power is lost during a write (mitigated by UPS or SSD capacitors)"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "storage.disable-indexing",
            "name": "Disable Windows Search Indexing Service",
            "category": "storage",
            "description": "Disable the Windows Search indexing service (WSearch) which continuously scans and indexes file contents in the background.",
            "rationale": "The Windows Search indexer consumes disk I/O, CPU, and memory by continuously crawling files for content indexing. On gaming systems, disabling it eliminates background I/O contention.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [
                { "name": "WSearch", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["storage", "debloat", "performance", "service"],
            "sideEffects": [
                "Windows Search and Start menu file search will be significantly slower",
                "Outlook desktop search will not work without indexing"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "services.disable-sysmain",
            "name": "Disable SysMain (Superfetch)",
            "category": "services",
            "description": "Disable the SysMain service (formerly Superfetch) which preloads frequently used applications into memory.",
            "rationale": "SysMain uses background I/O to preload application data into RAM. On SSD systems, the preloading offers negligible benefit. The background I/O creates disk contention and memory pressure.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [
                { "name": "SysMain", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["services", "performance", "disk", "memory"],
            "sideEffects": [
                "Application cold-start may be slightly slower on systems with HDDs",
                "Negligible impact on SSD-based systems"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "services.disable-print-spooler",
            "name": "Disable Print Spooler",
            "category": "services",
            "description": "Disable the Print Spooler service which manages print queues. Safe to disable on gaming systems with no printers.",
            "rationale": "The Print Spooler loads multiple DLLs and has been the target of multiple critical security vulnerabilities (PrintNightmare CVE-2021-34527).",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "registryChanges": [],
            "serviceChanges": [
                { "name": "Spooler", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["services", "security", "debloat"],
            "sideEffects": [
                "Cannot print from this system - re-enable if a printer is connected",
                "Print-to-PDF will not work"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "services.disable-remote-services",
            "name": "Disable Remote Access Services",
            "category": "services",
            "description": "Disable Remote Desktop, Remote Registry, and Remote Assistance services that allow external connections to this PC.",
            "rationale": "Remote access services listen for incoming connections and maintain authentication state. On a dedicated gaming PC, these represent unnecessary attack surface.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Remote Assistance",
                    "valueName": "fAllowToGetHelp",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [
                { "name": "RemoteRegistry", "startupType": "Disabled" },
                { "name": "TermService", "startupType": "Disabled" },
                { "name": "SessionEnv", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["services", "security", "hardening"],
            "sideEffects": [
                "Cannot use Remote Desktop to connect to this PC",
                "Remote Registry access will be denied",
                "Remote Assistance invitations cannot be sent or accepted"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "audio.disable-enhancements",
            "name": "Disable Audio Enhancements",
            "category": "audio",
            "description": "Disable Windows audio enhancements (spatial audio, equalizer, virtual surround, loudness equalization) to reduce audio processing overhead and DPC latency.",
            "rationale": "Audio enhancements add DSP processing stages in the audio pipeline, increasing DPC latency from audio drivers.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
                    "valueName": "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["audio", "latency", "dpc", "gaming"],
            "sideEffects": [
                "Spatial audio (Windows Sonic, Dolby Atmos for Headphones) will be disabled",
                "Any configured equalizer or loudness normalization will stop working"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "audio.exclusive-mode",
            "name": "Configure WASAPI Exclusive Mode Priority",
            "category": "audio",
            "description": "Ensure WASAPI exclusive mode is enabled for audio endpoints, allowing games and applications to bypass the Windows audio mixer for direct hardware access with lowest latency.",
            "rationale": "WASAPI exclusive mode gives an application direct access to the audio hardware, bypassing the Windows Audio Session mixer, eliminating resampling and mixing latency.",
            "risk": "low",
            "tier": "premium",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
                    "valueName": "{b3f8fa53-0004-438e-9003-51a46e139bfc},3",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
                    "valueName": "{b3f8fa53-0004-438e-9003-51a46e139bfc},4",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["audio", "latency", "wasapi", "gaming"],
            "sideEffects": [
                "When an application uses exclusive mode, all other applications lose audio output",
                "Discord, Spotify, and other audio sources will be muted while exclusive mode is active"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "display.disable-pointer-acceleration",
            "name": "Disable Mouse Pointer Acceleration",
            "category": "display",
            "description": "Disable Windows pointer acceleration (Enhance Pointer Precision) by setting MouseSpeed, MouseThreshold1, and MouseThreshold2 to 0.",
            "rationale": "Pointer acceleration applies a non-linear multiplier to mouse movement based on speed, making precise aiming inconsistent in games. Setting all thresholds to 0 creates a 1:1 mapping.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Control Panel\\Mouse",
                    "valueName": "MouseSpeed",
                    "valueType": "String",
                    "value": "0"
                },
                {
                    "hive": "HKCU",
                    "path": "Control Panel\\Mouse",
                    "valueName": "MouseThreshold1",
                    "valueType": "String",
                    "value": "0"
                },
                {
                    "hive": "HKCU",
                    "path": "Control Panel\\Mouse",
                    "valueName": "MouseThreshold2",
                    "valueType": "String",
                    "value": "0"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["input", "mouse", "gaming", "latency"],
            "sideEffects": ["Desktop mouse movement may feel different if previously relying on acceleration"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "display.disable-game-bar",
            "name": "Disable Game Bar and Game DVR",
            "category": "display",
            "description": "Disable the Xbox Game Bar overlay and Game DVR background recording, removing the capture pipeline from the display path.",
            "rationale": "Game Bar injects a capture hook into every DirectX application, and Game DVR maintains a background recording buffer consuming GPU encode resources.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR",
                    "valueName": "AppCaptureEnabled",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR",
                    "valueName": "AllowGameDVR",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKCU",
                    "path": "System\\GameConfigStore",
                    "valueName": "GameDVR_Enabled",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["display", "gaming", "debloat", "performance"],
            "sideEffects": [
                "Cannot use Game Bar overlay (Win+G) for screenshots or recording",
                "Game Bar FPS counter and performance overlay will not be available"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-ceip",
            "name": "Disable Customer Experience Improvement Program",
            "category": "privacy",
            "description": "Opt out of the Windows Customer Experience Improvement Program data collection.",
            "rationale": "CEIP collects usage data for Microsoft. Disabling it reduces background data collection tasks.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows",
                    "valueName": "CEIPEnable",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "telemetry"],
            "sideEffects": [],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-error-reporting",
            "name": "Disable Windows Error Reporting",
            "category": "privacy",
            "description": "Disable automatic error reporting to Microsoft and disable the WerSvc service.",
            "rationale": "Error reporting sends crash dumps to Microsoft. Disabling reduces background uploads.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting",
                    "valueName": "Disabled",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting",
                    "valueName": "Disabled",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [
                { "name": "WerSvc", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "telemetry"],
            "sideEffects": ["Crash reports won't be sent to Microsoft", "Some automatic fixes may not be applied"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-cloud-content",
            "name": "Disable Cloud Content & Suggestions",
            "category": "privacy",
            "description": "Disable Windows Spotlight, suggested apps, tips, and cloud-delivered content.",
            "rationale": "Cloud content features download and display promotional material, consuming bandwidth and creating visual noise.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent",
                    "valueName": "DisableWindowsConsumerFeatures",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent",
                    "valueName": "DisableSoftLanding",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SilentInstalledAppsEnabled",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SystemPaneSuggestionsEnabled",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "debloat", "cleanup"],
            "sideEffects": ["No more app suggestions on Start menu", "No Windows Spotlight on lock screen"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-clipboard-history",
            "name": "Disable Clipboard History & Cloud Sync",
            "category": "privacy",
            "description": "Disable Windows clipboard history and cross-device clipboard synchronization.",
            "rationale": "Clipboard history stores copied content and can sync it across devices via Microsoft account. Disabling prevents clipboard data from being stored or cloud-transmitted.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System",
                    "valueName": "AllowClipboardHistory",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System",
                    "valueName": "AllowCrossDeviceClipboard",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "clipboard", "sync"],
            "sideEffects": ["Win+V clipboard history panel will be empty", "Cloud clipboard sync across devices will stop"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-activity-feed",
            "name": "Disable Activity History & Timeline",
            "category": "privacy",
            "description": "Disable Windows activity feed, timeline, and activity data uploads to Microsoft.",
            "rationale": "Windows Activity History tracks app usage, file opens, and browsing history. Disabling prevents local collection and cloud upload of activity data.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System",
                    "valueName": "EnableActivityFeed",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System",
                    "valueName": "PublishUserActivities",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System",
                    "valueName": "UploadUserActivities",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "telemetry", "timeline"],
            "sideEffects": ["Windows Timeline (Win+Tab history) will be empty", "Activity-based Cortana suggestions will stop"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "startup.disable-automatic-maintenance",
            "name": "Disable Automatic Maintenance",
            "category": "startup",
            "description": "Disable Windows Automatic Maintenance which runs scheduled tasks including disk defragmentation, Windows Update checks, and security scans during idle periods.",
            "rationale": "Automatic Maintenance activates during what Windows considers idle time, but can overlap with gaming sessions, causing CPU, disk, and network spikes.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance",
                    "valueName": "MaintenanceDisabled",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["startup", "maintenance", "debloat", "performance"],
            "sideEffects": [
                "Disk optimization (TRIM for SSDs) must be run manually",
                "Windows Defender scheduled scans will not run automatically"
            ],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "startup.disable-gamebar-presence",
            "name": "Disable GameBarPresenceWriter",
            "category": "startup",
            "description": "Disable the GameBarPresenceWriter background process that runs alongside every game, even when Game Bar overlay is not used.",
            "rationale": "GameBarPresenceWriter is a COM-activated background process that monitors game presence for Xbox social features. It runs for every DirectX application regardless of whether Game Bar is used.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "office_laptop"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\WindowsRuntime\\ActivatableClassId\\Windows.Gaming.GameBar.PresenceServer.Internal.PresenceWriter",
                    "valueName": "ActivationType",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["startup", "gaming", "debloat", "performance"],
            "sideEffects": ["Xbox social presence features will not show 'Currently Playing' status"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "startup.disable-cloud-notifications",
            "name": "Disable Cloud Notification Network Usage",
            "category": "startup",
            "description": "Block Windows Push Notification System from making network calls to Microsoft cloud servers for notification delivery.",
            "rationale": "The Windows Push Notification service (WNS) maintains persistent connections to Microsoft servers. Blocking cloud notifications eliminates this traffic while local app notifications continue to work.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\CurrentVersion\\PushNotifications",
                    "valueName": "NoCloudApplicationNotification",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["startup", "privacy", "network", "debloat"],
            "sideEffects": ["Cloud-delivered notifications (e.g., from Microsoft 365) will not appear"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "security.reduce-ssbd-mitigation",
            "name": "Reduce Speculative Store Bypass (SSBD) Mitigation",
            "category": "security",
            "description": "Disable the SSBD mitigation via FeatureSettingsOverride registry keys. This reduces a 2-8% performance overhead on syscall-heavy workloads but exposes the system to CVE-2018-3639.",
            "rationale": "SSBD mitigates Spectre Variant 4. On dedicated gaming PCs not used for sensitive operations, the 2-8% overhead may not justify the protection.",
            "risk": "high",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "low_spec_system"],
            "blockedProfiles": ["work_pc", "office_laptop", "vm_cautious"],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
                    "valueName": "FeatureSettingsOverride",
                    "valueType": "DWord",
                    "value": 8
                },
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
                    "valueName": "FeatureSettingsOverrideMask",
                    "valueType": "DWord",
                    "value": 3
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["security", "spectre", "mitigation", "expert", "high-risk"],
            "sideEffects": [
                "SECURITY WARNING: Disables protection against CVE-2018-3639 (Spectre Variant 4)",
                "System is exposed to speculative store bypass side-channel attacks",
                "Do NOT use on systems handling sensitive data, banking, or personal information",
                "Only recommended for isolated gaming rigs or offline benchmark systems"
            ],
            "warningMessage": "SECURITY RISK: Disables Spectre v4 mitigation. Only for isolated gaming/benchmark systems."
        }),

        serde_json::json!({
            "id": "system.disable-windows-update",
            "name": "Disable Windows Update (EXTREME RISK)",
            "category": "security",
            "description": "Completely disable the Windows Update service and all related update mechanisms. This stops ALL updates including security patches.",
            "rationale": "On fully isolated benchmark machines or air-gapped gaming rigs, Windows Update background activity consumes CPU, disk I/O, and causes micro-stutter. THIS IS NOT RECOMMENDED FOR ANY INTERNET-CONNECTED SYSTEM.",
            "risk": "extreme",
            "tier": "premium",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 10,
            "allowedProfiles": ["gaming_desktop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU",
                    "valueName": "NoAutoUpdate",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
                    "valueName": "DisableWindowsUpdateAccess",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
                    "valueName": "DoNotConnectToWindowsUpdateInternetLocations",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
                    "valueName": "SetDisableUXWUAccess",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [
                { "name": "wuauserv", "startupType": "Disabled" },
                { "name": "UsoSvc", "startupType": "Disabled" },
                { "name": "WaaSMedicSvc", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["windows-update", "expert", "extreme-risk", "benchmark"],
            "sideEffects": [
                "CRITICAL: System will no longer receive security patches",
                "System is exposed to all future discovered vulnerabilities",
                "Microsoft Store will stop functioning",
                "Expert-only: Only for isolated benchmark/gaming systems",
                "Windows Defender definition updates will also stop"
            ],
            "warningMessage": "EXTREME RISK: All Windows updates including security patches will be disabled. Only for air-gapped/benchmark systems."
        }),

        serde_json::json!({
            "id": "appx.remove-mail-calendar",
            "category": "appx",
            "name": "Remove Mail and Calendar",
            "description": "Remove the built-in Mail and Calendar app (microsoft.windowscommunicationsapps)",
            "rationale": "Frees resources and removes unused inbox app; most users prefer Outlook or webmail",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "microsoft.windowscommunicationsapps"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "mail", "calendar"],
            "sideEffects": ["Built-in Mail and Calendar app removed; reinstall from Microsoft Store if needed"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-camera",
            "category": "appx",
            "name": "Remove Windows Camera",
            "description": "Remove the built-in Windows Camera app (Microsoft.WindowsCamera)",
            "rationale": "Removes unused camera app; third-party camera apps or video call apps provide their own capture",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.WindowsCamera"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "camera"],
            "sideEffects": ["Windows Camera app removed; webcam still works in other apps"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-alarms",
            "category": "appx",
            "name": "Remove Alarms & Clock",
            "description": "Remove the built-in Alarms & Clock app (Microsoft.WindowsAlarms)",
            "rationale": "Removes rarely-used timer/alarm app to reduce bloat",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.WindowsAlarms"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "alarms", "clock"],
            "sideEffects": ["Alarms & Clock app removed; system clock unaffected"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-sound-recorder",
            "category": "appx",
            "name": "Remove Sound Recorder",
            "description": "Remove the built-in Sound Recorder app (Microsoft.WindowsSoundRecorder)",
            "rationale": "Removes rarely-used audio recording app; dedicated audio software is preferred",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.WindowsSoundRecorder"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "audio", "recorder"],
            "sideEffects": ["Sound Recorder app removed; microphone still works in other apps"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-sticky-notes",
            "category": "appx",
            "name": "Remove Sticky Notes",
            "description": "Remove the built-in Sticky Notes app (Microsoft.MicrosoftStickyNotes)",
            "rationale": "Removes background-syncing notes app; alternatives like Notion or Obsidian preferred",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.MicrosoftStickyNotes"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "notes"],
            "sideEffects": ["Sticky Notes app removed; any saved notes will be lost unless synced to Microsoft account"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-feedback-hub",
            "category": "appx",
            "name": "Remove Feedback Hub",
            "description": "Remove the Feedback Hub app (Microsoft.WindowsFeedbackHub)",
            "rationale": "Removes telemetry feedback app that most users never open",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.WindowsFeedbackHub"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "feedback", "telemetry"],
            "sideEffects": ["Feedback Hub removed; cannot submit feedback to Microsoft via this app"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-maps",
            "category": "appx",
            "name": "Remove Windows Maps",
            "description": "Remove the built-in Windows Maps app (Microsoft.WindowsMaps)",
            "rationale": "Removes unused mapping app; web-based maps are preferred on desktop",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.WindowsMaps"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "maps"],
            "sideEffects": ["Windows Maps removed; use browser-based mapping services instead"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-get-help",
            "category": "appx",
            "name": "Remove Get Help",
            "description": "Remove the Get Help app (Microsoft.GetHelp)",
            "rationale": "Removes rarely-used help app; online support resources are more comprehensive",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.GetHelp"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "help"],
            "sideEffects": ["Get Help app removed; use online support or community forums instead"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-power-automate",
            "category": "appx",
            "name": "Remove Power Automate",
            "description": "Remove the Power Automate Desktop app (Microsoft.PowerAutomateDesktop)",
            "rationale": "Removes unused automation app that most home users never configure",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.PowerAutomateDesktop"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "automation"],
            "sideEffects": ["Power Automate Desktop removed; does not affect cloud Power Automate flows"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),
        serde_json::json!({
            "id": "appx.remove-solitaire",
            "category": "appx",
            "name": "Remove Solitaire",
            "description": "Remove the Solitaire Collection app (Microsoft.MicrosoftSolitaireCollection)",
            "rationale": "Removes ad-supported game app that runs background processes",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": false,
            "estimatedSeconds": 8,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "appx_remove",
            "packages": [
                "Microsoft.MicrosoftSolitaireCollection"
            ],
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["appx", "bloat", "game", "ads"],
            "sideEffects": ["Solitaire Collection removed; reinstall from Microsoft Store if wanted"],
            "warningMessage": "AppX removal cannot be automatically reversed. Reinstall from Microsoft Store."
        }),

        serde_json::json!({
            "id": "perf.mmcss-system-responsiveness",
            "category": "performance",
            "name": "Set MMCSS System Responsiveness",
            "description": "Set SystemResponsiveness to 10 to allocate more CPU to multimedia/gaming tasks",
            "rationale": "Reduces the guaranteed CPU percentage reserved for background tasks from 20% to 10%, improving game/media performance",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
                    "valueName": "SystemResponsiveness",
                    "value": 10,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "mmcss", "cpu", "latency"],
            "sideEffects": ["Background tasks may get slightly less CPU time during multimedia playback"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "perf.disable-service-host-split",
            "category": "performance",
            "name": "Disable Service Host Splitting",
            "description": "Set SvcHostSplitThresholdInKB to 0xFFFFFFFF to prevent Windows from splitting services into separate processes",
            "rationale": "Reduces process count and memory overhead by grouping services into fewer svchost instances",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control",
                    "valueName": "SvcHostSplitThresholdInKB",
                    "value": 4294967295u64,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "memory", "process-count", "svchost"],
            "sideEffects": ["Services grouped into fewer svchost.exe processes; individual service crash may affect grouped services"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "perf.disable-sleep-study",
            "category": "performance",
            "name": "Disable Sleep Study",
            "description": "Disable the SleepStudy service that logs energy usage data during sleep/standby",
            "rationale": "Removes unnecessary background energy logging service that provides no user-facing benefit",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "service",
            "registryChanges": [],
            "serviceChanges": [
                { "name": "SleepStudy", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "service", "energy", "sleep"],
            "sideEffects": ["Sleep study energy reports will no longer be generated"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "perf.gpu-energy-driver-disable",
            "category": "performance",
            "name": "Disable GPU Energy Driver",
            "description": "Disable the GpuEnergyDrv driver that monitors GPU energy usage and causes DPC latency spikes",
            "rationale": "GpuEnergyDrv is a known source of DPC latency; disabling it improves real-time audio/video performance",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "office_laptop"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\GpuEnergyDrv",
                    "valueName": "Start",
                    "value": 4,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "gpu", "dpc-latency", "driver"],
            "sideEffects": ["GPU energy monitoring disabled; GPU power usage will not be tracked by Windows"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "perf.disable-paging-executive",
            "category": "performance",
            "name": "Disable Paging Executive",
            "description": "Prevent Windows from paging kernel-mode drivers and system code to disk",
            "rationale": "Keeps kernel and drivers in RAM for lower latency; best on systems with 16GB+ RAM",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
                    "valueName": "DisablePagingExecutive",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "memory", "kernel", "paging"],
            "sideEffects": ["Kernel code stays in RAM; slightly higher memory usage on systems with less than 16GB RAM"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-app-launch-tracking",
            "category": "privacy",
            "name": "Disable App Launch Tracking",
            "description": "Disable tracking of application launches used to personalize the Start menu",
            "rationale": "Prevents Windows from tracking which apps you open; Start menu 'most used' list will not update",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
                    "valueName": "Start_TrackProgs",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "tracking", "start-menu"],
            "sideEffects": ["Start menu 'Most used' apps list will no longer update"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "privacy.disable-tailored-experiences",
            "category": "privacy",
            "name": "Disable Tailored Experiences",
            "description": "Disable Microsoft tailored experiences based on diagnostic data",
            "rationale": "Prevents Microsoft from using diagnostic data to show personalized tips, ads, and recommendations",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy",
                    "valueName": "TailoredExperiencesWithDiagnosticDataEnabled",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "telemetry", "ads", "recommendations"],
            "sideEffects": ["Personalized tips and suggestions from Microsoft will be disabled"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "privacy.disable-device-monitoring",
            "category": "privacy",
            "name": "Disable Device Install Monitoring",
            "description": "Disable system restore points for device installations via policy",
            "rationale": "Prevents automatic restore point creation during device driver installs, reducing disk I/O",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\DeviceInstall\\Settings",
                    "valueName": "DisableSystemRestore",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "device-install", "system-restore"],
            "sideEffects": ["Automatic restore points will not be created during device driver installation"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "privacy.disable-input-personalization",
            "category": "privacy",
            "name": "Disable Input Personalization",
            "description": "Disable implicit text and ink collection used for input personalization",
            "rationale": "Prevents Windows from collecting typing and inking patterns to build a local user profile",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\InputPersonalization",
                    "valueName": "RestrictImplicitTextCollection",
                    "value": 1,
                    "valueType": "DWord"
                },
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\InputPersonalization",
                    "valueName": "RestrictImplicitInkCollection",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "input", "typing", "ink", "personalization"],
            "sideEffects": ["Typing/inking predictions may be less accurate; autocorrect still works"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "privacy.disable-smart-app-control",
            "category": "privacy",
            "name": "Disable Smart App Control",
            "description": "Disable Smart App Control which checks apps against Microsoft cloud reputation service",
            "rationale": "Smart App Control causes slow app loading and sends app execution data to Microsoft",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\CI\\Policy",
                    "valueName": "VerifiedAndReputablePolicyState",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "smart-app-control", "cloud", "reputation"],
            "sideEffects": ["Apps will no longer be checked against Microsoft cloud reputation; Windows Defender still provides protection"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "shell.disable-copilot",
            "category": "shell",
            "name": "Disable Windows Copilot",
            "description": "Disable Windows Copilot via group policy registry key",
            "rationale": "Removes the Copilot sidebar and taskbar button; frees resources and reduces distractions",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Software\\Policies\\Microsoft\\Windows\\WindowsCopilot",
                    "valueName": "TurnOffWindowsCopilot",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "copilot", "ai", "taskbar"],
            "sideEffects": ["Windows Copilot disabled; Copilot button removed from taskbar"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "shell.disable-meet-now",
            "category": "shell",
            "name": "Disable Meet Now",
            "description": "Hide the Meet Now (Chat) icon from the taskbar system tray",
            "rationale": "Removes unused video calling shortcut from the taskbar notification area",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer",
                    "valueName": "HideSCAMeetNow",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "taskbar", "meet-now", "chat"],
            "sideEffects": ["Meet Now / Chat icon hidden from taskbar; Teams/Skype still work normally"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "shell.restore-classic-context-menu",
            "category": "shell",
            "name": "Restore Classic Context Menu",
            "description": "Restore the full classic right-click context menu on Windows 11",
            "rationale": "Restores full right-click context menu on Win11, removing the need to click 'Show more options'",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a8}\\InprocServer32",
                    "valueName": "",
                    "value": "",
                    "valueType": "String"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "context-menu", "win11", "classic"],
            "sideEffects": ["Right-click context menu reverts to Windows 10 style; new Win11 context menu entries may not appear"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "shutdown.decrease-shutdown-time",
            "category": "startup",
            "name": "Decrease Shutdown Time",
            "description": "Reduce app kill timeouts and enable auto-end tasks for faster shutdown",
            "rationale": "Reduces WaitToKillAppTimeout and HungAppTimeout so Windows shuts down faster instead of waiting for unresponsive apps",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Control Panel\\Desktop",
                    "valueName": "WaitToKillAppTimeout",
                    "value": "2000",
                    "valueType": "String"
                },
                {
                    "hive": "HKCU",
                    "path": "Control Panel\\Desktop",
                    "valueName": "HungAppTimeout",
                    "value": "1000",
                    "valueType": "String"
                },
                {
                    "hive": "HKCU",
                    "path": "Control Panel\\Desktop",
                    "valueName": "AutoEndTasks",
                    "value": "1",
                    "valueType": "String"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["startup", "shutdown", "timeout", "performance"],
            "sideEffects": ["Apps that are slow to close will be force-terminated sooner during shutdown; risk of unsaved data loss in hung apps"],
            "warningMessage": null
        }),
        serde_json::json!({
            "id": "shutdown.force-end-apps",
            "category": "startup",
            "name": "Reduce Service Shutdown Timeout",
            "description": "Reduce WaitToKillServiceTimeout to 2000ms for faster service shutdown",
            "rationale": "Forces services to terminate faster during shutdown instead of waiting the default 5000ms",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control",
                    "valueName": "WaitToKillServiceTimeout",
                    "value": "2000",
                    "valueType": "String"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["startup", "shutdown", "service", "timeout"],
            "sideEffects": ["Services will be force-terminated after 2 seconds during shutdown instead of 5"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-recall",
            "category": "privacy",
            "name": "Disable Windows Recall AI Feature",
            "description": "Disable the Windows Recall AI feature that takes periodic screenshots and indexes user activity using AI analysis.",
            "rationale": "Windows Recall captures screenshots and uses AI to index on-screen content. Disabling it prevents continuous background data collection and analysis.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "Software\\Policies\\Microsoft\\Windows\\WindowsAI",
                    "valueName": "DisableAIDataAnalysis",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "ai", "recall", "win11"],
            "sideEffects": ["Windows Recall feature will be completely disabled"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "perf.disable-fullscreen-optimizations",
            "category": "performance",
            "name": "Disable Fullscreen Optimizations Globally",
            "description": "Disable fullscreen optimizations globally by setting FSE behavior mode, preventing Windows from using borderless windowed mode for fullscreen applications.",
            "rationale": "Windows fullscreen optimizations can add input lag and cause frame pacing issues in some games by routing them through the DWM compositor instead of using exclusive fullscreen.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "System\\GameConfigStore",
                    "valueName": "GameDVR_FSEBehaviorMode",
                    "value": 2,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "gaming", "fullscreen"],
            "sideEffects": ["All fullscreen applications will use true exclusive fullscreen mode instead of optimized borderless windowed"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "network.disable-teredo",
            "category": "infrastructure",
            "name": "Disable Teredo Tunneling",
            "description": "Disable Teredo IPv6 tunneling which encapsulates IPv6 packets within IPv4 UDP datagrams, adding latency overhead.",
            "rationale": "Teredo tunneling adds network overhead and latency. Most modern networks have native IPv6 or do not need Teredo. Disabling it reduces unnecessary encapsulation processing.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters",
                    "valueName": "DisabledComponents",
                    "value": 1,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": ["netsh interface teredo set state disabled"],
            "tags": ["network", "teredo", "ipv6", "latency"],
            "sideEffects": ["Teredo-based IPv6 connectivity will be unavailable", "Xbox Live party chat may be affected on networks without native IPv6"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "gpu.disable-nvidia-telemetry",
            "category": "performance",
            "name": "Disable Nvidia Telemetry Services",
            "description": "Disable the NvTelemetryContainer service that collects and transmits Nvidia driver usage data.",
            "rationale": "Nvidia telemetry runs as a background service consuming CPU and network resources to send driver usage analytics. Disabling it eliminates this overhead.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "office_laptop"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "actionType": "service",
            "registryChanges": [],
            "serviceChanges": [
                { "name": "NvTelemetryContainer", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["gpu", "nvidia", "telemetry", "privacy"],
            "sideEffects": ["Nvidia driver usage analytics will no longer be collected"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "gpu.disable-amd-telemetry",
            "category": "performance",
            "name": "Disable AMD Telemetry",
            "description": "Disable the AMD External Events Utility service that collects AMD driver telemetry data.",
            "rationale": "AMD telemetry runs as a background service. Disabling it removes unnecessary CPU and network overhead from driver analytics collection.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "office_laptop"],
            "blockedProfiles": ["vm_cautious"],
            "preservationConflicts": [],
            "actionType": "service",
            "registryChanges": [],
            "serviceChanges": [
                { "name": "AMD External Events Utility", "startupType": "Disabled" }
            ],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["gpu", "amd", "telemetry", "privacy"],
            "sideEffects": ["AMD driver telemetry will no longer be collected"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.disable-smartscreen",
            "category": "privacy",
            "name": "Disable SmartScreen Filter",
            "description": "Disable the Windows SmartScreen filter that checks downloaded files and visited websites against Microsoft's reputation database.",
            "rationale": "SmartScreen sends file hashes and URLs to Microsoft servers for reputation checks. Disabling it removes this telemetry and network latency at the cost of reduced download protection.",
            "risk": "medium",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system"],
            "blockedProfiles": ["work_pc", "vm_cautious"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\System",
                    "valueName": "EnableSmartScreen",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["privacy", "smartscreen", "security"],
            "sideEffects": ["Downloaded files will not be checked against Microsoft's reputation database", "Malicious file detection via SmartScreen will be unavailable"],
            "warningMessage": "Disabling SmartScreen removes a layer of protection. Only disable if you have alternative security software."
        }),

        serde_json::json!({
            "id": "perf.disable-transparency",
            "category": "performance",
            "name": "Disable Window Transparency Effects",
            "description": "Disable window transparency effects (acrylic, blur) that use GPU compositing for translucent title bars and taskbar.",
            "rationale": "Transparency effects require GPU compositing passes that consume VRAM bandwidth and GPU cycles. Disabling them frees GPU resources for applications and reduces compositor latency.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
                    "valueName": "EnableTransparency",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["performance", "visual", "gpu", "latency"],
            "sideEffects": ["Windows taskbar, Start menu, and title bars will be fully opaque"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "privacy.block-app-reprovisioning",
            "category": "privacy",
            "name": "Block Removed Apps from Reinstalling",
            "description": "Block previously removed AppX packages from being reinstalled by Windows Update by creating the Deprovisioned registry key.",
            "rationale": "Windows Update can silently reinstall removed AppX packages during feature updates. Creating the Deprovisioned key prevents this reprovisioning behavior.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": ["$key = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Appx\\AppxAllUserStore\\Deprovisioned'; if (!(Test-Path $key)) { New-Item -Path $key -Force | Out-Null }"],
            "tags": ["privacy", "appx", "reprovisioning", "updates"],
            "sideEffects": ["Windows Update will no longer reinstall previously removed AppX packages"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "security.disable-hvci",
            "category": "advanced",
            "name": "Disable Hypervisor-enforced Code Integrity",
            "description": "Disable HVCI (Hypervisor-enforced Code Integrity) which validates kernel-mode code integrity using the hypervisor, adding overhead to every driver load and some system calls.",
            "rationale": "HVCI adds hypervisor-level validation overhead to kernel operations. On dedicated gaming PCs, disabling it reduces DPC latency and improves driver performance at the cost of reduced kernel security.",
            "risk": "high",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 3,
            "allowedProfiles": ["gaming_desktop", "low_spec_system"],
            "blockedProfiles": ["work_pc", "office_laptop", "vm_cautious"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity",
                    "valueName": "Enabled",
                    "value": 0,
                    "valueType": "DWord"
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["security", "hvci", "core-isolation", "performance"],
            "sideEffects": ["Kernel-mode code integrity will no longer be enforced by the hypervisor", "System is more vulnerable to kernel-level exploits"],
            "warningMessage": "Disabling HVCI reduces security. Only recommended for dedicated gaming PCs with no sensitive data."
        }),

        serde_json::json!({
            "id": "network.disable-ipv6",
            "category": "network",
            "name": "Disable IPv6 Protocol Stack",
            "description": "Disable the IPv6 protocol stack by setting DisabledComponents to 0xFF, preventing all IPv6 components from loading.",
            "rationale": "IPv6 expands the attack surface with additional protocols (NDP, SLAAC) that can be exploited for man-in-the-middle attacks. Most home networks operate purely on IPv4.",
            "risk": "medium",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters",
                    "valueName": "DisabledComponents",
                    "valueType": "DWord",
                    "value": 255
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["network", "ipv6", "security"],
            "sideEffects": ["IPv6-only services and networks will be unreachable"],
            "warningMessage": "Some networks require IPv6. Only disable on networks where IPv4 is sufficient."
        }),

        serde_json::json!({
            "id": "network.disable-llmnr",
            "category": "network",
            "name": "Disable Link-Local Multicast Name Resolution",
            "description": "Disable LLMNR by setting EnableMulticast to 0, preventing the system from responding to or sending LLMNR queries.",
            "rationale": "LLMNR is vulnerable to poisoning attacks where an attacker responds to name resolution queries to capture credentials (NTLMv2 hashes). Disabling it forces DNS-only resolution.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows NT\\DNSClient",
                    "valueName": "EnableMulticast",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["network", "security", "llmnr", "poisoning"],
            "sideEffects": ["Local network name resolution will only use DNS; devices without DNS entries may become unreachable by hostname"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "network.disable-netbios",
            "category": "network",
            "name": "Disable NetBIOS over TCP/IP",
            "description": "Disable NetBIOS over TCP/IP by setting NodeType to P-node (2) and NetbiosOptions to disabled (2), preventing NetBIOS name resolution and session services.",
            "rationale": "NetBIOS exposes ports 137-139 and is exploitable for enumeration, relay attacks, and credential theft. Modern networks use DNS and do not require NetBIOS.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": true,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters",
                    "valueName": "NodeType",
                    "valueType": "DWord",
                    "value": 2
                },
                {
                    "hive": "HKLM",
                    "path": "SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters",
                    "valueName": "NetbiosOptions",
                    "valueType": "DWord",
                    "value": 2
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["network", "security", "netbios"],
            "sideEffects": ["SMB file sharing by NetBIOS name will stop working; use IP addresses or DNS names instead"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "shell.disable-web-search",
            "category": "shell",
            "name": "Disable Web Results in Windows Search",
            "description": "Disable web results and Bing suggestions in the Windows Search box by setting DisableSearchBoxSuggestions to 1.",
            "rationale": "Windows Search sends every keystroke to Bing for web results, adding latency to local searches and leaking search queries. Disabling it makes search local-only and instant.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer",
                    "valueName": "DisableSearchBoxSuggestions",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "search", "privacy", "qol"],
            "sideEffects": ["Windows Search will no longer show web results or Bing suggestions"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "shell.disable-lock-screen-tips",
            "category": "shell",
            "name": "Disable Lock Screen Tips and Ads",
            "description": "Disable tips, tricks, and advertisements on the Windows lock screen by disabling SubscribedContent-338387 and RotatingLockScreenOverlay.",
            "rationale": "Microsoft displays promotional content and 'fun facts' on the lock screen that serve as advertising. Disabling them provides a cleaner lock screen experience.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SubscribedContent-338387Enabled",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "RotatingLockScreenOverlayEnabled",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "ads", "lockscreen", "qol"],
            "sideEffects": ["Lock screen will no longer display Microsoft tips or promotional content"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "shell.disable-start-menu-suggestions",
            "category": "shell",
            "name": "Disable Start Menu App Suggestions",
            "description": "Disable suggested apps in the Start Menu by disabling SystemPaneSuggestions and SubscribedContent-338388.",
            "rationale": "Windows suggests apps from the Microsoft Store in the Start Menu, which are effectively advertisements. Disabling them provides a cleaner Start Menu with only user-installed apps.",
            "risk": "safe",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "work_pc", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": [],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SystemPaneSuggestionsEnabled",
                    "valueType": "DWord",
                    "value": 0
                },
                {
                    "hive": "HKCU",
                    "path": "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
                    "valueName": "SubscribedContent-338388Enabled",
                    "valueType": "DWord",
                    "value": 0
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["shell", "ads", "startmenu", "qol"],
            "sideEffects": ["Start Menu will no longer suggest apps from the Microsoft Store"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "system.disable-update-auto-restart",
            "category": "system",
            "name": "Prevent Windows Update Auto-Restart",
            "description": "Prevent Windows Update from automatically restarting the PC when a user is logged on by setting NoAutoRebootWithLoggedOnUsers to 1.",
            "rationale": "Windows Update can forcibly restart the system during active use, causing data loss in unsaved work and interrupting gaming sessions. This policy gives the user control over restart timing.",
            "risk": "low",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU",
                    "valueName": "NoAutoRebootWithLoggedOnUsers",
                    "valueType": "DWord",
                    "value": 1
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["system", "updates", "restart"],
            "sideEffects": ["Windows Update will no longer auto-restart; the user must manually restart to complete updates"],
            "warningMessage": null
        }),

        serde_json::json!({
            "id": "system.defer-feature-updates",
            "category": "system",
            "name": "Defer Feature Updates by 365 Days",
            "description": "Defer Windows feature updates by 365 days, allowing only security and quality updates to install while postponing major version upgrades.",
            "rationale": "Feature updates (e.g., 23H2 → 24H2) often introduce driver incompatibilities, reset settings, and cause instability. Deferring them by a year lets early adopters find and report issues first.",
            "risk": "medium",
            "tier": "free",
            "requiresReboot": false,
            "reversible": true,
            "estimatedSeconds": 2,
            "allowedProfiles": ["gaming_desktop", "low_spec_system", "vm_cautious", "office_laptop"],
            "blockedProfiles": ["work_pc"],
            "preservationConflicts": [],
            "actionType": "registry",
            "registryChanges": [
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
                    "valueName": "DeferFeatureUpdates",
                    "valueType": "DWord",
                    "value": 1
                },
                {
                    "hive": "HKLM",
                    "path": "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
                    "valueName": "DeferFeatureUpdatesPeriodInDays",
                    "valueType": "DWord",
                    "value": 365
                }
            ],
            "serviceChanges": [],
            "taskChanges": [],
            "appxRemovals": [],
            "featureChanges": [],
            "powerShellCommands": [],
            "tags": ["system", "updates", "defer"],
            "sideEffects": ["Feature updates will be delayed by up to 365 days; security updates are unaffected"],
            "warningMessage": null
        }),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_classification(profile: &str) -> Value {
        serde_json::json!({
            "primary": profile,
            "confidence": 0.9,
            "scores": {},
            "signals": {},
            "workIndicators": {},
            "preservationFlags": match profile {
                "work_pc" => serde_json::json!({
                    "preserveOneDrive": true,
                    "preserveAppxPackages": false,
                    "preservePrintSpooler": true,
                    "preserveRdp": false,
                    "preserveGroupPolicy": true,
                }),
                "vm_cautious" => serde_json::json!({
                    "preserveOneDrive": false,
                    "preserveAppxPackages": true,
                    "preservePrintSpooler": false,
                    "preserveRdp": false,
                    "preserveGroupPolicy": false,
                }),
                _ => serde_json::json!({
                    "preserveOneDrive": false,
                    "preserveAppxPackages": false,
                    "preservePrintSpooler": false,
                    "preserveRdp": false,
                    "preserveGroupPolicy": false,
                }),
            },
        })
    }

    #[test]
    fn test_plan_generation_conservative() {
        let classification = make_classification("gaming_desktop");
        let plan = generate_plan(&classification, "conservative").unwrap();

        let actions = plan["actions"].as_array().unwrap();
        for action in actions {
            let risk = action["risk"].as_str().unwrap();
            assert!(
                risk == "safe" || risk == "low",
                "Conservative plan should only contain safe/low-risk actions, found: {}",
                risk
            );
        }
        assert!(
            !actions.is_empty(),
            "Conservative plan should have at least one action"
        );
    }

    #[test]
    fn test_work_pc_blocks_onedrive() {
        let classification = make_classification("work_pc");
        let plan = generate_plan(&classification, "aggressive").unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let has_onedrive = actions
            .iter()
            .any(|a| a["id"].as_str() == Some("tasks.disable-onedrive-tasks"));
        assert!(
            !has_onedrive,
            "work_pc profile must block tasks.disable-onedrive-tasks"
        );
    }

    #[test]
    fn test_vm_blocks_appx() {
        let classification = make_classification("vm_cautious");
        let plan = generate_plan(&classification, "aggressive").unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let has_appx = actions
            .iter()
            .any(|a| {
                a["id"]
                    .as_str()
                    .map(|id| id.starts_with("appx."))
                    .unwrap_or(false)
            });
        assert!(
            !has_appx,
            "vm_cautious profile must block all appx removal actions"
        );
    }

    #[test]
    fn test_action_count() {
        let all = embedded_actions();
        assert_eq!(
            all.len(),
            102,
            "Expected exactly 102 embedded actions, got {}",
            all.len()
        );
    }

    #[test]
    fn test_work_pc_blocks_shell_search() {
        let classification = make_classification("work_pc");
        let plan = generate_plan(&classification, "aggressive").unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let has_search = actions
            .iter()
            .any(|a| a["id"].as_str() == Some("shell.reduce-search-box"));
        assert!(
            !has_search,
            "work_pc profile must block shell.reduce-search-box"
        );
    }

    #[test]
    fn test_competitive_mode_allows_aggressive() {
        let classification = make_classification("gaming_desktop");
        let plan = generate_plan(&classification, "conservative").unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a["id"].as_str())
            .collect();

        assert!(
            action_ids.contains(&"cpu.win32-priority-separation"),
            "gaming_desktop conservative should include cpu.win32-priority-separation (risk: low)"
        );
        assert!(
            action_ids.contains(&"power.disable-fast-startup"),
            "gaming_desktop conservative should include power.disable-fast-startup (risk: safe)"
        );
        assert!(
            action_ids.contains(&"display.disable-pointer-acceleration"),
            "gaming_desktop conservative should include display.disable-pointer-acceleration (risk: safe)"
        );
    }

    #[test]
    fn test_office_laptop_blocks_cpu_power() {
        let mut classification = make_classification("gaming_desktop");
        classification["primary"] = serde_json::json!("office_laptop");
        let plan = generate_plan(&classification, "aggressive").unwrap();

        let actions = plan["actions"].as_array().unwrap();
        let action_ids: Vec<&str> = actions
            .iter()
            .filter_map(|a| a["id"].as_str())
            .collect();

        assert!(
            !action_ids.contains(&"cpu.disable-core-parking"),
            "office_laptop must block cpu.disable-core-parking"
        );
        assert!(
            !action_ids.contains(&"power.high-performance-plan"),
            "office_laptop must block power.high-performance-plan"
        );
    }

    #[test]
    fn test_work_pc_blocks_atlas_derived() {
        let classification = make_classification("work_pc");
        let plan = generate_plan(&classification, "aggressive").unwrap();
        let actions = plan["actions"].as_array().unwrap();
        let ids: Vec<&str> = actions.iter().filter_map(|a| a["id"].as_str()).collect();

        assert!(!ids.contains(&"perf.mmcss-system-responsiveness"), "MMCSS must be blocked on work_pc");
        assert!(!ids.contains(&"services.disable-print-spooler"), "Print spooler must be blocked on work_pc");
        assert!(!ids.contains(&"services.disable-remote-services"), "Remote services must be blocked on work_pc");
        assert!(!ids.contains(&"services.disable-sysmain"), "SysMain must be blocked on work_pc");
        assert!(!ids.contains(&"system.disable-windows-update"), "Windows Update must be blocked on work_pc");
        assert!(!ids.contains(&"security.reduce-ssbd-mitigation"), "SSBD must be blocked on work_pc");

        assert!(ids.contains(&"perf.disable-service-host-split"), "Service host split must be allowed on work_pc");
        assert!(ids.contains(&"shell.disable-copilot"), "Copilot disable must be allowed on work_pc");
        assert!(ids.contains(&"shutdown.decrease-shutdown-time"), "Shutdown time must be allowed on work_pc");
        assert!(ids.contains(&"perf.disable-paging-executive"), "Paging executive must be allowed on work_pc");
    }

    #[test]
    fn test_vm_cautious_blocks_gpu_and_appx() {
        let classification = make_classification("vm_cautious");
        let plan = generate_plan(&classification, "aggressive").unwrap();
        let actions = plan["actions"].as_array().unwrap();
        let ids: Vec<&str> = actions.iter().filter_map(|a| a["id"].as_str()).collect();

        assert!(!ids.contains(&"perf.gpu-energy-driver-disable"), "GPU energy driver must be blocked on vm_cautious");
        assert!(!ids.contains(&"gpu.msi-mode"), "GPU MSI mode must be blocked on vm_cautious");
        assert!(!ids.contains(&"startup.disable-gamebar-presence"), "GameBar presence must be blocked on vm_cautious");

        let appx_count = ids.iter().filter(|id| id.starts_with("appx.")).count();
        assert_eq!(appx_count, 0, "vm_cautious must block all AppX removal actions");

        assert!(ids.contains(&"privacy.disable-advertising-id"), "Privacy actions must be allowed on vm_cautious");
        assert!(ids.contains(&"shell.disable-copilot"), "Shell actions must be allowed on vm_cautious");
    }

    #[test]
    fn test_office_laptop_blocks_all_battery_draining() {
        let mut classification = make_classification("gaming_desktop");
        classification["primary"] = serde_json::json!("office_laptop");
        let plan = generate_plan(&classification, "aggressive").unwrap();
        let actions = plan["actions"].as_array().unwrap();
        let ids: Vec<&str> = actions.iter().filter_map(|a| a["id"].as_str()).collect();

        let must_block = [
            "cpu.disable-dynamic-tick",
            "cpu.disable-core-parking",
            "cpu.aggressive-boost-mode",
            "cpu.min-processor-state-100",
            "power.high-performance-plan",
            "power.disable-usb-selective-suspend",
            "power.disable-pcie-link-state-pm",
            "gpu.nvidia-disable-dynamic-pstate",
        ];
        for blocked in &must_block {
            assert!(!ids.contains(blocked), "office_laptop must block {}", blocked);
        }
    }

    #[test]
    fn test_atlas_derived_actions_have_registry_data() {
        let all = embedded_actions();
        let atlas_ids = [
            "perf.mmcss-system-responsiveness",
            "perf.disable-service-host-split",
            "perf.gpu-energy-driver-disable",
            "perf.disable-paging-executive",
            "shell.disable-copilot",
            "shutdown.decrease-shutdown-time",
        ];
        for target_id in &atlas_ids {
            let action = all.iter().find(|a| a["id"].as_str() == Some(target_id));
            assert!(action.is_some(), "Atlas-derived action {} must exist", target_id);
            let action = action.unwrap();
            let reg = action["registryChanges"].as_array();
            assert!(
                reg.is_some() && !reg.unwrap().is_empty(),
                "Atlas-derived action {} must have registry changes",
                target_id
            );
        }
    }
}
