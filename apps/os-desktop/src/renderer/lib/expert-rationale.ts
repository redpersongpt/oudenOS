// ─── Expert Rationale — visible product intelligence ────────────────────────
// Maps action IDs to human-readable "why" explanations.
// Used by PlaybookReview, Execution, and Report steps.

interface ActionRationale {
  why: string;
  profileNote?: Record<string, string>;
  antiCheatNote?: string;
}

const RATIONALE: Record<string, ActionRationale> = {
  // Privacy
  "privacy.disable-telemetry": { why: "Reduces background data transmission to Microsoft servers. Sets diagnostic data to minimum required level." },
  "privacy.disable-recall": { why: "Prevents Windows from continuously capturing screenshots of your activity for AI search." },
  "privacy.disable-advertising-id": { why: "Stops cross-app ad tracking. No functional impact — purely privacy improvement." },
  "privacy.disable-click-to-do": { why: "Prevents the AI overlay from analyzing on-screen content and suggesting actions." },
  "privacy.disable-ai-svc-autostart": { why: "Windows AI Fabric service consumes resources even when AI features aren't actively used." },
  "privacy.disable-edge-ai": { why: "Edge sends browsing context to cloud AI services for Copilot, compose, and search features." },
  "privacy.disable-paint-ai": { why: "Paint AI features send image data to Microsoft cloud for generative processing." },
  "privacy.disable-notepad-ai": { why: "Notepad AI sends text content to cloud for AI-powered rewriting and generation." },
  "privacy.disable-location": {
    why: "Disables location tracking used by apps and Windows features.",
    profileNote: { work_pc: "May affect VPN geo-detection on managed networks." },
  },
  "privacy.disable-input-personalization": { why: "Prevents Windows from collecting typing and inking patterns for prediction improvement." },
  "privacy.disable-online-speech": { why: "Stops speech data from being sent to Microsoft for cloud recognition training." },
  "privacy.disable-find-my-device": { why: "Stops continuous device location reporting to Microsoft's Find My Device service." },
  "privacy.disable-smartscreen": {
    why: "SmartScreen sends file hashes and URLs to Microsoft. Disabling removes this telemetry at the cost of download protection.",
    profileNote: { work_pc: "Not recommended — provides protection against malicious downloads." },
  },

  // Shell
  "shell.disable-copilot": { why: "Removes the Copilot AI sidebar and taskbar button. Frees RAM and eliminates background AI service." },
  "shell.show-file-extensions": { why: "Shows file type extensions in Explorer. Improves security awareness — hidden extensions can mask malware." },
  "shell.restore-classic-context-menu": { why: "Restores the full right-click menu instead of the truncated Windows 11 version." },
  "shell.hide-task-view": { why: "Removes the Task View button from taskbar. The feature remains accessible via Win+Tab." },
  "shell.hide-widgets-button": { why: "Removes the Widgets button. Eliminates background news/weather data fetching." },
  "shell.disable-web-search": { why: "Removes Bing web results from Start menu search. Keystrokes no longer sent to Microsoft servers." },
  "shell.disable-edge-ads": { why: "Disables 11 Edge promotional policies — shopping assistant, recommendations, new tab ads, and telemetry." },
  "shell.enable-end-task": { why: "Adds 'End Task' to taskbar right-click menu. Quick way to force-close unresponsive apps." },
  "shell.hide-chat-icon": { why: "Removes the Teams Chat icon from taskbar. Teams remains functional if installed." },
  "shell.disable-content-delivery": { why: "Removes 8 content delivery subscriptions — welcome tips, suggested apps, silent app installs." },

  // Performance
  "perf.mmcss-system-responsiveness": {
    why: "Reduces background CPU reservation from 20% to 10%. More CPU available for games and active applications.",
    profileNote: { work_pc: "May affect background task performance during meetings." },
  },
  "perf.disable-game-dvr": { why: "Game DVR silently records gameplay in the background, consuming GPU resources and increasing frame times." },
  "perf.disable-fullscreen-optimizations": { why: "Windows routes fullscreen apps through the DWM compositor. Disabling allows true exclusive fullscreen with lower input lag." },
  "perf.disable-transparency": { why: "Transparency effects (acrylic, blur) require GPU compositing passes. Disabling frees GPU resources." },
  "perf.disable-fault-tolerant-heap": { why: "FTH silently adds compatibility shims to crashed apps, increasing memory usage. Disabling prevents this automatic intervention." },
  "perf.disable-sticky-keys": { why: "The Shift×5 sticky keys shortcut interrupts fullscreen games with an accessibility dialog." },
  "perf.disable-service-host-split": { why: "Groups services into fewer svchost processes, reducing memory overhead from process isolation." },
  "perf.disable-paging-executive": { why: "Keeps kernel-mode drivers in RAM instead of allowing them to be paged to disk. Eliminates kernel page fault latency." },
  "cpu.win32-priority-separation": { why: "Sets foreground thread quantum to 3:1 ratio. Active window threads get 3× the CPU time slice of background threads." },
  "cpu.disable-core-parking": {
    why: "Core parking powers down idle CPU cores. Unparking takes 1-5ms — enough to cause micro-stutter in frame-sensitive games.",
    profileNote: {
      office_laptop: "Not applied — increases power consumption and heat on battery.",
      gaming_laptop: "Not applied — thermal management is more critical on laptops.",
    },
  },
  "cpu.global-timer-resolution": { why: "Restores pre-Win10 2004 global timer behavior. Without this, background processes stay at 15.625ms resolution even while a game requests 0.5ms." },

  // Power
  "power.disable-fast-startup": { why: "Fast Startup creates a hybrid shutdown/hibernate state. Disabling ensures every boot is a clean kernel initialization." },
  "power.disable-modern-standby": {
    why: "Modern Standby keeps CPU and network active during sleep. Wastes power on desktops, drains battery on laptops.",
    profileNote: {
      office_laptop: "Not applied — Modern Standby is important for quick wake and background sync on laptops.",
      gaming_laptop: "Not applied — changes sleep behavior which may cause issues with thermal management.",
    },
  },
  "power.disable-hibernation": { why: "Frees disk space equal to your RAM (8-64GB). Removes hiberfil.sys and ensures clean S5 shutdown." },

  // GPU
  "gpu.disable-nvidia-container": { why: "Nvidia Container services run telemetry, overlay rendering, and update checks in the background. Manual driver updates via nvidia.com still work." },
  "gpu.disable-amd-services": { why: "AMD background services run crash monitoring and event handling. Manual driver updates via amd.com still work." },
  "gpu.disable-hags": { why: "HAGS moves GPU memory management to the GPU's own scheduler. Can reduce latency but may cause issues with older games." },
  "gpu.tdr-delay": { why: "Extends GPU timeout detection from 2s to 10s. Prevents false 'display driver stopped responding' crashes during heavy GPU load." },

  // AppX / Edge
  "appx.remove-consumer-bloat": { why: "Removes pre-installed apps like Candy Crush, TikTok, and Solitaire that consume disk space and run background tasks." },
  "appx.remove-xbox-apps": { why: "Removes Xbox Game Bar, Identity Provider, and companion apps. Reduces background services." },
  "appx.disable-edge-updates": { why: "Prevents Edge from auto-updating and reinstalling itself. Registry policy only — does not remove Edge." },
  "appx.disable-edge-preload": { why: "Edge preloads into memory at login even if you never open it. This reclaims 100-300MB of RAM." },
  "appx.remove-edge": {
    why: "Permanently removes Microsoft Edge. Cannot be undone from within Windows. Some Windows features that open web links via Edge will fail.",
    antiCheatNote: "Some enterprise web apps require Edge. Verify before removing.",
  },
  "appx.remove-edge-webview": {
    why: "WebView2 is used by Teams, Widgets, and many Electron apps. Removing it WILL break these applications.",
    profileNote: { work_pc: "NEVER remove on work PCs — Teams and enterprise apps require WebView2." },
  },

  // Services
  "services.disable-sysmain": { why: "SysMain prefetches data into RAM. On SSD systems, the benefit is negligible because SSD random read is already fast." },
  "services.disable-xbox-services": { why: "Xbox Live Auth, Game Save, and networking services run even without Xbox hardware or Game Pass." },
  "services.disable-print-spooler": {
    why: "The Print Spooler has been the target of critical vulnerabilities (PrintNightmare). Safe to disable if no printers are connected.",
    profileNote: { work_pc: "Preserved — printing is required for business workflows." },
  },

  // Network
  "network.disable-nagle": { why: "Nagle's algorithm buffers small packets, adding up to 200ms delay. Disabling sends game packets immediately." },
  "network.disable-offloading": {
    why: "NIC offloading adds latency to packet processing. CPU-side processing is faster for competitive gaming.",
    profileNote: { work_pc: "Not applied — may cause connectivity issues on managed networks." },
  },

  // Startup
  "startup.disable-background-apps": { why: "Prevents UWP apps from running background tasks. Reduces CPU and memory usage from apps you're not actively using." },
  "startup.disable-autoplay": { why: "AutoPlay/AutoRun is a security risk — malware spreads via USB drives with autorun.inf files." },

  // Security
  "security.disable-delivery-optimization": { why: "Delivery Optimization uploads Windows Update data to other PCs, consuming your upload bandwidth." },
  "security.disable-update-asap": { why: "Prevents Windows from opting into preview-quality 'continuous innovation' updates." },
};

