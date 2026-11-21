// Wizard Store
// Step-based OS optimization wizard. Playbook-native flow.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  WIZARD_STATE_VERSION,
  alignSteps,
  decideRehydrate,
  migrateWizardState,
} from "@/lib/wizard-persist";

// Step IDs

export type WizardStepId =
  | "welcome"
  | "assessment"
  | "profile"
  | "playbook-strategy"
  | "playbook-review"
  | "personalization"
  | "final-review"
  | "execution"
  | "reboot-resume"
  | "report"
  | "donation"
  | "handoff";

// Step shape

export interface WizardStep {
  id: WizardStepId;
  label: string;
  status: "locked" | "current" | "completed" | "skipped";
}

// Profile detection result

export interface DetectedProfile {
  id: string;
  label: string;
  /** Classifier confidence 0-100; null when the service did not report one (never invented). */
  confidence: number | null;
  isWorkPc: boolean;
  machineName: string;
  signals: string[];
  accentColor: string;
  /** Real Windows build from the assessment; null when unknown (the service decides). */
  windowsBuild: number | null;
  /** true only for the macOS / browser preview sample profile */
  sample?: boolean;
  /** assess.full formFactor.chassis (desktop / laptop / …) */
  chassis?: string | null;
  /** assess.full healthChecks — guidance only, nothing is changed automatically */
  healthChecks?: HealthCheck[];
}

export interface HealthCheck {
  id: string;
  status: "ok" | "attention" | "unknown";
  title: string;
  detail: string;
  evidence?: Record<string, unknown> | null;
}

// Playbook resolved plan

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
  /** service-detected Windows build the plan was resolved for */
  windowsBuild?: number | null;
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

// Personalization

export interface PersonalizationPreferences {
  darkMode: boolean;
  brandAccent: boolean;
  wallpaper: boolean;
  taskbarCleanup: boolean;
  explorerCleanup: boolean;
  transparency: boolean;
}

export function getProfilePersonalizationDefaults(
  // profileId is currently unused — all profiles share the same defaults.
  // Kept as a parameter so future profile-specific defaults can be added
  // without touching callers.
  _profileId?: string | null,
): PersonalizationPreferences {
  return {
    darkMode: true,
    brandAccent: false,
    wallpaper: true,
    taskbarCleanup: false,
    explorerCleanup: false,
    transparency: false,
  };
}

export const DEFAULT_PERSONALIZATION: PersonalizationPreferences = getProfilePersonalizationDefaults(null);

// Execution result

export interface ExecutionJournalEntry {
  id: string;
  kind: "playbook-action" | "personalization";
  actionId: string;
  label: string;
  phase: string;
  status: "applied" | "skipped" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  questionKeys: string[];
  selectedValues: Array<string | boolean>;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  resultRef: string;
  errorMessage: string | null;
  /** sub-steps / items the service skipped, with reason codes (results[].reason) */
  skippedSteps?: Array<{ type: string; target: string | null; reason: string | null; note: string | null }>;
  /** -23: the action does not apply to this system (counted as skipped, not failed) */
  notApplicable?: boolean;
  /** personalization: Windows (UCPD) protected the Widgets button setting */
  widgetsProtected?: boolean;
}

export interface ExecutionResult {
  applied: number;
  failed: number;
  skipped: number;
  preserved: number;
  personalizationApplied: boolean;
  packageKind: "user-resolved";
  packageRefs: WizardPackageRefs | null;
  journal: ExecutionJournalEntry[];
  /** Where final counts came from. "ledger" = DB service truth, "local" = renderer journal */
  truthSource?: "ledger" | "local";
  /** ISO time the apply started (scopes "Undo everything" to this run's snapshots) */
  startedAt?: string;
  /** personalize.apply snapshot, reverted via personalize.revert */
  personalizationSnapshotId?: string | null;
  /** set when the service reported rollback_failed and applying was stopped */
  blockingError?: string | null;
  /** applied actions that only take effect after a restart */
  rebootRequiredCount?: number;
}

export interface LastRunSummary {
  finishedAt: string;
  applied: number;
  failed: number;
  skipped: number;
  rebootRequiredCount: number;
  profileId: string | null;
  preset: string | null;
  /** apply start — "Undo everything" restores only snapshots taken after this */
  startedAt?: string;
  personalizationSnapshotId?: string | null;
  undone?: boolean;
}

// Store interface

