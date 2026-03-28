import { motion } from "framer-motion";
import { ArrowRight, Shield, Cpu, Sparkles } from "lucide-react";
import { LogoHero } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

const FEATURES = [
  { icon: Shield, text: "Privacy hardening" },
  { icon: Cpu, text: "Performance optimization" },
  { icon: Sparkles, text: "System cleanup" },
];

export function WelcomeStep() {
  const { goNext } = useWizardStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center px-10"
    >
      <LogoHero size={56} />

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.35 }}
        className="mt-6 text-[24px] font-bold tracking-tight text-ink"
      >
        redcore · OS
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="mt-2 max-w-xs text-center text-[13px] leading-relaxed text-ink-secondary"
      >
        In-place Windows transformation.
        <br />Intelligent, reversible, built for your machine.
      </motion.p>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="mt-5 flex gap-2"
      >
        {FEATURES.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 + i * 0.06 }}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5"
          >
            <Icon className="h-3 w-3 text-brand-400" />
            <span className="text-[10px] font-medium text-ink-secondary">{text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-8"
      >
        <Button variant="primary" size="lg" onClick={goNext} icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
          Begin Assessment
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mt-5 text-[10px] text-ink-muted"
      >
        All changes are reversible · A snapshot is created before any modification
      </motion.p>
    </motion.div>
  );
}
