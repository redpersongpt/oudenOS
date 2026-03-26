#!/usr/bin/env node
/**
 * Mock JSON-RPC service for redcore-OS desktop headed proof.
 * Simulates the Rust service's IPC responses on macOS for UI testing.
 */

import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });
console.error("[Mock Service] Ready (OS mock)");

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

    case "assess.full":
      // Return DetectedProfile shape expected by the wizard store
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
        // Also include raw assessment data for other steps
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

    case "transform.plan": {
      const profile = params?.profile ?? "gaming_desktop";
      const preset = params?.preset ?? "balanced";
      const actions = generatePlanActions(profile, preset);
      return {
        id: "plan-" + Date.now(),
        profile,
        preset,
        actionCount: actions.length,
        actions
      };
    }

    case "transform.getActions": {
      const cat = params?.category;
      const all = generatePlanActions("gaming_desktop", "aggressive");
      return cat ? all.filter(a => a.category === cat) : all;
    }

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

    case "rollback.audit":
      return [];

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

    case "pipeline.assessClassifyPlan":
      return {
        assessment: handleMethod("assess.full", {}),
        classification: handleMethod("classify.machine", {}),
        plan: handleMethod("transform.plan", { preset: params?.preset ?? "balanced" })
      };

    default:
      return { error: `Unknown method: ${method}` };
  }
}

function generatePlanActions(profile, preset) {
  const actions = [
    { id: "privacy.disable-telemetry", category: "privacy", name: "Disable Telemetry", description: "Reduce diagnostic data collection", risk: "safe" },
    { id: "privacy.disable-advertising-id", category: "privacy", name: "Disable Advertising ID", description: "Reset and disable advertising identifier", risk: "safe" },
    { id: "privacy.disable-tailored-experiences", category: "privacy", name: "Disable Tailored Experiences", description: "Stop personalized ads based on diagnostic data", risk: "safe" },
    { id: "shell.disable-copilot", category: "shell", name: "Disable Windows Copilot", description: "Remove Copilot from taskbar and disable AI assistant", risk: "safe" },
    { id: "shell.show-file-extensions", category: "shell", name: "Show File Extensions", description: "Display file extensions in Explorer", risk: "safe" },
    { id: "shell.hide-widgets-button", category: "shell", name: "Hide Widgets Button", description: "Remove the Widgets button from taskbar", risk: "safe" },
    { id: "perf.mmcss-system-responsiveness", category: "performance", name: "MMCSS System Responsiveness", description: "Allocate more CPU to multimedia tasks", risk: "low" },
    { id: "perf.disable-service-host-split", category: "performance", name: "Disable Service Host Splitting", description: "Group services into fewer processes", risk: "low" },
    { id: "shutdown.decrease-shutdown-time", category: "startup", name: "Decrease Shutdown Time", description: "Reduce app kill timeouts for faster shutdown", risk: "low" },
    { id: "startup.disable-background-apps", category: "startup", name: "Disable Background Apps", description: "Prevent apps from running in background", risk: "safe" },
    { id: "display.disable-pointer-acceleration", category: "display", name: "Disable Mouse Acceleration", description: "Raw 1:1 mouse input", risk: "safe" },
    { id: "storage.disable-last-access", category: "storage", name: "Disable Last Access Timestamps", description: "Reduce disk writes on every file access", risk: "safe" },
  ];
  return actions;
}
