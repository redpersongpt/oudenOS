// Premium Gate
// Aspirational premium gating. Each locked feature gets specific value copy
// that explains what the user gains — not a generic "upgrade to unlock" wall.
//
// UX principle: Premium should feel like deeper capability, not blocked access.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLicenseStore } from "@/stores/license-store";
import { Sparkles } from "lucide-react";
import { Button } from "./Button";
import { spring } from "@redcore/design-system";

// Feature-specific value propositions — what the user GAINS, not what's locked
const FEATURE_VALUE: Record<string, { title: string; description: string }> = {
  full_tuning_engine: {
    title: "Advanced Tuning Engine",
    description: "Unlock deep CPU scheduling, timer resolution, and kernel-level optimizations tailored to your hardware profile.",
  },
  advanced_benchmarks: {
    title: "Advanced Benchmarks",
    description: "Measure DPC latency, thread scheduling overhead, and storage IOPS to quantify every optimization.",
  },
  bios_guidance: {
    title: "BIOS Guidance",
    description: "Get hardware-specific BIOS recommendations for XMP, virtualization, and power management.",
  },
  intelligent_recommendations: {
    title: "Machine Intelligence",
    description: "AI-driven analysis of your hardware to recommend the optimal tuning strategy.",
  },
  advanced_rollback: {
    title: "Advanced Rollback",
    description: "Selective per-action restore, diff comparison, and configuration snapshots.",
  },
  personalization: {
    title: "System Personalization",
    description: "Dark mode, accent colors, taskbar cleanup, and shell customization matched to your profile.",
  },
};

const DEFAULT_VALUE = {
  title: "Premium Feature",
  description: "Unlock advanced optimizations and deeper system control.",
};

interface PremiumGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  onUpgrade?: () => void;
}

export function PremiumGate({
  feature,
  children,
  fallback,
  onUpgrade,
}: PremiumGateProps) {
  const canAccess = useLicenseStore((s) => s.canAccess);
  const navigate = useNavigate();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const value = FEATURE_VALUE[feature] ?? DEFAULT_VALUE;

  const handleUpgrade = onUpgrade ?? (() => navigate("/subscription"));

  return (
    <div className="relative isolate overflow-hidden rounded-xl">
      {/* Blurred preview — shows what's behind the gate */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(4px)", opacity: 0.15 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/80 to-surface"
        aria-hidden="true"
      />

      {/* Aspirational CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          className="flex max-w-xs flex-col items-center gap-4 text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.bounce, delay: 0.1 }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10"
          >
            <Sparkles className="h-5 w-5 text-brand-400" strokeWidth={1.5} />
          </motion.div>

          {/* Value copy */}
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-ink">{value.title}</p>
            <p className="text-[13px] leading-relaxed text-ink-secondary">
              {value.description}
            </p>
          </div>

          {/* CTA */}
          <Button
            variant="primary"
            size="md"
            onClick={handleUpgrade}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Unlock Premium
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
