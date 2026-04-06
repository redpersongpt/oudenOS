import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// Custom profile icons — inline SVGs
function ProfileIcon({ profileId, size = 48 }: { profileId: string; size?: number }) {
  const s = size;
  const common = { width: s, height: s, viewBox: `0 0 ${s} ${s}`, fill: "none" } as const;

  if (profileId === "gaming_desktop" || profileId === "gaming_laptop") {
    // Gaming: monitor with crosshair
    return (
      <svg {...common}>
        <rect x={8} y={8} width={32} height={22} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <path d="M18 30h12M24 30v6M20 36h8" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={24} cy={19} r={5} stroke="var(--success)" strokeWidth="1.5" opacity="0.7" />
        <path d="M24 12v3M24 22v3M17 19h3M28 19h3" stroke="var(--success)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  if (profileId === "office_laptop") {
    // Laptop with battery indicator
    return (
      <svg {...common}>
        <rect x={6} y={12} width={36} height={22} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <path d="M10 34h28" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x={14} y={18} width={20} height={10} rx={1} stroke="var(--text-secondary)" strokeWidth="1" opacity="0.5" />
        <rect x={15} y={19} width={10} height={8} rx={0.5} fill="var(--success)" opacity="0.3" />
      </svg>
    );
  }

  if (profileId === "work_pc") {
    // Shield with lock
    return (
      <svg {...common}>
        <path d="M24 6l14 6v10c0 8-6 14-14 18-8-4-14-10-14-18V12l14-6z" stroke="var(--text-display)" strokeWidth="1.5" fill="none" />
        <rect x={20} y={20} width={8} height={8} rx={1.5} stroke="var(--text-secondary)" strokeWidth="1.5" />
        <path d="M22 20v-3a2 2 0 014 0v3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={24} cy={24.5} r={1} fill="var(--text-secondary)" />
      </svg>
    );
  }

  if (profileId === "vm_cautious") {
    // VM: stacked boxes
    return (
      <svg {...common}>
        <rect x={10} y={8} width={28} height={12} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <rect x={10} y={24} width={28} height={12} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <circle cx={15} cy={14} r={1.5} fill="var(--success)" opacity="0.6" />
        <circle cx={15} cy={30} r={1.5} fill="var(--success)" opacity="0.6" />
        <path d="M20 14h14M20 30h14" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    );
  }

  if (profileId === "low_spec_system" || profileId === "low_spec") {
    // Feather/lightweight
    return (
      <svg {...common}>
        <path d="M24 40V20" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M24 20c-6 0-12 4-14 12 4-2 8-3 14-3" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M24 20c6 0 12 4 14 12-4-2-8-3-14-3" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M18 28l6-8 6 8" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      </svg>
    );
  }

  // Default: generic PC
  return (
    <svg {...common}>
      <rect x={10} y={8} width={28} height={20} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
      <path d="M18 28h12M24 28v6M20 34h8" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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
      {/* Profile icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.4, type: "spring", stiffness: 200, damping: 18 }}
        className="flex items-center justify-center w-20 h-20 rounded-full border border-[var(--border)] bg-[var(--surface)]"
      >
        <ProfileIcon profileId={p.id} size={48} />
      </motion.div>

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
          className="flex items-start gap-3 border border-white/[0.12] bg-white/[0.04] px-4 py-3 rounded-sm max-w-sm"
        >
          <div className="w-3 h-0.5 bg-[var(--text-display)] mt-1.5 shrink-0" />
          <div>
            <p className="nd-label text-[var(--text-display)]">WORK PC DETECTED</p>
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
          <motion.svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            animate={{ rotate: showOverride ? 180 : 0 }}
            transition={{ duration: 0.2, ease: ND_EASE }}
          >
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
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
                      className={`flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-nd border-b border-[var(--border)] ${
                        isActive ? "bg-[var(--surface-raised)]" : "bg-[var(--black)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div className="shrink-0 opacity-60">
                        <ProfileIcon profileId={opt.id} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-caption tracking-label ${isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
                          {opt.label}
                        </p>
                        <p className="nd-label-sm text-[var(--text-disabled)] mt-0.5">{opt.desc}</p>
                      </div>
                      {isActive && <div className="w-3 h-0.5 bg-[var(--accent)] shrink-0" />}
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
