// ─── Wizard Store ─────────────────────────────────────────────────────────────
// 13-step OS transformation wizard. Playbook-native flow.

import { create } from "zustand";

// ─── Step IDs ─────────────────────────────────────────────────────────────────

export type WizardStepId =
  | "welcome"
  | "assessment"
  | "profile"
  | "preservation"
  | "playbook-strategy"
  | "playbook-review"
  | "personalization"
  | "app-setup"
  | "final-review"
  | "execution"
  | "reboot-resume"
  | "report"
  | "donation"
  | "handoff";

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
  windowsBuild: number;
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
  decisionSummary?: QuestionnaireDecisionSummary | null;
  actionProvenance?: ActionDecisionProvenance[];
  packageRefs?: WizardPackageRefs | null;
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

export interface QuestionnaireDecisionEffect {
  questionKey: string;
  questionLabel: string;
  selectedValue: string | boolean;
  selectedTitle: string;
  includedActions: string[];
  blockedActions: string[];
  blockedReason: string | null;
  warnings: string[];
  requiresReboot: boolean;
  estimatedActions: number;
  estimatedBlocked: number;
  estimatedPreserved: number;
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  optionSourceRef?: string;
}

export interface QuestionnaireDecisionSummary {
  estimatedActions: number;
  estimatedBlocked: number;
  estimatedPreserved: number;
  rebootRequired: boolean;
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  warnings: string[];
  selectedEffects: QuestionnaireDecisionEffect[];
}

export interface WizardPackageRefs {
  manifestRef: string;
  wizardMetadataRef: string;
  resolvedPlaybookRef: string;
  decisionSummaryRef: string;
  actionProvenanceRef: string;
  executionJournalRef: string;
  injectionMetadataRef: string;
  // DB-backed ledger identity (used by ledger.createPlan)
  planId?: string;
  packageId?: string;
  packageRole?: string;
  packageVersion?: string | null;
  packageSourceRef?: string | null;
  sourceCommit?: string | null;
}

export interface ActionDecisionSource {
  effect: "include" | "block";
  questionKey: string;
  questionLabel: string;
  selectedValue: string | boolean;
  selectedTitle: string;
  blockedReason: string | null;
  warnings: string[];
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  requiresReboot: boolean;
  estimatedPreserved: number;
  optionSourceRef: string;
}

export interface ActionDecisionProvenance {
  actionId: string;
  actionName: string;
  phaseId: string;
  phaseName: string;
  description: string;
  defaultStatus: PlaybookResolvedAction["status"];
  finalStatus: PlaybookResolvedAction["status"];
  inclusionReason: string | null;
  blockedReason: string | null;
  preservedReason: string | null;
  reasonOrigin: "base-playbook" | "user-choice" | "profile-safeguard" | "build-gate";
  warnings: string[];
  riskLevel: "safe" | "mixed" | "aggressive" | "expert";
  expertOnly: boolean;
  requiresReboot: boolean;
  offlineApplicable: boolean;
  imageApplicable: boolean;
  sourceQuestionIds: string[];
  sourceOptionValues: Array<string | boolean>;
  sources: ActionDecisionSource[];
  packageSourceRef: string;
  journalRecordRefs: string[];
  executionResultRef: string | null;
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

// ─── Personalization ─────────────────────────────────────────────────────────

export interface PersonalizationPreferences {
  darkMode: boolean;
  brandAccent: boolean;
  taskbarCleanup: boolean;
  explorerCleanup: boolean;
  transparency: boolean;
}

export function getProfilePersonalizationDefaults(profileId?: string | null): PersonalizationPreferences {
  switch (profileId) {
    case "work_pc":
      return {
        darkMode: true,
        brandAccent: true,
        taskbarCleanup: false,
        explorerCleanup: false,
        transparency: true,
      };
    case "low_spec_system":
    case "low_spec":
      return {
        darkMode: true,
        brandAccent: true,
        taskbarCleanup: true,
        explorerCleanup: true,
        transparency: false,
      };
    default:
      return {
        darkMode: true,
        brandAccent: true,
        taskbarCleanup: true,
        explorerCleanup: true,
        transparency: true,
      };
  }
}

export const DEFAULT_PERSONALIZATION: PersonalizationPreferences = getProfilePersonalizationDefaults(null);

// ─── Execution result ────────────────────────────────────────────────────────

export interface AppInstallSummary {
  requested: number;
  installed: number;
  failed: number;
}

export interface ExecutionJournalEntry {
  id: string;
  kind: "playbook-action" | "personalization" | "app-install";
  actionId: string;
  label: string;
  phase: string;
  status: "applied" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  questionKeys: string[];
  selectedValues: Array<string | boolean>;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  resultRef: string;
  errorMessage: string | null;
}

export interface ExecutionResult {
  applied: number;
  failed: number;
  skipped: number;
  preserved: number;
  personalizationApplied: boolean;
  appInstall: AppInstallSummary;
  packageKind: "user-resolved";
  packageRefs: WizardPackageRefs | null;
  journal: ExecutionJournalEntry[];
}

// ─── Store interface ─────────────────────────────────────────────────────────

interface WizardState {
  currentStep: WizardStepId;
  steps: WizardStep[];
  stepReadiness: Record<WizardStepId, boolean>;
  demoMode: boolean;

