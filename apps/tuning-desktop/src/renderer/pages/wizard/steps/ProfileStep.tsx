// ─── Profile Step ─────────────────────────────────────────────────────────────
// Reveals the AI-classified machine archetype with emblem, confidence ring,
// signal breakdown, strategy summary, and any warning notes.

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { ARCHETYPE_META } from "@redcore/shared-schema/device-intelligence";
import { useWizardStore } from "@/stores/wizard-store";
import { useIntelligenceStore } from "@/stores/intelligence-store";
import { Badge } from "@/components/ui/Badge";
import {
  ArchetypeEmblem,
  ConfidenceRing,
  SignalCard,
  accentBorder,
  accentText,
} from "@/pages/intelligence/components";

// ─── Strategy focus points per archetype ─────────────────────────────────────
// Surfaced as bullet points in the "What we will focus on" section.

const ARCHETYPE_STRATEGY: Record<string, string[]> = {
  gaming_desktop: [
    "Maximise frame rates via scheduler and GPU priority tuning",
    "Enable XMP/EXPO for memory performance",
    "Reduce interrupt latency and DPC overhead",
    "Disable background telemetry and Xbox services",
  ],
  budget_desktop: [
    "Reduce startup time and idle resource usage",
    "Free memory from background processes and services",
    "Apply safe power plan tweaks without risk",
    "Clean up bloatware and scheduled tasks",
  ],
  highend_workstation: [
    "Tune CPU affinity and thread scheduling for sustained load",
    "Optimise storage I/O queues for throughput workloads",
    "Balance power plan for efficiency under sustained load",
    "Disable consumer features that conflict with pro workflows",
  ],
  office_laptop: [
    "Prioritise battery life and thermal management",
    "Reduce background resource consumption",
    "Optimise startup and login performance",
    "Apply conservative, reversible tweaks only",
  ],
  gaming_laptop: [
    "Manage thermal throttling to sustain peak performance",
    "Tune power limits for sustained GPU performance",
    "Reduce scheduling jitter for frame consistency",
    "Optimise battery/AC profile switching",
  ],
  low_spec_system: [
    "Aggressively reduce memory footprint",
    "Disable non-essential services and startup items",
    "Apply lightweight visual settings for responsiveness",
    "Focus on cleanup and bloat removal",
  ],
  vm_cautious: [
    "Apply only VM-compatible and safe tweaks",
    "Reduce resource contention with host system",
    "Disable hardware-specific tweaks that may not apply",
    "Focus on software-level optimisation only",
  ],
};

// ─── Dark skeleton block ──────────────────────────────────────────────────────

function DarkSkeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-xl bg-white/[0.04] ${className}`}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <DarkSkeleton className="h-36 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <DarkSkeleton className="h-20" />
        <DarkSkeleton className="h-20" />
        <DarkSkeleton className="h-20" />
        <DarkSkeleton className="h-20" />
      </div>
      <DarkSkeleton className="h-44" />
    </div>
  );
}

// ─── Profile Step ─────────────────────────────────────────────────────────────

export function ProfileStep() {
  const classification = useIntelligenceStore((s) => s.classification);
  const profile        = useIntelligenceStore((s) => s.profile);
  const isClassifying  = useIntelligenceStore((s) => s.isClassifying);
  const loadProfile    = useIntelligenceStore((s) => s.loadProfile);
  const machineProfileId = useWizardStore((s) => s.machineProfileId);

  // Load full profile if we only have classification
  useEffect(() => {
    if (!profile && machineProfileId && !isClassifying) {
      void loadProfile(machineProfileId);
    }
  }, [machineProfileId, profile, isClassifying, loadProfile]);

  const isLoading = isClassifying || (!classification && !profile);

  const archetype = classification?.primary;
  const meta      = archetype ? ARCHETYPE_META[archetype] : null;
  const signals   = classification?.signals.slice(0, 4) ?? [];
  const warnings  = profile?.warnings ?? [];
  const strategy  = archetype ? (ARCHETYPE_STRATEGY[archetype] ?? []) : [];
  const preset    = profile?.suggestedPreset ?? meta?.suggestedPreset;

  const borderClass = meta ? (accentBorder[meta.accentColor] ?? "border-white/[0.06]") : "border-white/[0.06]";
  const textClass   = meta ? (accentText[meta.accentColor]   ?? "text-ink-secondary")  : "text-ink-secondary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col items-center justify-center px-12 py-16"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-8"
      >
        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
            Your Machine Profile
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary max-w-lg">
            We have classified your system and built a tailored optimization
            strategy based on your exact hardware.
          </p>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" exit={{ opacity: 0 }}>
              <ProfileSkeleton />
            </motion.div>
          ) : !meta || !archetype ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-4"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" strokeWidth={1.5} />
              <p className="text-sm text-red-300">
                Classification unavailable. Try re-running the scan from the previous step.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Hero archetype card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                className={`rounded-xl border bg-white/[0.04] p-6 ${borderClass}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-5">
                    <ArchetypeEmblem
                      archetype={archetype}
                      accentColor={meta.accentColor}
                      size={80}
                    />
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
                        Machine Archetype
                      </p>
                      <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                        {meta.label}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-ink-secondary max-w-[320px]">
                        {meta.tagline}
                      </p>
                    </div>
                  </div>
                  <ConfidenceRing
                    confidence={classification?.confidence ?? 0}
                    accentColor={meta.accentColor}
                  />
                </div>

                {/* Preset badge */}
                {preset && (
                  <div className="mt-4 ml-[100px] flex items-center gap-2">
                    <span className="text-xs text-ink-tertiary">Suggested preset</span>
                    <Badge variant="default">
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </Badge>
                  </div>
                )}
              </motion.div>

              {/* Signals grid */}
              {signals.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
                    Classification Signals
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {signals.map((signal) => (
                      <SignalCard
                        key={signal.factor}
                        signal={signal}
                        archetypeMeta={meta}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Strategy summary */}
              {strategy.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
                    What we will focus on
                  </p>
                  <ul className="space-y-2.5">
                    {strategy.map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${textClass}`}
                          strokeWidth={2}
                        />
                        <span className="text-sm leading-snug text-ink-secondary">{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Warning notes */}
              <AnimatePresence>
                {warnings.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
                      Notes
                    </p>
                    {warnings.map((note) => (
                      <div
                        key={note}
                        className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3.5 py-2.5"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400"
                          strokeWidth={1.5}
                        />
                        <p className="text-xs leading-relaxed text-amber-300/80">{note}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick wins preview */}
              {(profile?.quickWins?.length ?? 0) > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-brand-400" strokeWidth={1.5} />
                  <p className="text-xs text-ink-secondary">
                    <span className="font-semibold text-ink">
                      {profile!.quickWins.length} quick win{profile!.quickWins.length !== 1 ? "s" : ""}
                    </span>{" "}
                    identified for immediate impact
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
