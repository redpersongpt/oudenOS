// ─── TierGate ────────────────────────────────────────────────────────────────
// Renders children only when the user's tier meets the feature requirement.
// Falls back to a contextual upgrade prompt that fits inline or full-screen.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import { useLicenseStore } from "@/stores/license-store";
import { FEATURE_GATES } from "@redcore/shared-schema/license";
import type { SubscriptionTier } from "@redcore/shared-schema/license";
import { Button } from "./Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TierGateProps {
  /** Feature key from FEATURE_GATES, e.g. "benchmark_lab" */
  feature: string;
  children: ReactNode;
  /** Custom fallback instead of the default upgrade card */
  fallback?: ReactNode;
  /** "blur" overlays a lock on blurred content (default), "hide" shows nothing */
  variant?: "blur" | "hide" | "inline";
}

// ─── Feature→tier display names ──────────────────────────────────────────────

const FEATURE_LABELS: Partial<Record<string, string>> = {
  full_tuning_engine: "Full Tuning Engine",
  benchmark_lab: "Benchmark Lab",
  rollback_center: "Rollback Center",
  reboot_resume: "Reboot & Resume",
  thermal_analysis: "Thermal Analysis",
  bottleneck_analysis: "Bottleneck Analysis",
  tuning_plans: "Tuning Plans",
  guided_oc_undervolt: "OC / Undervolt Guide",
  expert_mode: "Expert Mode",
  app_install_hub: "App Install Hub",
  full_version_logic: "Full Version Logic",
  config_sync: "Config Sync",
  cpu_parking_optimization: "CPU Core Parking",
  speculative_mitigation_control: "Speculative Mitigation Control",
  timer_latency_optimization: "Timer Latency Optimization",
  gpu_pstate_lock: "GPU P-State Lock",
  storage_8dot3_optimization: "Storage 8.3 Name Optimization",
  fault_tolerant_heap_control: "Fault Tolerant Heap Control",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TierGate({ feature, children, fallback, variant = "blur" }: TierGateProps) {
  const canAccess = useLicenseStore((s) => s.canAccess);

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredTier = FEATURE_GATES[feature] as SubscriptionTier | undefined;
  const featureLabel = FEATURE_LABELS[feature] ?? feature;

  if (variant === "hide") {
    return null;
  }

  if (variant === "inline") {
    return <InlineGate featureLabel={featureLabel} requiredTier={requiredTier} />;
  }

  // Default: blur overlay
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Blurred content preview */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(3px)", opacity: 0.35 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock overlay */}
      <OverlayGate featureLabel={featureLabel} requiredTier={requiredTier} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GateUIProps {
  featureLabel: string;
  requiredTier: SubscriptionTier | undefined;
}

function OverlayGate({ featureLabel, requiredTier }: GateUIProps) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-page/70 backdrop-blur-[4px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/15 border border-brand-500/30 shadow-sm">
        <Lock className="h-5 w-5 text-brand-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">{featureLabel}</p>
        {requiredTier && (
          <p className="text-xs text-ink-tertiary mt-0.5">
            Requires <span className="font-medium capitalize text-brand-400">{requiredTier}</span>
          </p>
        )}
      </div>
      <UpgradeButton />
    </motion.div>
  );
}

function InlineGate({ featureLabel, requiredTier }: GateUIProps) {
  return (
    <motion.div
      className="flex items-center gap-3 rounded-lg border border-brand-500/20 bg-brand-500/10 px-4 py-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20">
        <Zap className="h-4 w-4 text-brand-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          {featureLabel} is a{" "}
          {requiredTier && (
            <span className="capitalize text-brand-400">{requiredTier}</span>
          )}{" "}
          feature
        </p>
        <p className="text-xs text-ink-tertiary">Upgrade to unlock all optimization tools</p>
      </div>
      <UpgradeButton size="sm" />
    </motion.div>
  );
}

function UpgradeButton({ size = "sm" }: { size?: "sm" | "md" }) {
  const handleUpgrade = () => {
    // TODO: Open upgrade flow (web billing portal or in-app purchase)
    window.open("https://redcore-tuning.com/pricing", "_blank", "noopener,noreferrer");
  };

  return (
    <Button variant="primary" size={size} onClick={handleUpgrade}>
      Upgrade to Premium
    </Button>
  );
}
