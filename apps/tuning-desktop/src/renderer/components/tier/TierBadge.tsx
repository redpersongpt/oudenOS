// ─── TierBadge ───────────────────────────────────────────────────────────────
// Pill badge for license tier display.
//   Free    → gray (surface-overlay)
//   Premium → blue gradient
//   Expert  → purple gradient

import type { ReactNode } from "react";
import { Zap, Crown, Shield } from "lucide-react";
import type { AppTier } from "@/hooks/useTier";

interface TierBadgeProps {
  tier: AppTier;
  /** Show icon beside label (default: true) */
  showIcon?: boolean;
  /** md adds slightly more padding (default: sm) */
  size?: "sm" | "md";
  className?: string;
}

const TIER_CONFIG: Record<
  AppTier,
  { label: string; icon: ReactNode; styles: string }
> = {
  free: {
    label: "Free",
    icon: <Shield className="h-3 w-3" strokeWidth={1.5} />,
    styles: "bg-surface-overlay text-ink-secondary border-border",
  },
  premium: {
    label: "Premium",
    icon: <Zap className="h-3 w-3" strokeWidth={2.5} />,
    styles:
      "bg-gradient-to-r from-blue-500/20 to-blue-400/10 text-blue-400 border-blue-500/30",
  },
  expert: {
    label: "Expert",
    icon: <Crown className="h-3 w-3" strokeWidth={2} />,
    styles:
      "bg-gradient-to-r from-violet-500/20 to-violet-400/10 text-violet-400 border-violet-500/30",
  },
};

export function TierBadge({
  tier,
  showIcon = true,
  size = "sm",
  className = "",
}: TierBadgeProps) {
  const { label, icon, styles } = TIER_CONFIG[tier];
  const sizeStyles =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1"
      : "px-2.5 py-1 text-sm gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${styles} ${sizeStyles} ${className}`}
    >
      {showIcon && <span className="shrink-0">{icon}</span>}
      {label}
    </span>
  );
}
