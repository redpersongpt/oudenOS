// Normalised runtime status (platform / service / elevation), refreshed on demand.

import { create } from "zustand";
import { platform } from "@/lib/platform";
import { UNAVAILABLE_STATUS, type RuntimeStatus } from "@/lib/runtime";

interface RuntimeStore {
  status: RuntimeStatus;
  checked: boolean;
  /** last time the shell refused to close because changes were being applied */
  closeBlockedAt: number | null;
  refresh: () => Promise<RuntimeStatus>;
  noteCloseBlocked: () => void;
}

export const useRuntimeStore = create<RuntimeStore>((set) => ({
  status: { ...UNAVAILABLE_STATUS },
  checked: false,
  closeBlockedAt: null,
  refresh: async () => {
    let status: RuntimeStatus;
    try {
      status = await platform().service.status();
    } catch {
      status = { ...UNAVAILABLE_STATUS };
    }
    set({ status, checked: true });
    return status;
  },
  noteCloseBlocked: () => set({ closeBlockedAt: Date.now() }),
}));
