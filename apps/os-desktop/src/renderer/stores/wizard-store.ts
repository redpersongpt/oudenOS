// ─── Wizard Store ─────────────────────────────────────────────────────────────
// 13-step OS transformation wizard. Playbook-native flow.

import { create } from "zustand";

// ─── Step IDs ─────────────────────────────────────────────────────────────────

export type WizardStepId =
  | "welcome"
  | "assessment"
  | "profile"
  | "preservation"
  | "playbook-review"
  | "personalization"
  | "app-setup"
  | "final-review"
  | "execution"
  | "report";

// ─── Step shape ───────────────────────────────────────────────────────────────

export interface WizardStep {
  id: WizardStepId;
  label: string;
  status: "locked" | "current" | "completed" | "skipped";
}

// ─── Profile detection result ─────────────────────────────────────────────────

export interface DetectedProfile {
  id: string;
  label: string;
  confidence: number;
  isWorkPc: boolean;
  machineName: string;
  signals: string[];
  accentColor: string;
}

// ─── Playbook resolved plan ──────────────────────────────────────────────────

export interface ResolvedPlaybook {
  playbookName: string;
  playbookVersion: string;
  profile: string;
  preset: string;
  totalIncluded: number;
  totalBlocked: number;
  totalOptional: number;
  totalExpertOnly: number;
  phases: PlaybookPhase[];
  blockedReasons: { actionId: string; reason: string }[];
}

export interface PlaybookPhase {
  id: string;
  name: string;
  actions: PlaybookResolvedAction[];
}

export interface PlaybookResolvedAction {
  id: string;
  name: string;
  description: string;
  risk: string;
  status: "Included" | "Optional" | "ExpertOnly" | "Blocked" | "BuildGated";
  default: boolean;
  expertOnly: boolean;
  blockedReason: string | null;
  requiresReboot: boolean;
  warningMessage: string | null;
}

// ─── App bundle ──────────────────────────────────────────────────────────────

export interface RecommendedApp {
  id: string;
  name: string;
  category: string;
  description: string;
  recommended: boolean;
  selected: boolean;
  workSafe: boolean;
}

// ─── Legacy plan (kept for backward compat) ──────────────────────────────────

export interface TransformationPlan {
  totalActions: number;
  byCategory: Record<string, number>;
  riskSummary: "safe" | "low" | "medium";
  rebootRequired: boolean;
}

// ─── Personalization ─────────────────────────────────────────────────────────

export interface PersonalizationPreferences {
  darkMode: boolean;
  brandAccent: boolean;
  taskbarCleanup: boolean;
  explorerCleanup: boolean;
  transparency: boolean;
}

export const DEFAULT_PERSONALIZATION: PersonalizationPreferences = {
  darkMode: true,
  brandAccent: true,
  taskbarCleanup: true,
  explorerCleanup: true,
  transparency: true,
};

// ─── Execution result ────────────────────────────────────────────────────────

