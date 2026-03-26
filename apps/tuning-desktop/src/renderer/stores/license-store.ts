// ─── License State Store ────────────────────────────────────────────────────

import { create } from "zustand";
import type { LicenseState, SubscriptionTier } from "@redcore/shared-schema/license";
import { FEATURE_GATES } from "@redcore/shared-schema/license";

interface LicenseStoreState {
  license: LicenseState | null;
  setLicense: (license: LicenseState) => void;
  isPremium: () => boolean;
  canAccess: (feature: string) => boolean;
}

export const useLicenseStore = create<LicenseStoreState>((set, get) => ({
  license: null,
  setLicense: (license) => set({ license }),
  isPremium: () => {
    const l = get().license;
    return (l?.tier === "premium" || l?.tier === "expert") && l?.status === "active";
  },
  canAccess: (feature: string) => {
    const license = get().license;
    if (!license) return false;
    const requiredTier = FEATURE_GATES[feature] as SubscriptionTier | undefined;
    if (!requiredTier) return false;
    if (requiredTier === "free") return true;
    const isActive = license.status === "active" || license.status === "trialing";
    if (requiredTier === "premium") return (license.tier === "premium" || license.tier === "expert") && isActive;
    if (requiredTier === "expert") return license.tier === "expert" && isActive;
    return false;
  },
}));
