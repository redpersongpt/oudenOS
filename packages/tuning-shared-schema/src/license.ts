// ─── License & Subscription Schemas ─────────────────────────────────────────

export type SubscriptionTier = "free" | "premium" | "expert";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "trialing";

export type DeviceBindingStatus = "active" | "revoked" | "expired";

export interface LicenseState {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt: string | null;
  deviceBound: boolean;
  deviceId: string | null;
  lastValidatedAt: string;
  offlineGraceDays: number;    // how many days the app works without phone-home
  offlineDaysRemaining: number;
  features: FeatureGate[];
}

export interface FeatureGate {
  feature: string;
  tier: SubscriptionTier;
  enabled: boolean;
}

export interface DeviceBinding {
  id: string;
  userId: string;
  subscriptionId: string;
  deviceFingerprint: string;
  hostname: string;
  boundAt: string;
  status: DeviceBindingStatus;
  lastSeenAt: string;
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string | null;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

// Features gated by tier
export const FEATURE_GATES: Record<string, SubscriptionTier> = {
  // ── Free tier ──────────────────────────────────────────────────
  // Generous free tier: scan, plan, apply safe actions, benchmark,
  // app hub, rollback, intelligence. Premium gates advanced/risky tweaks.
  "hardware_scan": "free",
  "health_overview": "free",
  "basic_startup_cleanup": "free",
  "basic_debloat": "free",
  "limited_recommendations": "free",
  "basic_benchmark": "free",
  "bios_guidance_preview": "free",
  "tuning_plans": "free",
  "app_install_hub": "free",
  "rollback_center": "free",
  "benchmark_lab": "free",
  "machine_classification": "free",
  "intelligent_recommendations": "free",
  "speculative_mitigation_analysis": "free",

  // ── Premium tier ──────────────────────────────────────────────
  // Premium unlocks: advanced tuning, reboot-resume, thermal deep
  // analysis, GPU/CPU low-level tweaks, expert mode.
  "full_tuning_engine": "premium",
  "reboot_resume": "premium",
  "thermal_analysis": "premium",
  "bottleneck_analysis": "premium",
  "guided_oc_undervolt": "premium",
  "expert_mode": "premium",
  "full_version_logic": "premium",
  "config_sync": "premium",
  "cpu_parking_optimization": "premium",
  "speculative_mitigation_control": "premium",
  "timer_latency_optimization": "premium",
  "gpu_pstate_lock": "premium",
  "storage_8dot3_optimization": "premium",
  "fault_tolerant_heap_control": "premium",

  // Expert tier features
  "multi_machine_sync": "expert",
  "advanced_oc_control": "expert",
  "config_export_import": "expert",
  "priority_support": "expert",
  "early_access_features": "expert",
  "bios_guidance": "expert",
  "advanced_controls": "expert",
  "api_access": "expert",
  "auto_updates": "premium",
} as const;
