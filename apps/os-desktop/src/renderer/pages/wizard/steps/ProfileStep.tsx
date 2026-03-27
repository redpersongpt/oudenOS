import { motion } from "framer-motion";
import { Monitor, Briefcase } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

export function ProfileStep() {
  const { detectedProfile } = useWizardStore();
  const p = detectedProfile;

  if (!p) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[12px] text-ink-tertiary">No profile detected.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20"
      >
        <Monitor className="h-6 w-6 text-brand-400" />
      </motion.div>

      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">{p.machineName}</p>
        <h2 className="mt-1 text-[20px] font-bold text-ink">{p.label}</h2>
      </div>

      {/* Confidence */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-[10px]">
          <span className="text-ink-tertiary">Confidence</span>
          <span className="font-mono-metric text-brand-400">{p.confidence}%</span>
        </div>
        <div className="mt-1 relative h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${p.confidence}%` }}
            transition={{ duration: 0.6, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.15 }}
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {p.signals.map((s) => (
          <span key={s} className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-ink-secondary">
            {s}
          </span>
        ))}
      </div>

      {p.isWorkPc && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5 max-w-sm"
        >
          <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-[11px] font-semibold text-amber-300">Work PC Detected</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-amber-400/70">
              Business-critical services preserved. Aggressive optimizations blocked.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
