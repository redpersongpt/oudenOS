// ─── User Decisions Store ────────────────────────────────────────────────────
// Tracks every user decision made during the wizard. These answers shape the
// playbook — which actions are included, blocked, optional, or expert-only.
// The playbook is NOT a static preset. It is constructed from user answers.

import { create } from "zustand";

// ─── Decision categories ────────────────────────────────────────────────────

export interface MachineRoleDecisions {
  role: "gaming_desktop" | "gaming_laptop" | "work_pc" | "office_laptop" | "workstation" | "budget_desktop" | "low_spec" | "vm_cautious" | null;
  isPrimary: boolean;
  isPersonal: boolean;
}

export interface WorkCompatDecisions {
  needsPrinting: boolean;
  needsRdp: boolean;
  needsSmb: boolean;
  needsDomainGpo: boolean;
  needsTeamsOffice: boolean;
  needsWebViewApps: boolean;
  needsRemoteSupport: boolean;
}

export interface BrowserDecisions {
  edgeAction: "keep" | "suppress" | "disable-updates" | "remove" | null;
  webviewAction: "keep" | "remove" | null;
  chromeAction: "keep" | "suppress-background" | null;
  preferredBrowser: "brave" | "firefox" | "chrome" | "edge" | "none" | null;
}

export interface PrivacyDecisions {
  disableRecall: boolean;
  disableCopilot: boolean;
  disableAiApps: boolean; // Paint AI, Notepad AI, Edge AI
  telemetryLevel: "conservative" | "aggressive" | null;
  disableActivityHistory: boolean;
  disableSuggestionsAds: boolean;
}

export interface PerformanceDecisions {
  aggressionLevel: "safe" | "balanced" | "aggressive" | "expert" | null;
  prioritizeLatency: boolean;
  serviceCleanupDepth: "conservative" | "moderate" | "aggressive" | null;
  startupCleanupDepth: "conservative" | "moderate" | "aggressive" | null;
  suppressBrowserBackground: boolean;
  // Oneclick-mapped performance tuning
  powerPlan: "windows-balanced" | "ultimate" | "ultimate-idle-off" | null;
  prioritySeparation: "balanced" | "latency" | "fps" | null;
  timerResolution: "system" | "locked-05ms" | "locked-1ms" | null;
}

export interface SecurityDecisions {
  defenderAction: "keep" | "suppress" | "disable" | null;
}

export interface SystemDecisions {
  searchAction: "keep" | "remove" | null;
}

export interface NetworkDecisions {
  tweakLevel: "keep-default" | "latency-safe" | "aggressive" | null;
}

export interface OptionalFeaturesDecisions {
  preserveVirtualization: boolean;
  preserveWindowsSandbox: boolean;
  preserveWsl: boolean;
}

export interface AudioDecisions {
  cleanupLevel: "keep-default" | "remove-extras" | "aggressive" | null;
}

export interface DeviceManagerDecisions {
  tweakLevel: "off" | "power-saving-only" | "aggressive" | null;
}

export interface PowerDecisions {
  batteryImportant: boolean;
  preserveModernStandby: boolean;
  preserveFastWake: boolean;
}

export interface PersonalizationDecisions {
  darkMode: boolean;
  brandAccent: boolean;
  taskbarCleanup: boolean;
  explorerCleanup: boolean;
  transparency: boolean;
  showHiddenFiles: boolean;
}

export interface AppDecisions {
  bundleType: "gaming" | "work" | "dev" | "minimal" | "none" | null;
  wantBrave: boolean;
  wantDiscord: boolean;
  wantSteam: boolean;
  wantVsCode: boolean;
  wantRuntimes: boolean;
  customSelections: string[];
}

export interface GamingDecisions {
  competitiveGaming: boolean;
  antiCheatSafe: boolean;
  preserveOverlays: boolean;
  disableGameDvr: boolean;
  disableFullscreenOpt: boolean;
}

// ─── Derived playbook impact ────────────────────────────────────────────────

