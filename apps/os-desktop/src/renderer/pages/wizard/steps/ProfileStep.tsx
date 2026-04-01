import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Briefcase, ChevronDown, Gamepad2, Laptop, Server, Cpu, AlertTriangle, Check } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile } from "@/stores/wizard-store";

function useCountUp(target: number, duration = 1100): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === 0) { setV(0); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setV(Math.round(target * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

const PROFILE_OPTIONS = [
  { id: "gaming_desktop", label: "Gaming Desktop", icon: Gamepad2, desc: "Aggressive performance, max FPS" },
  { id: "office_laptop", label: "Office Laptop", icon: Laptop, desc: "Battery-safe, keep productivity tools" },
  { id: "work_pc", label: "Work PC", icon: Briefcase, desc: "Preserve enterprise services, cautious" },
  { id: "vm_cautious", label: "Virtual Machine", icon: Server, desc: "Skip hardware tweaks, minimal changes" },
  { id: "low_spec_system", label: "Low Spec System", icon: Cpu, desc: "Lightweight cleanup, reduce overhead" },
] as const;

export function ProfileStep() {
  const { detectedProfile, setDetectedProfile, setStepReady } = useWizardStore();
  const p = detectedProfile;
  const signals = Array.isArray(p?.signals) ? p.signals : [];
  const [showOverride, setShowOverride] = useState(false);
  const [isOverridden, setIsOverridden] = useState(false);

  const displayConfidence = useCountUp(p?.confidence ?? 0, 1100);

  useEffect(() => {
    setStepReady("profile", Boolean(p));
  }, [p, setStepReady]);

  if (!p) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[12px] text-ink-tertiary">No profile detected.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20"
      >
        <Monitor className="h-6 w-6 text-brand-400" />
      </motion.div>

      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">{p.machineName}</p>
        <h2 className="mt-1 text-[20px] font-bold text-ink">{p.label}</h2>
      </div>

      {/* Confidence with count-up — hidden when user overrides profile */}
      {!isOverridden && (
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-[10px]">
          <span className="text-ink-tertiary">Confidence</span>
          <motion.span
            className="font-mono-metric text-brand-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {displayConfidence}%
          </motion.span>
        </div>
        <div className="mt-1 relative h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${p.confidence}%` }}
            transition={{ duration: 1.1, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.1 }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
          />
        </div>
      </div>
      )}

      {/* Manual override indicator */}
      {isOverridden && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1"
        >
          <span className="text-[10px] font-medium text-brand-400">Manual selection</span>
        </motion.div>
      )}

      {/* Signal chips — staggered entrance */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {signals.map((s, i) => (
          <motion.span
            key={s}
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 400, damping: 20 }}
            className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-ink-secondary"
          >
            {s}
          </motion.span>
        ))}
      </div>

      {p.isWorkPc && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5 max-w-sm"
        >
          <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-[11px] font-semibold text-amber-300">Work PC Detected</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-amber-400/70">
              Business-critical services preserved. Aggressive optimizations blocked.
            </p>
          </div>
        </motion.div>
      )}

      {/* Profile override */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-xs"
      >
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-1.5 mx-auto text-[10px] text-ink-muted hover:text-ink-tertiary transition-colors cursor-pointer"
        >
          <span>Not right? Switch profile</span>
          <motion.div animate={{ rotate: showOverride ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-3 w-3" />
          </motion.div>
        </button>
        <AnimatePresence>
          {showOverride && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex flex-col gap-1">
                {PROFILE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = p.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (isActive) return;
                        const overridden: DetectedProfile = {
                          ...p,
                          id: opt.id,
                          label: opt.label,
                          isWorkPc: opt.id === "work_pc",
                          confidence: p.confidence,
                          signals: p.id === opt.id ? p.signals : [...p.signals, "Manual override"],
                        };
                        setDetectedProfile(overridden);
                        setIsOverridden(true);
                        setShowOverride(false);
                      }}
                      className={[
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all cursor-pointer",
                        isActive
                          ? "bg-brand-500/10 border border-brand-500/25"
                          : "bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-brand-400" : "text-ink-tertiary"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium ${isActive ? "text-brand-400" : "text-ink-secondary"}`}>{opt.label}</p>
                        <p className="text-[9px] text-ink-muted truncate">{opt.desc}</p>
                      </div>
                      {isActive && <Check className="h-3 w-3 shrink-0 text-brand-400" />}
                    </button>
                  );
                })}
                <p className="mt-1 text-[9px] text-ink-muted/60 text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Override affects which optimizations are safe to apply
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
