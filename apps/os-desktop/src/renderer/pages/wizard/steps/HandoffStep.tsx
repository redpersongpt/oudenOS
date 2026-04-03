// Handoff Step — final: handoff to Ouden.Tuning

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
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      <Zap className="h-8 w-8 text-[var(--accent)]" />

      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">READY</h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">YOUR WINDOWS IS CLEAN</p>
      </div>

      {/* Tuning features */}
      <div className="w-full max-w-sm border border-[var(--border)] bg-[var(--surface)] rounded-sm p-4">
        <div className="mb-3 nd-label text-[var(--accent)]">OUDEN.TUNING</div>
        {TUNING_FEATURES.map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.04, duration: 0.2, ease: ND_EASE }}
            className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0"
          >
            <div className="w-2 h-px bg-[var(--accent)] shrink-0" />
            <span className="nd-label-sm text-[var(--text-secondary)]">{feature}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => platform().shell.openExternal("https://ouden.cc/redcore-tuning")}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--text-display)] px-6 py-2.5 rounded-sm font-mono text-label tracking-label uppercase transition-colors duration-150 ease-nd hover:bg-[var(--accent)]"
        >
          <Zap className="h-3.5 w-3.5" />
          OPEN TUNING
        </button>
        <button
          onClick={() => platform().window.close()}
          className="px-6 py-2.5 border border-[var(--border)] rounded-sm font-mono text-label tracking-label text-[var(--text-secondary)] uppercase transition-colors duration-150 ease-nd hover:bg-[var(--surface)]"
        >
          CLOSE
        </button>
      </div>
    </motion.div>
  );
}
