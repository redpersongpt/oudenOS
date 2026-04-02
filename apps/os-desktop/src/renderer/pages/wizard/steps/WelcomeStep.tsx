import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const ND = { ease: [0.25, 0.1, 0.25, 1] as const };

const FEATURES = [
  "KILL BLOATWARE", "STOP TELEMETRY", "FASTER BOOT",
  "LOWER LATENCY", "FIX FRAME DROPS", "CLEAN REGISTRY",
];

const TAGLINES = [
  "YOUR PC, MINUS THE MICROSOFT TAX.",
  "WHAT WINDOWS SHOULD HAVE BEEN.",
  "NO SCRIPTS. NO GUESSING. JUST RESULTS.",
  "27GB FOR AN OS IS STILL INSANE.",
];

export function WelcomeStep() {
  const { goNext } = useWizardStore();
  const [admin, setAdmin] = useState({ checked: false, isAdmin: true, platform: "unknown" });
  const [logoClicks, setLogoClicks] = useState(0);
  const [tagIdx, setTagIdx] = useState(0);

  const handleLogoClick = useCallback(() => {
    const n = logoClicks + 1;
    setLogoClicks(n);
    if (n >= 7) { setLogoClicks(0); platform().shell.openExternal(RICKROLL_URL); }
  }, [logoClicks]);

  useEffect(() => {
    platform().service.status()
      .then((s) => setAdmin({ checked: true, isAdmin: s.isAdmin, platform: s.platform }))
      .catch(() => setAdmin({ checked: true, isAdmin: false, platform: "unknown" }));
  }, []);

  useEffect(() => {
    const i = setInterval(() => setTagIdx((p) => (p + 1) % TAGLINES.length), 4000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ background: "var(--black)" }}>
      {/* Dot grid bg — subtle */}
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-20 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: ND.ease }}
        className="flex flex-1 flex-col items-center justify-center px-8 relative z-10"
      >
        {/* TERTIARY — version, top-right */}
        <div className="absolute top-6 right-6 nd-label-sm" style={{ color: "var(--text-disabled)" }}>
          V0.2.0
        </div>

        {/* PRIMARY — Logo mark + Doto title */}
        <div onClick={handleLogoClick} className="cursor-default select-none mb-8">
          {/* Geometric mark: square border + inner square + circle */}
          <div className="w-20 h-20 flex items-center justify-center" style={{ border: "1px solid var(--border-visible)" }}>
            <div className="w-10 h-10 flex items-center justify-center" style={{ border: "1px solid var(--accent)" }}>
              <div className="w-4 h-4 rounded-full" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        </div>

        {/* Doto display — hero. 48px. The ONE thing you see first. */}
        <h1 className="font-display text-display tracking-tight" style={{ color: "var(--text-display)" }}>
          redcore
        </h1>

        {/* SECONDARY — label */}
        <p className="nd-label mt-2" style={{ color: "var(--accent)" }}>
          OPERATING SYSTEM
        </p>

        {/* Divider — 1px, --border-visible */}
        <div className="w-48 mt-8 mb-6" style={{ height: 1, background: "var(--border-visible)" }} />

        {/* Rotating tagline — tertiary */}
        <div className="h-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={tagIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: ND.ease }}
              className="nd-label-sm"
              style={{ color: "var(--text-disabled)" }}
            >
              {TAGLINES[tagIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Feature tags — pill chips, 1px border, no fill */}
        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-sm">
          {FEATURES.map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.25, ease: ND.ease }}
              className="px-3 py-1 font-mono text-label tracking-[0.06em] uppercase"
              style={{ border: "1px solid var(--border-visible)", color: "var(--text-secondary)", borderRadius: 4 }}
            >
              {t}
            </motion.span>
          ))}
        </div>

        {/* Admin warning */}
        {admin.checked && !admin.isAdmin && admin.platform === "win32" && (
          <div className="mt-6 flex items-start gap-3 px-4 py-3 max-w-sm" style={{ border: "1px solid var(--warning)", background: "rgba(212,168,67,0.04)" }}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--warning)" }} />
            <div>
              <p className="nd-label" style={{ color: "var(--warning)" }}>NOT RUNNING AS ADMINISTRATOR</p>
              <p className="mt-1 text-caption" style={{ color: "var(--text-secondary)" }}>
                Right-click the app and select "Run as administrator" for full functionality.
              </p>
            </div>
          </div>
        )}

        {/* CTA — Primary button: white bg, black text, pill, Space Mono ALL CAPS */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3, ease: ND.ease }}
          onClick={goNext}
          className="mt-10 flex items-center gap-3 font-mono text-[13px] uppercase tracking-[0.06em] px-6 py-3 transition-opacity duration-200 hover:opacity-80"
          style={{ background: "var(--text-display)", color: "var(--black)", borderRadius: 999, minHeight: 44 }}
        >
          BEGIN ASSESSMENT
          <ArrowRight className="h-4 w-4" />
        </motion.button>

        {/* Tertiary footer */}
        <p className="nd-label-sm mt-8" style={{ color: "var(--text-disabled)" }}>
          SNAPSHOT BEFORE EVERY CHANGE · NOTHING LEAVES YOUR MACHINE
        </p>

        {/* Bottom segmented bar — signature visualization */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-8 h-1" style={{ background: "var(--accent)" }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-8 h-1" style={{ background: "var(--border)" }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
