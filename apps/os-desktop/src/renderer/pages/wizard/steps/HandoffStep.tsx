// ─── Handoff Step ────────────────────────────────────────────────────────────
// Final step: handoff to redcore-Tuning for advanced per-component optimization.

import { motion } from "framer-motion";
import { Zap, ExternalLink, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

const TUNING_FEATURES = [
  "Per-component CPU, GPU, and memory tuning",
  "Benchmark Lab with before/after comparison",
  "One-click Rollback Center",
  "Guided overclocking and undervolting",
  "Timer resolution and latency optimization",
];

export function HandoffStep() {
  const handleOpenTuning = () => {
    const win = window as unknown as { redcore?: { shell?: { openExternal: (url: string) => void } } };
    if (win.redcore?.shell) {
      win.redcore.shell.openExternal("https://redcoreos.net/redcore-tuning");
    }
  };

  const handleClose = () => {
    const win = window as unknown as {
      redcore?: { window?: { close: () => void } };
    };
    win.redcore?.window?.close();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 16 }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/10"
      >
        <Zap className="h-7 w-7 text-brand-400" />
      </motion.div>

      {/* Heading */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-ink">Your OS Is Ready</h2>
        <p className="max-w-sm text-xs text-ink-secondary">
          redcore-OS has optimized your Windows installation. For advanced per-component tuning, continue with redcore-Tuning.
        </p>
      </div>

      {/* Feature list */}
      <div className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-brand-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
            redcore-Tuning
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {TUNING_FEATURES.map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: 0.1 + i * 0.04 }}
              className="flex items-start gap-2"
            >
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-brand-400/60" />
              <span className="text-[11px] text-ink-secondary">{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleOpenTuning}
          icon={<Zap className="h-4 w-4" />}
        >
          Open redcore-Tuning
          <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
        </Button>
        <Button variant="secondary" size="md" onClick={handleClose}>
          Close Installer
        </Button>
      </div>
    </motion.div>
  );
}
