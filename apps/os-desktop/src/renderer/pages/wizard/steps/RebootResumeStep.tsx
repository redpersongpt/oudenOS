// Reboot / Resume Step
// If any executed action requires reboot, shows restart prompt.
// On resume, loads remainingActions from DB ledger and re-dispatches them.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";
import type { ExecutionJournalEntry } from "@/stores/wizard-store";
import { buildRebootJournalContext, getPendingRebootProvenanceRefs } from "@/lib/package-journal";

interface RemainingAction {
  actionId: string;
  actionName: string;
  phase: string;
  queuePosition: number;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  questionKeys: string[];
  selectedValues: string[];
  requiresReboot: boolean;
  riskLevel: string;
  expertOnly: boolean;
}

interface ResumeResponse {
  status: string;
  resumed: number;
  planId: string | null;
  packageId: string | null;
  packageRole: string | null;
  remainingActions: RemainingAction[];
}

interface JournalState {
  planId: string;
  requiresReboot: boolean;
  canResume: boolean;
  package: { packageId: string; packageRole: string; packageVersion: string | null } | null;
  pendingRebootProvenanceRefs: string[];
  currentActionProvenanceRef: string | null;
  totalRemaining?: number;
  steps: { status: string }[];
}

export function RebootResumeStep() {
  const { resolvedPlaybook, executionResult, detectedProfile, skipStep, completeStep, setExecutionResult } = useWizardStore();
  const [resumePhase, setResumePhase] = useState<"idle" | "resuming" | "executing" | "done">("idle");
  const [rebootError, setRebootError] = useState<string | null>(null);
  const [journalState, setJournalState] = useState<JournalState | null>(null);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [resumeProgress, setResumeProgress] = useState({ completed: 0, total: 0, failed: 0 });
  const abortRef = useRef<AbortController | null>(null);

  // Check if any included action requires reboot
  const needsReboot = resolvedPlaybook?.phases.some((phase) =>
    phase.actions.some((a) => a.status === "Included" && a.requiresReboot)
  ) ?? false;

  const { demoMode } = useWizardStore();

  // Auto-skip if no reboot needed OR if running in demo/simulated mode
  useEffect(() => {
    if (!needsReboot || demoMode) {
      const t = setTimeout(() => skipStep("reboot-resume"), 150);
      return () => clearTimeout(t);
    }
  }, [needsReboot, demoMode, skipStep]);

  useEffect(() => {
    if (!needsReboot) return;
    let cancelled = false;
    const loadJournalState = async () => {
      try {
        const { serviceCall } = await import("@/lib/service");
        const result = await serviceCall<JournalState | null>("journal.state");
        if (!cancelled && result.ok) {
          setJournalState(result.data);
        }
      } catch {
        // Non-fatal
      }
    };
    loadJournalState();
    return () => { cancelled = true; };
  }, [needsReboot]);

  if (!needsReboot || demoMode) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-4 rounded-sm border-2 border-[var(--text-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleRestart = async () => {
    setRebootError(null);
    try {
      const { serviceCall } = await import("@/lib/service");
      const result = await serviceCall("system.reboot", {
        reason: "playbook-reboot-required",
        journalContext: resolvedPlaybook
          ? buildRebootJournalContext(resolvedPlaybook, detectedProfile?.id)
          : undefined,
      });
      if (!result.ok) {
        setRebootError("Reboot failed. Please restart your computer manually.");
      }
    } catch {
      setRebootError("Reboot failed. Please restart your computer manually.");
    }
  };

  const handleSkip = () => {
    completeStep("reboot-resume");
  };

  // True resume: load remaining actions from DB ledger and re-dispatch
  const handleResume = async () => {
    setResumePhase("resuming");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { serviceCall } = await import("@/lib/service");

      // Call journal.resume — returns remainingActions from DB ledger
      const resumeResult = await serviceCall<ResumeResponse>("journal.resume");
      if (!resumeResult.ok) {
        setResumePhase("done");
        completeStep("reboot-resume");
        return;
      }

      const { remainingActions, planId } = resumeResult.data;

      // If no remaining actions, resume is complete
      if (!remainingActions || remainingActions.length === 0) {
        setResumePhase("done");
        completeStep("reboot-resume");
        return;
      }

      // Re-dispatch remaining actions through execute.applyAction
      setResumePhase("executing");
      setResumeProgress({ completed: 0, total: remainingActions.length, failed: 0 });

      const resumeJournal: ExecutionJournalEntry[] = [];
      let localCompleted = 0;
      let localFailed = 0;

      for (const action of remainingActions) {
        if (controller.signal.aborted) break;

        setCurrentAction(action.actionName);

        // Mark started in DB ledger
        serviceCall("ledger.markStarted", {
          planId,
          actionId: action.actionId,
        }).catch(() => {});

        const startedAt = new Date().toISOString();

        // Execute the action via the Rust service
        const execResult = await serviceCall<Record<string, unknown>>("execute.applyAction", {
          actionId: action.actionId,
          journalContext: planId ? {
            package: {
              planId,
              packageId: resumeResult.data.packageId ?? "ouden-os",
              packageRole: resumeResult.data.packageRole ?? "user-resolved",
              packageVersion: null,
              packageSourceRef: action.packageSourceRef,
              actionProvenanceRef: action.provenanceRef,
              executionJournalRef: "state/execution-journal.json",
              sourceCommit: null,
            },
            action: {
              actionId: action.actionId,
              label: action.actionName,
              phase: action.phase,
              packageSourceRef: action.packageSourceRef,
              provenanceRef: action.provenanceRef,
              questionKeys: action.questionKeys,
              selectedValues: action.selectedValues.map(String),
              requiresReboot: action.requiresReboot,
            },
          } : undefined,
        });

        const finishedAt = new Date().toISOString();
        let status: "applied" | "failed" = "failed";

        if (execResult.ok) {
          const rpcStatus = typeof execResult.data.status === "string" ? execResult.data.status : "failed";
          const nestedFailures = typeof execResult.data.failed === "number" ? execResult.data.failed : 0;
          status = rpcStatus === "success" && nestedFailures === 0 ? "applied" : "failed";
        }

        if (status === "applied") {
          localCompleted++;
        } else {
          localFailed++;
        }

        // Record in DB ledger (fire-and-forget — execute.applyAction already dual-writes)
        resumeJournal.push({
          id: `journal.resume.${action.actionId}`,
          kind: "playbook-action",
          actionId: action.actionId,
          label: action.actionName,
          phase: action.phase,
          status,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
          questionKeys: action.questionKeys,
          selectedValues: action.selectedValues,
          packageSourceRef: action.packageSourceRef,
          provenanceRef: action.provenanceRef,
          resultRef: `state/execution-journal.json#/resume/${action.actionId}`,
          errorMessage: status === "failed" ? "Resumed action execution failed." : null,
        });

        setResumeProgress({ completed: localCompleted, total: remainingActions.length, failed: localFailed });
      }

      setCurrentAction(null);

      // Complete the plan in DB ledger
      if (planId) {
        serviceCall("ledger.completePlan", { planId }).catch(() => {});
      }

      // Merge resume journal into existing execution result
      const existing = executionResult;
      if (existing) {
        setExecutionResult({
          ...existing,
          applied: existing.applied + localCompleted,
          failed: existing.failed + localFailed,
          journal: [...existing.journal, ...resumeJournal],
        });
      }

      setResumePhase("done");
      completeStep("reboot-resume");
    } catch (e) {
      console.error("[RebootResumeStep] Resume execution error:", e);
      setResumePhase("done");
      completeStep("reboot-resume");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      {resumePhase === "executing" ? (
        <>
          {/* Active resume execution UI */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-14 w-14 items-center justify-center rounded-sm border border-[var(--border-visible)] bg-white/5"
          >
            <Loader2 className="h-7 w-7 text-[var(--text-primary)] animate-spin" />
          </motion.div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Resuming Execution</h2>
            <p className="max-w-sm text-xs text-[var(--text-secondary)]">
              Applying remaining actions from the service execution ledger
            </p>
          </div>

          <AnimatePresence mode="wait">
            {currentAction && (
              <motion.div
                key={currentAction}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="w-full max-w-md rounded-xl border border-[var(--border-visible)] bg-white/5 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
                    className="h-4 w-4 shrink-0 rounded-sm border-2 border-[var(--text-primary)] border-t-transparent"
                  />
                  <span className="flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">{currentAction}</span>
                  <span className="shrink-0 font-mono-metric text-[10px] text-[var(--text-secondary)]">
                    {resumeProgress.completed + resumeProgress.failed}/{resumeProgress.total}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-full max-w-md">
            <div className="relative h-1.5 overflow-hidden rounded-sm bg-white/[0.06]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-sm bg-[var(--text-primary)]"
                animate={{ width: `${resumeProgress.total > 0 ? Math.round(((resumeProgress.completed + resumeProgress.failed) / resumeProgress.total) * 100) : 0}%` }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-[var(--text-secondary)] font-mono-metric">
              <span>{resumeProgress.completed} applied</span>
              {resumeProgress.failed > 0 && <span className="text-[#FF6B6B]">{resumeProgress.failed} failed</span>}
              <span>{resumeProgress.total - resumeProgress.completed - resumeProgress.failed} remaining</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Standard reboot/resume prompt */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 16 }}
            className="flex h-14 w-14 items-center justify-center rounded-sm border border-white/[0.12] bg-white/[0.04]"
          >
            <RotateCw className="h-7 w-7 text-[var(--text-display)]" />
          </motion.div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Restart Recommended</h2>
            <p className="max-w-sm text-xs text-[var(--text-secondary)]">
              Some optimizations require a restart to take effect. You can restart now or continue and restart later.
            </p>
            {resolvedPlaybook && (
              <p className="max-w-sm text-[10px] text-[var(--text-secondary)]">
                Resume chain: {journalState?.planId ?? buildRebootJournalContext(resolvedPlaybook, detectedProfile?.id).planId}
                {" · "}
                {journalState?.totalRemaining ?? (journalState?.pendingRebootProvenanceRefs.length ?? getPendingRebootProvenanceRefs(resolvedPlaybook, executionResult).length)} pending actions
              </p>
            )}
          </div>

          {rebootError && (
            <div className="flex items-center gap-2 rounded-sm border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-[#FF6B6B]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {rebootError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="primary" size="md" onClick={handleRestart} icon={<RotateCw className="h-4 w-4" />}>
              Restart Now
            </Button>
            <Button variant="secondary" size="md" onClick={handleResume} disabled={resumePhase === "resuming"}>
              {resumePhase === "resuming" ? "Loading..." : "Resume Without Restart"}
            </Button>
          </div>

          <button onClick={handleSkip} className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors">
            Skip and restart later
          </button>
        </>
      )}
    </motion.div>
  );
}
