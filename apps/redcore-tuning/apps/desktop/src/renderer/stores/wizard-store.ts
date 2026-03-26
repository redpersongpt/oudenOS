// ─── Wizard Store ─────────────────────────────────────────────────────────────
// Manages the 15-step optimization wizard flow state.
// Categories group steps visually in the left rail.

import { create } from "zustand";

// ─── Step IDs ─────────────────────────────────────────────────────────────────

export type WizardStepId =
  | "welcome"
  | "analysis"
  | "profile"
  | "cleanup"
  | "services"
  | "performance"
  | "infrastructure"
  | "apphub"
  | "benchmark"
  | "summary"
  | "bios"
  | "apply-prep"
  | "execution"
  | "reboot"
  | "report";

export type WizardCategory =
  | "discover"
  | "optimize"
  | "validate"
  | "advanced"
  | "execute";

// ─── Step shape ───────────────────────────────────────────────────────────────

export interface WizardStep {
  id: WizardStepId;
  label: string;
  description: string;
  status: "locked" | "current" | "completed" | "skipped";
  category: WizardCategory;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface WizardState {
  currentStep: WizardStepId;
  steps: WizardStep[];
  completedActions: string[];
  selectedActions: string[];
  machineProfileId: string | null;

  // Navigation
  goToStep: (step: WizardStepId) => void;
  completeStep: (step: WizardStepId) => void;
  skipStep: (step: WizardStepId) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // Computed
  progress: number; // 0-100

  // Actions
  setMachineProfileId: (id: string) => void;
  addSelectedAction: (actionId: string) => void;
  removeSelectedAction: (actionId: string) => void;
  addCompletedAction: (actionId: string) => void;
  reset: () => void;
}

// ─── Ordered step definitions ─────────────────────────────────────────────────

const INITIAL_STEPS: WizardStep[] = [
  // discover
  {
    id: "welcome",
    label: "Welcome",
    description: "Get started with the optimization wizard",
    status: "current",
    category: "discover",
  },
  {
    id: "analysis",
    label: "System Analysis",
    description: "Deep scan of your hardware and configuration",
    status: "locked",
    category: "discover",
  },
  {
    id: "profile",
    label: "Machine Profile",
    description: "AI-classified machine archetype and strategy",
    status: "locked",
    category: "discover",
  },
  // optimize
  {
    id: "cleanup",
    label: "Cleanup",
    description: "Remove bloat, temp files, and startup noise",
    status: "locked",
    category: "optimize",
  },
  {
    id: "services",
    label: "Services",
    description: "Disable unnecessary Windows services",
    status: "locked",
    category: "optimize",
  },
  {
    id: "performance",
    label: "Performance",
    description: "Scheduler, power plan, and latency tuning",
    status: "locked",
    category: "optimize",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    description: "Network, storage, and memory configuration",
    status: "locked",
    category: "optimize",
  },
  // validate
  {
    id: "apphub",
    label: "App Hub",
    description: "Install recommended software silently",
    status: "locked",
    category: "validate",
  },
  {
    id: "benchmark",
    label: "Benchmark",
    description: "Baseline performance measurement",
    status: "locked",
    category: "validate",
  },
  // advanced
  {
    id: "summary",
    label: "Summary",
    description: "Review all planned changes before apply",
    status: "locked",
    category: "advanced",
  },
  {
    id: "bios",
    label: "BIOS Guidance",
    description: "Manual BIOS recommendations for your CPU",
    status: "locked",
    category: "advanced",
  },
  // execute
  {
    id: "apply-prep",
    label: "Prepare",
    description: "Create system snapshot before applying",
    status: "locked",
    category: "execute",
  },
  {
    id: "execution",
    label: "Applying",
    description: "Execute all selected tuning actions",
    status: "locked",
    category: "execute",
  },
  {
    id: "reboot",
    label: "Reboot",
    description: "Reboot to finalise kernel-level changes",
    status: "locked",
    category: "execute",
  },
  {
    id: "report",
    label: "Report",
    description: "Before vs after benchmark comparison",
    status: "locked",
    category: "execute",
  },
];

const STEP_ORDER = INITIAL_STEPS.map((s) => s.id);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeProgress(steps: WizardStep[]): number {
  const completed = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  return Math.round((completed / steps.length) * 100);
}

function computeCanGoNext(_steps: WizardStep[], currentStep: WizardStepId): boolean {
  const idx = STEP_ORDER.indexOf(currentStep);
  return idx < STEP_ORDER.length - 1;
}

function computeCanGoBack(_steps: WizardStep[], currentStep: WizardStepId): boolean {
  const idx = STEP_ORDER.indexOf(currentStep);
  return idx > 0;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: "welcome",
  steps: INITIAL_STEPS,
  completedActions: [],
  selectedActions: [],
  machineProfileId: null,
  canGoNext: true,
  canGoBack: false,
  progress: 0,

  goToStep: (stepId) => {
    set((state) => {
      const targetStep = state.steps.find((s) => s.id === stepId);
      if (!targetStep || targetStep.status === "locked") return state;

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
      const currentIdx = STEP_ORDER.indexOf(state.currentStep);
      if (currentIdx <= 0) return state;

      const prevId = STEP_ORDER[currentIdx - 1] as WizardStepId;

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

  setMachineProfileId: (id) => set({ machineProfileId: id }),

  addSelectedAction: (actionId) =>
    set((state) => ({
      selectedActions: state.selectedActions.includes(actionId)
        ? state.selectedActions
        : [...state.selectedActions, actionId],
    })),

  removeSelectedAction: (actionId) =>
    set((state) => ({
      selectedActions: state.selectedActions.filter((id) => id !== actionId),
    })),

  addCompletedAction: (actionId) =>
    set((state) => ({
      completedActions: state.completedActions.includes(actionId)
        ? state.completedActions
        : [...state.completedActions, actionId],
    })),

  reset: () =>
    set({
      currentStep: "welcome",
      steps: INITIAL_STEPS,
      completedActions: [],
      selectedActions: [],
      machineProfileId: null,
      canGoNext: true,
      canGoBack: false,
      progress: 0,
    }),
}));

// ─── Selector helpers ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<WizardCategory, string> = {
  discover: "Discover",
  optimize: "Optimize",
  validate: "Validate",
  advanced: "Advanced",
  execute: "Execute",
};

export const CATEGORY_ORDER: WizardCategory[] = [
  "discover",
  "optimize",
  "validate",
  "advanced",
  "execute",
];
