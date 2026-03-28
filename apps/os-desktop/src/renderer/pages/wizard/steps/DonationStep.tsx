// ─── Donation Step ───────────────────────────────────────────────────────────
// Optional step — accessible from ReportStep. Support the project.

import { motion } from "framer-motion";
import { Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

export function DonationStep() {
  const { completeStep } = useWizardStore();

  const handleDonate = () => {
    const win = window as unknown as { redcore?: { shell?: { openExternal: (url: string) => void } } };
    win.redcore?.shell?.openExternal("https://redcoreos.net/support");
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
        className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10"
      >
        <Heart className="h-7 w-7 text-red-400" />
      </motion.div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-ink">Support redcore-OS</h2>
        <p className="max-w-sm text-xs text-ink-secondary">
          redcore-OS is free and open source. If it helped you, consider supporting the project so we can keep improving it.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="md"
          onClick={handleDonate}
          icon={<Heart className="h-4 w-4" />}
        >
          Support the Project
          <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
        </Button>
        <Button variant="secondary" size="md" onClick={() => completeStep("donation")}>
          Skip
        </Button>
      </div>
    </motion.div>
  );
}
