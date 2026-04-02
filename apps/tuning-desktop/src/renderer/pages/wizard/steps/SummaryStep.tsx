// Summary Step
// Final review before BIOS guidance and execution.
// Grouped action list, risk summary, plan stats.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Shield,
  Layers,
  RotateCcw,
  Power,
} from "lucide-react";
import {
  spring,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { useTuningStore } from "@/stores/tuning-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { TuningCategory, RiskLevel } from "@redcore/shared-schema/tuning";

// Helpers

const RISK_ORDER: RiskLevel[] = ["safe", "low", "medium", "high", "extreme"];

function computeOverallRisk(risks: RiskLevel[]): RiskLevel {
  if (!risks.length) return "safe";
  const max = risks.reduce((a, b) =>
    RISK_ORDER.indexOf(b) > RISK_ORDER.indexOf(a) ? b : a
  );
  return max;
}

const CATEGORY_LABELS: Record<TuningCategory, string> = {
  cpu: "CPU", gpu: "GPU", memory: "Memory", storage: "Storage",
  network: "Network", power: "Power Plan", display: "Display",
  audio: "Audio", privacy: "Privacy", startup: "Startup",
  services: "Services", scheduler: "Scheduler", gaming: "Gaming",
  thermal: "Thermal", drivers: "Drivers", debloat: "Debloat", security: "Security",
};

// Stat card

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-tertiary" strokeWidth={1.5} />
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">{label}</p>
      </div>
      <p className="text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-tertiary">{sub}</p>}
    </motion.div>
  );
}

// Category group row

function CategoryGroup({ category, actions }: {
  category: TuningCategory;
  actions: Array<{ id: string; name: string; risk: RiskLevel; tier: "free" | "premium" }>;
}) {
  const [open, setOpen] = useState(false);
  const overallRisk = computeOverallRisk(actions.map((a) => a.risk));
  const hasPremium = actions.some((a) => a.tier === "premium");

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink">
            {CATEGORY_LABELS[category] ?? category}
          </span>
          <Badge variant="default">{actions.length} actions</Badge>
          <Badge variant={overallRisk === "safe" || overallRisk === "low" ? "success" : "warning"}>
            {overallRisk}
          </Badge>
          {hasPremium && <Badge variant="premium">Premium</Badge>}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy}>
          <ChevronDown className="h-4 w-4 text-ink-tertiary" strokeWidth={1.5} />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={spring.smooth}
        className="overflow-hidden"
      >
        <div className="border-t border-white/[0.05] divide-y divide-white/[0.04]">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-ink-secondary">{a.name}</span>
              <div className="flex items-center gap-2">
                {a.tier === "premium" && <Badge variant="premium" className="text-[10px]">Premium</Badge>}
                <Badge variant="risk" risk={a.risk}>{a.risk}</Badge>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Component

export function SummaryStep() {
  const { goNext, skipStep, currentStep } = useWizardStore();
  const { selectedActions } = useWizardStore();
  const plan = useTuningStore((s) => s.plan);

  const planActions = plan?.actions ?? [];
  const selected = planActions.filter((pa) =>
    selectedActions.includes(pa.actionId)
  );

  const totalCount   = selected.length;
  const freeCount    = selected.filter((a) => a.action.tier === "free").length;
  const premiumCount = selected.filter((a) => a.action.tier === "premium").length;
  const rebootNeeded = selected.some((a) => a.action.requiresReboot);
  const overallRisk  = computeOverallRisk(selected.map((a) => a.action.risk));

  // Group by category
  const grouped = selected.reduce<Record<string, typeof selected>>((acc, pa) => {
    const cat = pa.action.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pa);
    return acc;
  }, {});

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
            Step 10 — Advanced
          </p>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            Optimization Summary
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            Review your complete optimization plan before applying changes.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          <StatCard icon={Layers}     label="Total Actions"     value={totalCount} />
          <StatCard icon={Shield}     label="Free / Premium"    value={`${freeCount} / ${premiumCount}`} />
          <StatCard icon={Power}      label="Reboot Required"   value={rebootNeeded ? "Yes" : "No"} />
          <StatCard icon={RotateCcw}  label="Rollback"          value="High" sub="Full snapshot before apply" />
          <StatCard icon={AlertTriangle} label="Risk Level"     value={overallRisk.charAt(0).toUpperCase() + overallRisk.slice(1)} />
          <StatCard icon={RefreshCw}  label="Reversible"        value="100%" sub="All changes can be undone" />
        </motion.div>

        {/* Action groups */}
        {Object.keys(grouped).length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-3">
              Actions by Category
            </p>
            {Object.entries(grouped).map(([cat, actions]) => (
              <CategoryGroup
                key={cat}
                category={cat as TuningCategory}
                actions={actions.map((pa) => ({
                  id: pa.actionId,
                  name: pa.action.name,
                  risk: pa.action.risk,
                  tier: pa.action.tier,
                }))}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-8 text-center"
          >
            <p className="text-sm text-ink-tertiary">No actions selected. Go back to configure your optimization plan.</p>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center justify-between gap-3 pt-2">
          <Button variant="secondary" size="md" onClick={() => skipStep(currentStep)}>
            Skip to Apply
          </Button>
          <Button
            size="md"
            onClick={() => goNext()}
            icon={<ChevronRight className="h-4 w-4" />}
            iconPosition="right"
          >
            Proceed to BIOS Guidance
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