interface WizardState {
  currentStep: WizardStepId;
  steps: WizardStep[];
  stepReadiness: Record<WizardStepId, boolean>;
  demoMode: boolean;

  // Data
  detectedProfile: DetectedProfile | null;
  playbookPreset: string;
  resolvedPlaybook: ResolvedPlaybook | null;
  executionResult: ExecutionResult | null;
  personalization: PersonalizationPreferences;
  /** Summary of the most recent finished run — survives "Start over". */
  lastRun: LastRunSummary | null;
  /** The app was closed while applying; the next session must not show success. */
  interruptedRun: boolean;
  /** Changes are being applied right now (blocks close + update). Not persisted. */
  executing: boolean;
  /** High/extreme/expert-only action ids the user explicitly acknowledged at Final Review. */
  acknowledgedActionIds: string[];

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
  /** Jump forward (quick setup): every step before `target` is marked completed. */
  fastTrackTo: (target: WizardStepId) => void;

  // Data setters
  setDetectedProfile: (profile: DetectedProfile) => void;
  setPlaybookPreset: (preset: string) => void;
  setResolvedPlaybook: (playbook: ResolvedPlaybook) => void;
  setExecutionResult: (result: ExecutionResult) => void;
  setPersonalization: (prefs: Partial<PersonalizationPreferences>) => void;
  setDemoMode: (demo: boolean) => void;
  setLastRun: (run: LastRunSummary | null) => void;
  setInterruptedRun: (value: boolean) => void;
  setExecuting: (value: boolean) => void;
  setAcknowledgedActionIds: (ids: string[]) => void;

  /** Navigate to the optional donation step (bypasses lock — accessible from report). */
  gotoDonation: () => void;
  /** Complete the donation step and navigate to handoff. */
  completeDonation: () => void;

  /** Fresh wizard session. Keeps `lastRun` so the welcome screen can show it. */
  reset: () => void;
}

// Ordered step definitions

export const INITIAL_STEPS: WizardStep[] = [
  { id: "welcome",            label: "Welcome",           status: "current" },
  { id: "assessment",         label: "Assessment",        status: "locked"  },
  { id: "profile",            label: "Profile",           status: "locked"  },
  { id: "playbook-strategy",  label: "Strategy",          status: "locked"  },
  { id: "playbook-review",    label: "Playbook Review",   status: "locked"  },
  { id: "personalization",    label: "Personalization",   status: "locked"  },
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
  "playbook-strategy": false,
  "playbook-review": false,
  personalization: true,
  "final-review": false,
  execution: false,
  "reboot-resume": false,
  report: true,
  donation: true, // side-trip step — always "ready", not in STEP_ORDER
  handoff: false,
};

// Helpers

function computeProgress(steps: WizardStep[]): number {
  const done = steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
  return Math.round((done / steps.length) * 100);
}

function computeCanGoNext(
  currentStep: WizardStepId,
  stepReadiness: Record<WizardStepId, boolean>,
): boolean {
  return STEP_ORDER.indexOf(currentStep) < STEP_ORDER.length - 1 && stepReadiness[currentStep] === true;
}

function computeCanGoBack(currentStep: WizardStepId): boolean {
  return STEP_ORDER.indexOf(currentStep) > 0;
}

function freshSessionState() {
  return {
    currentStep: "welcome" as WizardStepId,
    steps: INITIAL_STEPS.map((s) => ({ ...s })),
    stepReadiness: { ...INITIAL_STEP_READINESS },
    demoMode: false,
    detectedProfile: null,
    playbookPreset: "balanced",
    resolvedPlaybook: null,
    executionResult: null,
    personalization: { ...DEFAULT_PERSONALIZATION },
    interruptedRun: false,
    executing: false,
    acknowledgedActionIds: [] as string[],
    canGoNext: true,
    canGoBack: false,
    progress: 0,
  };
}

// Store