  // Data
  detectedProfile: DetectedProfile | null;
  playbookPreset: string;
  resolvedPlaybook: ResolvedPlaybook | null;
  recommendedApps: RecommendedApp[];
  selectedAppIds: string[];
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
  setStepReady: (step: WizardStepId, ready: boolean) => void;

  // Data setters
  setDetectedProfile: (profile: DetectedProfile) => void;
  setPlaybookPreset: (preset: string) => void;
  setResolvedPlaybook: (playbook: ResolvedPlaybook) => void;
  setRecommendedApps: (apps: RecommendedApp[]) => void;
  toggleApp: (appId: string) => void;
  setExecutionResult: (result: ExecutionResult) => void;
  setPersonalization: (prefs: Partial<PersonalizationPreferences>) => void;
  setDemoMode: (demo: boolean) => void;

  /** Navigate to the optional donation step (bypasses lock — accessible from report). */
  gotoDonation: () => void;
  /** Complete the donation step and navigate to handoff. */
  completeDonation: () => void;

  reset: () => void;
}

// ─── Ordered step definitions ────────────────────────────────────────────────

const INITIAL_STEPS: WizardStep[] = [
  { id: "welcome",            label: "Welcome",           status: "current" },
  { id: "assessment",         label: "Assessment",        status: "locked"  },
  { id: "profile",            label: "Profile",           status: "locked"  },
  { id: "preservation",       label: "Preservation",      status: "locked"  },
  { id: "playbook-strategy",  label: "Strategy",          status: "locked"  },
  { id: "playbook-review",    label: "Playbook Review",   status: "locked"  },
  { id: "personalization",    label: "Personalization",   status: "locked"  },
  { id: "app-setup",          label: "App Setup",         status: "locked"  },
  { id: "final-review",       label: "Final Review",      status: "locked"  },
  { id: "execution",          label: "Apply",             status: "locked"  },
  { id: "reboot-resume",      label: "Reboot",            status: "locked"  },
  { id: "report",             label: "Complete",          status: "locked"  },
  { id: "handoff",            label: "Next Steps",        status: "locked"  },
];

const STEP_ORDER = INITIAL_STEPS.map((s) => s.id);
const INITIAL_STEP_READINESS: Record<WizardStepId, boolean> = {
  welcome: true,
  assessment: false,
  profile: false,
  preservation: true,
  "playbook-strategy": false,
  "playbook-review": false,
  personalization: true,
  "app-setup": false,
  "final-review": false,
  execution: false,
  "reboot-resume": false,
  report: true,
  donation: true, // side-trip step — always "ready", not in STEP_ORDER
  handoff: false,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeProgress(steps: WizardStep[]): number {
  const done = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  return Math.round((done / steps.length) * 100);
}

function computeCanGoNext(
  _steps: WizardStep[],
  currentStep: WizardStepId,
  stepReadiness: Record<WizardStepId, boolean>,
): boolean {
  return STEP_ORDER.indexOf(currentStep) < STEP_ORDER.length - 1 && stepReadiness[currentStep] === true;
}

function computeCanGoBack(_steps: WizardStep[], currentStep: WizardStepId): boolean {
  return STEP_ORDER.indexOf(currentStep) > 0;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: "welcome",
  steps: INITIAL_STEPS.map(s => ({ ...s })),
  stepReadiness: { ...INITIAL_STEP_READINESS },
  demoMode: false,
  detectedProfile: null,
  playbookPreset: "balanced",
  resolvedPlaybook: null,
  recommendedApps: [],
  selectedAppIds: [],
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
        canGoNext: computeCanGoNext(steps, stepId, state.stepReadiness),
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
        canGoNext: computeCanGoNext(steps, newCurrent, state.stepReadiness),
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
        canGoNext: computeCanGoNext(steps, newCurrent, state.stepReadiness),
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
        // Mark the step we're leaving as completed (not locked) so we can return to it
        if (s.id === state.currentStep) return { ...s, status: "completed" as const };
        if (s.id === prevId) return { ...s, status: "current" as const };
        return s;
      });

