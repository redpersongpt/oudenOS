// ─── Machine Intelligence Store ──────────────────────────────────────────────

import { create } from "zustand";
import type {
  MachineClassification,
  IntelligentTuningProfile,
} from "@redcore/shared-schema/device-intelligence";
import { serviceCall } from "@/lib/api";

interface IntelligenceState {
  classification: MachineClassification | null;
  profile: IntelligentTuningProfile | null;
  isClassifying: boolean;
  isLoadingProfile: boolean;
  classifyError: string | null;
  profileError: string | null;
  classify: (deviceProfileId: string) => Promise<void>;
  loadProfile: (deviceProfileId: string) => Promise<void>;
  reset: () => void;
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  classification: null,
  profile: null,
  isClassifying: false,
  isLoadingProfile: false,
  classifyError: null,
  profileError: null,

  classify: async (deviceProfileId: string) => {
    set({ isClassifying: true, classifyError: null });
    try {
      const result = await serviceCall("intelligence.classify", {
        deviceProfileId,
      });
      set({ classification: result, isClassifying: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Classification failed";
      set({ isClassifying: false, classifyError: message });
    }
  },

  loadProfile: async (deviceProfileId: string) => {
    set({ isLoadingProfile: true, profileError: null });
    try {
      const result = await serviceCall("intelligence.getProfile", {
        deviceProfileId,
      });
      set({ profile: result, classification: result.classification, isLoadingProfile: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load profile";
      set({ isLoadingProfile: false, profileError: message });
    }
  },

  reset: () =>
    set({
      classification: null,
      profile: null,
      isClassifying: false,
      isLoadingProfile: false,
      classifyError: null,
      profileError: null,
    }),
}));