export const useWizardStore = create<WizardState>()(persist((set, get) => ({
  ...freshSessionState(),
  lastRun: null,

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
        canGoNext: computeCanGoNext(stepId, state.stepReadiness),
        canGoBack: computeCanGoBack(stepId),
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
        canGoNext: computeCanGoNext(newCurrent, state.stepReadiness),
        canGoBack: computeCanGoBack(newCurrent),
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
        canGoNext: computeCanGoNext(newCurrent, state.stepReadiness),
        canGoBack: computeCanGoBack(newCurrent),
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
        if (s.id === state.currentStep) return { ...s, status: "completed" as const };
        if (s.id === prevId) return { ...s, status: "current" as const };
        return s;
      });

      return {
        currentStep: prevId,
        steps,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(prevId, state.stepReadiness),
        canGoBack: computeCanGoBack(prevId),
      };
    });
  },

  setStepReady: (stepId, ready) =>
    set((state) => {
      const stepReadiness = { ...state.stepReadiness, [stepId]: ready };
      return {
        stepReadiness,
        canGoNext: computeCanGoNext(state.currentStep, stepReadiness),
      };
    }),

  fastTrackTo: (target) =>
    set((state) => {
      const targetIdx = STEP_ORDER.indexOf(target);
      if (targetIdx < 0) return state;
      const steps = state.steps.map((s) => {
        const idx = STEP_ORDER.indexOf(s.id);
        if (idx < targetIdx) return { ...s, status: "completed" as const };
        if (idx === targetIdx) return { ...s, status: "current" as const };
        return s;
      });
      return {
        steps,
        currentStep: target,
        progress: computeProgress(steps),
        canGoNext: computeCanGoNext(target, state.stepReadiness),
        canGoBack: computeCanGoBack(target),
      };
    }),

  setDetectedProfile: (profile) => set({
    detectedProfile: profile,
    personalization: getProfilePersonalizationDefaults(profile.id),
  }),
  setPlaybookPreset: (preset) => set({ playbookPreset: preset, resolvedPlaybook: null }),
  setResolvedPlaybook: (playbook) => set({ resolvedPlaybook: playbook }),
  setExecutionResult: (result) => set({ executionResult: result }),
  setPersonalization: (prefs) =>
    set((state) => ({ personalization: { ...state.personalization, ...prefs } })),
  setDemoMode: (demo) => set({ demoMode: demo }),
  setLastRun: (run) => set({ lastRun: run }),
  setInterruptedRun: (value) => set({ interruptedRun: value }),
  setExecuting: (value) => set({ executing: value }),
  setAcknowledgedActionIds: (ids) => set({ acknowledgedActionIds: ids }),

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
        canGoNext: computeCanGoNext("handoff", state.stepReadiness),
        canGoBack: false,
      };
    }),

  reset: () => set(freshSessionState()),
}), {
  name: "oudenOS-wizard-state",
  version: WIZARD_STATE_VERSION,
  migrate: (persisted, version) =>
    migrateWizardState(persisted, version, INITIAL_STEPS) as unknown as WizardState,
  // Only persist the data needed to survive a reboot/relaunch.
  // resolvedPlaybook must be persisted so reboot-resume has the action list
  // after the app restarts mid-execution.
  partialize: (state) => ({
    currentStep: state.currentStep,
    steps: state.steps,
    stepReadiness: state.stepReadiness,
    detectedProfile: state.detectedProfile,
    playbookPreset: state.playbookPreset,
    resolvedPlaybook: state.resolvedPlaybook,
    executionResult: state.executionResult,
    personalization: state.personalization,
    lastRun: state.lastRun,
    interruptedRun: state.interruptedRun,
    // needed by reboot-resume after a restart
    acknowledgedActionIds: state.acknowledgedActionIds,
  }),
  onRehydrateStorage: () => {
    return (state?: WizardState) => {
      if (!state) return;
      const decision = decideRehydrate(state.currentStep);
      if (decision.freshSession) {
        // The previous run finished: start a new session, keep its summary.
        Object.assign(state, freshSessionState());
      } else {
        state.steps = alignSteps(state.steps, INITIAL_STEPS) as WizardStep[];
        state.stepReadiness = { ...INITIAL_STEP_READINESS, ...state.stepReadiness };
        if (decision.interrupted) {
          // Closed while applying: inspect / resume from the service ledger.
          state.currentStep = "reboot-resume";
          state.interruptedRun = true;
          state.steps = state.steps.map((s) =>
            s.id === "execution" ? { ...s, status: "completed" as const } :
            s.id === "reboot-resume" ? { ...s, status: "current" as const } : s
          );
        }
      }
      state.executing = false;
      state.progress = computeProgress(state.steps);
      state.canGoNext = computeCanGoNext(state.currentStep, state.stepReadiness);
      state.canGoBack = computeCanGoBack(state.currentStep);
    };
  },
}));