export function getActionRationale(actionId: string, profile?: string): { why: string; profileWarning?: string; antiCheatNote?: string } {
  const r = RATIONALE[actionId];
  if (!r) return { why: "" };

  return {
    why: r.why,
    profileWarning: profile && r.profileNote?.[profile],
    antiCheatNote: r.antiCheatNote,
  };
}

// Phase-level explanations
export const PHASE_RATIONALE: Record<string, string> = {
  cleanup: "Removes pre-installed bloatware and unused packages to free disk space and reduce background processes.",
  services: "Disables background services that aren't needed for your use case. Each service's dependencies are checked before disabling.",
  tasks: "Disables scheduled tasks that run periodic telemetry collection, update checks, and maintenance during idle periods.",
  privacy: "Reduces data collection by disabling telemetry, advertising tracking, AI features, and input monitoring.",
  performance: "Optimizes CPU scheduling, GPU behavior, and system responsiveness for lower latency and better frame pacing.",
  shell: "Cleans up the taskbar, context menus, search, and Explorer for a distraction-free desktop experience.",
  "startup-shutdown": "Reduces boot overhead by disabling background apps, auto-maintenance, and hybrid shutdown states.",
  networking: "Optimizes network stack for lower latency — Nagle's algorithm, RSS queues, and protocol hardening.",
  security: "Adjusts Windows Update behavior and security mitigations based on your risk tolerance and use case.",
  personalization: "Applies visual preferences — dark mode, accent color, taskbar cleanup, and transparency settings.",
};

