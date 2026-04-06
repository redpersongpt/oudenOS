// Donation Step — help keep the lights on

import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 28S4 20 4 12a6 6 0 0112 0 6 6 0 0112 0c0 8-12 16-12 16z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DonationStep() {
  const { completeDonation } = useWizardStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      <HeartIcon className="text-[var(--accent)]" />

      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">SUPPORT</h2>
        <p className="mt-2 text-[12px] text-[var(--text-secondary)] max-w-sm">
          This whole thing is free and open source. Built by one person. If it saved you a reinstall or three hours of registry hunting, throwing a few bucks would genuinely help.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => platform().shell.openExternal("https://ouden.cc/support")}
          className="flex items-center gap-2 bg-[var(--text-display)] text-[var(--black)] px-6 py-2.5 rounded-sm font-mono text-[11px] tracking-[0.08em] uppercase transition-opacity duration-150 ease-nd hover:opacity-90"
        >
          SUPPORT
        </button>
        <button
          onClick={completeDonation}
          className="px-6 py-2.5 border border-[var(--border)] rounded-sm font-mono text-[11px] tracking-[0.08em] text-[var(--text-secondary)] uppercase transition-colors duration-150 ease-nd hover:bg-[var(--surface)]"
        >
          SKIP
        </button>
      </div>
    </motion.div>
  );
}
