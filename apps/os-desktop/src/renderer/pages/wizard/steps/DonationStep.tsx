// Donation Step — optional, accessible from report

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

export function DonationStep() {
  const { completeDonation } = useWizardStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      <Heart className="h-8 w-8 text-[var(--accent)]" />

      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">SUPPORT</h2>
        <p className="mt-2 text-body-sm text-[var(--text-secondary)] max-w-sm">
          Free and open source. If it helped, consider supporting the project.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => platform().shell.openExternal("https://redcoreos.net/support")}
          className="flex items-center gap-2 bg-[var(--accent)] text-[var(--text-display)] px-6 py-2.5 rounded-sm font-mono text-label tracking-label uppercase transition-colors duration-150 ease-nd hover:bg-[var(--accent)]"
        >
          <Heart className="h-3.5 w-3.5" />
          SUPPORT
        </button>
        <button
          onClick={completeDonation}
          className="px-6 py-2.5 border border-[var(--border)] rounded-sm font-mono text-label tracking-label text-[var(--text-secondary)] uppercase transition-colors duration-150 ease-nd hover:bg-[var(--surface)]"
        >
          SKIP
        </button>
      </div>
    </motion.div>
  );
}