      return {
        currentStep: prevId,
        steps,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(steps, prevId, state.stepReadiness),
        canGoBack: computeCanGoBack(steps, prevId),
      };
    });
  },

  setStepReady: (stepId, ready) =>
    set((state) => {
      const stepReadiness = { ...state.stepReadiness, [stepId]: ready };
      return {
        stepReadiness,
        canGoNext: computeCanGoNext(state.steps, state.currentStep, stepReadiness),
      };
    }),

  setDetectedProfile: (profile) => set({
    detectedProfile: profile,
    personalization: getProfilePersonalizationDefaults(profile.id),
  }),
  setPlaybookPreset: (preset) => set({ playbookPreset: preset, resolvedPlaybook: null }),
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
  setExecutionResult: (result) => set({ executionResult: result }),
  setPersonalization: (prefs) =>
    set((state) => ({ personalization: { ...state.personalization, ...prefs } })),
  setDemoMode: (demo) => set({ demoMode: demo }),

  // Donation step is an optional side-trip — not in STEP_ORDER.
  // Marks the previous step (report) as completed, navigates to donation.
  // handoff stays locked until completeDonation is called.
  gotoDonation: () =>
    set((state) => {
      const steps = state.steps.map((s) => {
        if (s.id === state.currentStep) return { ...s, status: "completed" as const };
        return s;
      });
      return {
        currentStep: "donation" as WizardStepId,
        steps,
        progress: computeProgress(steps),
        canGoNext: true,
        canGoBack: false,
      };
    }),

  // Called when donation step is done (donated or skipped).
  // Unlocks and navigates to handoff.
  completeDonation: () =>
    set((state) => {
      const steps = state.steps.map((s) => {
        if (s.id === "handoff" && s.status === "locked") return { ...s, status: "current" as const };
        return s;
      });
      return {
        currentStep: "handoff" as WizardStepId,
        steps,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(steps, "handoff", state.stepReadiness),
        canGoBack: false,
      };
    }),

  reset: () =>
    set({
      currentStep: "welcome",
      steps: INITIAL_STEPS.map(s => ({ ...s })),
      stepReadiness: { ...INITIAL_STEP_READINESS },
      demoMode: false,
      detectedProfile: null,
      playbookPreset: "balanced",
      resolvedPlaybook: null,
      recommendedApps: [],
      selectedAppIds: [],
      executionResult: null,
      personalization: { ...DEFAULT_PERSONALIZATION },
      canGoNext: true,
      canGoBack: false,
      progress: 0,
    }),
}));