export interface PlaybookImpact {
  estimatedActions: number;
  estimatedBlocked: number;
  estimatedPreserved: number;
  rebootRequired: boolean;
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  warnings: string[];
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface DecisionsState {
  // All decision groups
  machineRole: MachineRoleDecisions;
  workCompat: WorkCompatDecisions;
  browser: BrowserDecisions;
  privacy: PrivacyDecisions;
  performance: PerformanceDecisions;
  power: PowerDecisions;
  personalization: PersonalizationDecisions;
  apps: AppDecisions;
  gaming: GamingDecisions;
  security: SecurityDecisions;
  system: SystemDecisions;
  network: NetworkDecisions;
  optionalFeatures: OptionalFeaturesDecisions;
  audio: AudioDecisions;
  deviceManager: DeviceManagerDecisions;

  // Completion tracking
  completedSections: string[];

  // Computed impact
  impact: PlaybookImpact;

  // Setters
  setMachineRole: (d: Partial<MachineRoleDecisions>) => void;
  setWorkCompat: (d: Partial<WorkCompatDecisions>) => void;
  setBrowser: (d: Partial<BrowserDecisions>) => void;
  setPrivacy: (d: Partial<PrivacyDecisions>) => void;
  setPerformance: (d: Partial<PerformanceDecisions>) => void;
  setPower: (d: Partial<PowerDecisions>) => void;
  setPersonalization: (d: Partial<PersonalizationDecisions>) => void;
  setApps: (d: Partial<AppDecisions>) => void;
  setGaming: (d: Partial<GamingDecisions>) => void;
  setSecurity: (d: Partial<SecurityDecisions>) => void;
  setSystem: (d: Partial<SystemDecisions>) => void;
  setNetwork: (d: Partial<NetworkDecisions>) => void;
  setOptionalFeatures: (d: Partial<OptionalFeaturesDecisions>) => void;
  setAudio: (d: Partial<AudioDecisions>) => void;
  setDeviceManager: (d: Partial<DeviceManagerDecisions>) => void;
  markSectionComplete: (section: string) => void;

  // Computed
  isWorkPc: () => boolean;
  isLaptop: () => boolean;
  isGaming: () => boolean;
  needsBrowserQuestions: () => boolean;
  needsGamingQuestions: () => boolean;
  needsWorkQuestions: () => boolean;
  needsPowerQuestions: () => boolean;

  reset: () => void;
}

const DEFAULT_MACHINE_ROLE: MachineRoleDecisions = {
  role: null, isPrimary: true, isPersonal: true,
};

const DEFAULT_WORK_COMPAT: WorkCompatDecisions = {
  needsPrinting: false, needsRdp: false, needsSmb: false,
  needsDomainGpo: false, needsTeamsOffice: false,
  needsWebViewApps: false, needsRemoteSupport: false,
};

const DEFAULT_BROWSER: BrowserDecisions = {
  edgeAction: null, webviewAction: null, chromeAction: null, preferredBrowser: null,
};

const DEFAULT_PRIVACY: PrivacyDecisions = {
  disableRecall: true, disableCopilot: true, disableAiApps: true,
  telemetryLevel: null, disableActivityHistory: true, disableSuggestionsAds: true,
};

const DEFAULT_PERFORMANCE: PerformanceDecisions = {
  aggressionLevel: null, prioritizeLatency: false,
  serviceCleanupDepth: null, startupCleanupDepth: null,
  suppressBrowserBackground: true,
  powerPlan: null,
  prioritySeparation: null,
  timerResolution: null,
};

const DEFAULT_SECURITY: SecurityDecisions = {
  defenderAction: null,
};

const DEFAULT_SYSTEM: SystemDecisions = {
  searchAction: null,
};

const DEFAULT_NETWORK: NetworkDecisions = {
  tweakLevel: null,
};

const DEFAULT_OPTIONAL_FEATURES: OptionalFeaturesDecisions = {
  preserveVirtualization: true,
  preserveWindowsSandbox: true,
  preserveWsl: true,
};

const DEFAULT_AUDIO: AudioDecisions = {
  cleanupLevel: null,
};

const DEFAULT_DEVICE_MANAGER: DeviceManagerDecisions = {
  tweakLevel: null,
};

const DEFAULT_POWER: PowerDecisions = {
  batteryImportant: false, preserveModernStandby: true, preserveFastWake: true,
};

const DEFAULT_PERSONALIZATION: PersonalizationDecisions = {
  darkMode: true, brandAccent: true, taskbarCleanup: true,
  explorerCleanup: true, transparency: true, showHiddenFiles: false,
};

const DEFAULT_APPS: AppDecisions = {
  bundleType: null, wantBrave: true, wantDiscord: false,
  wantSteam: false, wantVsCode: false, wantRuntimes: true,
  customSelections: [],
};

const DEFAULT_GAMING: GamingDecisions = {
  competitiveGaming: false, antiCheatSafe: true,
  preserveOverlays: true, disableGameDvr: true, disableFullscreenOpt: true,
};

function computeImpact(state: DecisionsState): PlaybookImpact {
  const warnings: string[] = [];
  let estimated = 47; // base actions
  let blocked = 0;
  let preserved = 0;
  let reboot = false;

  // Work PC increases preserved, decreases actions
  if (state.machineRole.role === "work_pc") {
    preserved += 12;
    blocked += 8;
    estimated -= 8;
    warnings.push("Work PC mode: business-critical services preserved");
  }

  // Aggressive performance adds actions and reboot
  if (state.performance.aggressionLevel === "aggressive" || state.performance.aggressionLevel === "expert") {
    estimated += 15;
    reboot = true;
  }

  // Edge removal adds warning
  if (state.browser.edgeAction === "remove") {
    warnings.push("Edge removal is irreversible — install alternative browser first");
    reboot = true;
  }

  // WebView2 removal adds extreme warning
  if (state.browser.webviewAction === "remove") {
    warnings.push("WebView2 removal will break Teams, Widgets, and many Electron apps");
  }

  // Laptop power preservation
  if (state.power.batteryImportant) {
    blocked += 4;
    estimated -= 4;
  }

  // Anti-cheat safety reduces actions
  if (state.gaming.antiCheatSafe) {
    blocked += 2;
  }

  // Defender action
  if (state.security.defenderAction === "disable") {
    warnings.push("Windows Defender disabled — real-time protection removed");
    estimated += 1;
  } else if (state.security.defenderAction === "suppress") {
    estimated += 1;
  }

  // Power plan
  if (state.performance.powerPlan === "ultimate-idle-off") {
    warnings.push("Idle-off power plan: significantly higher heat and power draw");
    reboot = true;
    estimated += 2;
  } else if (state.performance.powerPlan === "ultimate") {
    estimated += 1;
  }

  // Priority separation
  if (state.performance.prioritySeparation) {
    estimated += 1;
  }

  // Timer resolution
  if (state.performance.timerResolution && state.performance.timerResolution !== "system") {
    estimated += 1;
    reboot = true;
  }

  // Search removal
  if (state.system.searchAction === "remove") {
    warnings.push("Windows Search removal: Start Menu search will stop working");
    reboot = true;
    estimated += 2;
  }

  if (state.network.tweakLevel === "latency-safe") {
    estimated += 2;
  } else if (state.network.tweakLevel === "aggressive") {
    estimated += 4;
    warnings.push("Aggressive network tweaks can hurt throughput or break some adapters");
  }

  if (state.optionalFeatures.preserveVirtualization || state.optionalFeatures.preserveWindowsSandbox || state.optionalFeatures.preserveWsl) {
    preserved += 2;
  }

  if (state.audio.cleanupLevel === "remove-extras") {
    estimated += 1;
  } else if (state.audio.cleanupLevel === "aggressive") {
    estimated += 2;
    warnings.push("Aggressive audio cleanup may break OEM audio enhancements until drivers are reinstalled");
  }

  if (state.deviceManager.tweakLevel === "power-saving-only") {
    estimated += 1;
  } else if (state.deviceManager.tweakLevel === "aggressive") {
    estimated += 3;
    warnings.push("Aggressive device-manager tweaks can cause instability on some hardware");
  }

  const riskLevel = state.performance.aggressionLevel === "expert" ? "expert"
    : state.performance.aggressionLevel === "aggressive" ? "aggressive"
    : state.browser.edgeAction === "remove" ? "aggressive"
    : "mixed";

  return {
    estimatedActions: Math.max(0, estimated),
    estimatedBlocked: blocked,
    estimatedPreserved: preserved,
    rebootRequired: reboot,
    riskLevel: riskLevel as PlaybookImpact["riskLevel"],
    warnings,
  };
}

export const useDecisionsStore = create<DecisionsState>((set, get) => ({
  machineRole: { ...DEFAULT_MACHINE_ROLE },
  workCompat: { ...DEFAULT_WORK_COMPAT },
  browser: { ...DEFAULT_BROWSER },
  privacy: { ...DEFAULT_PRIVACY },
  performance: { ...DEFAULT_PERFORMANCE },
  power: { ...DEFAULT_POWER },
  personalization: { ...DEFAULT_PERSONALIZATION },
  apps: { ...DEFAULT_APPS },
  gaming: { ...DEFAULT_GAMING },
  security: { ...DEFAULT_SECURITY },
  system: { ...DEFAULT_SYSTEM },
  network: { ...DEFAULT_NETWORK },
  optionalFeatures: { ...DEFAULT_OPTIONAL_FEATURES },
  audio: { ...DEFAULT_AUDIO },
  deviceManager: { ...DEFAULT_DEVICE_MANAGER },
  completedSections: [],
  impact: { estimatedActions: 47, estimatedBlocked: 0, estimatedPreserved: 0, rebootRequired: false, riskLevel: "mixed", warnings: [] },

  setMachineRole: (d) => set((s) => {
    const next = { ...s, machineRole: { ...s.machineRole, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setWorkCompat: (d) => set((s) => {
    const next = { ...s, workCompat: { ...s.workCompat, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setBrowser: (d) => set((s) => {
    const next = { ...s, browser: { ...s.browser, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setPrivacy: (d) => set((s) => {
    const next = { ...s, privacy: { ...s.privacy, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setPerformance: (d) => set((s) => {
    const next = { ...s, performance: { ...s.performance, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setPower: (d) => set((s) => {
    const next = { ...s, power: { ...s.power, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setPersonalization: (d) => set((s) => {
    const next = { ...s, personalization: { ...s.personalization, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setApps: (d) => set((s) => {
    const next = { ...s, apps: { ...s.apps, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setGaming: (d) => set((s) => {
    const next = { ...s, gaming: { ...s.gaming, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setSecurity: (d) => set((s) => {
    const next = { ...s, security: { ...s.security, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setSystem: (d) => set((s) => {
    const next = { ...s, system: { ...s.system, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setNetwork: (d) => set((s) => {
    const next = { ...s, network: { ...s.network, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setOptionalFeatures: (d) => set((s) => {
    const next = { ...s, optionalFeatures: { ...s.optionalFeatures, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setAudio: (d) => set((s) => {
    const next = { ...s, audio: { ...s.audio, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  setDeviceManager: (d) => set((s) => {
    const next = { ...s, deviceManager: { ...s.deviceManager, ...d } };
    return { ...next, impact: computeImpact(next) };
  }),
  markSectionComplete: (section) => set((s) => ({
    completedSections: [...new Set([...s.completedSections, section])],
  })),

  // Conditional branching helpers
  isWorkPc: () => {
    const r = get().machineRole.role;
    return r === "work_pc" || r === "office_laptop";
  },
  isLaptop: () => {
    const r = get().machineRole.role;
    return r === "gaming_laptop" || r === "office_laptop";
  },
  isGaming: () => {
    const r = get().machineRole.role;
    return r === "gaming_desktop" || r === "gaming_laptop";
  },
  needsBrowserQuestions: () => true, // always relevant
  needsGamingQuestions: () => {
    const r = get().machineRole.role;
    return r === "gaming_desktop" || r === "gaming_laptop";
  },
  needsWorkQuestions: () => {
    const r = get().machineRole.role;
    return r === "work_pc" || r === "office_laptop" || !get().machineRole.isPersonal;
  },
  needsPowerQuestions: () => {
    const r = get().machineRole.role;
    return r === "gaming_laptop" || r === "office_laptop" || r === "low_spec";
  },

  reset: () => set({
    machineRole: { ...DEFAULT_MACHINE_ROLE },
    workCompat: { ...DEFAULT_WORK_COMPAT },
    browser: { ...DEFAULT_BROWSER },
    privacy: { ...DEFAULT_PRIVACY },
    performance: { ...DEFAULT_PERFORMANCE },
    power: { ...DEFAULT_POWER },
    personalization: { ...DEFAULT_PERSONALIZATION },
    apps: { ...DEFAULT_APPS },
    gaming: { ...DEFAULT_GAMING },
    security: { ...DEFAULT_SECURITY },
    system: { ...DEFAULT_SYSTEM },
    network: { ...DEFAULT_NETWORK },
    optionalFeatures: { ...DEFAULT_OPTIONAL_FEATURES },
    audio: { ...DEFAULT_AUDIO },
    deviceManager: { ...DEFAULT_DEVICE_MANAGER },
    completedSections: [],
    impact: { estimatedActions: 47, estimatedBlocked: 0, estimatedPreserved: 0, rebootRequired: false, riskLevel: "mixed", warnings: [] },
  }),
}));
