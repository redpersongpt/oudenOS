import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

function useCountUp(target: number, duration = 1000): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === 0) { setV(0); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setV(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

const PROFILE_OPTIONS = [
  { id: "gaming_desktop", label: "GAMING DESKTOP", desc: "AGGRESSIVE PERFORMANCE, MAX FPS" },
  { id: "office_laptop", label: "OFFICE LAPTOP", desc: "BATTERY-SAFE, KEEP PRODUCTIVITY" },
  { id: "work_pc", label: "WORK PC", desc: "PRESERVE ENTERPRISE SERVICES" },
  { id: "vm_cautious", label: "VIRTUAL MACHINE", desc: "SKIP HARDWARE TWEAKS" },
  { id: "low_spec_system", label: "LOW SPEC", desc: "LIGHTWEIGHT CLEANUP" },
] as const;

export function ProfileStep() {
  const { detectedProfile, setDetectedProfile, setStepReady } = useWizardStore();
  const p = detectedProfile;
  const signals = Array.isArray(p?.signals) ? p.signals : [];
  const [showOverride, setShowOverride] = useState(false);
  const [isOverridden, setIsOverridden] = useState(false);
  const displayConfidence = useCountUp(p?.confidence ?? 0, 1000);

  useEffect(() => {
    setStepReady("profile", Boolean(p));
  }, [p, setStepReady]);

  if (!p) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--black)]">
        <p className="nd-label text-[var(--text-disabled)]">NO PROFILE DETECTED</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      {/* Machine name label */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3, ease: ND_EASE }}
        className="nd-label-sm text-[var(--text-disabled)]"
      >
        {p.machineName}
      </motion.div>

      {/* Profile name — Doto display */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3, ease: ND_EASE }}
        className="font-display text-heading text-[var(--text-display)]"
      >
        {p.label.toUpperCase()}
      </motion.h2>

      {/* Confidence — Nothing segmented bar */}
      {!isOverridden && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3, ease: ND_EASE }}
          className="w-full max-w-xs"
        >
          <div className="flex justify-between mb-1">
            <span className="nd-label text-[var(--text-secondary)]">CONFIDENCE</span>
            <span className="font-mono text-label tracking-label text-[var(--accent)]">
              {displayConfidence}%
            </span>
          </div>
          {/* Segmented bar — 10 segments */}
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.2, ease: ND_EASE }}
                className={`flex-1 h-1 origin-left ${
                  i < Math.round((p.confidence ?? 0) / 10) ? "bg-[var(--accent)]" : "bg-nd-border-subtle"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Manual override indicator */}
      {isOverridden && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="nd-label text-[var(--accent)]"
        >
          [MANUAL SELECTION]
        </motion.div>
      )}

      {/* Signal chips — Nothing style */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {signals.map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.05, duration: 0.2, ease: ND_EASE }}
            className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1 rounded-sm font-mono text-label tracking-label text-[var(--text-secondary)]"
          >
            {s.toUpperCase()}
          </motion.span>
        ))}
      </div>

      {/* Work PC warning */}
      {p.isWorkPc && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3, ease: ND_EASE }}
          className="flex items-start gap-3 border border-warning-400/20 bg-[var(--warning)]/[0.04] px-4 py-3 rounded-sm max-w-sm"
        >
          <div className="w-3 h-0.5 bg-[var(--warning)] mt-1.5 shrink-0" />
          <div>
            <p className="nd-label text-[var(--warning)]">WORK PC DETECTED</p>
            <p className="mt-1 text-caption text-[var(--text-secondary)]">
              Business-critical services preserved. Aggressive optimizations blocked.
            </p>
          </div>
        </motion.div>
      )}

      {/* Profile override */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3, ease: ND_EASE }}
        className="w-full max-w-xs"
      >
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-2 mx-auto nd-label-sm text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors duration-150 ease-nd"
        >
          <span>SWITCH PROFILE</span>
          <motion.div animate={{ rotate: showOverride ? 180 : 0 }} transition={{ duration: 0.2, ease: ND_EASE }}>
            <ChevronDown className="h-3 w-3" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showOverride && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: ND_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-col gap-px">
                {PROFILE_OPTIONS.map((opt, optIdx) => {
                  const isActive = p.id === opt.id;
                  return (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: optIdx * 0.04, duration: 0.2, ease: ND_EASE }}
                      layout
                      key={opt.id}
                      onClick={() => {
                        if (isActive) return;
                        const overridden: DetectedProfile = {
                          ...p, id: opt.id, label: opt.label.split(" ").map(w => w[0] + w.slice(1).toLowerCase()).join(" "),
                          isWorkPc: opt.id === "work_pc", confidence: p.confidence,
                          signals: [...p.signals, "Manual override"],
                        };
                        setDetectedProfile(overridden);
                        setIsOverridden(true);
                        setShowOverride(false);
                      }}
                      className={`flex items-center justify-between px-4 py-2.5 text-left transition-colors duration-150 ease-nd border-b border-[var(--border)] ${
                        isActive ? "bg-[var(--surface-raised)]" : "bg-[var(--black)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div>
                        <p className={`font-mono text-caption tracking-label ${isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
                          {opt.label}
                        </p>
                        <p className="nd-label-sm text-[var(--text-disabled)] mt-0.5">{opt.desc}</p>
                      </div>
                      {isActive && <div className="w-3 h-0.5 bg-[var(--accent)]" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
