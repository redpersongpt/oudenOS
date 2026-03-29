// ─── Playbook Review Step ────────────────────────────────────────────────────
// Transformation manifest review. Shows the resolved playbook plan grouped by
// phase with action statuses. Premium installer-grade density.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Lock, ChevronDown, Shield, Cpu, Eye, Info } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { ResolvedPlaybook, PlaybookPhase } from "@/stores/wizard-store";
import { getActionRationale, PHASE_RATIONALE, getBlockedExplanation } from "@/lib/expert-rationale";

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Included:   "bg-green-500/15 text-green-400 border-green-500/20",
    Blocked:    "bg-red-500/15 text-red-400 border-red-500/20",
    Optional:   "bg-amber-500/15 text-amber-400 border-amber-500/20",
    ExpertOnly: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    BuildGated: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20",
  };
  const icons: Record<string, ReactNode> = {
    Included:   <Check className="mr-0.5 h-2.5 w-2.5" />,
    Blocked:    <X className="mr-0.5 h-2.5 w-2.5" />,
    ExpertOnly: <Lock className="mr-0.5 h-2.5 w-2.5" />,
    Optional:   <Eye className="mr-0.5 h-2.5 w-2.5" />,
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.Blocked}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ─── Phase section ───────────────────────────────────────────────────────────

