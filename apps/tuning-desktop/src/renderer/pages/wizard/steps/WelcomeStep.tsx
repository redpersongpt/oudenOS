// Welcome Step
// The product's first impression. Must communicate:
// 1. What this is (precision performance optimizer)
// 2. Why it's trustworthy (reversible, guided, intelligent)
// 3. Clear next action (begin)
//
// UX north star: "This tool understands your machine and will guide you safely."

import { motion } from "framer-motion";
import { Shield, RotateCcw, Cpu } from "lucide-react";
import { spring } from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { LogoHero } from "@/components/brand/Logo";

const TRUST_SIGNALS = [
  { icon: Cpu, label: "Machine-aware", detail: "Adapts to your hardware" },
  { icon: RotateCcw, label: "Reversible", detail: "Every change has a rollback" },
  { icon: Shield, label: "Safe by default", detail: "Only proven optimizations" },
] as const;

export function WelcomeStep() {
  const goNext = useWizardStore((s) => s.goNext);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col items-center justify-center px-8"
    >
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Logo with entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.bounce, delay: 0.1 }}
        >
          <LogoHero size={72} />
        </motion.div>

        {/* Display heading — the largest type in the product */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.2, 0, 0, 1] }}
          className="mt-6 text-[31px] font-bold leading-tight tracking-tight text-ink"
        >
          Precision performance,
          <br />
          <span className="text-brand-400">tailored to your machine.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.2, 0, 0, 1] }}
          className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-secondary"
        >
          We scan your hardware, build a profile, and apply only safe,
          reversible optimizations. Every change is backed by a rollback
          snapshot.
        </motion.p>

        {/* Trust signals — three pillars */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.2, 0, 0, 1] }}
          className="mt-8 flex w-full gap-3"
        >
          {TRUST_SIGNALS.map(({ icon: Icon, label, detail }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.3 }}
              className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                <Icon className="h-4 w-4 text-brand-400" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-semibold text-ink">{label}</p>
              <p className="text-[11px] leading-snug text-ink-tertiary">{detail}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA — owns the bottom of the content */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.65 }}
          whileHover={{ y: -1, transition: spring.gentle }}
          whileTap={{ scale: 0.98 }}
          onClick={goNext}
          className="mt-8 w-full max-w-xs rounded-lg bg-brand-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-500/20 transition-shadow hover:shadow-xl hover:shadow-brand-500/30"
        >
          Begin Optimization
        </motion.button>
      </div>
    </motion.div>
  );
}
