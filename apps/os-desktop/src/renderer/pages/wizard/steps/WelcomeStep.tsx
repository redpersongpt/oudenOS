import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const FEATURES = [
  "KILL BLOATWARE",
  "STOP TELEMETRY",
  "FASTER BOOT",
  "LOWER LATENCY",
  "FIX FRAME DROPS",
  "CLEAN REGISTRY",
];

const TAGLINES = [
  "WE HATE WINDOWS, AND YOU SHOULD TOO.",
  "YOUR PC, MINUS THE MICROSOFT TAX.",
  "WHAT WINDOWS SHOULD HAVE BEEN.",
  "NO SCRIPTS. NO GUESSING. JUST RESULTS.",
  "BECAUSE 27GB FOR AN OS IS STILL INSANE.",
  "FED UP WITH BLOATED DEBLOATERS?",
];

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

export function WelcomeStep() {
  const { goNext } = useWizardStore();
  const [adminState, setAdminState] = useState<{ checked: boolean; isAdmin: boolean; platform: string }>({
    checked: false, isAdmin: true, platform: "unknown",
  });
  const [logoClicks, setLogoClicks] = useState(0);
  const [taglineIdx, setTaglineIdx] = useState(0);

  const handleLogoClick = useCallback(() => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 7) {
      setLogoClicks(0);
      platform().shell.openExternal(RICKROLL_URL);
    }
  }, [logoClicks]);

  useEffect(() => {
    platform().service.status().then((s) => {
      setAdminState({ checked: true, isAdmin: s.isAdmin, platform: s.platform });
    }).catch(() => {
      setAdminState({ checked: true, isAdmin: false, platform: "unknown" });
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-nd-bg">

      {/* Dot grid background */}
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-30 pointer-events-none" />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: ND_EASE }}
        className="flex flex-1 flex-col items-center justify-center px-8 relative z-10"
      >
        {/* Version label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: ND_EASE }}
          className="absolute top-6 right-6 nd-label-sm"
        >
          V0.2.0
        </motion.div>

        {/* Logo */}
        <motion.div
          onClick={handleLogoClick}
          className="cursor-default select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: ND_EASE }}
        >
          {/* Nothing-style hexagon mark */}
          <div className="w-16 h-16 border border-nd-border rounded-lg flex items-center justify-center relative">
            <div className="w-8 h-8 border border-brand-500 rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 bg-brand-500 rounded-full" />
            </div>
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-nd-border-subtle" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-nd-border-subtle" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-nd-border-subtle" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-nd-border-subtle" />
          </div>
        </motion.div>

        {/* Title — Doto display font */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: ND_EASE }}
          className="mt-6 font-display text-display text-nd-text-display tracking-tight"
        >
          redcore
        </motion.h1>

        {/* Subtitle label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: ND_EASE }}
          className="mt-1 nd-label text-brand-500"
        >
          OPERATING SYSTEM
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.6, ease: ND_EASE }}
          className="mt-6 w-[200px] h-px bg-nd-border"
        />

        {/* Rotating tagline */}
        <div className="mt-4 h-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: ND_EASE }}
              className="nd-label-sm text-center text-nd-text-secondary"
            >
              {TAGLINES[taglineIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Feature tags — Nothing segmented style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4, ease: ND_EASE }}
          className="mt-6 flex flex-wrap justify-center gap-2 max-w-[360px]"
        >
          {FEATURES.map((text, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 + i * 0.05, duration: 0.3, ease: ND_EASE }}
              className="border border-nd-border bg-nd-surface px-3 py-1.5 rounded-sm"
            >
              <span className="font-mono text-label tracking-label text-nd-text-secondary">{text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Admin warning */}
        {adminState.checked && !adminState.isAdmin && adminState.platform === "win32" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3, ease: ND_EASE }}
            className="mt-6 flex items-start gap-3 border border-warning-400/30 bg-warning-400/[0.04] px-4 py-3 rounded-sm max-w-sm"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-400" />
            <div>
              <p className="nd-label text-warning-400">NOT RUNNING AS ADMINISTRATOR</p>
              <p className="mt-1 text-caption text-nd-text-secondary leading-relaxed">
                Right-click the app and select "Run as administrator" for full functionality.
              </p>
            </div>
          </motion.div>
        )}

        {/* CTA — Nothing style button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3, ease: ND_EASE }}
          onClick={goNext}
          className="mt-8 flex items-center gap-3 bg-brand-500 text-nd-text-display px-8 py-3 rounded-sm font-mono text-body-sm tracking-label uppercase transition-all duration-250 ease-nd hover:bg-brand-400 active:bg-brand-600"
        >
          BEGIN ASSESSMENT
          <ArrowRight className="h-4 w-4" />
        </motion.button>

        {/* Footer info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3, ease: ND_EASE }}
          className="mt-6 nd-label-sm text-nd-text-disabled"
        >
          SNAPSHOT BEFORE EVERY CHANGE · NOTHING LEAVES YOUR MACHINE
        </motion.p>

        {/* Bottom segmented bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4, ease: ND_EASE }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-0.5"
        >
          <div className="w-8 h-1 bg-brand-500" />
          <div className="w-8 h-1 bg-nd-border-subtle" />
          <div className="w-8 h-1 bg-nd-border-subtle" />
          <div className="w-8 h-1 bg-nd-border-subtle" />
          <div className="w-8 h-1 bg-nd-border-subtle" />
        </motion.div>
      </motion.div>
    </div>
  );
}
