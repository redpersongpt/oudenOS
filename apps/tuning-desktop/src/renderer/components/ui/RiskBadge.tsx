import type { RiskLevel } from "@redcore/shared-schema/tuning";

// RiskBadge
// Standalone badge for tuning action risk levels.
// Consistent dot indicator + label, readable on dark surfaces.

interface RiskBadgeProps {
  risk: RiskLevel;
  className?: string;
  /** Show only the dot — useful in tight spaces */
  dotOnly?: boolean;
}

const config: Record<
  RiskLevel,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  safe: {
    label: "Safe",
    dot:   "bg-green-400",
    text:  "text-green-400",
    bg:    "bg-green-900/20",
    border: "border-green-800/50",
  },
  low: {
    label: "Low",
    dot:   "bg-yellow-400",
    text:  "text-yellow-400",
    bg:    "bg-yellow-900/20",
    border: "border-yellow-800/50",
  },
  medium: {
    label: "Medium",
    dot:   "bg-amber-400",
    text:  "text-amber-400",
    bg:    "bg-amber-900/25",
    border: "border-amber-700/60",
  },
  high: {
    label: "High",
    dot:   "bg-red-400",
    text:  "text-red-400",
    bg:    "bg-red-950/60",
    border: "border-red-800",
  },
  extreme: {
    label: "Extreme",
    dot:   "bg-brand-300",
    text:  "text-brand-300",
    bg:    "bg-brand-950/80",
    border: "border-brand-700",
  },
};

export function RiskBadge({ risk, className = "", dotOnly = false }: RiskBadgeProps) {
  const c = config[risk];

  if (dotOnly) {
    return (
      <span
        className={`inline-block h-2 w-2 rounded-full ${c.dot} ${className}`}
        title={c.label}
        aria-label={`Risk level: ${c.label}`}
      />
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5
        text-xs font-medium
        ${c.bg} ${c.text} ${c.border}
        ${className}
      `}
      aria-label={`Risk level: ${c.label}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${c.dot} shrink-0`}
        aria-hidden="true"
      />
      {c.label}
    </span>
  );
}
