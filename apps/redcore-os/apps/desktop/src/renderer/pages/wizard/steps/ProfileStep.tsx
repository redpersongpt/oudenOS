// ─── Profile Step ─────────────────────────────────────────────────────────────
// Shows the machine profile detected during assessment.
// Machine name + profile label + confidence + key signals.
// Work PC preservation flags are called out prominently.

import { motion } from "framer-motion";
import { Monitor, Briefcase, Cpu, ChevronRight } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

// ─── Signal pill ─────────────────────────────────────────────────────────────

function SignalPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-400">
      {label}
    </span>
  );
}

// ─── Confidence bar ──────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.2, 0.0, 0.0, 1.0], delay: 0.2 }}
        />
      </div>
      <span className="font-mono-metric text-xs text-neutral-400">{value}%</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfileStep() {
  const { detectedProfile } = useWizardStore();

  // Fallback if store hasn't been populated
  const profile = detectedProfile ?? {
    id:          "gaming-consumer",
    label:       "Gaming Consumer",
    confidence:  88,
    isWorkPc:    false,
    machineName: "REDCORE-PC",
    signals:     ["Steam detected", "No domain join", "High-performance GPU"],
    accentColor: "text-brand-400",
  };

  const ProfileIcon = profile.isWorkPc ? Briefcase : Monitor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="text-lg font-semibold text-neutral-100">Machine Profile Detected</h2>
        <p className="text-xs text-neutral-500">
          AI-classified based on hardware, software, and configuration signals
        </p>
      </div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.2, 0.0, 0.0, 1.0], delay: 0.06 }}
        className="w-full max-w-md rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
      >
        {/* Machine name + icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
            <ProfileIcon className="h-5 w-5 text-brand-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-widest text-neutral-600">
              {profile.machineName}
            </div>
            <div className={`text-base font-semibold ${profile.accentColor}`}>
              {profile.label}
            </div>
          </div>
          {profile.isWorkPc && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              <Briefcase className="h-2.5 w-2.5" />
              Work PC
            </span>
          )}
        </div>

        {/* Confidence */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-neutral-600">Classification confidence</span>
          </div>
          <ConfidenceBar value={profile.confidence} />
        </div>

        {/* Signals */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-600">
            <Cpu className="h-3 w-3" />
            Key signals
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.signals.map((sig) => (
              <SignalPill key={sig} label={sig} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Work PC notice */}
      {profile.isWorkPc && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.18 }}
          className="flex w-full max-w-md items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3"
        >
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <div className="text-xs font-medium text-amber-300">
              Business workflow protection enabled
            </div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-amber-500/70">
              Critical services such as Print Spooler, RDP, and Group Policy will be preserved.
              You can review these on the next screen.
            </div>
          </div>
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        </motion.div>
      )}
    </motion.div>
  );
}
