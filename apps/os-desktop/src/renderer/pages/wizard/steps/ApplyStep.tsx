// ─── Apply Step ───────────────────────────────────────────────────────────────
// Confirm before executing. Summary + rollback assurance + Apply CTA.

import { motion } from "framer-motion";
import { Shield, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

const ASSURANCES = [
  {
    icon: Shield,
    title: "System snapshot created",
    detail: "A full rollback point is saved before any change is made",
  },
  {
    icon: RotateCcw,
    title: "Every action is reversible",
    detail: "Run rollback at any time to restore your previous configuration",
  },
  {
    icon: Zap,
    title: "No destructive operations",
    detail: "Files are never deleted — only disabled or reconfigured",
  },
];

export function ApplyStep() {
  const { plan, goNext } = useWizardStore();
  const totalActions = plan?.totalActions ?? 47;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-7 px-8"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-neutral-100">Ready to Apply</h2>
        <p className="text-xs text-neutral-500">
          {totalActions} actions will be applied to your system
        </p>
      </div>

      {/* Assurances */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        {ASSURANCES.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.08 + i * 0.07 }}
              className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/10">
                <Icon className="h-3.5 w-3.5 text-brand-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-200">{item.title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-neutral-600">
                  {item.detail}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.28 }}
        className="flex flex-col items-center gap-2"
      >
        <Button variant="primary" size="lg" onClick={goNext}>
          Apply Transformations
        </Button>
        <p className="text-[11px] text-neutral-700">
          This will take a few minutes. Do not shut down your computer.
        </p>
      </motion.div>
    </motion.div>
  );
}