function PhaseSection({ phase, defaultOpen, profile }: { phase: PlaybookPhase; defaultOpen: boolean; profile: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const included = phase.actions.filter(a => a.status === "Included").length;
  const blocked  = phase.actions.filter(a => a.status === "Blocked").length;
  const total    = phase.actions.length;
  const phaseNote = PHASE_RATIONALE[phase.id];

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-semibold text-ink truncate">{phase.name}</span>
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
              {included}
            </span>
            {blocked > 0 && (
              <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                {blocked} blocked
              </span>
            )}
            <span className="text-[10px] text-ink-muted">of {total}</span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              {/* Phase rationale */}
              {phaseNote && (
                <div className="px-4 py-2 bg-white/[0.01] border-b border-white/[0.03]">
                  <p className="text-[10px] leading-relaxed text-ink-tertiary">{phaseNote}</p>
                </div>
              )}
              {/* Actions */}
              <div className="divide-y divide-white/[0.03]">
                {phase.actions.map((action) => {
                  const rationale = getActionRationale(action.id, profile);
                  const blockedNote = action.status === "Blocked"
                    ? getBlockedExplanation(action.id, action.blockedReason, profile)
                    : null;

                  return (
                    <div key={action.id} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-semibold text-ink truncate">{action.name}</p>
                            {action.requiresReboot && (
                              <span className="shrink-0 rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                reboot
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 shrink-0">
                          <StatusBadge status={action.status} />
                        </div>
                      </div>
                      {rationale.why ? (
                        <p className="mt-0.5 text-[10px] leading-relaxed text-ink-tertiary">{rationale.why}</p>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-ink-muted">{action.description}</p>
                      )}
                      {rationale.profileWarning && (
                        <p className="mt-0.5 text-[10px] text-amber-400/80 flex items-center gap-1">
                          <Info className="h-2.5 w-2.5 shrink-0" />
                          {rationale.profileWarning}
                        </p>
                      )}
                      {rationale.antiCheatNote && (
                        <p className="mt-0.5 text-[10px] text-amber-400/80 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                          {rationale.antiCheatNote}
                        </p>
                      )}
                      {blockedNote && (
                        <p className="mt-0.5 text-[10px] text-red-400/80 flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5 shrink-0" />
                          {blockedNote}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function PlaybookSkeleton() {
  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="mb-4 space-y-2">
        <div className="h-6 w-52 rounded-md bg-white/[0.04] animate-pulse" />
        <div className="h-3.5 w-80 rounded bg-white/[0.03] animate-pulse" />
      </div>
      <div className="mb-4 h-9 w-full rounded-lg bg-white/[0.03] animate-pulse" />
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-lg bg-white/[0.02] animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="mb-1.5 h-11 rounded-lg bg-white/[0.02] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ─── Mock data ───────────────────────────────────────────────────────────────

function buildMockPlaybook(profile: string, preset: string): ResolvedPlaybook {
  const blocked = profile === "work_pc";
  return {
    playbookName: "redcore-os-default",
    playbookVersion: "1.0.0",
    profile,
    preset,
    totalIncluded: 47,
    totalBlocked: blocked ? 12 : 2,
    totalOptional: 8,
    totalExpertOnly: 3,
    phases: [
      { id: "cleanup", name: "Bloatware Cleanup", actions: [
        { id: "appx.remove-consumer-bloat", name: "Remove Consumer Bloatware", description: "Candy Crush, TikTok, Solitaire, etc.", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "appx.remove-xbox-apps", name: "Remove Xbox Apps", description: "Xbox Game Bar, Identity Provider", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "appx.remove-edge", name: "Remove Microsoft Edge", description: "Force uninstall Edge browser", risk: "high", status: "ExpertOnly", default: false, expertOnly: true, blockedReason: null, requiresReboot: true, warningMessage: "Irreversible. Install alt browser first." },
      ]},
      { id: "privacy", name: "Privacy Hardening", actions: [
        { id: "privacy.disable-telemetry", name: "Disable Telemetry", description: "Set diagnostic data to minimum", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "privacy.disable-recall", name: "Disable Windows Recall", description: "Stop AI screen capture", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "privacy.disable-advertising-id", name: "Disable Advertising ID", description: "Reset ad tracking identifier", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "privacy.disable-location", name: "Disable Location", description: "Turn off location tracking", risk: "safe", status: blocked ? "Blocked" : "Included", default: true, expertOnly: false, blockedReason: blocked ? "Work PC: may affect VPN" : null, requiresReboot: false, warningMessage: null },
      ]},
      { id: "performance", name: "Performance", actions: [
        { id: "perf.mmcss-system-responsiveness", name: "MMCSS Responsiveness", description: "Allocate more CPU to games", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "perf.disable-game-dvr", name: "Disable Game DVR", description: "Stop background recording", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "cpu.disable-core-parking", name: "Disable Core Parking", description: "Keep all CPU cores active", risk: "medium", status: preset === "aggressive" ? "Included" : "Optional", default: false, expertOnly: false, blockedReason: null, requiresReboot: true, warningMessage: "Increases power consumption" },
      ]},
      { id: "shell", name: "Shell & Explorer", actions: [
        { id: "shell.disable-copilot", name: "Disable Copilot", description: "Remove AI sidebar from taskbar", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.show-file-extensions", name: "Show File Extensions", description: "Always show file type", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.enable-end-task", name: "Enable End Task in Taskbar", description: "Show End Task when right-clicking taskbar apps on Windows 11", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "shell.restore-classic-context-menu", name: "Classic Context Menu", description: "Full right-click menu", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
      ]},
      { id: "startup", name: "Startup & Power", actions: [
        { id: "startup.disable-background-apps", name: "Disable Background Apps", description: "Prevent UWP background activity", risk: "safe", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: false, warningMessage: null },
        { id: "power.disable-fast-startup", name: "Disable Fast Startup", description: "Use clean boot for stability", risk: "low", status: "Included", default: true, expertOnly: false, blockedReason: null, requiresReboot: true, warningMessage: null },
      ]},
    ],
    blockedReasons: blocked ? [
      { actionId: "services.disable-print-spooler", reason: "Work PC: printing required" },
      { actionId: "privacy.disable-location", reason: "Work PC: may affect VPN" },
    ] : [],
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlaybookReviewStep() {
  const { detectedProfile, playbookPreset, resolvedPlaybook, setResolvedPlaybook, setStepReady } = useWizardStore();
  const [loading, setLoading] = useState(!resolvedPlaybook);

  useEffect(() => {
    setStepReady("playbook-review", false);
    if (resolvedPlaybook) return;

    const load = async () => {
      const profile = detectedProfile?.id ?? "gaming_desktop";
      try {
        const { serviceCall } = await import("@/lib/service");
        const result = await serviceCall<ResolvedPlaybook>("playbook.resolve", {
          profile,
          preset: playbookPreset,
        });
        if (result.ok) {
          setResolvedPlaybook(result.data);
        } else {
          setResolvedPlaybook(buildMockPlaybook(profile, playbookPreset));
        }
      } catch {
        setResolvedPlaybook(buildMockPlaybook(profile, playbookPreset));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [detectedProfile, playbookPreset, resolvedPlaybook, setResolvedPlaybook, setStepReady]);

  useEffect(() => {
    setStepReady("playbook-review", !loading && Boolean(resolvedPlaybook));
  }, [loading, resolvedPlaybook, setStepReady]);

  if (loading) return <PlaybookSkeleton />;

  if (!resolvedPlaybook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-ink-secondary">Playbook not available</p>
      </div>
    );
  }

  const rebootCount = resolvedPlaybook.phases.reduce(
    (n, p) => n + p.actions.filter(a => a.status === "Included" && a.requiresReboot).length, 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full flex-col px-6 py-5 overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold tracking-tight text-ink">
          Transformation Playbook
        </h1>
        <p className="mt-1 text-[12px] text-ink-secondary">
          Review what will be changed on your{" "}
          <span className="font-medium text-ink">{detectedProfile?.label ?? "machine"}</span>
          {" "}using the{" "}
          <span className="font-medium text-ink">{playbookPreset}</span>
          {" "}preset.
        </p>
      </div>

      {/* Context bar */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <Shield className="h-3.5 w-3.5 shrink-0 text-brand-400" />
        <span className="text-[11px] text-ink-secondary">
          <span className="font-medium text-ink">{resolvedPlaybook.playbookName}</span>
          {" "}v{resolvedPlaybook.playbookVersion}
          {" · "}
          <span className="text-ink">{resolvedPlaybook.profile}</span>
          {" · "}
          <span className="text-ink">{resolvedPlaybook.preset}</span>
        </span>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { label: "Included", value: resolvedPlaybook.totalIncluded,   color: "text-green-400",   bg: "bg-green-500/8" },
          { label: "Blocked",  value: resolvedPlaybook.totalBlocked,    color: "text-red-400",     bg: "bg-red-500/8" },
          { label: "Optional", value: resolvedPlaybook.totalOptional,   color: "text-amber-400",   bg: "bg-amber-500/8" },
          { label: "Expert",   value: resolvedPlaybook.totalExpertOnly, color: "text-purple-400",  bg: "bg-purple-500/8" },
        ].map(({ label, value, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className={`rounded-lg border border-white/[0.06] ${bg} px-2.5 py-2 text-center`}
          >
            <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-tertiary">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Reboot notice */}
      {rebootCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2"
        >
          <Cpu className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="text-[11px] text-amber-400">
            {rebootCount} action{rebootCount !== 1 ? "s" : ""} require a restart to take effect
          </span>
        </motion.div>
      )}

      {/* Blocked reasons (Work PC) */}
      {resolvedPlaybook.blockedReasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          className="mb-3 rounded-lg border border-red-500/15 bg-red-500/[0.03] px-3 py-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/80 mb-1">
            Blocked by profile preservation
          </p>
          {resolvedPlaybook.blockedReasons.slice(0, 3).map((br) => (
            <p key={br.actionId} className="text-[11px] text-red-400/60 truncate">
              {br.actionId}: {br.reason}
            </p>
          ))}
          {resolvedPlaybook.blockedReasons.length > 3 && (
            <p className="text-[10px] text-red-400/40 mt-0.5">
              +{resolvedPlaybook.blockedReasons.length - 3} more
            </p>
          )}
        </motion.div>
      )}

      {/* Phase list — staggered entrance */}
      <div className="space-y-1.5">
        {resolvedPlaybook.phases.map((phase, i) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07, duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
          >
            <PhaseSection phase={phase} defaultOpen={i === 0} profile={resolvedPlaybook.profile} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
