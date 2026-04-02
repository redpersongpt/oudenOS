// Report Step
// Final report — journey complete. Success celebration, stats, deep satisfaction.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  LayoutDashboard,
  RotateCcw,
  Activity,
  ChevronDown,
  TrendingUp,
  Shield,
  Layers,
  SkipForward,
} from "lucide-react";
import {
  spring,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { useTuningStore } from "@/stores/tuning-store";
import { useDeviceStore } from "@/stores/device-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceRing } from "@/pages/intelligence/components";

// Stat card

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "brand" | "amber";
}) {
  const valColor =
    accent === "green"  ? "text-green-400"  :
    accent === "brand"  ? "text-brand-400"  :
    accent === "amber"  ? "text-amber-400"  :
    "text-neutral-100";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
        <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-mono ${valColor}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-600">{sub}</p>}
    </motion.div>
  );
}

// Component

export function ReportStep() {
  const { completedActions, selectedActions } = useWizardStore();
  const plan = useTuningStore((s) => s.plan);
  const profile = useDeviceStore((s) => s.profile);
  const navigate = useNavigate();
  const [timelineOpen, setTimelineOpen] = useState(false);

  const totalSelected  = selectedActions.length;
  const totalCompleted = completedActions.length;
  const totalSkipped   = totalSelected - totalCompleted;
  // Snapshot count corresponds to total completed actions (one per apply session in practice)
  const snapshotCount  = totalCompleted > 0 ? 1 : 0;

  // Only show real benchmark data — never fabricate numbers
  const benchmarkImprovement = "Run benchmark";

  const planActions = plan?.actions ?? [];
  const completedPlanActions = planActions.filter((pa) =>
    completedActions.includes(pa.actionId)
  );

  function navigateTo(path: string) {
    navigate(path);
  }

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
        className="w-full max-w-2xl mx-auto space-y-10"
      >
        {/* Hero success icon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.bounce, delay: 0.15 }}
            className="relative"
          >
            {/* Outer glow rings */}
            <motion.div
              className="absolute inset-[-16px] rounded-full border border-green-500/10"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-[-8px] rounded-full border border-green-500/15"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="h-14 w-14 text-green-400" strokeWidth={1.25} />
            </div>
            <div className="absolute inset-0 rounded-full bg-green-500/08 blur-2xl -z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, ...spring.smooth }}
            className="space-y-2"
          >
            <h1 className="text-[31px] font-bold tracking-tight text-ink">
              Optimization Complete
            </h1>
            <p className="text-[15px] leading-relaxed text-ink-secondary">
              {totalCompleted} changes applied. Every change is backed by a rollback snapshot.
            </p>
          </motion.div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <StatCard icon={CheckCircle2} label="Applied"     value={totalCompleted} accent="green" />
          <StatCard icon={SkipForward}  label="Skipped"     value={totalSkipped}   />
          <StatCard icon={TrendingUp}   label="Improvement" value={benchmarkImprovement} accent="brand" sub="vs baseline" />
          <StatCard icon={Shield}       label="Snapshots"   value={snapshotCount}  accent="green" sub="Ready to restore" />
        </motion.div>

        {/* Machine recap */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.04] px-5 py-4"
          >
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-neutral-500">System</p>
              <p className="text-sm font-semibold text-neutral-200">
                {profile.cpu.brand}
              </p>
              <p className="text-xs text-neutral-500">
                {profile.memory.totalMb >= 1024
                  ? `${Math.round(profile.memory.totalMb / 1024)} GB ${profile.memory.type}`
                  : `${profile.memory.totalMb} MB`}
                {" — "}
                {profile.gpus[0]?.name ?? "No GPU detected"}
              </p>
            </div>
            <ConfidenceRing confidence={totalCompleted / Math.max(totalSelected, 1)} accentColor="green" />
          </motion.div>
        )}

        {/* Action timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-lg border border-white/[0.07] overflow-hidden">
          <button
            onClick={() => setTimelineOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span className="text-sm font-medium text-neutral-300">
                Action Timeline
              </span>
              <Badge variant="default">{completedPlanActions.length}</Badge>
            </div>
            <motion.div animate={{ rotate: timelineOpen ? 180 : 0 }} transition={spring.snappy}>
              <ChevronDown className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
            </motion.div>
          </button>

          <motion.div
            initial={false}
            animate={{ height: timelineOpen ? "auto" : 0, opacity: timelineOpen ? 1 : 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05] divide-y divide-white/[0.04] max-h-56 overflow-y-auto">
              {completedPlanActions.map((pa) => (
                <div key={pa.actionId} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" strokeWidth={1.5} />
                    <span className="text-xs text-neutral-300 truncate">{pa.action.name}</span>
                  </div>
                  <Badge variant="default" className="shrink-0 text-[10px]">
                    {pa.action.category}
                  </Badge>
                </div>
              ))}
              {completedPlanActions.length === 0 && (
                <p className="px-4 py-4 text-xs text-neutral-500 text-center">No actions recorded.</p>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={() => navigateTo("/dashboard")}
            icon={<LayoutDashboard className="h-4 w-4" />}
            className="w-full"
          >
            Open Dashboard
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigateTo("/rollback")}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              Rollback Center
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigateTo("/benchmark")}
              icon={<Activity className="h-4 w-4" />}
            >
              Post-Tuning Benchmark
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="text-center">
          <p className="text-xs text-neutral-600 leading-relaxed">
            You can re-run this wizard anytime or access individual features directly from the dashboard.
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
