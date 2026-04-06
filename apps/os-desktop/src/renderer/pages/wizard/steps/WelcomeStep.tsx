import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { platform } from "@/lib/platform";

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const ND = { ease: [0.25, 0.1, 0.25, 1] as const };

const FEATURES = [
  "Remove clutter", "Reduce tracking", "Faster startup",
  "Lower latency", "Steadier frame times", "Cleaner system",
];

const TAGLINES = [
  "Make changes you can explain.",
  "Keep what matters. Cut the rest.",
  "Clear tradeoffs. No guesswork.",
  "Measure it before you trust it.",
];

export function WelcomeStep() {
  const { goNext } = useWizardStore();
  const [runtime, setRuntime] = useState({ checked: false, isAdmin: true, platform: "unknown", mode: "demo" });
  const [logoClicks, setLogoClicks] = useState(0);
  const [tagIdx, setTagIdx] = useState(0);

  const handleLogoClick = useCallback(() => {
    const n = logoClicks + 1;
    setLogoClicks(n);
    if (n >= 7) { setLogoClicks(0); platform().shell.openExternal(RICKROLL_URL); }
  }, [logoClicks]);

  useEffect(() => {
    platform().service.status()
      .then((s) => setRuntime({ checked: true, isAdmin: s.isAdmin, platform: s.platform, mode: s.mode }))
      .catch(() => setRuntime({ checked: true, isAdmin: false, platform: "unknown", mode: "demo" }));
  }, []);

  useEffect(() => {
    const i = setInterval(() => setTagIdx((p) => (p + 1) % TAGLINES.length), 4000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ background: "var(--black)" }}>
      {/* Breathing glow behind logo — absolute, centered high */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Dot grid bg — subtle */}
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-20 pointer-events-none" />

      {/* CSS for gradient border animation */}
      <style>{`
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .cta-gradient-border {
          position: relative;
          padding: 1px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.55),
            rgba(255,255,255,0.15),
            rgba(255,255,255,0.7),
            rgba(255,255,255,0.15),
            rgba(255,255,255,0.55)
          );
          background-size: 200% 200%;
          animation: gradient-shift 3.5s ease infinite;
        }
        .cta-gradient-border > button {
          border-radius: 999px;
        }
      `}</style>

      <div className="relative z-10 flex flex-1 min-h-0 flex-col items-center justify-center px-6 py-8">
        {/* TERTIARY — version, top-right */}
        <motion.div
          className="absolute top-6 right-6 nd-label-sm"
          style={{ color: "var(--text-disabled)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4, ease: ND.ease }}
        >
          V0.2.0
        </motion.div>

        {/* PRIMARY — Logo mark: spring scale-in first */}
        <motion.div
          onClick={handleLogoClick}
          className="mb-6 cursor-default select-none"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0 }}
        >
          <svg width={64} height={64} viewBox="0 0 100 100" fill="none" className="h-16 w-16">
            <motion.path
              d="M 82.14 66.08 A 32 32 0 1 1 77.1 39.9"
              stroke="var(--text-primary)"
              strokeWidth={7}
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.circle
              cx="77.1" cy="39.9" r={4}
              fill="var(--text-primary)"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, duration: 0.3 }}
            />
          </svg>
        </motion.div>

        {/* Doto display — slides up after logo */}
        <motion.h1
          className="font-display tracking-tight leading-none text-center"
          style={{ color: "var(--text-display)", fontSize: "clamp(2.5rem, 7vw, 4.5rem)" }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: ND.ease }}
        >
          Ouden
        </motion.h1>

        {/* SECONDARY — fades in after title */}
        <motion.p
          className="nd-label mt-2"
          style={{ color: "var(--text-secondary)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.35, ease: ND.ease }}
        >
          Operating system
        </motion.p>

        {/* Divider */}
        <motion.div
          className="w-40 mt-6 mb-5"
          style={{ height: 1, background: "var(--border-visible)" }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.4, ease: ND.ease }}
        />

        {/* Rotating tagline */}
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

        {/* Feature chips — stagger from left */}
        <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
          {FEATURES.map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 + i * 0.07, duration: 0.3, ease: ND.ease }}
              whileHover={{ scale: 1.02, filter: "brightness(1.25)" }}
              className="px-3 py-1 font-mono text-label tracking-[0.06em] cursor-default select-none"
              style={{
                border: "1px solid var(--border-visible)",
                color: "var(--text-secondary)",
                borderRadius: 4,
                transition: "filter 150ms ease",
              }}
            >
              {t}
            </motion.span>
          ))}
        </div>

        {/* Admin warning */}
        {runtime.checked && runtime.mode === "simulated" && (
          <div className="mt-5 flex max-w-sm items-start gap-3 px-4 py-3" style={{ border: "1px solid rgba(96,165,250,0.45)", background: "rgba(59,130,246,0.06)" }}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-display)" }} />
            <div>
              <p className="nd-label" style={{ color: "var(--text-display)" }}>Demo mode</p>
              <p className="mt-1 text-caption" style={{ color: "var(--text-display)" }}>
                You can use the app here, but changes will not be applied on this machine.
              </p>
            </div>
          </div>
        )}

        {runtime.checked && !runtime.isAdmin && runtime.platform === "win32" && (
          <div className="mt-5 flex max-w-sm items-start gap-3 px-4 py-3" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-display)" }} />
            <div>
              <p className="nd-label" style={{ color: "var(--text-display)" }}>Administrator access required</p>
              <p className="mt-1 text-caption" style={{ color: "var(--text-display)" }}>
                Run the app as administrator to apply all changes.
              </p>
            </div>
          </div>
        )}

        {/* CTA — animated gradient border wrapper */}
        <motion.div
          className="mt-8 cta-gradient-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.3, ease: ND.ease }}
        >
          <button
            onClick={goNext}
            className="flex items-center gap-3 px-6 py-3 font-mono text-[13px] uppercase tracking-[0.06em] transition-opacity duration-200 hover:opacity-85"
            style={{ background: "var(--text-display)", color: "var(--black)", minHeight: 44 }}
          >
            Start assessment
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </motion.div>

        {/* Tertiary footer */}
        <motion.p
          className="nd-label-sm mt-6 text-center"
          style={{ color: "var(--text-disabled)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.3, ease: ND.ease }}
        >
          Rollback available · stays on this machine
        </motion.p>
      </div>
    </div>
  );
}
