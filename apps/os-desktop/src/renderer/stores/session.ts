// Session-level actions that span several stores.

import { useWizardStore } from "./wizard-store";
import { useDecisionsStore } from "./decisions-store";
import { useLogStore } from "./log-store";
import { useQuestionnaireStore } from "./questionnaire-store";
import { PERSISTED_SESSION_KEYS } from "@/lib/wizard-persist";

/** "Start over": fresh wizard + answers. Keeps the last-run summary and language. */
export function startOver(): void {
  useWizardStore.getState().reset();
  useDecisionsStore.getState().reset();
  useQuestionnaireStore.getState().clear();
  useLogStore.getState().clear();
}

/** Used by the ErrorBoundary: wipe persisted session state so a bad state cannot crash-loop. */
export function clearPersistedSession(): void {
  for (const key of PERSISTED_SESSION_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable — nothing to clear
    }
  }
}
