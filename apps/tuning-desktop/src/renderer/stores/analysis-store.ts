// ─── Analysis Pipeline Store ─────────────────────────────────────────────────
// Holds the system-analyzer pipeline state for the DiagnosticsPage.

import { create } from "zustand";
import {
  createInitialPipelineState,
  toggleRecommendation,
  recomputePlan,
} from "@redcore/system-analyzer";
import type { AnalysisPipelineState, Recommendation } from "@redcore/system-analyzer";

interface AnalysisStoreState {
  pipeline: AnalysisPipelineState;
  isRunning: boolean;
  setPipeline: (updater: (prev: AnalysisPipelineState) => AnalysisPipelineState) => void;
  setRunning: (running: boolean) => void;
  toggleRecommendation: (id: string) => void;
  toggleAll: (enabled: boolean) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStoreState>((set, get) => ({
  pipeline: createInitialPipelineState(),
  isRunning: false,

  setPipeline: (updater) =>
    set((state) => ({ pipeline: updater(state.pipeline) })),

  setRunning: (isRunning) => set({ isRunning }),

  toggleRecommendation: (id: string) => {
    set((state) => {
      const updated = toggleRecommendation(state.pipeline.recommendations, id);
      const recomputed = recomputePlan({ ...state.pipeline, recommendations: updated });
      return {
        pipeline: {
          ...state.pipeline,
          recommendations: updated,
          ...recomputed,
        },
      };
    });
  },

  toggleAll: (enabled: boolean) => {
    set((state) => {
      const updated: Recommendation[] = state.pipeline.recommendations.map((r) => ({
        ...r,
        isEnabled: enabled,
      }));
      const recomputed = recomputePlan({ ...state.pipeline, recommendations: updated });
      return {
        pipeline: {
          ...state.pipeline,
          recommendations: updated,
          ...recomputed,
        },
      };
    });
  },

  reset: () =>
    set({ pipeline: createInitialPipelineState(), isRunning: false }),
}));
