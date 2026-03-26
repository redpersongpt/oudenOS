// ─── Welcome Step ─────────────────────────────────────────────────────────────
// Hero screen: LogoHero + product name + tagline + Begin Assessment CTA.
// Compact, centered, no scrolling.

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LogoHero } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

export function WelcomeStep() {
  const { goNext } = useWizardStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-8 px-8"
    >
      {/* Logo hero */}
      <LogoHero size={72} />

      {/* Text */}
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.08 }}
          className="text-2xl font-semibold tracking-tight text-neutral-100"
        >
          Welcome to redcore · OS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.13 }}
          className="max-w-xs text-sm leading-relaxed text-neutral-500"
        >
          In-place Windows transformation. Intelligent, reversible, and built for your machine.
        </motion.p>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.18 }}
      >
        <Button
          variant="primary"
          size="lg"
          onClick={goNext}
          icon={<ArrowRight className="h-4 w-4" />}
          iconPosition="right"
        >
          Begin Assessment
        </Button>
      </motion.div>

      {/* Footnote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.28 }}
        className="text-[11px] text-neutral-700"
      >
        All changes are reversible. A snapshot is created before any modification.
      </motion.p>
    </motion.div>
  );
}
