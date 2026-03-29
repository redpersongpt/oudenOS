// ─── useTier ─────────────────────────────────────────────────────────────────
// Convenience hook that surfaces tier/feature-gate logic from the license store.

import { useLicenseStore } from "@/stores/license-store";
import { FEATURE_GATES } from "@redcore/shared-schema/license";

export type AppTier = "free" | "premium" | "expert";

// Maps feature keys to the minimum tier required for UI display purposes.
// MUST stay in sync with FEATURE_GATES in shared-schema/license.ts,
// which is the enforcement source of truth. Any feature not in FEATURE_GATES
// will not be accessible regardless of this map.
export const FEATURE_TIER_MAP: Record<string, AppTier> = {
  // Free tier (matches FEATURE_GATES)
  hardware_scan: "free",
  health_overview: "free",
  basic_startup_cleanup: "free",
  basic_debloat: "free",
  limited_recommendations: "free",
  basic_benchmark: "free",
  bios_guidance_preview: "free",
  tuning_plans: "free",
  app_install_hub: "free",
  rollback_center: "free",
  benchmark_lab: "free",
  machine_classification: "free",
  intelligent_recommendations: "free",
  speculative_mitigation_analysis: "free",

  // Premium tier (matches FEATURE_GATES)
  full_tuning_engine: "premium",
  reboot_resume: "premium",
  thermal_analysis: "premium",
  bottleneck_analysis: "premium",
  guided_oc_undervolt: "premium",
  expert_mode: "premium",
  full_version_logic: "premium",
  config_sync: "premium",
  cpu_parking_optimization: "premium",
  speculative_mitigation_control: "premium",
  timer_latency_optimization: "premium",
  gpu_pstate_lock: "premium",
  storage_8dot3_optimization: "premium",
  fault_tolerant_heap_control: "premium",
  auto_updates: "premium",

  // Expert tier (matches FEATURE_GATES)
  multi_machine_sync: "expert",
  advanced_oc_control: "expert",
  config_export_import: "expert",
  priority_support: "expert",
  early_access_features: "expert",
  bios_guidance: "expert",
  advanced_controls: "expert",
  api_access: "expert",
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
