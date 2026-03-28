// ─── ImpactPreview ───────────────────────────────────────────────────────────
// Displays estimated before/after comparison per optimization category.

import { motion } from "framer-motion";
import type { ImpactEstimate, OptimizationCategory } from "../types.js";

const CATEGORY_ICONS: Record<OptimizationCategory, string> = {
  cpu:       "⚡",
  gpu:       "🎮",
  memory:    "💾",
  storage:   "💽",
  network:   "🌐",
  security:  "🛡",
  startup:   "🚀",
  services:  "⚙️",
  power:     "🔋",
  scheduler: "📊",
};

const CATEGORY_LABELS: Record<OptimizationCategory, string> = {
  cpu:       "CPU Scheduling",
  gpu:       "GPU Config",
  memory:    "Memory",
  storage:   "Storage",
  network:   "Network",
  security:  "Security",
  startup:   "Startup",
  services:  "Services",
  power:     "Power Plan",
  scheduler: "Scheduler",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high:   "High confidence",
  medium: "Medium confidence",
  low:    "Low confidence",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   "text-green-400",
  medium: "text-amber-400",
  low:    "text-ink-muted",
};

// ─── Impact Bar ───────────────────────────────────────────────────────────────

interface ImpactBarProps {
  percent: number;
  confidence: "high" | "medium" | "low";
  delay: number;
}

function ImpactBar({ percent, confidence, delay }: ImpactBarProps) {
  const color =
    confidence === "high" ? "bg-green-500" :
    confidence === "medium" ? "bg-brand-500" : "bg-white/20";

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent * 2, 100)}%` }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay }}
        />
      </div>
      <span className="w-10 text-right text-[11px] font-mono font-semibold text-ink">
        +{percent}%
      </span>
    </div>
  );
}

// ─── Impact Card ──────────────────────────────────────────────────────────────

interface ImpactCardProps {
  estimate: ImpactEstimate;
  index: number;
}

function ImpactCard({ estimate, index }: ImpactCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{CATEGORY_ICONS[estimate.category]}</span>
          <span className="text-[12px] font-semibold text-ink">
            {CATEGORY_LABELS[estimate.category]}
          </span>
        </div>
        <span className={`text-[10px] ${CONFIDENCE_COLORS[estimate.confidence]}`}>
          {CONFIDENCE_LABELS[estimate.confidence]}
        </span>
      </div>

      {/* Impact bar */}
      <ImpactBar
        percent={estimate.estimatedGainPercent}
        confidence={estimate.confidence}
        delay={index * 0.05 + 0.2}
      />

      {/* Metrics */}
      <div className="flex flex-wrap gap-1">
        {estimate.metrics.map((m) => (
          <span key={m} className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.03] text-ink-tertiary border border-white/[0.05]">
            {m}
          </span>
        ))}
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
          <p className="text-[9px] font-semibold text-ink-muted mb-1">BEFORE</p>
          <p className="text-[10px] text-ink-secondary leading-relaxed">{estimate.beforeDesc}</p>
        </div>
        <div className="rounded-lg border border-brand-500/20 bg-brand-500/[0.04] px-3 py-2">
          <p className="text-[9px] font-semibold text-brand-400 mb-1">AFTER</p>
          <p className="text-[10px] text-ink-secondary leading-relaxed">{estimate.afterDesc}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ImpactPreview ───────────────────────────────────────────────────────

interface ImpactPreviewProps {
  estimates: ImpactEstimate[];
  className?: string;
}

export function ImpactPreview({ estimates, className = "" }: ImpactPreviewProps) {
  if (estimates.length === 0) {
    return (
      <div className={`text-center py-8 text-[12px] text-ink-muted ${className}`}>
        Enable recommendations to see impact estimates
      </div>
    );
  }

  const totalImpact = estimates.reduce((sum, e) => sum + e.estimatedGainPercent, 0);
  const avgImpact = Math.round(totalImpact / estimates.length);
  const topCategories = estimates.slice(0, 3).map((e) => CATEGORY_LABELS[e.category]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.04] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-ink">
              Estimated Performance Gain
            </p>
            <p className="text-[11px] text-ink-tertiary mt-0.5">
              Across {estimates.length} optimized categories · Top: {topCategories.join(", ")}
            </p>
          </div>
          <div className="text-right">
            <motion.p
              className="text-3xl font-bold text-brand-400"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            >
              +{Math.min(totalImpact, 50)}%
            </motion.p>
            <p className="text-[10px] text-ink-muted">max estimate</p>
          </div>
        </div>

        {/* Overall bar */}
        <div className="mt-3">
          <div className="relative h-2 overflow-hidden rounded-full bg-brand-500/10">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(avgImpact * 2, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Per-category cards */}
      <div className="space-y-3">
        {estimates.map((est, i) => (
          <ImpactCard key={est.category} estimate={est} index={i} />
        ))}
      </div>

      <p className="text-[10px] text-ink-disabled text-center">
        Estimates are based on typical hardware configurations. Actual results vary by workload.
      </p>
    </div>
  );
}