export interface ExecutionResult {
  applied: number;
  failed: number;
  skipped: number;
  preserved: number;
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface WizardState {
  currentStep: WizardStepId;
  steps: WizardStep[];

  // Data
  detectedProfile: DetectedProfile | null;
  resolvedPlaybook: ResolvedPlaybook | null;
  recommendedApps: RecommendedApp[];
  selectedAppIds: string[];
  plan: TransformationPlan | null;
  executionResult: ExecutionResult | null;
  personalization: PersonalizationPreferences;

  // Navigation
  canGoNext: boolean;
  canGoBack: boolean;
  progress: number;

  goToStep: (step: WizardStepId) => void;
  completeStep: (step: WizardStepId) => void;
  skipStep: (step: WizardStepId) => void;
  goNext: () => void;
  goBack: () => void;

  // Data setters
  setDetectedProfile: (profile: DetectedProfile) => void;
  setResolvedPlaybook: (playbook: ResolvedPlaybook) => void;
  setRecommendedApps: (apps: RecommendedApp[]) => void;
  toggleApp: (appId: string) => void;
  setPlan: (plan: TransformationPlan) => void;
  setExecutionResult: (result: ExecutionResult) => void;
  setPersonalization: (prefs: Partial<PersonalizationPreferences>) => void;

  reset: () => void;
}

// ─── Ordered step definitions ────────────────────────────────────────────────

const INITIAL_STEPS: WizardStep[] = [
  { id: "welcome",          label: "Welcome",           status: "current" },
  { id: "assessment",       label: "Assessment",        status: "locked"  },
  { id: "profile",          label: "Profile",           status: "locked"  },
  { id: "preservation",     label: "Preservation",      status: "locked"  },
  { id: "playbook-review",  label: "Playbook Review",   status: "locked"  },
  { id: "personalization",  label: "Personalization",   status: "locked"  },
  { id: "app-setup",        label: "App Setup",         status: "locked"  },
  { id: "final-review",     label: "Final Review",      status: "locked"  },
  { id: "execution",        label: "Apply",             status: "locked"  },
  { id: "report",           label: "Complete",          status: "locked"  },
];

const STEP_ORDER = INITIAL_STEPS.map((s) => s.id);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeProgress(steps: WizardStep[]): number {
  const done = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  return Math.round((done / steps.length) * 100);
}

function computeCanGoNext(_steps: WizardStep[], currentStep: WizardStepId): boolean {
  return STEP_ORDER.indexOf(currentStep) < STEP_ORDER.length - 1;
}

function computeCanGoBack(_steps: WizardStep[], currentStep: WizardStepId): boolean {
  return STEP_ORDER.indexOf(currentStep) > 0;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: "welcome",
  steps: INITIAL_STEPS,
  detectedProfile: null,
  resolvedPlaybook: null,
  recommendedApps: [],
  selectedAppIds: [],
  plan: null,
  executionResult: null,
  personalization: { ...DEFAULT_PERSONALIZATION },
  canGoNext: true,
  canGoBack: false,
  progress: 0,

  goToStep: (stepId) => {
    set((state) => {
      const target = state.steps.find((s) => s.id === stepId);
      if (!target || target.status === "locked") return state;

      const steps = state.steps.map((s) =>
        s.id === stepId
          ? { ...s, status: "current" as const }
          : s.id === state.currentStep && s.status === "current"
          ? { ...s, status: "completed" as const }
          : s
      );

      return {
        currentStep: stepId,
        steps,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(steps, stepId),
        canGoBack: computeCanGoBack(steps, stepId),
      };
    });
  },

  completeStep: (stepId) => {
    set((state) => {
      const currentIdx = STEP_ORDER.indexOf(stepId);
      const nextId = STEP_ORDER[currentIdx + 1] as WizardStepId | undefined;

      const steps = state.steps.map((s) => {
        if (s.id === stepId) return { ...s, status: "completed" as const };
        if (s.id === nextId && s.status === "locked") return { ...s, status: "current" as const };
        return s;
      });

      const newCurrent = nextId ?? stepId;

      return {
        steps,
        currentStep: nextId ?? state.currentStep,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(steps, newCurrent),
        canGoBack: computeCanGoBack(steps, newCurrent),
      };
    });
  },

  skipStep: (stepId) => {
    set((state) => {
      const currentIdx = STEP_ORDER.indexOf(stepId);
      const nextId = STEP_ORDER[currentIdx + 1] as WizardStepId | undefined;

      const steps = state.steps.map((s) => {
        if (s.id === stepId) return { ...s, status: "skipped" as const };
        if (s.id === nextId && s.status === "locked") return { ...s, status: "current" as const };
        return s;
      });

      const newCurrent = nextId ?? stepId;

      return {
        steps,
        currentStep: nextId ?? state.currentStep,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(steps, newCurrent),
        canGoBack: computeCanGoBack(steps, newCurrent),
      };
    });
  },

  goNext: () => {
    const { currentStep, completeStep } = get();
    completeStep(currentStep);
  },

  goBack: () => {
    set((state) => {
      const idx = STEP_ORDER.indexOf(state.currentStep);
      if (idx <= 0) return state;

      const prevId = STEP_ORDER[idx - 1] as WizardStepId;

      const steps = state.steps.map((s) => {
        if (s.id === state.currentStep) return { ...s, status: "locked" as const };
        if (s.id === prevId) return { ...s, status: "current" as const };
        return s;
      });

      return {
        currentStep: prevId,
        steps,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(steps, prevId),
        canGoBack: computeCanGoBack(steps, prevId),
      };
    });
  },

  setDetectedProfile: (profile) => set({ detectedProfile: profile }),
  setResolvedPlaybook: (playbook) => set({ resolvedPlaybook: playbook }),
  setRecommendedApps: (apps) => set({
    recommendedApps: apps,
    selectedAppIds: apps.filter(a => a.selected).map(a => a.id),
  }),
  toggleApp: (appId) => set((state) => ({
    selectedAppIds: state.selectedAppIds.includes(appId)
      ? state.selectedAppIds.filter(id => id !== appId)
      : [...state.selectedAppIds, appId],
  })),
  setPlan: (plan) => set({ plan }),
  setExecutionResult: (result) => set({ executionResult: result }),
  setPersonalization: (prefs) =>
    set((state) => ({ personalization: { ...state.personalization, ...prefs } })),

  reset: () =>
    set({
      currentStep: "welcome",
      steps: INITIAL_STEPS,
      detectedProfile: null,
      resolvedPlaybook: null,
      recommendedApps: [],
      selectedAppIds: [],
      plan: null,
      executionResult: null,
      personalization: { ...DEFAULT_PERSONALIZATION },
      canGoNext: true,
      canGoBack: false,
      progress: 0,
    }),
}));
