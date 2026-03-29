// ─── Reboot / Resume Step ────────────────────────────────────────────────────
// If any executed action requires reboot, shows restart prompt.
// Auto-skips if no reboot is needed.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

interface JournalState {
  requiresReboot: boolean;
  canResume: boolean;
  steps: { status: string }[];
}

export function RebootResumeStep() {
  const { resolvedPlaybook, skipStep, completeStep } = useWizardStore();
  const [resuming, setResuming] = useState(false);

  // Check if any included action requires reboot
  const needsReboot = resolvedPlaybook?.phases.some((phase) =>
    phase.actions.some((a) => a.status === "Included" && a.requiresReboot)
  ) ?? false;

  // Auto-skip if no reboot needed
  useEffect(() => {
    if (!needsReboot) {
      const t = setTimeout(() => skipStep("reboot-resume"), 150);
      return () => clearTimeout(t);
    }
  }, [needsReboot, skipStep]);

  if (!needsReboot) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleRestart = async () => {
    const { serviceCall } = await import("@/lib/service");
    await serviceCall("system.reboot", { reason: "playbook-reboot-required" });
  };

  const handleSkip = () => {
    completeStep("reboot-resume");
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      const { serviceCall } = await import("@/lib/service");
      const result = await serviceCall<JournalState | null>("journal.state");
      const canResume = result.ok && result.data && (
        result.data.canResume ||
        result.data.steps.some((step) => step.status === "pending" || step.status === "awaiting_reboot")
      );
      if (canResume) {
        await serviceCall("journal.resume");
      }
    } catch {
      // Resume failure is non-blocking
    } finally {
      setResuming(false);
      completeStep("reboot-resume");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 16 }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10"
      >
        <RotateCw className="h-7 w-7 text-amber-400" />
      </motion.div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-ink">Restart Recommended</h2>
        <p className="max-w-sm text-xs text-ink-secondary">
          Some optimizations require a restart to take effect. You can restart now or continue and restart later.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" size="md" onClick={handleRestart} icon={<RotateCw className="h-4 w-4" />}>
          Restart Now
        </Button>
        <Button variant="secondary" size="md" onClick={handleResume} disabled={resuming}>
          {resuming ? "Resuming..." : "Resume Without Restart"}
        </Button>
      </div>

      <button onClick={handleSkip} className="text-[11px] text-ink-tertiary hover:text-ink-secondary transition-colors">
        Skip and restart later
      </button>
    </motion.div>
  );
}