// Blocked reason explanations
export function getBlockedExplanation(actionId: string, reason: string | null, profile: string): string {
  if (reason) return reason;

  if (profile === "work_pc") {
    if (actionId.includes("print")) return "Preserved — printing stack is required for business workflows.";
    if (actionId.includes("remote") || actionId.includes("rdp")) return "Preserved — remote support and RDP access are required for IT management.";
    if (actionId.includes("smb")) return "Preserved — network file sharing is required for mapped drives.";
    if (actionId.includes("edge")) return "Blocked — enterprise web apps and IT policies may depend on Edge.";
    if (actionId.includes("update")) return "Blocked — managed update policies are controlled by IT.";
    return "Blocked — may affect business-critical workflows on this Work PC.";
  }

  if (profile === "office_laptop" || profile === "gaming_laptop") {
    if (actionId.includes("core-parking") || actionId.includes("modern-standby") || actionId.includes("processor-state"))
      return "Not applied — increases power consumption and heat on battery-powered systems.";
    if (actionId.includes("pcie") || actionId.includes("aspm"))
      return "Not applied — PCIe power management is essential for battery life.";
  }

  if (profile === "vm_cautious") {
    if (actionId.includes("appx") || actionId.includes("gpu") || actionId.includes("nvidia") || actionId.includes("amd"))
      return "Blocked — hardware-specific tweaks don't apply in virtual environments.";
    return "Blocked — aggressive changes are suppressed in cautious mode.";
  }

  return "Blocked by profile safety rules.";
}
