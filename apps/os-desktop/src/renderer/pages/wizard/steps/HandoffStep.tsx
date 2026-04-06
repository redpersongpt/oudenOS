// Handoff Step — you're done, go touch grass

import { motion } from "framer-motion";
import { platform } from "@/lib/platform";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// Custom bolt icon
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M18 4L8 18h7l-1 10 10-14h-7l1-10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.5 3.3 12.3l.7-4.1-3-2.9 4.2-.7L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 2.5l8 4.5-8 4.5V2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function HandoffStep() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      <BoltIcon className="text-[var(--accent)]" />

      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">YOU'RE SET</h2>
        <p className="mt-2 text-[12px] text-[var(--text-secondary)] max-w-sm">
          Your system is cleaned up and running lean. Windows is finally doing what you told it to.
        </p>
      </div>

      {/* Social links */}
      <div className="w-full max-w-sm space-y-2">
        <button
          onClick={() => platform().shell.openExternal("https://github.com/redpersongpt/oudenOS")}
          className="flex items-center gap-3 w-full px-4 py-2.5 border border-[var(--border)] bg-[var(--surface)] rounded-sm transition-colors duration-150 ease-nd hover:bg-[var(--surface-raised)]"
        >
          <StarIcon />
          <span className="text-[12px] text-[var(--text-primary)]">Drop a star on GitHub if this saved you hours of googling</span>
        </button>
        <button
          onClick={() => platform().shell.openExternal("https://www.youtube.com/@redpersonn")}
          className="flex items-center gap-3 w-full px-4 py-2.5 border border-[var(--border)] bg-[var(--surface)] rounded-sm transition-colors duration-150 ease-nd hover:bg-[var(--surface-raised)]"
        >
          <PlayIcon />
          <span className="text-[12px] text-[var(--text-primary)]">Subscribe for deep dives, benchmarks, and more tools</span>
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => platform().shell.openExternal("https://ouden.cc")}
          className="flex items-center gap-2 bg-[var(--text-display)] text-[var(--black)] px-6 py-2.5 rounded-sm font-mono text-[11px] tracking-[0.08em] uppercase transition-opacity duration-150 ease-nd hover:opacity-90"
        >
          OPEN TUNING
        </button>
        <button
          onClick={() => platform().window.close()}
          className="px-6 py-2.5 border border-[var(--border)] rounded-sm font-mono text-[11px] tracking-[0.08em] text-[var(--text-secondary)] uppercase transition-colors duration-150 ease-nd hover:bg-[var(--surface)]"
        >
          CLOSE
        </button>
      </div>
    </motion.div>
  );
}
