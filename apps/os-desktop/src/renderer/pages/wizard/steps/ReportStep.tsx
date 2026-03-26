// ─── Report Step ──────────────────────────────────────────────────────────────
// Success state: checkmark animation + stats + "Open redcore-Tuning" CTA.

import { motion } from "framer-motion";
import { Check, ExternalLink, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color = "text-neutral-100",
  delay = 0,
}: {
  value: number;
  label: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0], delay }}
      className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-4"
    >
      <span className={`font-mono-metric text-3xl font-bold ${color}`}>{value}</span>
      <span className="text-[11px] text-neutral-600">{label}</span>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportStep() {
  const { executionResult } = useWizardStore();

  const result = executionResult ?? { applied: 47, failed: 0, skipped: 0, preserved: 5 };

  // Open redcore-Tuning (safe — would go through validated IPC in real build)
  const handleOpenTuning = () => {
    if (typeof window !== "undefined" && (window as unknown as { redcore?: { openApp?: (id: string) => void } }).redcore?.openApp) {
      (window as unknown as { redcore: { openApp: (id: string) => void } }).redcore.openApp("redcore-tuning");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-7 px-8"
    >
      {/* Checkmark */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 16, delay: 0.05 }}
        className="relative flex h-16 w-16 items-center justify-center"
      >
        {/* Glow ring */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
          className="absolute inset-0 rounded-full bg-success-500/20"
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-success-500/30 bg-success-500/10">
          <Check className="h-8 w-8 text-success-400" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.12 }}
        className="flex flex-col items-center gap-1.5 text-center"
      >
        <h2 className="text-xl font-semibold text-neutral-100">
          Transformation Complete
        </h2>
        <p className="text-xs text-neutral-500">
          Your Windows installation has been successfully optimised
        </p>
      </motion.div>

      {/* Stats */}
      <div className="flex gap-3">
        <StatCard
          value={result.applied}
          label="Actions Applied"
          color="text-success-400"
          delay={0.16}
        />
        <StatCard
          value={result.failed}
          label="Failed"
          color={result.failed > 0 ? "text-danger-400" : "text-neutral-600"}
          delay={0.2}
        />
        <StatCard
          value={result.skipped + result.preserved}
          label="Preserved"
          color="text-neutral-400"
          delay={0.24}
        />
      </div>

      {/* redcore-Tuning CTA */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.3 }}
        className="flex flex-col items-center gap-2"
      >
        <Button
          variant="secondary"
          size="md"
          onClick={handleOpenTuning}
          icon={<Zap className="h-4 w-4" />}
        >
          Open redcore-Tuning for Advanced Optimization
          <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
        </Button>
        <p className="text-[11px] text-neutral-700">
          Fine-tune every system parameter with granular control
        </p>
      </motion.div>
    </motion.div>
  );
}
