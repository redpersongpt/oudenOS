// ─── useTier ─────────────────────────────────────────────────────────────────
// Convenience hook that surfaces tier/feature-gate logic from the license store.

import { useLicenseStore } from "@/stores/license-store";
import { FEATURE_GATES } from "@redcore/shared-schema/license";

export type AppTier = "free" | "premium" | "expert";

// Maps feature keys to the minimum tier required.
// Entries from FEATURE_GATES (shared-schema) are the source of truth;
// this table adds UI-only aliases and fills gaps.
export const FEATURE_TIER_MAP: Record<string, AppTier> = {
  // Free
  hardware_scan: "free",
  basic_benchmark: "free",
  basic_startup_cleanup: "free",
  basic_debloat: "free",
  bios_guidance_preview: "free",

  // Premium
  full_tuning_engine: "premium",
  full_version_logic: "premium",
  benchmark_lab: "premium",
  rollback_center: "premium",
  reboot_resume: "premium",
  thermal_analysis: "premium",
  bottleneck_analysis: "premium",
  app_install_hub: "premium",
  config_sync: "premium",
  auto_updates: "premium",
  cpu_parking_optimization: "premium",
  timer_latency_optimization: "premium",
  tuning_plans: "premium",

  // Expert
  expert_mode: "expert",
  guided_oc_undervolt: "expert",
  speculative_mitigation_control: "expert",
  gpu_pstate_lock: "expert",
  bios_guidance: "expert",
  api_access: "expert",
  storage_8dot3_optimization: "expert",
  fault_tolerant_heap_control: "expert",
  advanced_controls: "expert",
};

export interface UseTierReturn {
  /** The user's current active tier */
  currentTier: AppTier;
  /**
   * Returns true when the current license grants access to `feature`.
   * Delegates to license-store.canAccess which reads FEATURE_GATES.
   */
  canUseFeature: (feature: string) => boolean;
  /** Returns true when `feature` is a known gated feature (may or may not be accessible). */
  isFeatureAvailable: (feature: string) => boolean;
  /**
   * Returns the minimum tier required to use `feature`, or null if the
   * user already has access (i.e. no upgrade required).
   */
  upgradeRequired: (feature: string) => AppTier | null;
}

export function useTier(): UseTierReturn {
  const license = useLicenseStore((s) => s.license);
  const canAccess = useLicenseStore((s) => s.canAccess);

  const currentTier = ((license?.tier as AppTier | undefined) ?? "free") as AppTier;

  function canUseFeature(feature: string): boolean {
    return canAccess(feature);
  }

  function isFeatureAvailable(feature: string): boolean {
    return feature in FEATURE_TIER_MAP || feature in FEATURE_GATES;
  }

  function upgradeRequired(feature: string): AppTier | null {
    if (canAccess(feature)) return null;
    const gate = FEATURE_GATES[feature] as AppTier | undefined;
    return gate ?? FEATURE_TIER_MAP[feature] ?? null;
  }

  return { currentTier, canUseFeature, isFeatureAvailable, upgradeRequired };
}
