#!/usr/bin/env node
/**
 * Mock JSON-RPC service for redcore-OS desktop headed proof.
 * Simulates the Rust service's IPC responses on macOS for UI testing.
 * Playbook-native: all methods match the real service contract.
 */

import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });
console.error("[Mock Service] Ready (OS mock — playbook-native)");

rl.on("line", (line) => {
  try {
    const req = JSON.parse(line);
    const result = handleMethod(req.method, req.params);
    process.stdout.write(JSON.stringify({ id: req.id, result }) + "\n");
  } catch (e) {
    console.error(`[Mock] Error: ${e.message}`);
  }
});

function handleMethod(method, params) {
  switch (method) {
    case "system.status":
      return { status: "running", uptimeSeconds: 42, version: "0.1.0" };

    case "system.reboot":
      return { status: "ok" };

    case "assess.full":
      return {
        id: "gaming_desktop",
        label: "Gaming Desktop",
        confidence: 92,
        isWorkPc: false,
        machineName: "REDCORE-PC",
        signals: [
          "NVIDIA RTX 3070 detected",
          "32 GB DDR4 RAM",
          "No domain join",
          "Steam / Discord installed",
          "NVMe SSD primary",
          "8-core CPU"
        ],
        accentColor: "text-brand-400",
        windows: { caption: "Microsoft Windows 11 Pro", buildNumber: "22631", displayVersion: "23H2" },
        appx: { count: 47, removable: 28 },
        services: { running: 142, total: 310, disableable: 45 },
        startup: { count: 12, heavyItems: ["Microsoft Teams", "Discord"] },
        telemetry: { activeTaskCount: 8, diagTrackRunning: true },
        vm: { isVM: false, hypervisor: null },
        workSignals: {
          printSpooler: "Running",
          rdpDenied: 0,
          domainJoined: false,
          smbServer: false,
          groupPolicyClient: "Stopped"
        },
        hardware: {
          cpu: "AMD Ryzen 7 5800X 8-Core Processor",
          gpu: "NVIDIA GeForce RTX 3070",
          ram: "32768 MB DDR4",
          storage: "Samsung SSD 980 PRO 1TB"
        },
        overallScore: 72
      };

    case "classify.machine":
      return {
        primary: "gaming_desktop",
        confidence: 0.92,
        scores: {
          gaming_desktop: 0.92,
          office_laptop: 0.15,
          work_pc: 0.08,
          low_spec_system: 0.05,
          vm_cautious: 0.02
        },
        workIndicators: { printSpooler: false, domainJoined: false, rdpEnabled: false },
        preservationFlags: []
      };

    // ─── Playbook-native path (primary) ───────────────────────────────

    case "playbook.resolve":
      return buildResolvedPlaybook(params?.profile ?? "gaming_desktop", params?.preset ?? "balanced");

    case "appbundle.getRecommended":
      return { apps: buildRecommendedApps(params?.profile ?? "gaming_desktop") };

    case "appbundle.resolve":
      return {
        profile: params?.profile ?? "gaming_desktop",
        queue: (params?.selectedApps ?? []).map((id) => ({
          id,
          name: APP_CATALOG[id]?.name ?? id,
          url: APP_CATALOG[id]?.url ?? "https://example.com",
          silentArgs: APP_CATALOG[id]?.silentArgs ?? "/S",
          status: "queued",
        })),
      };

    // ─── Execution & rollback ─────────────────────────────────────────

    case "execute.applyAction":
      return {
        actionId: params?.actionId,
        status: "success",
        succeeded: 1,
        failed: 0,
        snapshotId: "snap-" + Date.now(),
        results: [{ type: "registry", path: "HKCU\\mock", valueName: "mock", status: "success" }]
      };

    case "rollback.list":
      return [];

    case "rollback.restore":
      return { status: "success" };

    case "rollback.audit":
      return [];

    // ─── Personalization ──────────────────────────────────────────────

    case "personalize.options":
      return {
        darkMode: true,
        accentColor: "#E8453C",
        taskbarCleanup: true,
        explorerCleanup: true,
        wallpaper: true,
        transparency: false
      };

    case "personalize.apply":
      return { status: "success", changesApplied: 5 };

    case "personalize.revert":
      return { status: "success" };

    // ─── Journal (reboot/resume) ──────────────────────────────────────

    case "journal.state":
      return { pendingActions: 0, lastReboot: null };

    case "journal.resume":
      return { status: "complete", resumed: 0 };

    case "journal.cancel":
      return { status: "ok" };

    // ─── Verification ─────────────────────────────────────────────────

    case "verify.registryValue":
      return { exists: true, currentValue: 0, path: params?.path, valueName: params?.valueName };

    // ─── Legacy fallback (kept for CI backward compat only) ───────────

    case "transform.plan":
    case "transform.getActions":
    case "pipeline.assessClassifyPlan":
      console.error(`[Mock] LEGACY method called: ${method} — use playbook.resolve instead`);
      return { deprecated: true, message: `${method} is legacy. Use playbook.resolve.` };

    default:
      return { error: `Unknown method: ${method}` };
  }
}

