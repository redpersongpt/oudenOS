// ─── Plan Step ────────────────────────────────────────────────────────────────
// Shows the full transformation plan: action counts by category,
// risk summary, and reboot requirement.

import { motion } from "framer-motion";
import { Trash2, Settings, EyeOff, Zap, AlertTriangle, RotateCcw } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { TransformationPlan } from "@/stores/wizard-store";

// ─── Mock plan (used when service is not connected) ───────────────────────────

const MOCK_PLAN: TransformationPlan = {
  totalActions:  47,
  byCategory: {
    cleanup:  14,
    tasks:    11,
    privacy:   9,
    startup:  13,
  },
  riskSummary:    "safe",
  rebootRequired: true,
};

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: typeof Trash2; color: string }> = {
  cleanup: { label: "Cleanup",         icon: Trash2,   color: "text-sky-400"     },
  tasks:   { label: "Scheduled Tasks", icon: Settings, color: "text-violet-400"  },
  privacy: { label: "Privacy",         icon: EyeOff,   color: "text-emerald-400" },
  startup: { label: "Startup",         icon: Zap,      color: "text-amber-400"   },
};

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: "safe" | "low" | "medium" }) {
  const styles = {
    safe:   "border-success-500/30 bg-success-500/10 text-success-400",
    low:    "border-amber-500/30 bg-amber-500/10 text-amber-400",
    medium: "border-danger-500/30 bg-danger-500/10 text-danger-400",
  };
  const labels = { safe: "Safe", low: "Low Risk", medium: "Medium Risk" };

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlanStep() {
  const { plan } = useWizardStore();
  const activePlan = plan ?? MOCK_PLAN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-neutral-100">Transformation Plan</h2>
        <p className="text-xs text-neutral-500">
          Review all planned changes before applying
        </p>
      </div>

      {/* Total count */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, delay: 0.06 }}
        className="flex flex-col items-center"
      >
        <span className="font-mono-metric text-5xl font-bold text-neutral-100">
          {activePlan.totalActions}
        </span>
        <span className="mt-1 text-xs text-neutral-500">total actions planned</span>
      </motion.div>

      {/* Category breakdown */}
      <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
        {Object.entries(activePlan.byCategory).map(([catId, count], i) => {
          const meta = CATEGORY_META[catId] ?? {
            label: catId,
            icon: Settings,
            color: "text-neutral-400",
          };
          const Icon = meta.icon;

          return (
            <motion.div
              key={catId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.1 + i * 0.05 }}
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-xs text-neutral-400">{meta.label}</span>
                <span className={`font-mono-metric text-sm font-semibold ${meta.color}`}>
                  {count}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Risk + reboot summary */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.25 }}
        className="flex w-full max-w-md items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-3"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-neutral-600" />
          <span className="text-xs text-neutral-500">Risk level</span>
          <RiskBadge level={activePlan.riskSummary} />
        </div>
        <div className="flex items-center gap-2.5">
          <RotateCcw className="h-4 w-4 text-neutral-600" />
          <span className="text-xs text-neutral-500">Reboot required</span>
          <span
            className={`text-xs font-medium ${
              activePlan.rebootRequired ? "text-amber-400" : "text-success-400"
            }`}
          >
            {activePlan.rebootRequired ? "Yes" : "No"}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
