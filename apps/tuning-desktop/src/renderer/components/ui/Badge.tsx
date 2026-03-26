import type { ReactNode } from "react";
import type { RiskLevel } from "@redcore/shared-schema/tuning";

// Dark-first risk badge styles — legible on #131316 surface
const riskStyles: Record<RiskLevel, string> = {
  safe:    "bg-green-900/30   text-green-400   border-green-800/60",
  low:     "bg-green-900/20   text-green-400   border-green-800/50",
  medium:  "bg-amber-900/30   text-amber-400   border-amber-800/60",
  high:    "bg-brand-950/60   text-brand-400   border-brand-800",
  extreme: "bg-brand-950/80   text-brand-300   border-brand-700",
};

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "risk" | "premium" | "info" | "success" | "warning";
  risk?: RiskLevel;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  risk,
  className = "",
}: BadgeProps) {
  let styles =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

  if (variant === "risk" && risk) {
    styles += ` ${riskStyles[risk]}`;
  } else if (variant === "premium") {
    styles += " bg-brand-950/60 text-brand-400 border-brand-800";
  } else if (variant === "info") {
    styles += " bg-blue-900/30 text-blue-400 border-blue-800/60";
  } else if (variant === "success") {
    styles += " bg-green-900/30 text-green-400 border-green-800/60";
  } else if (variant === "warning") {
    styles += " bg-amber-900/30 text-amber-400 border-amber-800/60";
  } else {
    styles += " bg-surface-overlay text-ink-secondary border-border";
  }

  return (
    <span className={`${styles} ${className}`}>{children}</span>
  );
}
