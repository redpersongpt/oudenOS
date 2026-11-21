// Persistence rules for the wizard store (pure, unit-tested).
//
// v1 (≤ 1.0.5) persisted state with no version. That state is untrustworthy:
// on Windows the profile was always the demo sample (platform "win32" bug) and
// the step list may not match this build. v2 adds lastRun / interruptedRun.

export const WIZARD_STATE_VERSION = 2;

export interface StepLike {
  id: string;
  label: string;
  status: "locked" | "current" | "completed" | "skipped";
}

/** Steps after which a run is over — a relaunch starts a fresh session. */
export const FINISHED_STEPS = new Set(["report", "donation", "handoff"]);

type Dict = Record<string, unknown>;

/**
 * Re-key persisted step statuses onto this build's step list, so added,
 * removed or reordered steps can never leave the wizard locked.
 */
export function alignSteps(persisted: unknown, initial: StepLike[]): StepLike[] {
  const byId = new Map<string, StepLike["status"]>();
  if (Array.isArray(persisted)) {
    for (const s of persisted) {
      if (s && typeof s === "object" && typeof (s as Dict).id === "string") {
        const status = (s as Dict).status;
        if (status === "locked" || status === "current" || status === "completed" || status === "skipped") {
          byId.set((s as Dict).id as string, status);
        }
      }
    }
  }
  return initial.map((s) => ({ ...s, status: byId.get(s.id) ?? s.status }));
}

/**
 * zustand `persist` migrate hook. Anything older than v2 is discarded, except
 * a pending reboot-resume (so an update installed between "restart" and
 * "resume" does not lose the resume chain — the service ledger is the truth).
 */
export function migrateWizardState(persisted: unknown, fromVersion: number, initial: StepLike[]): Dict {
  const state: Dict = persisted && typeof persisted === "object" ? { ...(persisted as Dict) } : {};
  if (fromVersion >= WIZARD_STATE_VERSION) return state;
  if (state.currentStep === "reboot-resume") {
    return {
      currentStep: "reboot-resume",
      steps: alignSteps(state.steps, initial),
      resolvedPlaybook: state.resolvedPlaybook ?? null,
      executionResult: state.executionResult ?? null,
      detectedProfile: null,
      lastRun: null,
      interruptedRun: false,
    };
  }
  return {};
}

export interface RehydrateDecision {
  /** start a brand-new session at the welcome step */
  freshSession: boolean;
  /** the app closed while applying — resume/inspect instead of showing success */
  interrupted: boolean;
}

export function decideRehydrate(currentStep: unknown): RehydrateDecision {
  if (typeof currentStep === "string" && FINISHED_STEPS.has(currentStep)) {
    return { freshSession: true, interrupted: false };
  }
  if (currentStep === "execution") return { freshSession: false, interrupted: true };
  return { freshSession: false, interrupted: false };
}

/** Keys the ErrorBoundary / "Start over" clear. Language is intentionally kept. */
export const PERSISTED_SESSION_KEYS = ["oudenOS-wizard-state", "oudenOS-decisions"] as const;
