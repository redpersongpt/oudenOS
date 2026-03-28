// ─── TierGate (tier/) ────────────────────────────────────────────────────────
// Dark-theme feature gate. Three display modes:
//   replace  — replaces children entirely with the upgrade prompt (default)
//   blur     — blurs children and overlays a lock panel
//   overlay  — absolute-positioned lock over children (use inside position:relative parents)
//
// The older components/ui/TierGate.tsx remains for existing call sites.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Lock, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTier } from "@/hooks/useTier";
import type { AppTier } from "@/hooks/useTier";
import { TierBadge } from "./TierBadge";
import { Button } from "@/components/ui/Button";

interface TierGateProps {
  /** Feature key from FEATURE_TIER_MAP / FEATURE_GATES */
  feature: string;
  children: ReactNode;
  /** Custom fallback rendered instead of the built-in upgrade prompt */
  fallback?: ReactNode;
  /** Visual mode (default: replace) */
  variant?: "replace" | "blur" | "overlay";
  /** Override the required tier label (auto-detected from feature map) */
  requiredTier?: AppTier;
}

// ─── Tier display metadata ─────────────────────────────────────────────────

const TIER_META: Record<AppTier, { label: string; color: string; icon: ReactNode }> = {
  free: {
    label: "Free",
    color: "text-ink-secondary",
    icon: <Lock className="h-4 w-4" strokeWidth={1.5} />,
  },
  premium: {
    label: "Premium",
    color: "text-blue-400",
    icon: <Zap className="h-4 w-4" strokeWidth={2} />,
  },
  expert: {
    label: "Expert",
    color: "text-violet-400",
    icon: <Crown className="h-4 w-4" strokeWidth={2} />,
  },
};

const TIER_GLOW: Record<AppTier, string> = {
  free: "",
  premium: "border-blue-500/20 bg-blue-500/5",
  expert: "border-violet-500/20 bg-violet-500/5",
};

// ─── Feature label map ─────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  full_tuning_engine: "Full Tuning Engine",
  benchmark_lab: "Benchmark Lab",
  rollback_center: "Rollback Center",
  reboot_resume: "Reboot & Resume",
  thermal_analysis: "Thermal Analysis",
  bottleneck_analysis: "Bottleneck Analysis",
  app_install_hub: "App Install Hub",
  config_sync: "Config Sync",
  cpu_parking_optimization: "CPU Core Parking",
  timer_latency_optimization: "Timer Latency",
  expert_mode: "Expert Mode",
  guided_oc_undervolt: "OC / Undervolt Guide",
  speculative_mitigation_control: "Speculative Mitigation",
  gpu_pstate_lock: "GPU P-State Lock",
  bios_guidance: "BIOS Guidance",
  api_access: "API Access",
  advanced_controls: "Advanced Controls",
};

// ─── Component ─────────────────────────────────────────────────────────────

export function TierGate({
  feature,
  children,
  fallback,
  variant = "replace",
  requiredTier: requiredTierProp,
}: TierGateProps) {
  const { canUseFeature, upgradeRequired } = useTier();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  const requiredTier = requiredTierProp ?? upgradeRequired(feature) ?? "premium";
  const featureLabel = FEATURE_LABELS[feature] ?? feature.replace(/_/g, " ");

  if (variant === "blur") {
    return (
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="pointer-events-none select-none"
          style={{ filter: "blur(4px)", opacity: 0.25 }}
          aria-hidden="true"
        >
          {children}
        </div>
        <LockOverlay featureLabel={featureLabel} requiredTier={requiredTier} />
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none opacity-30" aria-hidden="true">
          {children}
        </div>
        <LockOverlay featureLabel={featureLabel} requiredTier={requiredTier} absolute />
      </div>
    );
  }

  // replace (default)
  return <InlinePrompt featureLabel={featureLabel} requiredTier={requiredTier} />;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function LockOverlay({
  featureLabel,
  requiredTier,
  absolute = false,
}: {
  featureLabel: string;
  requiredTier: AppTier;
  absolute?: boolean;
}) {
  const meta = TIER_META[requiredTier];
  const glow = TIER_GLOW[requiredTier];

  return (
    <motion.div
      className={`${absolute ? "absolute inset-0" : ""} flex flex-col items-center justify-center gap-3 rounded-xl border ${glow} backdrop-blur-sm p-6`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${glow}`}>
        <span className={meta.color}>{meta.icon}</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">{featureLabel}</p>
        <p className="mt-0.5 text-xs text-ink-tertiary">
          Requires{" "}
          <TierBadge tier={requiredTier} size="sm" className="ml-0.5 align-middle" />
        </p>
      </div>
      <UpgradeButton requiredTier={requiredTier} />
    </motion.div>
  );
}

function InlinePrompt({
  featureLabel,
  requiredTier,
}: {
  featureLabel: string;
  requiredTier: AppTier;
}) {
  const meta = TIER_META[requiredTier];
  const glow = TIER_GLOW[requiredTier];

  return (
    <motion.div
      className={`flex items-center gap-3 rounded-xl border ${glow} px-4 py-3`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${glow}`}>
        <span className={meta.color}>{meta.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          {featureLabel} requires{" "}
          <TierBadge tier={requiredTier} size="sm" className="ml-0.5 align-middle" />
        </p>
        <p className="text-xs text-ink-tertiary">Upgrade to unlock this feature</p>
      </div>
      <UpgradeButton requiredTier={requiredTier} size="sm" />
    </motion.div>
  );
}

function UpgradeButton({
  requiredTier,
  size = "md",
}: {
  requiredTier: AppTier;
  size?: "sm" | "md";
}) {
  const navigate = useNavigate();
  return (
    <Button
      variant="primary"
      size={size}
      onClick={() => navigate("/subscription")}
    >
      Upgrade to {TIER_META[requiredTier].label}
    </Button>
  );
}
