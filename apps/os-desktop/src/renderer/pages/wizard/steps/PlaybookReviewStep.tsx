// ─── Playbook Review Step ────────────────────────────────────────────────────
// Shows the resolved playbook plan: included, blocked, optional, expert actions.
// Calls playbook.resolve via IPC and displays the result grouped by phase.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, AlertTriangle, Lock, ChevronDown } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { ResolvedPlaybook, PlaybookPhase } from "@/stores/wizard-store";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Included: "bg-green-500/15 text-green-400 border-green-500/20",
    Blocked: "bg-red-500/15 text-red-400 border-red-500/20",
    Optional: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    ExpertOnly: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    BuildGated: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.Blocked}`}>
      {status === "Included" && <Check className="mr-0.5 h-2.5 w-2.5" />}
      {status === "Blocked" && <X className="mr-0.5 h-2.5 w-2.5" />}
      {status === "ExpertOnly" && <Lock className="mr-0.5 h-2.5 w-2.5" />}
      {status}
    </span>
  );
}

function PhaseSection({ phase, defaultOpen }: { phase: PlaybookPhase; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const included = phase.actions.filter(a => a.status === "Included").length;
  const total = phase.actions.length;

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-ink">{phase.name}</span>
          <span className="text-[11px] text-ink-tertiary">{included}/{total} included</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-ink-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-white/[0.04] divide-y divide-white/[0.03]">
          {phase.actions.map((action) => (
            <div key={action.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-ink truncate">{action.name}</p>
                <p className="text-[11px] text-ink-tertiary truncate">{action.description}</p>
              </div>
              <div className="ml-3 shrink-0">
                <StatusBadge status={action.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlaybookReviewStep() {
  const { detectedProfile, resolvedPlaybook, setResolvedPlaybook, completeStep } = useWizardStore();
  const [loading, setLoading] = useState(!resolvedPlaybook);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedPlaybook) return;

    const load = async () => {
      try {
        const win = window as unknown as {
          redcore: { service: { call: (m: string, p: object) => Promise<ResolvedPlaybook> } };
        };
        const profile = detectedProfile?.id ?? "gaming_desktop";
        const result = await win.redcore.service.call("playbook.resolve", {
          profile,
          preset: detectedProfile?.isWorkPc ? "conservative" : "balanced",
        });
        setResolvedPlaybook(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load playbook");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [detectedProfile, resolvedPlaybook, setResolvedPlaybook]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-ink-secondary">Loading playbook...</p>
      </div>
    );
  }

  if (error || !resolvedPlaybook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-ink-secondary">{error ?? "Playbook not available"}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full flex-col px-6 py-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Transformation Playbook
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-secondary">
          Review what will be changed on your system. Blocked actions are filtered by your machine profile.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-5 flex gap-3">
        {[
          { label: "Included", value: resolvedPlaybook.totalIncluded, color: "text-green-400" },
          { label: "Blocked", value: resolvedPlaybook.totalBlocked, color: "text-red-400" },
          { label: "Optional", value: resolvedPlaybook.totalOptional, color: "text-amber-400" },
          { label: "Expert", value: resolvedPlaybook.totalExpertOnly, color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center">
            <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">{label}</p>
          </div>
        ))}
      </div>

      {/* Phase list */}
      <div className="space-y-2">
        {resolvedPlaybook.phases.map((phase, i) => (
          <PhaseSection key={phase.id} phase={phase} defaultOpen={i === 0} />
        ))}
      </div>
    </motion.div>
  );
}
