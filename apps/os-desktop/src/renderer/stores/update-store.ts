// Updater state shared by the title-bar gear (dot) and the Settings panel.
// A silent check runs once on launch; nothing is ever installed without the
// user pressing "Update now", and never while changes are being applied.

import { create } from "zustand";
import { platform } from "@/lib/platform";

export type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate"; current: string }
  | { kind: "available"; current: string; version: string; notes?: string }
  | { kind: "downloading"; percent: number }
  | { kind: "error"; message: string; current: string };

interface UpdateStore {
  state: UpdateState;
  check: (silent?: boolean) => Promise<void>;
  install: () => Promise<void>;
}

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  state: { kind: "idle" },

  check: async (silent = false) => {
    if (get().state.kind === "checking" || get().state.kind === "downloading") return;
    if (!silent) set({ state: { kind: "checking" } });
    const info = await platform().updater.check();
    if (info.available && info.version) {
      set({ state: { kind: "available", current: info.currentVersion, version: info.version, notes: info.notes } });
    } else if (info.error) {
      // A silent launch check never surfaces errors (offline is normal).
      set({ state: silent ? { kind: "idle" } : { kind: "error", message: info.error, current: info.currentVersion } });
    } else {
      set({ state: { kind: "uptodate", current: info.currentVersion } });
    }
  },

  install: async () => {
    set({ state: { kind: "downloading", percent: 0 } });
    try {
      await platform().updater.downloadAndInstall((percent) => set({ state: { kind: "downloading", percent } }));
      await get().check();
    } catch (e) {
      set({ state: { kind: "error", message: String(e), current: `v${__APP_VERSION__}` } });
    }
  },
}));
