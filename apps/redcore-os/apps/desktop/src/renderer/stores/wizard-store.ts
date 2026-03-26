// ─── Wizard Store ─────────────────────────────────────────────────────────────
// 9-step OS transformation wizard. Each step occupies the full window.

import { create } from "zustand";

// ─── Step IDs ─────────────────────────────────────────────────────────────────

export type WizardStepId =
  | "welcome"
  | "assessment"
  | "profile"
  | "preservation"
  | "plan"
  | "personalization"
  | "apply"
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
  confidence: number; // 0–100
  isWorkPc: boolean;
  machineName: string;
  signals: string[];
  accentColor: string; // Tailwind color class
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface TransformationPlan {
  totalActions: number;
  byCategory: Record<string, number>;
  riskSummary: "safe" | "low" | "medium";
  rebootRequired: boolean;
}

// ─── Personalization preferences ──────────────────────────────────────────────

export interface PersonalizationPreferences {
  darkMode:         boolean;
  brandAccent:      boolean;
  taskbarCleanup:   boolean;
  explorerCleanup:  boolean;
  transparency:     boolean;
}

export const DEFAULT_PERSONALIZATION: PersonalizationPreferences = {
  darkMode:        true,
  brandAccent:     true,
  taskbarCleanup:  true,
  explorerCleanup: true,
  transparency:    true,
};

// ─── Execution result ─────────────────────────────────────────────────────────

export interface ExecutionResult {
  applied: number;
  failed: number;
  skipped: number;
  preserved: number;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface WizardState {
  currentStep: WizardStepId;
  steps: WizardStep[];

  // Detected data
  detectedProfile: DetectedProfile | null;
  plan: TransformationPlan | null;
  executionResult: ExecutionResult | null;
  personalization: PersonalizationPreferences;

  // Navigation
  canGoNext: boolean;
  canGoBack: boolean;
  progress: number; // 0–100

  goToStep: (step: WizardStepId) => void;
  completeStep: (step: WizardStepId) => void;
  skipStep: (step: WizardStepId) => void;
  goNext: () => void;
  goBack: () => void;

  // Data setters
  setDetectedProfile: (profile: DetectedProfile) => void;
  setPlan: (plan: TransformationPlan) => void;
  setExecutionResult: (result: ExecutionResult) => void;
  setPersonalization: (prefs: Partial<PersonalizationPreferences>) => void;

  reset: () => void;
}

// ─── Ordered step definitions ─────────────────────────────────────────────────

const INITIAL_STEPS: WizardStep[] = [
  { id: "welcome",         label: "Welcome",         status: "current" },
  { id: "assessment",      label: "Assessment",      status: "locked"  },
  { id: "profile",         label: "Profile",         status: "locked"  },
  { id: "preservation",    label: "Preservation",    status: "locked"  },
  { id: "plan",            label: "Plan",            status: "locked"  },
  { id: "personalization", label: "Personalization", status: "locked"  },
  { id: "apply",           label: "Apply",           status: "locked"  },
  { id: "execution",       label: "Execution",       status: "locked"  },
  { id: "report",          label: "Report",          status: "locked"  },
];

const STEP_ORDER = INITIAL_STEPS.map((s) => s.id);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: "welcome",
  steps: INITIAL_STEPS,
  detectedProfile: null,
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
  setPlan: (plan) => set({ plan }),
  setExecutionResult: (result) => set({ executionResult: result }),
  setPersonalization: (prefs) =>
    set((state) => ({ personalization: { ...state.personalization, ...prefs } })),

  reset: () =>
    set({
      currentStep: "welcome",
      steps: INITIAL_STEPS,
      detectedProfile: null,
      plan: null,
      executionResult: null,
      personalization: { ...DEFAULT_PERSONALIZATION },
      canGoNext: true,
      canGoBack: false,
      progress: 0,
    }),
}));
