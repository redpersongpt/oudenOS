#!/usr/bin/env node
/**
 * Mock JSON-RPC service for redcore-OS desktop headed proof.
 * Simulates the Rust service's IPC responses on macOS for UI testing.
 * Playbook-native: all methods match the real service contract.
 */

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";

const rl = createInterface({ input: process.stdin });
console.error("[Mock Service] Ready (OS mock — playbook-native)");

const FALLBACK_DATA = JSON.parse(
  readFileSync(new URL("../src/renderer/lib/generated-playbook-fallback.json", import.meta.url), "utf8"),
);

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
        brandAccent: true,
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
      return null;

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
  const rules = FALLBACK_DATA.profiles[profile] ?? { blockedActions: [], optionalActions: [] };
  const normalizedPreset = preset === "expert" ? "aggressive" : preset;
  const phases = FALLBACK_DATA.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    actions: phase.actions.map((action) => {
      const status = buildActionStatus(action, profile, normalizedPreset, rules, 22631);
      return {
        id: action.id,
        name: action.name,
        description: action.description,
        risk: action.risk,
        status: status.status,
        default: action.default,
        expertOnly: action.expertOnly,
        blockedReason: status.blockedReason,
        requiresReboot: action.requiresReboot,
        warningMessage: action.warningMessage,
      };
    }),
  }));

  let totalIncluded = 0;
  let totalBlocked = 0;
  let totalOptional = 0;
  let totalExpertOnly = 0;
  const blockedReasons = [];
  for (const phase of phases) {
    for (const a of phase.actions) {
      if (a.status === "Included") totalIncluded++;
      else if (a.status === "Blocked") { totalBlocked++; blockedReasons.push({ actionId: a.id, reason: a.blockedReason }); }
      else if (a.status === "BuildGated") { totalBlocked++; blockedReasons.push({ actionId: a.id, reason: a.blockedReason }); }
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

function matchesBlockedPattern(pattern, actionId) {
  return pattern.endsWith(".*")
    ? actionId.startsWith(pattern.slice(0, -2))
    : pattern === actionId;
}

function allowsRisk(risk, preset) {
  if (preset === "conservative") {
    return risk === "safe" || risk === "low";
  }
  if (preset === "balanced") {
    return risk !== "high" && risk !== "extreme";
  }
  return true;
}

function buildActionStatus(action, profile, preset, rules, windowsBuild) {
  const isBlockedByProfile =
    action.blockedProfiles.includes(profile) ||
    rules.blockedActions.some((pattern) => matchesBlockedPattern(pattern, action.id));

  if (isBlockedByProfile) {
    return {
      status: "Blocked",
      blockedReason: `Blocked for ${profile} profile`,
    };
  }

  if (action.minWindowsBuild !== null && windowsBuild < action.minWindowsBuild) {
    return {
      status: "BuildGated",
      blockedReason: `Requires Windows build ${action.minWindowsBuild} or later`,
    };
  }

  if (action.expertOnly) {
    return {
      status: "ExpertOnly",
      blockedReason: "Expert-only action",
    };
  }

  if (rules.optionalActions.includes(action.id) || action.default === false) {
    return {
      status: "Optional",
      blockedReason: null,
    };
  }

  if (!allowsRisk(action.risk, preset)) {
    return {
      status: "Optional",
      blockedReason: null,
    };
  }

  return {
    status: "Included",
    blockedReason: null,
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
