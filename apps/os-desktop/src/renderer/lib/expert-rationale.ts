// Expert Rationale — visible product intelligence
// Maps action IDs to human-readable "why" explanations.
// Used by PlaybookReview, Execution, and Report steps.

interface ActionRationale {
  why: string;
  profileNote?: Record<string, string>;
  antiCheatNote?: string;
}

const RATIONALE: Record<string, ActionRationale> = {
  // Privacy
  "privacy.disable-telemetry": { why: "Stops Windows from sending usage data to Microsoft in the background." },
  "privacy.disable-recall": { why: "Stops Windows from taking screenshots of everything you do for AI search." },
  "privacy.disable-advertising-id": { why: "Stops apps from tracking you for targeted ads. No downside." },
  "privacy.disable-click-to-do": { why: "Removes the AI overlay that analyzes your screen and suggests actions." },
  "privacy.disable-ai-svc-autostart": { why: "The AI background service uses memory even when you're not using AI features." },
  "privacy.disable-edge-ai": { why: "Stops Edge from sending your browsing activity to cloud AI services." },
  "privacy.disable-paint-ai": { why: "Stops Paint from sending your images to Microsoft's cloud for AI processing." },
  "privacy.disable-notepad-ai": { why: "Stops Notepad from sending your text to the cloud for AI features." },
  "privacy.disable-location": {
    why: "Stops Windows and apps from tracking your location.",
    profileNote: { work_pc: "May affect VPN geo-detection on managed networks." },
  },
  "privacy.disable-input-personalization": { why: "Stops Windows from collecting what you type and how you write." },
  "privacy.disable-online-speech": { why: "Stops your voice data from being sent to Microsoft." },
  "privacy.disable-find-my-device": { why: "Stops your PC from constantly reporting its location to Microsoft." },
  "privacy.disable-smartscreen": {
    why: "SmartScreen checks every file you download with Microsoft. Disabling stops this, but removes download protection.",
    profileNote: { work_pc: "Not recommended — provides protection against malicious downloads." },
  },

  // Shell
  "shell.disable-copilot": { why: "Removes the Copilot button and frees up memory it uses in the background." },
  "shell.show-file-extensions": { why: "Shows file types (.exe, .pdf) in Explorer so you can spot disguised malware." },
  "shell.enable-end-task": { why: "Lets you kill frozen apps directly from the taskbar without opening Task Manager." },
  "shell.restore-classic-context-menu": { why: "Brings back the full right-click menu instead of the trimmed Windows 11 version." },
  "shell.hide-task-view": { why: "Removes the Task View button. You can still use Win+Tab." },
  "shell.hide-widgets-button": { why: "Removes the Widgets button and stops background news/weather fetching." },
  "shell.disable-web-search": { why: "Stops Start menu from sending your searches to Bing." },
  "shell.disable-edge-ads": { why: "Stops Edge from showing shopping suggestions, new tab ads, and promotional popups." },
  "shell.hide-chat-icon": { why: "Removes the Teams Chat icon from the taskbar. Teams still works if installed." },
  "shell.disable-content-delivery": { why: "Stops Windows from silently installing suggested apps and showing welcome tips." },

  // Performance
  "perf.mmcss-system-responsiveness": {
    why: "Gives more CPU to your games and active apps by reducing what Windows reserves for background tasks.",
    profileNote: { work_pc: "May affect background task performance during meetings." },
  },
  "perf.disable-game-dvr": { why: "Stops the silent background game recording that eats GPU resources and causes frame drops." },
  "perf.disable-fullscreen-optimizations": { why: "Gives you true fullscreen instead of Windows' compatibility layer. Lower input lag." },
  "perf.disable-transparency": { why: "Removes the blur and see-through effects that use GPU resources." },
  "perf.disable-fault-tolerant-heap": { why: "Stops Windows from silently patching crashed apps, which uses extra memory." },
  "perf.disable-sticky-keys": { why: "Stops the Shift key popup from interrupting fullscreen games." },
  "perf.disable-service-host-split": { why: "Groups background services together to use less memory." },
  "perf.disable-paging-executive": { why: "Keeps important system code in RAM instead of swapping to disk." },
  "cpu.win32-priority-separation": { why: "Makes the app you're using get 3x more CPU time than background apps." },
  "cpu.disable-core-parking": {
    why: "Keeps all CPU cores awake so they respond instantly instead of taking 1-5ms to wake up.",
    profileNote: {
      office_laptop: "Not applied — increases power consumption and heat on battery.",
      gaming_laptop: "Not applied — thermal management is more critical on laptops.",
    },
  },
  "cpu.global-timer-resolution": { why: "Fixes a Windows 11 change that made game timing less accurate." },

  // Power
  "power.disable-fast-startup": { why: "Makes your PC fully shut down instead of saving a snapshot. Prevents driver issues from stale state." },
  "power.disable-modern-standby": {
    why: "Stops your PC from staying partially active during sleep, which wastes power and drains battery.",
    profileNote: {
      office_laptop: "Not applied — Modern Standby is important for quick wake and background sync on laptops.",
      gaming_laptop: "Not applied — changes sleep behavior which may cause issues with thermal management.",
    },
  },
  "power.disable-hibernation": { why: "Frees disk space equal to your RAM (8-64GB) and ensures clean shutdowns." },

  // GPU
  "gpu.disable-nvidia-container": { why: "Stops NVIDIA background services that collect data. You can still update drivers manually." },
  "gpu.disable-amd-services": { why: "Stops AMD background services that collect data. You can still update drivers manually." },
  "gpu.disable-hags": { why: "Lets Windows manage GPU memory instead of the GPU itself. More predictable on some systems." },
  "gpu.tdr-delay": { why: "Gives the GPU more time before Windows thinks it crashed. Prevents false 'driver stopped responding' errors." },

  // AppX / Edge
  "appx.remove-consumer-bloat": { why: "Removes apps like Candy Crush, TikTok, and Solitaire that you didn't ask for." },
  "appx.remove-xbox-apps": { why: "Removes Xbox Game Bar and related apps that run in the background." },
  "appx.disable-edge-updates": { why: "Stops Edge from updating itself automatically. Does not remove Edge." },
  "appx.disable-edge-preload": { why: "Stops Edge from loading into memory at startup, even when you never open it. Saves 100-300MB RAM." },
  "appx.remove-edge": {
    why: "Permanently deletes Edge. Cannot be undone. Some Windows features that need a browser will stop working.",
    antiCheatNote: "Some enterprise web apps require Edge. Verify before removing.",
  },
  "appx.remove-edge-webview": {
    why: "WebView2 is needed by Teams, Widgets, and many apps. Removing it WILL break them.",
    profileNote: { work_pc: "NEVER remove on work PCs — Teams and enterprise apps require WebView2." },
  },

  // Services
  "services.disable-sysmain": { why: "Stops Windows from pre-loading apps into RAM. Not needed if you have an SSD." },
  "services.disable-xbox-services": { why: "Stops Xbox services that run even if you don't use Xbox or Game Pass." },
  "services.disable-print-spooler": {
    why: "The print service has known security flaws. Safe to turn off if you don't use a printer.",
    profileNote: { work_pc: "Preserved — printing is required for business workflows." },
  },

  // Network
  "network.disable-nagle": { why: "Sends game data immediately instead of waiting to bundle packets. Reduces online game delay." },
  "network.disable-offloading": {
    why: "Lets your CPU handle network packets directly for faster response in online games.",
    profileNote: { work_pc: "Not applied — may cause connectivity issues on managed networks." },
  },

  // Startup
  "startup.disable-background-apps": { why: "Stops apps from running silently when you're not using them. Saves CPU and memory." },
  "startup.disable-autoplay": { why: "Stops USB drives from running programs automatically. Prevents a common way malware spreads." },

  // Security
  "security.disable-delivery-optimization": { why: "Stops Windows from using your internet to upload updates to other people's PCs." },
  "security.disable-update-asap": { why: "Stops Windows from opting you into early preview updates that may be less stable." },

  // PC-Tuning derived optimizations
  "perf.disable-mouse-acceleration": { why: "Removes pointer acceleration for 1:1 mouse input. MouseSpeed=0 gives you raw sensor movement." },
  "perf.disable-mpos": { why: "Disables Multi-Plane Overlays (OverlayTestMode=5). Fixes frame pacing issues on certain GPU/monitor combos." },
  "perf.disable-last-access-time": { why: "Stops NTFS from writing timestamps on every file read. Reduces disk I/O." },
  "perf.disable-device-power-saving": { why: "Prevents USB, NIC, and PCI devices from entering low-power states that add wake latency." },
  "network.disable-nagle-algorithm": { why: "Disables TCP packet batching (TcpAckFrequency=1, TCPNoDelay=1). Reduces network round-trip time for games." },
  "perf.disable-memory-compression": { why: "Runs Disable-MMAgent. Saves CPU overhead on 16GB+ systems where compression isn't needed." },
  "perf.fix-ndu-memory-leak": { why: "Sets ndu.sys Start=4. Fixes the known Windows network data usage driver memory leak." },
  "gpu.disable-mpo-dwm": { why: "Sets DWM OverlayTestMode=5. Forces classic desktop composition for more consistent frame pacing." },
  "cpu.aggressive-boost": { why: "Keeps CPU at maximum turbo frequency under load. Trades power/heat for maximum performance." },
  "cpu.min-processor-state-100": { why: "Sets MinProcessorState to 100%. CPU stays at full speed — no downclocking between frames." },

  // PC-Tuning derived — newly added playbook actions
  "perf.disable-gamebar-presence": { why: "Kills the GameBarPresenceWriter background process. It runs constantly but isn't needed for Game Mode." },
  "perf.legacy-flip-presentation": { why: "Forces Hardware: Legacy Flip (true exclusive fullscreen). Bypasses DWM composition for lower input latency." },
  "perf.disable-auto-maintenance": { why: "Stops Windows from running defrag, scans, and cleanup at random times. You maintain manually." },
  "perf.disable-auto-sign-on": { why: "Prevents auto-login after restarts. Security improvement, no performance cost." },
  "perf.disable-store-auto-updates": { why: "Stops Microsoft Store from downloading app updates in the background." },
  "privacy.powershell-telemetry-optout": { why: "Sets POWERSHELL_TELEMETRY_OPTOUT=1. PowerShell sends telemetry by default — this stops it." },
  "privacy.disable-typing-insights": { why: "Stops Windows from analyzing your typing patterns. InsightsEnabled=0." },
  "privacy.disable-msrt": { why: "Prevents the Malicious Software Removal Tool from being delivered via Windows Update." },
  "network.qos-dscp-fix": { why: "Fixes QoS DSCP packet tagging on multi-NIC systems. Ensures game traffic gets priority marking." },
  "power.disable-device-power-saving": {
    why: "Disables power saving on USB, NIC, and PCI devices. Eliminates wake-up latency.",
    profileNote: {
      office_laptop: "Not applied — device power saving is important for battery life.",
    },
  },
  "security.full-defender-disable": {
    why: "Nuclear option: kills all 9 Defender services + SmartScreen. Frees ~500MB RAM and removes MsMpEng.exe CPU overhead entirely.",
    profileNote: {
      work_pc: "NEVER disable on work PCs — enterprise compliance requires active AV.",
    },
    antiCheatNote: "Some anti-cheat systems (FACEIT, Vanguard) may require Defender to be running.",
  },
  "security.disable-vulnerable-driver-blocklist": {
    why: "Allows blocked drivers to load. Required for RW-Everything (XHCI IMOD) and MSI Utility tools.",
  },
  "security.disable-cpu-mitigations": {
    why: "Disables Spectre/Meltdown mitigations by renaming microcode DLL + registry. 2-15% perf gain on CPU-bound workloads.",
    profileNote: {
      work_pc: "NEVER disable on systems handling sensitive data.",
    },
  },
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
  cleanup: "Removes apps you didn't install (Candy Crush, TikTok, etc.) to free up space and stop background activity.",
  services: "Turns off background services your PC doesn't need. Each one is checked for dependencies first.",
  tasks: "Stops scheduled tasks that collect data, check for updates, and run maintenance while your PC is idle.",
  privacy: "Reduces what Microsoft knows about you by disabling tracking, ads, AI features, and data collection.",
  performance: "Makes your CPU, GPU, and system respond faster with lower delay.",
  shell: "Cleans up the taskbar, right-click menus, search, and Explorer for a clutter-free desktop.",
  "startup-shutdown": "Makes your PC boot faster by stopping background apps and unnecessary startup tasks.",
  networking: "Reduces network delay for online gaming and removes old insecure protocols.",
  security: "Adjusts Windows Update and security settings based on how much risk you're comfortable with.",
  personalization: "Applies your visual preferences — dark mode, colors, taskbar layout, and transparency.",
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
