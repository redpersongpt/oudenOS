// ─── Report Step ──────────────────────────────────────────────────────────────
// Transformation complete. Shows expert-grade summary of what changed and why.

import { motion } from "framer-motion";
import { Check, Shield, AlertTriangle, Lock } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

export function ReportStep() {
  const { executionResult, resolvedPlaybook, detectedProfile } = useWizardStore();
  const result = executionResult ?? { applied: 0, failed: 0, skipped: 0, preserved: 0 };
  const pb = resolvedPlaybook;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 }}
        className="relative flex h-14 w-14 items-center justify-center"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
          className="absolute inset-0 rounded-full bg-success-500/20"
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success-500/30 bg-success-500/10">
          <Check className="h-7 w-7 text-success-400" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-[18px] font-bold text-ink">Transformation Complete</h2>
        <p className="mt-1 text-[11px] text-ink-secondary">
          Your {detectedProfile?.label ?? "system"} has been optimized
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        {[
          { value: result.applied, label: "Applied", color: "text-success-400", icon: Check },
          { value: result.failed, label: "Failed", color: result.failed > 0 ? "text-danger-400" : "text-ink-muted", icon: AlertTriangle },
          { value: result.preserved, label: "Preserved", color: "text-ink-secondary", icon: Shield },
        ].map(({ value, label, color, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3"
          >
            <Icon className={`h-3.5 w-3.5 ${color} mb-0.5`} />
            <span className={`font-mono-metric text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-[10px] text-ink-muted">{label}</span>
          </motion.div>
        ))}
      </div>

      {/* Intelligent summary */}
      {pb && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-md space-y-1.5"
        >
          {/* What was included */}
          <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-success-400" />
            <p className="text-[10px] leading-relaxed text-ink-secondary">
              <span className="font-semibold text-ink">{pb.totalIncluded} actions</span> applied across {pb.phases.length} categories — privacy hardening, performance optimization, shell cleanup, and bloatware removal.
            </p>
          </div>

          {/* What was preserved */}
          {pb.totalBlocked > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{pb.totalBlocked} actions preserved</span>
                {detectedProfile?.isWorkPc
                  ? " — business-critical services (printing, RDP, Group Policy) were protected for your Work PC."
                  : " — profile-specific safety rules prevented incompatible changes."}
              </p>
            </div>
          )}

          {/* Expert-only actions skipped */}
          {pb.totalExpertOnly > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-purple-400" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{pb.totalExpertOnly} expert-only actions</span> were available but not included by default — these require manual opt-in for advanced users.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Trust footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-[10px] text-ink-muted"
      >
        A rollback snapshot was created before every change · All transformations are reversible
      </motion.p>
    </motion.div>
  );
}
