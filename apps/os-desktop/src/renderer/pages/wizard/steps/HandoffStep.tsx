// Handoff Step — final: handoff to redcore Tuning

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { platform } from "@/lib/platform";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

const TUNING_FEATURES = [
  "PER-COMPONENT CPU, GPU, AND MEMORY TUNING",
  "BENCHMARK LAB WITH BEFORE/AFTER",
  "ONE-CLICK ROLLBACK CENTER",
  "GUIDED OVERCLOCKING AND UNDERVOLTING",
  "TIMER RESOLUTION AND LATENCY OPTIMIZATION",
];

export function HandoffStep() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-nd-bg"
    >
      <Zap className="h-8 w-8 text-brand-500" />

      <div className="text-center">
        <h2 className="font-display text-title text-nd-text-display">READY</h2>
        <p className="mt-2 nd-label text-nd-text-secondary">YOUR WINDOWS IS CLEAN</p>
      </div>

      {/* Tuning features */}
      <div className="w-full max-w-sm border border-nd-border bg-nd-surface rounded-sm p-4">
        <div className="mb-3 nd-label text-brand-500">REDCORE TUNING</div>
        {TUNING_FEATURES.map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.04, duration: 0.2, ease: ND_EASE }}
            className="flex items-center gap-3 py-1.5 border-b border-nd-border-subtle last:border-0"
          >
            <div className="w-2 h-px bg-brand-500 shrink-0" />
            <span className="nd-label-sm text-nd-text-secondary">{feature}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => platform().shell.openExternal("https://redcoreos.net/redcore-tuning")}
          className="flex items-center gap-2 bg-brand-500 text-nd-text-display px-6 py-2.5 rounded-sm font-mono text-label tracking-label uppercase transition-colors duration-150 ease-nd hover:bg-brand-400"
        >
          <Zap className="h-3.5 w-3.5" />
          OPEN TUNING
        </button>
        <button
          onClick={() => platform().window.close()}
          className="px-6 py-2.5 border border-nd-border rounded-sm font-mono text-label tracking-label text-nd-text-secondary uppercase transition-colors duration-150 ease-nd hover:bg-nd-surface"
        >
          CLOSE
        </button>
      </div>
    </motion.div>
  );
}
