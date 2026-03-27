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
  edgeAction: null, webviewAction: "keep", chromeAction: null, preferredBrowser: null,
};

const DEFAULT_PRIVACY: PrivacyDecisions = {
  disableRecall: true, disableCopilot: true, disableAiApps: true,
  telemetryLevel: null, disableActivityHistory: true, disableSuggestionsAds: true,
};

const DEFAULT_PERFORMANCE: PerformanceDecisions = {
  aggressionLevel: null, prioritizeLatency: false,
  serviceCleanupDepth: null, startupCleanupDepth: null,
  suppressBrowserBackground: true,
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
    completedSections: [],
    impact: { estimatedActions: 47, estimatedBlocked: 0, estimatedPreserved: 0, rebootRequired: false, riskLevel: "mixed", warnings: [] },
  }),
}));
