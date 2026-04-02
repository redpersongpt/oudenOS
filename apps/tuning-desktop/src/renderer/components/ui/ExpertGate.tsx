import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useLicenseStore } from "@/stores/license-store";
import { Button } from "./Button";
import { scaleUp } from "@redcore/design-system";

// ExpertGate
// Locks expert/advanced features behind a gate. Shows blurred content with an
// upgrade CTA overlay when the user doesn't have the required access.
//
// Usage:
//   <ExpertGate feature="advanced_tweaks" label="Advanced CPU Scheduler">
//     <AdvancedControls />
//   </ExpertGate>

interface ExpertGateProps {
  /** Feature key to check against FEATURE_GATES */
  feature: string;
  /** Short label shown in the gate overlay (e.g. "Advanced CPU Scheduler") */
  label?: string;
  /** Optional description shown under the label */
  description?: string;
  children: ReactNode;
  /** Render nothing instead of a blurred preview when locked */
  hideContent?: boolean;
  /** Called when the CTA is pressed — override to route to upgrade flow */
  onUpgrade?: () => void;
}

export function ExpertGate({
  feature,
  label = "Expert Feature",
  description = "Unlock advanced tuning controls with a Premium license.",
  children,
  hideContent = false,
  onUpgrade,
}: ExpertGateProps) {
  const canAccess = useLicenseStore((s) => s.canAccess);

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  if (hideContent) {
    return (
      <GateOverlay
        label={label}
        description={description}
        onUpgrade={onUpgrade}
      />
    );
  }

  return (
    <div className="relative isolate">
      {/* Blurred preview — pointer-events disabled so nothing is clickable */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(3px)", opacity: 0.35 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Gradient fade over the blur */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/60 to-surface"
        aria-hidden="true"
      />

      {/* Gate overlay — centered CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <motion.div
          variants={scaleUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised border border-border shadow-none">
            <ShieldAlert className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">{label}</p>
            <p className="text-xs text-ink-secondary max-w-[240px] leading-relaxed">
              {description}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onUpgrade}
          >
            Upgrade to Premium
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// Standalone gate overlay (no blurred preview)

function GateOverlay({
  label,
  description,
  onUpgrade,
}: {
  label: string;
  description: string;
  onUpgrade?: () => void;
}) {
  return (
    <motion.div
      variants={scaleUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-surface p-8 text-center shadow-none"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-raised border border-border shadow-none">
        <ShieldAlert className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-secondary max-w-[280px] leading-relaxed">
          {description}
        </p>
      </div>

      <Button variant="primary" size="sm" onClick={onUpgrade}>
        Upgrade to Premium
      </Button>
    </motion.div>
  );
}
