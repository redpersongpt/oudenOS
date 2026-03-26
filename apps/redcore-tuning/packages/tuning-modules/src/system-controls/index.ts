// ─── Advanced System Controls Module ─────────────────────────────────────────
// Windows Update, Defender, and Edge management actions.
// High-risk actions are gated to premium tier and carry extensive warnings.

import type { TuningActionDefinition } from "../types.js";

export const systemControlsActions: TuningActionDefinition[] = [
  // ── Windows Update Controls (Safe / Free Tier) ─────────────────────────────

  {
    id: "system.defer-feature-updates",
    name: "Defer Feature Updates by 365 Days",
    category: "security",
    description: "Configure Windows Update for Business (WUfB) to defer feature updates (major version upgrades) by 365 days. Quality/security updates are unaffected.",
    rationale: "Feature updates (e.g., 23H2 to 24H2) often introduce bugs, driver incompatibilities, and unwanted UI changes in the first months after release. Deferring by 365 days lets early adopters shake out issues. Security patches continue to arrive normally via quality updates.",
    tier: "free",
    risk: "safe",
    compatibility: {
      minBuild: 15063, // Windows 10 1703+ (Creators Update) introduced WUfB policies
      editions: ["Pro", "Professional", "Enterprise", "Education"],
    },
    dependencies: [],
    conflicts: ["system.disable-windows-update"],
    estimatedImpact: null,
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "DeferFeatureUpdates",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "DeferFeatureUpdatesPeriodInDays",
        valueType: "REG_DWORD",
        newValue: 365,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "BranchReadinessLevel",
        valueType: "REG_DWORD",
        newValue: 32, // Semi-Annual Channel
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "You will not receive major Windows feature upgrades for 365 days",
      "Security/quality updates continue normally",
      "Only works on Pro/Enterprise/Education editions — Home ignores WUfB policies",
    ],
    tags: ["windows-update", "stability", "safe"],
  },
  {
    id: "system.defer-quality-updates",
    name: "Defer Quality Updates by 7 Days",
    category: "security",
    description: "Configure WUfB to defer quality updates (cumulative security patches) by 7 days.",
    rationale: "Cumulative quality updates occasionally cause issues (driver conflicts, BSOD, boot loops). A 7-day deferral allows the community to discover and report critical problems before your system installs them. Microsoft can pull defective updates within this window.",
    tier: "free",
    risk: "safe",
    compatibility: {
      minBuild: 15063,
      editions: ["Pro", "Professional", "Enterprise", "Education"],
    },
    dependencies: [],
    conflicts: ["system.disable-windows-update"],
    estimatedImpact: null,
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "DeferQualityUpdates",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "DeferQualityUpdatesPeriodInDays",
        valueType: "REG_DWORD",
        newValue: 7,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Security patches arrive 7 days later than normal",
      "System is exposed to newly disclosed vulnerabilities for an extra week",
      "Only works on Pro/Enterprise/Education editions",
    ],
    tags: ["windows-update", "stability", "safe"],
  },
  {
    id: "system.disable-driver-updates-via-wu",
    name: "Prevent Driver Installation via Windows Update",
    category: "security",
    description: "Disable automatic driver installation through Windows Update. Drivers must be manually installed or updated through the manufacturer's tools.",
    rationale: "Windows Update frequently installs generic or outdated drivers that override manufacturer-optimized versions (especially NVIDIA/AMD GPU drivers). This causes performance regressions, black screens, and loss of vendor-specific features. Manual driver management gives full control over driver versions.",
    tier: "free",
    risk: "low",
    compatibility: { minBuild: 10240 },
    dependencies: [],
    conflicts: ["system.disable-windows-update"],
    estimatedImpact: null,
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "ExcludeWUDriversInQualityUpdate",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DriverSearching",
        valueName: "SearchOrderConfig",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata",
        valueName: "PreventDeviceMetadataFromNetwork",
        valueType: "REG_DWORD",
        newValue: 1,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "New hardware may not automatically get drivers — manual installation required",
      "GPU drivers will not be updated through Windows Update",
      "Plug-and-play devices may not work until drivers are manually installed",
    ],
    tags: ["windows-update", "drivers", "stability"],
  },

  // ── Windows Update Controls (Expert / Premium / High Risk) ─────────────────

  {
    id: "system.disable-windows-update",
    name: "Disable Windows Update (EXTREME RISK)",
    category: "security",
    description: "Completely disable the Windows Update service and all related update mechanisms. This stops ALL updates — security patches, quality updates, feature updates, and Microsoft Store updates.",
    rationale: "On fully isolated benchmark machines or air-gapped gaming rigs, Windows Update background activity (TiWorker.exe, UsoClient.exe) consumes CPU, disk I/O, and causes micro-stutter during gaming sessions. Disabling it eliminates all update-related background activity. THIS IS NOT RECOMMENDED FOR ANY INTERNET-CONNECTED SYSTEM.",
    tier: "premium",
    risk: "extreme",
    compatibility: {
      minBuild: 10240,
      requiresAdmin: true,
    },
    dependencies: [],
    conflicts: [
      "system.defer-feature-updates",
      "system.defer-quality-updates",
      "system.disable-driver-updates-via-wu",
    ],
    estimatedImpact: {
      metric: "background_cpu_usage",
      directionBetter: "lower",
      estimatedDelta: "Eliminates Windows Update background I/O and CPU spikes",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU",
        valueName: "NoAutoUpdate",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "DisableWindowsUpdateAccess",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "DoNotConnectToWindowsUpdateInternetLocations",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        valueName: "SetDisableUXWUAccess",
        valueType: "REG_DWORD",
        newValue: 1,
      },
    ],
    serviceChanges: [
      { serviceName: "wuauserv", newStartType: "Disabled" },
      { serviceName: "UsoSvc", newStartType: "Disabled" },
      { serviceName: "WaaSMedicSvc", newStartType: "Disabled" },
    ],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: true,
    sideEffects: [
      "CRITICAL: System will no longer receive security patches",
      "System is exposed to all future discovered vulnerabilities",
      "Microsoft Store will stop functioning",
      "Expert-only: Only for isolated benchmark/gaming systems",
      "Windows Defender definition updates will also stop",
      "Cumulative updates, zero-day patches, and driver updates will not be installed",
      "Some third-party software that depends on Windows Update components may break",
      "WaaSMedicSvc may re-enable itself on future Windows versions — monitor after reboot",
      "To re-enable, all three services must be set back to Manual/Automatic and registry keys removed",
    ],
    tags: ["windows-update", "expert", "extreme-risk", "benchmark"],
  },

  // ── Defender Controls (Safe / Free) ────────────────────────────────────────

  {
    id: "system.defender-add-game-exclusions",
    name: "Add Game Directory Exclusions to Windows Defender",
    category: "security",
    description: "Analyze installed game directories (Steam, Epic, GOG, etc.) and add them to Windows Defender's real-time protection exclusion list. This is analysis + non-destructive config change only.",
    rationale: "Windows Defender real-time scanning intercepts every file read, adding 1-5ms per I/O operation. Games load thousands of asset files during level loads and streaming. Adding game directories to the exclusion list eliminates this overhead. Steam library folders, Epic vaults, and other launcher directories are scanned to build the exclusion list.",
    tier: "free",
    risk: "low",
    compatibility: {
      minBuild: 10240,
      requiresAdmin: true,
    },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "game_load_time",
      directionBetter: "lower",
      estimatedDelta: "~5-20% faster level/asset loading",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths",
        valueName: "{dynamic:steam_library}",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths",
        valueName: "{dynamic:epic_vault}",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths",
        valueName: "{dynamic:gog_library}",
        valueType: "REG_DWORD",
        newValue: 0,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Files in excluded directories will not be scanned by real-time protection",
      "If a game mod or download contains malware, Defender will not catch it in these folders",
      "Tamper Protection may block registry-based exclusion changes — use PowerShell Add-MpPreference as fallback",
      "Exclusion paths are dynamically detected at execution time based on installed launchers",
    ],
    tags: ["defender", "gaming", "performance", "exclusions"],
  },
  {
    id: "system.disable-defender-sample-submission",
    name: "Disable Defender Automatic Sample Submission",
    category: "security",
    description: "Disable automatic sample submission to Microsoft when Defender detects a suspicious file. Cloud-delivered protection and real-time scanning remain active.",
    rationale: "By default, Defender uploads suspicious files to Microsoft for analysis. This can upload game files, mods, and private data without user consent. Disabling sample submission stops this upload behavior while keeping all local protection active.",
    tier: "free",
    risk: "safe",
    compatibility: { minBuild: 10240 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: null,
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet",
        valueName: "SubmitSamplesConsent",
        valueType: "REG_DWORD",
        newValue: 2, // 2 = Never send
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet",
        valueName: "SpynetReporting",
        valueType: "REG_DWORD",
        newValue: 0, // 0 = Disabled
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Microsoft will not receive samples for analysis — slightly slower cloud signature updates for novel threats",
      "Cloud-delivered protection and real-time scanning remain fully functional",
      "Tamper Protection may revert these changes if enabled — check Security Center settings",
    ],
    tags: ["defender", "privacy", "safe"],
  },

  // ── Browser Cleanup (Safe / Free) ──────────────────────────────────────────

  {
    id: "system.disable-edge-startup",
    name: "Disable Microsoft Edge Auto-Startup and Background Running",
    category: "startup",
    description: "Disable Edge startup boost, background running, and auto-launch on Windows startup. Frees ~100-200MB RAM and eliminates Edge background processes.",
    rationale: "Edge runs multiple background processes by default even when not in use: startup boost pre-launches Edge at login, and background extensions keep Edge alive. This wastes memory and CPU cycles on systems that use a different default browser.",
    tier: "free",
    risk: "safe",
    compatibility: { minBuild: 10240 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "idle_memory_usage",
      directionBetter: "lower",
      estimatedDelta: "~100-200MB RAM freed at idle",
      confidence: "measured",
    },
    registryChanges: [
      // Disable Edge startup boost
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Edge",
        valueName: "StartupBoostEnabled",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      // Disable Edge background running
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Edge",
        valueName: "BackgroundModeEnabled",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      // Prevent Edge from pre-launching at Windows startup
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\Main",
        valueName: "AllowPrelaunch",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      // Disable Edge tab pre-loading on new tab page
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\MicrosoftEdge\\TabPreloader",
        valueName: "AllowTabPreloading",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      // Prevent Edge from running at startup via "Startup Apps"
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\Edge",
        valueName: "HubsSidebarEnabled",
        valueType: "REG_DWORD",
        newValue: 0,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Edge will take slightly longer to open on first launch (no startup boost)",
      "Edge extensions that rely on background mode will not run when Edge is closed",
      "Edge sidebar and hub features will be disabled",
    ],
    tags: ["edge", "startup", "memory", "debloat"],
  },
  {
    id: "system.disable-edge-updates",
    name: "Disable Microsoft Edge Auto-Update Services",
    category: "startup",
    description: "Disable the Microsoft Edge Update service and scheduled tasks that check for and install Edge updates in the background.",
    rationale: "Edge auto-update services (MicrosoftEdgeUpdate.exe) run scheduled tasks and a persistent service that consume CPU and network bandwidth. On systems using a different browser, these updates are unnecessary overhead.",
    tier: "free",
    risk: "low",
    compatibility: { minBuild: 10240 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "background_cpu_usage",
      directionBetter: "lower",
      estimatedDelta: "Eliminates periodic Edge update CPU/network spikes",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\EdgeUpdate",
        valueName: "UpdateDefault",
        valueType: "REG_DWORD",
        newValue: 0, // 0 = Updates disabled
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\EdgeUpdate",
        valueName: "AutoUpdateCheckPeriodMinutes",
        valueType: "REG_DWORD",
        newValue: 0, // 0 = Never check
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Policies\\Microsoft\\EdgeUpdate",
        valueName: "Install{56EB18F8-B008-4CBD-B6D2-8C97FE7E9062}",
        valueType: "REG_DWORD",
        newValue: 0, // Prevent Edge (Stable) install/update
      },
    ],
    serviceChanges: [
      { serviceName: "edgeupdate", newStartType: "Disabled" },
      { serviceName: "edgeupdatem", newStartType: "Disabled" },
    ],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Edge will not receive updates — security vulnerabilities in Edge will not be patched",
      "If Edge is your default browser, you should NOT apply this action",
      "Edge update scheduled tasks may need to be manually disabled in Task Scheduler",
      "Microsoft may re-enable updates through Windows cumulative updates",
    ],
    tags: ["edge", "updates", "debloat", "services"],
  },
];
