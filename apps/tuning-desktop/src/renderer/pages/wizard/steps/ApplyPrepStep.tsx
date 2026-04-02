// Apply Prep Step
// Confirm before running — snapshot assurance, plan review, final warnings.

import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Clock,
  Power,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useTuningStore } from "@/stores/tuning-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Summary stat row

function SummaryRow({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: "green" | "amber" | "neutral";
}) {
  const valueColor =
    accent === "green"  ? "text-green-400" :
    accent === "amber"  ? "text-amber-400" :
    "text-ink";

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-ink-tertiary shrink-0" strokeWidth={1.5} />
        <span className="text-sm text-ink-secondary">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

// Component

export function ApplyPrepStep() {
  const { goNext, goBack, selectedActions } = useWizardStore();
  const plan = useTuningStore((s) => s.plan);

  const planActions = plan?.actions ?? [];
  const selected = planActions.filter((pa) => selectedActions.includes(pa.actionId));

  const totalCount     = selected.length;
  const rebootCount    = selected.filter((a) => a.action.requiresReboot).length;
  const highRiskCount  = selected.filter(
    (a) => a.action.risk === "high" || a.action.risk === "extreme"
  ).length;
  const hasHighRisk    = highRiskCount > 0;

  // Rough estimate: ~2s per action + 10s snapshot overhead
  const estimatedSecs  = totalCount * 2 + 10;
  const estimatedLabel = estimatedSecs < 60
    ? `~${estimatedSecs} seconds`
    : `~${Math.ceil(estimatedSecs / 60)} minute${Math.ceil(estimatedSecs / 60) > 1 ? "s" : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-10 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Step 12 — Execute
          </p>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            Ready to Apply
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            Review and confirm your optimization plan.
          </p>
        </motion.div>

        {/* Summary panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-5 divide-y divide-white/[0.05]"
        >
          <SummaryRow
            icon={Shield}
            label="Actions to apply"
            value={`${totalCount} optimizations`}
            accent="neutral"
          />
          <SummaryRow
            icon={RotateCcw}
            label="Rollback snapshot"
            value="Will be created"
            accent="green"
          />
          <SummaryRow
            icon={Power}
            label="Reboot required"
            value={rebootCount > 0 ? `Yes — ${rebootCount} action${rebootCount > 1 ? "s" : ""}` : "Not required"}
            accent={rebootCount > 0 ? "amber" : "green"}
          />
          <SummaryRow
            icon={Clock}
            label="Estimated time"
            value={estimatedLabel}
            accent="neutral"
          />
        </motion.div>

        {/* High-risk warning */}
        {hasHighRisk && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="flex items-start gap-3 rounded-lg border border-amber-700/40 bg-amber-900/10 px-4 py-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-300">
                {highRiskCount} high-risk action{highRiskCount > 1 ? "s" : ""} selected
              </p>
              <p className="text-xs leading-relaxed text-amber-500">
                These changes carry elevated risk. They are fully reversible via the Rollback Center,
                but review them carefully before proceeding.
              </p>
            </div>
          </motion.div>
        )}

        {/* Rollback assurance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex items-start gap-3 rounded-lg border border-green-800/30 bg-green-900/10 px-4 py-4"
        >
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-green-400" strokeWidth={1.5} />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-green-300">
              Full rollback protection enabled
            </p>
            <p className="text-xs leading-relaxed text-green-600">
              A complete system snapshot will be created before any changes are written.
              You can restore to this exact state from the Rollback Center at any time.
            </p>
          </div>
        </motion.div>

        {/* Action cards summary */}
        {selected.length > 0 && (
          <motion.div
            
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2"
          >
            {selected.slice(0, 4).map((pa) => (
              <motion.div
                key={pa.actionId}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 flex items-center justify-between gap-2 min-w-0"
              >
                <span className="text-xs text-ink-secondary truncate">{pa.action.name}</span>
                <Badge variant="risk" risk={pa.action.risk} className="shrink-0">{pa.action.risk}</Badge>
              </motion.div>
            ))}
            {selected.length > 4 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 col-span-2 text-center"
              >
                <span className="text-xs text-ink-tertiary">
                  + {selected.length - 4} more action{selected.length - 4 > 1 ? "s" : ""}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            onClick={() => goNext()}
            icon={<ChevronRight className="h-4 w-4" />}
            iconPosition="right"
            className="w-full"
          >
            Apply All Changes
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => goBack()}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="w-full"
          >
            Go Back and Review
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
