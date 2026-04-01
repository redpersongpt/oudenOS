// Tuning Plan Store

import { create } from "zustand";
import type { TuningPlan } from "@redcore/shared-schema/tuning";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "success" | "error";
  message: string;
}

interface TuningState {
  plan: TuningPlan | null;
  applying: boolean;
  currentActionIndex: number;
  logs: LogEntry[];
  setPlan: (plan: TuningPlan) => void;
  setApplying: (applying: boolean) => void;
  addLog: (level: LogEntry["level"], message: string) => void;
  setCurrentActionIndex: (index: number) => void;
  reset: () => void;
}

export const useTuningStore = create<TuningState>((set) => ({
  plan: null,
  applying: false,
  currentActionIndex: 0,
  logs: [],
  setPlan: (plan) => set({ plan }),
  setApplying: (applying) => set({ applying }),
  addLog: (level, message) =>
    set((s) => ({
      logs: [
        ...s.logs,
        { timestamp: new Date().toLocaleTimeString(), level, message },
      ],
    })),
  setCurrentActionIndex: (currentActionIndex) => set({ currentActionIndex }),
  reset: () =>
    set({ plan: null, applying: false, currentActionIndex: 0, logs: [] }),
}));
