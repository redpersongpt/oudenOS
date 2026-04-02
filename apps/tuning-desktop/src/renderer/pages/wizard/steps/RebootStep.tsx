// Reboot Step
// Reboot / resume flow. Shows pending reboot actions or auto-advances.

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Power, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";
import {
  spring,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { useTuningStore } from "@/stores/tuning-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Component

export function RebootStep() {
  const { goNext } = useWizardStore();
  const { selectedActions } = useWizardStore();
  const plan = useTuningStore((s) => s.plan);

  const planActions = plan?.actions ?? [];
  const rebootActions = planActions.filter(
    (pa) => selectedActions.includes(pa.actionId) && pa.action.requiresReboot
  );

  const needsReboot = rebootActions.length > 0;

  // If no reboot needed, auto-advance after brief display
  useEffect(() => {
    if (!needsReboot) {
      const t = setTimeout(() => goNext(), 2400);
      return () => clearTimeout(t);
    }
  }, [needsReboot, goNext]);

  async function handleRebootNow() {
    await window.redcore.service.call("system.requestReboot", {
      reason: "wizard_execution_complete",
    });
  }

  // No reboot needed

  if (!needsReboot) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex min-h-full flex-col items-center justify-center px-10 py-12"
      >
        <motion.div
          
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.bounce, delay: 0.1 }}
            className="relative"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/25">
              <CheckCircle2 className="h-10 w-10 text-green-400" strokeWidth={1.25} />
            </div>
            <div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl -z-10" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
            <h2 className="text-[26px] font-bold text-ink">No Reboot Required</h2>
            <p className="text-[14px] text-ink-secondary leading-relaxed">
              All changes have been applied without requiring a restart.
              Continuing to your optimization report.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-ink-tertiary"
          >
            Advancing automatically...
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Reboot needed

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-10 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Step 14 — Execute
          </p>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            Reboot Required
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            Some changes need a system restart to take effect.
          </p>
        </motion.div>

        {/* Actions requiring reboot */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
            Pending after reboot
          </p>
          <motion.div
            
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {rebootActions.map((pa) => (
              <motion.div
                key={pa.actionId}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.04] px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Power className="h-3.5 w-3.5 text-amber-400 shrink-0" strokeWidth={1.5} />
                  <span className="text-sm text-ink truncate">{pa.action.name}</span>
                </div>
                <Badge variant="warning" className="shrink-0">Reboot</Badge>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* What will happen */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
            What happens next
          </p>
          <div className="space-y-2">
            {[
              "System will restart and all pending changes will finalise.",
              "Ouden.Tuning will launch automatically after restart.",
              "The wizard will resume from this point and complete your report.",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[10px] font-semibold text-ink-secondary">
                  {i + 1}
                </span>
                <p className="text-sm text-ink-secondary leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Journal state indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex items-center gap-3 rounded-lg border border-blue-800/30 bg-blue-900/10 px-4 py-3"
        >
          <RotateCcw className="h-4 w-4 text-blue-400 shrink-0" strokeWidth={1.5} />
          <p className="text-xs text-blue-400 leading-relaxed">
            Wizard state is saved to the journal. Your progress will not be lost across the restart.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            onClick={handleRebootNow}
            icon={<Power className="h-4 w-4" />}
            className="w-full"
          >
            Reboot Now
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => goNext()}
            icon={<ArrowRight className="h-4 w-4" />}
            iconPosition="right"
            className="w-full"
          >
            Reboot Later — Continue to Report
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
