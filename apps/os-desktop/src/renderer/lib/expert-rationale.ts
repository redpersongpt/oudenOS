// Expert Rationale — visible product intelligence
// Maps action IDs to human-readable "why" explanations.
// Used by PlaybookReview, Execution, and Report steps.

import rationaleTr from "@/i18n/rationale-tr.json";

type RationaleLang = "en" | "tr";
const TR = rationaleTr as {
  actions: Record<string, { why?: string; profileWarning?: Record<string, string>; antiCheatNote?: string }>;
  phases: Record<string, string>;
};

interface ActionRationale {
  why: string;
  profileNote?: Record<string, string>;
  antiCheatNote?: string;
}

const RATIONALE: Record<string, ActionRationale> = {
  // Privacy
  "privacy.disable-telemetry": { why: "Windows quietly narrates what you do back to Microsoft. This hangs up the call." },
  "privacy.disable-recall": { why: "Windows was screenshotting everything on your screen so AI could 'remember' it. Hard pass." },
  "privacy.disable-advertising-id": { why: "Kills the ad ID apps use to profile you. Wild that you had to opt out of this." },
  "privacy.disable-click-to-do": { why: "Removes the AI overlay that reads your screen and 'suggests' things nobody asked for." },
  "privacy.disable-ai-svc-autostart": { why: "The AI service squats in your RAM whether you use it or not. Evicted." },
  "privacy.disable-edge-ai": { why: "Stops Edge from shipping your browsing history off to cloud AI." },
  "privacy.disable-paint-ai": { why: "Paint does not need the cloud to draw a circle. Disconnected." },
  "privacy.disable-notepad-ai": { why: "Notepad is for notes — not for phoning the cloud about them." },
  "privacy.disable-location": {
    why: "Stops Windows and apps from following you around the map.",
    profileNote: { work_pc: "May affect VPN geo-detection on managed networks." },
  },
  "privacy.disable-input-personalization": { why: "Stops Windows from studying how you type." },
  "privacy.disable-online-speech": { why: "Your voice stays on your machine instead of Microsoft's servers." },
  "privacy.disable-find-my-device": { why: "Stops your PC from pinging Microsoft its location all day long." },
  "privacy.disable-smartscreen": {
    why: "SmartScreen runs every download past Microsoft before it opens. Turning it off removes that check — and the download protection that comes with it.",
    profileNote: { work_pc: "Not recommended — provides protection against malicious downloads." },
  },

  // Shell
  "shell.disable-copilot": { why: "Evicts the Copilot button and the memory it squats on in the background." },
  "shell.show-file-extensions": { why: "Shows real file types (.exe, .pdf) in Explorer — so 'invoice.pdf.exe' can't hide from you." },
  "shell.enable-end-task": { why: "Adds 'End task' to the taskbar right-click, so you can kill a frozen app without opening Task Manager." },
  "shell.remove-cast-to-device": { why: "Removes the Cast to Device entry nobody's clicked since 2017." },
  "shell.remove-troubleshoot-compatibility": { why: "Clears the compatibility-troubleshooter clutter out of your right-click menu." },
  "shell.remove-edit-with-paint3d": { why: "Hides the Paint 3D leftover Microsoft keeps pretending people use." },
  "shell.hide-task-view": { why: "Removes the Task View button. Win+Tab still does the same thing." },
  "shell.hide-widgets-button": { why: "Kills the Widgets button and the news/weather it fetches behind your back." },
  "shell.disable-web-search": { why: "Your Start menu searches stop getting detoured through Bing." },
  "shell.disable-edge-ads": { why: "Shuts off Edge's shopping 'suggestions', new-tab ads, and promo popups." },
  "shell.hide-chat-icon": { why: "Drops the Teams Chat icon off the taskbar. Teams still works if you actually want it." },
  "shell.disable-content-delivery": { why: "Stops Windows from silently installing 'suggested' apps and the welcome-tour tips." },

  // Performance
  "perf.mmcss-system-responsiveness": {
    why: "Gives more CPU to your games and active apps by reducing what Windows reserves for background tasks.",
    profileNote: { work_pc: "May affect background task performance during meetings." },
  },
  "perf.disable-game-dvr": { why: "Game DVR records your gameplay in the background — uninvited — eating GPU and dropping your frames. Off it goes." },
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
  "gpu.disable-hags": { why: "Hands GPU scheduling back to Windows — can smooth frame times on some setups. But NVIDIA DLSS Frame Generation REQUIRES HAGS on, so leave it enabled if you use DLSS Frame Gen. Off by default; opt in only if you know you want it." },
  "gpu.tdr-delay": { why: "Gives the GPU more time before Windows thinks it crashed. Prevents false 'driver stopped responding' errors." },

  // AppX / Edge
  "appx.remove-consumer-bloat": { why: "Boots Candy Crush, TikTok, Solitaire and the rest of the uninvited guests off your Start menu." },
  "appx.remove-xbox-apps": { why: "Removes Xbox Game Bar and its background tagalongs. Keep it if you actually game on Xbox." },
  "appx.disable-edge-updates": { why: "Stops Edge from updating itself on its own schedule. Edge stays installed." },
  "appx.disable-edge-preload": { why: "Edge preloads into RAM at boot even when you never open it. This stops the freeloading — 100-300MB back." },
  "appx.remove-edge": {
    why: "Permanently deletes Edge. Cannot be undone. Some Windows features that need a browser will stop working.",
    antiCheatNote: "Some enterprise web apps require Edge. Verify before removing.",
  },
  "appx.remove-edge-webview": {
    why: "WebView2 is needed by Teams, Widgets, and many apps. Removing it WILL break them.",
    profileNote: { work_pc: "NEVER remove on work PCs — Teams and enterprise apps require WebView2." },
  },

  // Services
  "services.disable-sysmain": { why: "Stops Windows 'helpfully' preloading apps into RAM. Pointless once you're on an SSD." },
  "services.disable-xbox-services": { why: "Shuts down Xbox services that keep running even if you've never opened Xbox." },
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
  "startup.disable-background-apps": { why: "Stops apps idling in the background when you're not even looking at them. CPU and RAM, reclaimed." },
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

export function getActionRationale(actionId: string, profile?: string, lang: RationaleLang = "en"): { why: string; profileWarning?: string; antiCheatNote?: string } {
  const r = RATIONALE[actionId];
  if (!r) return { why: "" };
  const tr = lang === "tr" ? TR.actions[actionId] : undefined;

  return {
    why: tr?.why || r.why,
    profileWarning: profile ? (tr?.profileWarning?.[profile] ?? r.profileNote?.[profile]) : undefined,
    antiCheatNote: tr?.antiCheatNote ?? r.antiCheatNote,
  };
}

// Phase-level explanations
export const PHASE_RATIONALE: Record<string, string> = {
  cleanup: "Evicts the apps you never installed — Candy Crush, TikTok, the lot — and the background noise they drag in.",
  services: "Switches off background services your PC doesn't need. Dependencies get checked first, so nothing important breaks.",
  tasks: "Kills the scheduled tasks that phone home, check for updates, and run 'maintenance' while you're trying to use your PC.",
  privacy: "Shrinks what Microsoft knows about you: tracking, ads, AI snooping, and the data collection you never opted into.",
  performance: "Tunes CPU, GPU, and system responsiveness for less delay and more frames.",
  shell: "Declutters the taskbar, right-click menus, search, and Explorer — the desktop you actually wanted.",
  "startup-shutdown": "Boots faster by cutting the background apps and startup tasks piling up behind the login screen.",
  networking: "Trims network delay for online play and retires old, insecure protocols.",
  security: "Tunes Windows Update and security to the risk level you're actually comfortable with.",
  personalization: "Your look: dark mode, colors, taskbar layout, transparency.",
};

export function getPhaseRationale(phaseId: string, lang: RationaleLang = "en"): string {
  if (lang === "tr") return TR.phases[phaseId] || PHASE_RATIONALE[phaseId] || "";
  return PHASE_RATIONALE[phaseId] || "";
}

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