// ─── Playbook builder ─────────────────────────────────────────────────────────

function buildResolvedPlaybook(profile, preset) {
  const phases = [
    {
      id: "cleanup", name: "Bloatware Cleanup",
      actions: [
        { id: "appx.remove-consumer-bloat", name: "Remove Consumer Bloatware", description: "Remove pre-installed consumer apps (Candy Crush, TikTok, etc.)", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "appx.remove-xbox-apps", name: "Remove Xbox Apps", description: "Remove Xbox Game Bar, Xbox Identity Provider", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
      ]
    },
    {
      id: "services", name: "Background Services",
      actions: [
        { id: "services.disable-sysmain", name: "Disable SysMain (Superfetch)", description: "Stop prefetching on SSD systems", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "services.disable-search-indexer", name: "Disable Windows Search Indexer", description: "Stop background file indexing", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "services.disable-print-spooler", name: "Disable Print Spooler", description: "Stop print service if no printers", risk: "low", status: profile === "work_pc" ? "Blocked" : "Included", default: true, expertOnly: false, blockedReason: profile === "work_pc" ? "Work PC: printing required" : null, requiresReboot: false, warningMessage: null },
      ]
    },
    {
      id: "privacy", name: "Privacy Hardening",
      actions: [
        { id: "privacy.disable-telemetry", name: "Set Diagnostic Data to Minimum", description: "Reduce Windows telemetry to required only", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "privacy.disable-advertising-id", name: "Disable Advertising ID", description: "Reset and disable ad tracking identifier", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "privacy.disable-tailored-experiences", name: "Disable Tailored Experiences", description: "Stop personalized ads from diagnostic data", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "privacy.disable-location", name: "Disable Location Services", description: "Turn off location tracking", risk: "safe", status: profile === "work_pc" ? "Blocked" : "Included", default: true, expertOnly: false, blockedReason: profile === "work_pc" ? "Work PC: may affect VPN" : null, requiresReboot: false, warningMessage: null },
      ]
    },
    {
      id: "performance", name: "Performance Optimization",
      actions: [
        { id: "perf.mmcss-system-responsiveness", name: "MMCSS System Responsiveness", description: "Allocate more CPU to multimedia tasks", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "perf.disable-game-dvr", name: "Disable Game DVR", description: "Stop background game recording", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "cpu.win32-priority-separation", name: "Optimize Process Priority", description: "Set foreground process priority for responsiveness", risk: "low", status: preset === "conservative" ? "Optional" : "Included", default: preset !== "conservative", expertOnly: false, blockedReason: null, requiresReboot: true, warningMessage: null },
        { id: "cpu.disable-core-parking", name: "Disable Core Parking", description: "Keep all CPU cores active", risk: "medium", status: preset === "aggressive" ? "Included" : "Optional", default: preset === "aggressive", expertOnly: false, blockedReason: null, requiresReboot: true, warningMessage: "May increase power consumption" },
      ]
    },
    {
      id: "shell", name: "Shell & Explorer",
      actions: [
        { id: "shell.disable-copilot", name: "Disable Windows Copilot", description: "Remove AI assistant from taskbar", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.show-file-extensions", name: "Show File Extensions", description: "Always show file type extensions", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.enable-end-task", name: "Enable End Task in Taskbar", description: "Show End Task when right-clicking taskbar apps on Windows 11", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.hide-widgets-button", name: "Hide Widgets Button", description: "Remove Widgets from taskbar", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.restore-classic-context-menu", name: "Restore Classic Context Menu", description: "Bring back the full right-click menu", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
      ]
    },
    {
      id: "startup-shutdown", name: "Startup & Shutdown",
      actions: [
        { id: "startup.disable-background-apps", name: "Disable Background Apps", description: "Prevent apps from running in background", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shutdown.decrease-shutdown-time", name: "Decrease Shutdown Time", description: "Reduce app kill timeouts", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "power.disable-fast-startup", name: "Disable Fast Startup", description: "Use clean boot for stability", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: true, warningMessage: null },
      ]
    },
    {
      id: "security", name: "Security Tuning",
      actions: [
        { id: "security.analyze-mitigations", name: "Analyze Security Mitigations", description: "Read-only: assess current CPU mitigation state", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "security.reduce-ssbd-mitigation", name: "Reduce SSBD Mitigation", description: "Disable Speculative Store Bypass for performance", risk: "high", status: "ExpertOnly", default: false, expertOnly: true, blockedReason: null, requiresReboot: true, warningMessage: "Reduces CPU security. Expert only." },
      ]
    },
  ];

  let totalIncluded = 0, totalBlocked = 0, totalOptional = 0, totalExpertOnly = 0;
  const blockedReasons = [];
  for (const phase of phases) {
    for (const a of phase.actions) {
      if (a.status === "Included") totalIncluded++;
      else if (a.status === "Blocked") { totalBlocked++; blockedReasons.push({ actionId: a.id, reason: a.blockedReason }); }
      else if (a.status === "Optional") totalOptional++;
      else if (a.status === "ExpertOnly") totalExpertOnly++;
    }
  }

  return {
    playbookName: "redcore-os-default",
    playbookVersion: "1.0.0",
    profile,
    preset,
    totalIncluded,
    totalBlocked,
    totalOptional,
    totalExpertOnly,
    phases,
    blockedReasons,
  };
}

// ─── App catalog & recommendations ────────────────────────────────────────────

const APP_CATALOG = {
  steam: { name: "Steam", category: "gaming", description: "Game distribution platform", url: "https://cdn.cloudflare.steamstatic.com/client/installer/SteamSetup.exe", silentArgs: "/S", workSafe: false },
  discord: { name: "Discord", category: "communication", description: "Voice and text chat for gamers", url: "https://discord.com/api/downloads/distributions/app/installers/latest?platform=win", silentArgs: "-s", workSafe: false },
  brave: { name: "Brave Browser", category: "browser", description: "Privacy-focused web browser", url: "https://laptop-updates.brave.com/latest/winx64", silentArgs: "--silent --install", workSafe: true },
  "7zip": { name: "7-Zip", category: "utility", description: "File archiver with high compression", url: "https://www.7-zip.org/a/7z2301-x64.exe", silentArgs: "/S", workSafe: true },
  vlc: { name: "VLC", category: "media", description: "Free open-source media player", url: "https://get.videolan.org/vlc/last/win64/", silentArgs: "/S /L=1033", workSafe: true },
  everything: { name: "Everything", category: "utility", description: "Instant file search", url: "https://www.voidtools.com/Everything-1.4.1.1024.x64-Setup.exe", silentArgs: "/S", workSafe: true },
  notepadpp: { name: "Notepad++", category: "development", description: "Source code editor", url: "https://notepad-plus-plus.org/", silentArgs: "/S", workSafe: true },
  hwinfo: { name: "HWiNFO", category: "monitoring", description: "Hardware monitoring and reporting", url: "https://www.hwinfo.com/", silentArgs: "/SILENT", workSafe: false },
};

const PROFILE_BUNDLES = {
  gaming_desktop: ["steam", "discord", "brave", "7zip", "everything", "hwinfo"],
  work_pc: ["brave", "7zip", "everything", "notepadpp"],
  office_laptop: ["brave", "7zip", "vlc", "everything", "notepadpp"],
  low_spec_system: ["brave", "7zip", "everything"],
  vm_cautious: ["7zip", "notepadpp"],
};

function buildRecommendedApps(profile) {
  const bundleIds = PROFILE_BUNDLES[profile] ?? PROFILE_BUNDLES.gaming_desktop;
  return Object.entries(APP_CATALOG).map(([id, app]) => ({
    id,
    name: app.name,
    category: app.category,
    description: app.description,
    recommended: bundleIds.includes(id),
    selected: bundleIds.includes(id),
    workSafe: app.workSafe,
  }));
}
