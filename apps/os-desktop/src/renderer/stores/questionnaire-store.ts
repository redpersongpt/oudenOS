// Questionnaire schema cache (not persisted). Loaded once per profile + build
// and shared by the Profile step (quick setups) and the Strategy step.

import { create } from "zustand";
import { serviceCall } from "@/lib/service";
import questionnaireFallback from "@/lib/questionnaire-fallback.json";
import type { QuestionnaireSchema } from "@/lib/wizard-question-model";
import { readQuickSetups, type QuickSetup } from "@/lib/quick-setup";

interface QuestionnaireState {
  key: string | null;
  schema: QuestionnaireSchema | null;
  quickSetups: QuickSetup[];
  /** build the service resolved the questionnaire for (truth for gating/display) */
  serviceWindowsBuild: number | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  load: (profile: string, windowsBuild: number | null, demoMode: boolean, force?: boolean) => Promise<void>;
  clear: () => void;
}

let inflight: Promise<void> | null = null;

export const useQuestionnaireStore = create<QuestionnaireState>((set, get) => ({
  key: null,
  schema: null,
  quickSetups: [],
  serviceWindowsBuild: null,
  status: "idle",
  error: null,

  load: async (profile, windowsBuild, demoMode, force = false) => {
    const key = `${profile}|${windowsBuild ?? "auto"}|${demoMode ? "demo" : "live"}`;
    const current = get();
    if (!force && current.key === key && (current.status === "ready" || current.status === "loading")) {
      return inflight ?? Promise.resolve();
    }
    set({ key, status: "loading", error: null });
    inflight = (async () => {
      // No client build is ever sent: the service detects it and returns
      // windowsBuild on the schema (stored as serviceWindowsBuild).
      const params: Record<string, unknown> = { profile };
      const result = await serviceCall<QuestionnaireSchema>("questionnaire.resolve", params);
      if (get().key !== key) return; // superseded
      if (result.ok) {
        const build = (result.data as { windowsBuild?: unknown }).windowsBuild;
        set({
          schema: result.data,
          quickSetups: readQuickSetups(result.data),
          serviceWindowsBuild: typeof build === "number" ? build : null,
          status: "ready",
        });
      } else if (demoMode) {
        const schema = questionnaireFallback as unknown as QuestionnaireSchema;
        set({ schema, quickSetups: readQuickSetups(schema), status: "ready" });
      } else {
        set({ schema: null, quickSetups: [], status: "error", error: result.error || null });
      }
    })();
    try {
      await inflight;
    } finally {
      inflight = null;
    }
  },

  clear: () => set({ key: null, schema: null, quickSetups: [], serviceWindowsBuild: null, status: "idle", error: null }),
}));
