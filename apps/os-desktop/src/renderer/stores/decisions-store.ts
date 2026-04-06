import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AggressionPreset = "conservative" | "balanced" | "aggressive" | "expert";
export type EdgeBehavior = "keep" | "suppress" | "suppress-and-freeze";
export type TelemetryLevel = "keep" | "reduce" | "aggressive";
export type QuestionAnswer = string | boolean;

export interface QuestionnaireAnswers {
  [key: string]: QuestionAnswer | null | undefined;
  aggressionPreset?: string | null;
  disableTransparency?: boolean | null;
}

interface DecisionsState {
  answers: QuestionnaireAnswers;
  setAnswer: (key: string, value: QuestionAnswer | null) => void;
  applyAnswers: (next: QuestionnaireAnswers) => void;
  reset: () => void;
}

export const DEFAULT_QUESTIONNAIRE_ANSWERS: QuestionnaireAnswers = {};

export const useDecisionsStore = create<DecisionsState>()(
  persist(
    (set) => ({
      answers: { ...DEFAULT_QUESTIONNAIRE_ANSWERS },

      setAnswer: (key, value) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [key]: value,
          },
        })),

      applyAnswers: (next) =>
        set((state) => ({
          answers: {
            ...state.answers,
            ...next,
          },
        })),

      reset: () => {
        set({ answers: { ...DEFAULT_QUESTIONNAIRE_ANSWERS } });
        try {
          localStorage.removeItem("oudenOS-decisions");
        } catch {}
      },
    }),
    {
      name: "oudenOS-decisions",
      partialize: (state) => ({ answers: state.answers }),
    },
  ),
);
