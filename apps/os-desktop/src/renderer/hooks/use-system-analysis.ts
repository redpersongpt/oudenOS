// ─── useSystemAnalysis hook ──────────────────────────────────────────────────
// Runs the system-analyzer pipeline after a DeviceProfile becomes available.
// Designed for os-desktop's wizard flow — no Zustand store dependency.

import { useState, useRef, useCallback } from "react";
import {
  runAnalysisPipeline,
  createInitialPipelineState,
  toggleRecommendation,
  recomputePlan,
} from "@redcore/system-analyzer";
import type { AnalysisPipelineState, Recommendation } from "@redcore/system-analyzer";
import type { DeviceProfile } from "@redcore/shared-schema/device";

export function useSystemAnalysis() {
  const [state, setState] = useState<AnalysisPipelineState>(createInitialPipelineState);
  const [isRunning, setIsRunning] = useState(false);
  const abortedRef = useRef(false);

  const run = useCallback(async (profile: DeviceProfile) => {
    abortedRef.current = false;
    setState(createInitialPipelineState());
    setIsRunning(true);

    try {
      await runAnalysisPipeline(profile, (updater) => {
        if (!abortedRef.current) {
          setState(updater);
        }
      }, { simulatedDelay: 180 }); // slight delay per step for visual polish
    } catch (err) {
      console.error("[useSystemAnalysis] Pipeline error:", err);
    } finally {
      if (!abortedRef.current) {
        setIsRunning(false);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    abortedRef.current = true;
    setIsRunning(false);
  }, []);

  const toggle = useCallback((id: string) => {
    setState((prev) => {
      const updated = toggleRecommendation(prev.recommendations, id);
      const recomputed = recomputePlan({ ...prev, recommendations: updated });
      return { ...prev, recommendations: updated as Recommendation[], ...recomputed };
    });
  }, []);

  return { state, isRunning, run, cancel, toggle };
}
