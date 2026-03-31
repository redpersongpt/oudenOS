// ─── Execution Step ───────────────────────────────────────────────────────────
// Live execution screen. No bottom bar (WizardShell suppresses it).
// Reads included actions from resolvedPlaybook, executes each via IPC.
// Calls execute.applyAction for each action via window.redcore.service.call.

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { ActionDecisionProvenance, ExecutionJournalEntry } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { getActionRationale } from "@/lib/expert-rationale";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";
import { buildExecutionJournalContext } from "@/lib/package-journal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExecutableAction {
  id: string;
  name: string;
  phase: string;
  provenance: ActionDecisionProvenance | null;
}

interface CompletedAction {
  label: string;
  actionId: string;
  status: "applied" | "failed";
  packageSourceRef: string | null;
  provenanceRef: string | null;
}

interface AppInstallProgress {
  requested: number;
  installed: number;
  failed: number;
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({ action }: { action: CompletedAction }) {
  const failed = action.status === "failed";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10, height: 0 }}
      animate={
        failed
          ? { opacity: 1, x: [0, -5, 5, -3, 3, -1, 0], height: "auto" }
          : { opacity: 1, x: 0, height: "auto" }
      }
      transition={
        failed
          ? { duration: 0.44, ease: "easeOut" }
          : { duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] }
      }
      className="flex items-center gap-2.5 py-1"
    >
      {action.status === "applied" ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success-400" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger-400" />
      )}
      <span className="text-[11px] text-ink-secondary truncate">{action.label}</span>
      <span className={`ml-auto shrink-0 text-[10px] font-medium ${
        action.status === "applied" ? "text-success-400/60" : "text-danger-400/60"
      }`}>
        {action.status}
      </span>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExecutionStep() {
  const { detectedProfile, resolvedPlaybook, selectedAppIds, personalization, demoMode, completeStep, setExecutionResult, setResolvedPlaybook } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const effectivePersonalization = useMemo(
    () => resolveEffectivePersonalization(detectedProfile?.id, personalization, answers),
    [answers, detectedProfile?.id, personalization],
  );

  // ── Build action queue from resolved playbook ──
  const actionQueue = useMemo<ExecutableAction[]>(() => {
    if (!resolvedPlaybook) return [];
    const provenanceByAction = new Map(
      (resolvedPlaybook.actionProvenance ?? []).map((entry) => [entry.actionId, entry] as const),
    );
    const queue: ExecutableAction[] = [];
    for (const phase of resolvedPlaybook.phases) {
      for (const action of phase.actions) {
        if (action.status === "Included") {
          queue.push({
            id: action.id,
            name: action.name,
            phase: phase.name,
            provenance: provenanceByAction.get(action.id) ?? null,
          });
        }
      }
    }
    return queue;
  }, [resolvedPlaybook]);

  const totalActions = actionQueue.length + selectedAppIds.length + 1;

  const [currentIdx,    setCurrentIdx]    = useState(-1);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase]   = useState<string | null>(null);
  const [completed,     setCompleted]     = useState<CompletedAction[]>([]);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const started     = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const applied   = completed.filter((c) => c.status === "applied").length;
  const failCount = completed.filter((c) => c.status === "failed").length;
  const remaining = Math.max(0, totalActions - completed.length - (currentAction ? 1 : 0));
  const progress  = totalActions > 0
    ? Math.round((completed.length / totalActions) * 100)
    : 0;

  useEffect(() => {
    if (started.current || totalActions === 0) return;
    started.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    const exec = async () => {
      const playbook = resolvedPlaybook;
      if (!playbook) return;
      const { serviceCall } = await import("@/lib/service");
      let localFailed = 0;
      let operationIndex = 0;
      const journalEntries: ExecutionJournalEntry[] = [];

      // ── Create DB-backed execution plan (service ledger) ──
      const planId = playbook.packageRefs?.planId ?? `plan-${Date.now()}`;
      try {
        const ledgerActions = actionQueue.map((action, idx) => ({
          actionId: action.id,
          actionName: action.name,
          phase: action.phase,
          queuePosition: idx,
          inclusionReason: action.provenance?.inclusionReason ?? null,
          blockedReason: null,
          preservedReason: null,
          riskLevel: action.provenance?.riskLevel ?? "safe",
          expertOnly: action.provenance?.expertOnly ?? false,
          requiresReboot: action.provenance?.requiresReboot ?? false,
          packageSourceRef: action.provenance?.packageSourceRef ?? null,
          provenanceRef: action.provenance?.packageSourceRef ?? null,
          questionKeys: action.provenance?.sourceQuestionIds ?? [],
          selectedValues: (action.provenance?.sourceOptionValues ?? []).map(String),
        }));

        await serviceCall("ledger.createPlan", {
          package: {
            planId,
            packageId: playbook.packageRefs?.packageId ?? "redcore-os",
            packageRole: playbook.packageRefs?.packageRole ?? "user-resolved",
            packageVersion: playbook.packageRefs?.packageVersion ?? null,
            packageSourceRef: playbook.packageRefs?.packageSourceRef ?? null,
            actionProvenanceRef: playbook.packageRefs?.actionProvenanceRef ?? null,
            executionJournalRef: playbook.packageRefs?.executionJournalRef ?? null,
            sourceCommit: playbook.packageRefs?.sourceCommit ?? null,
          },
          profile: detectedProfile?.id ?? "gaming_desktop",
          preset: playbook.preset ?? "balanced",
          actions: ledgerActions,
        });
      } catch (e) {
        console.warn("[ExecutionStep] Failed to create DB ledger plan (non-fatal):", e);
      }

      // ── Phase 1: Apply playbook actions ──
      for (let i = 0; i < actionQueue.length; i++) {
        if (controller.signal.aborted) return;
        const action = actionQueue[i];
        const startedAt = new Date().toISOString();

        setCurrentIdx(operationIndex);
        setCurrentAction(action.name);
        setCurrentActionId(action.id);
        setCurrentPhase(action.phase);

        // Mark started in DB ledger
        serviceCall("ledger.markStarted", { planId, actionId: action.id }).catch(() => {});

        let status: "applied" | "failed" = "failed";
        const result = await serviceCall<Record<string, unknown>>("execute.applyAction", {
          actionId: action.id,
          journalContext: action.provenance
            ? buildExecutionJournalContext(playbook, action.provenance, detectedProfile?.id)
            : undefined,
        });
        const resultData = result.ok ? result.data : null;
        if (result.ok) {
          const rpcStatus = typeof result.data.status === "string" ? result.data.status : "failed";
          const nestedFailures = typeof result.data.failed === "number" ? result.data.failed : 0;
          status = rpcStatus === "success" && nestedFailures === 0 ? "applied" : "failed";
        } else if (demoMode) {
          // Explicit demo mode only — never fake success in the real runtime.
          await new Promise<void>((resolve) => {
            timerRef.current = setTimeout(resolve, 180 + Math.random() * 140);
          });
          status = "applied";
        }

        if (controller.signal.aborted) return;
        setCurrentAction(null);
        if (status === "failed") {
          localFailed++;
        }

        // Record result in DB ledger (fire-and-forget)
        serviceCall("ledger.recordResult", {
          planId,
          result: {
            actionId: action.id,
            status: status === "applied" ? "success" : "failed",
            rollbackSnapshotId: null,
            errorMessage: status === "failed" ? "Action execution returned a failure status." : null,
            durationMs: null,
          },
        }).catch(() => {});

        const finishedAt = new Date().toISOString();
        const completedEntry: CompletedAction = {
          label: action.name,
          actionId: action.id,
          status,
          packageSourceRef: action.provenance?.packageSourceRef ?? null,
          provenanceRef: action.provenance?.packageSourceRef ?? null,
        };
        const journalEntry: ExecutionJournalEntry = {
          id: `journal.playbook.${action.id}`,
          kind: "playbook-action",
          actionId: action.id,
          label: action.name,
          phase: action.phase,
          status,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
          questionKeys: action.provenance?.sourceQuestionIds ?? [],
          selectedValues: action.provenance?.sourceOptionValues ?? [],
          packageSourceRef: typeof resultData?.packageSourceRef === "string"
            ? resultData.packageSourceRef
            : action.provenance?.packageSourceRef ?? null,
          provenanceRef: typeof resultData?.provenanceRef === "string"
            ? resultData.provenanceRef
            : action.provenance?.packageSourceRef ?? null,
          resultRef: typeof resultData?.journalRef === "string"
            ? resultData.journalRef
            : `${playbook.packageRefs?.executionJournalRef ?? "state/execution-journal.json"}#/entries/${journalEntries.length}`,
          errorMessage: status === "failed" ? "Action execution returned a failure status." : null,
        };
        journalEntries.push(journalEntry);
        setCompleted((prev) => [...prev, completedEntry]);
        operationIndex += 1;

        requestAnimationFrame(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
          }
        });
      }

      if (controller.signal.aborted) return;

      // ── Phase 2: Apply personalization ──
      let personalizationFailed = false;
      let personalizationApplied = false;
      const personalizationStartedAt = new Date().toISOString();
      try {
        setCurrentIdx(operationIndex);
        setCurrentAction("Applying personalization");
        setCurrentActionId("personalize.apply");
        setCurrentPhase("Personalization");
        const persResult = await serviceCall("personalize.apply", {
          profile: detectedProfile?.id ?? "gaming_desktop",
          options: effectivePersonalization,
        });
        if (!persResult.ok) {
          personalizationFailed = true;
        } else {
          const payload = persResult.data as { status?: unknown; failed?: unknown } | undefined;
          const rpcStatus = typeof payload?.status === "string" ? payload.status : "failed";
          const failedCount = typeof payload?.failed === "number" ? payload.failed : 0;
          personalizationFailed = rpcStatus !== "success" || failedCount > 0;
          personalizationApplied = !personalizationFailed;
        }
      } catch {
        personalizationFailed = true;
      }
      setCurrentAction(null);
      const personalizationFinishedAt = new Date().toISOString();
      const personalizationStatus = personalizationFailed ? "failed" : "applied";
      journalEntries.push({
        id: "journal.personalization.apply",
        kind: "personalization",
        actionId: "personalize.apply",
        label: "Apply personalization",
        phase: "Personalization",
        status: personalizationStatus,
        startedAt: personalizationStartedAt,
        finishedAt: personalizationFinishedAt,
        durationMs: Math.max(0, new Date(personalizationFinishedAt).getTime() - new Date(personalizationStartedAt).getTime()),
        questionKeys: ["disableTransparency"],
        selectedValues: [],
        packageSourceRef: playbook.packageRefs?.decisionSummaryRef ?? null,
        provenanceRef: null,
        resultRef: `${playbook.packageRefs?.executionJournalRef ?? "state/execution-journal.json"}#/entries/${journalEntries.length}`,
        errorMessage: personalizationFailed ? "Personalization apply failed." : null,
      });
      setCompleted((prev) => [
        ...prev,
        {
          label: "Apply personalization",
          actionId: "personalize.apply",
          status: personalizationStatus,
          packageSourceRef: playbook.packageRefs?.decisionSummaryRef ?? null,
          provenanceRef: null,
        },
      ]);
      operationIndex += 1;

      // ── Phase 3: Install selected apps ──
      let appInstallProgress: AppInstallProgress = {
        requested: selectedAppIds.length,
        installed: 0,
        failed: 0,
      };
      if (selectedAppIds.length > 0) {
        try {
          const appResult = await serviceCall("appbundle.resolve", {
            profile: detectedProfile?.id ?? "gaming_desktop",
            selectedApps: selectedAppIds,
          });
          if (!appResult.ok) {
            appInstallProgress.failed = selectedAppIds.length;
          } else {
            const payload = appResult.data as { installQueue?: Array<{ id: string; name: string }> } | undefined;
            const installQueue = Array.isArray(payload?.installQueue) ? payload.installQueue : [];

            for (const app of installQueue) {
              if (controller.signal.aborted) return;
              const appStartedAt = new Date().toISOString();

              setCurrentIdx(operationIndex);
              setCurrentAction(`Installing ${app.name}`);
              setCurrentActionId(`app.${app.id}`);
              setCurrentPhase("App Setup");

              let status: "applied" | "failed" = "failed";
              const installResult = await serviceCall<{
                status?: unknown;
                error?: unknown;
                name?: unknown;
              }>("appbundle.install", { appId: app.id });

              if (installResult.ok) {
                const rpcStatus = typeof installResult.data.status === "string" ? installResult.data.status : "failed";
                status = rpcStatus === "installed" || rpcStatus === "skipped" ? "applied" : "failed";
              } else if (demoMode) {
                await new Promise<void>((resolve) => {
                  timerRef.current = setTimeout(resolve, 180 + Math.random() * 140);
                });
                status = "applied";
              }

              if (status === "applied") {
                appInstallProgress.installed += 1;
              } else {
                appInstallProgress.failed += 1;
              }

              setCurrentAction(null);
              const appFinishedAt = new Date().toISOString();
              journalEntries.push({
                id: `journal.app.${app.id}`,
                kind: "app-install",
                actionId: `app.${app.id}`,
                label: `Install ${app.name}`,
                phase: "App Setup",
                status,
                startedAt: appStartedAt,
                finishedAt: appFinishedAt,
                durationMs: Math.max(0, new Date(appFinishedAt).getTime() - new Date(appStartedAt).getTime()),
                questionKeys: [],
                selectedValues: [app.id],
                packageSourceRef: "state/selected-apps.json",
                provenanceRef: null,
                resultRef: `${playbook.packageRefs?.executionJournalRef ?? "state/execution-journal.json"}#/entries/${journalEntries.length}`,
                errorMessage: status === "failed" ? `App install failed for ${app.name}.` : null,
              });
              setCompleted((prev) => [
                ...prev,
                {
                  label: `Install ${app.name}`,
                  actionId: `app.${app.id}`,
                  status,
                  packageSourceRef: "state/selected-apps.json",
                  provenanceRef: null,
                },
              ]);
              operationIndex += 1;

              requestAnimationFrame(() => {
                if (timelineRef.current) {
                  timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
                }
              });
            }
          }
        } catch {
          appInstallProgress.failed = selectedAppIds.length;
        }
      }

      if (controller.signal.aborted) return;

      // ── Done: complete ledger plan, then read authoritative final state ──
      await serviceCall("ledger.completePlan", { planId }).catch(() => {});

      // Query ledger for authoritative final counts
      const ledgerResult = await serviceCall<{
        totalCompleted?: number;
        totalFailed?: number;
        totalRemaining?: number;
        status?: string;
        steps?: Array<{ actionId: string; status: string }>;
      }>("ledger.query", { planId });

      const ledgerApplied = ledgerResult.ok && typeof ledgerResult.data?.totalCompleted === "number"
        ? ledgerResult.data.totalCompleted
        : journalEntries.filter((entry) => entry.status === "applied").length;
      const ledgerFailed = ledgerResult.ok && typeof ledgerResult.data?.totalFailed === "number"
        ? ledgerResult.data.totalFailed
        : journalEntries.filter((entry) => entry.status === "failed").length;

      const skipped = personalizationFailed ? 1 : 0;
      const executionJournalRef = playbook.packageRefs?.executionJournalRef ?? "state/execution-journal.json";
      const actionProvenance = (playbook.actionProvenance ?? []).map((entry) => {
        const matchingJournalRefs = journalEntries
          .filter((journalEntry) => journalEntry.actionId === entry.actionId)
          .map((journalEntry) => `${executionJournalRef}#/entries/${journalEntries.indexOf(journalEntry)}`);
        return {
          ...entry,
          journalRecordRefs: matchingJournalRefs,
          executionResultRef: matchingJournalRefs[0] ?? null,
        };
      });
      const executionAwarePlaybook = {
        ...playbook,
        actionProvenance,
      };
      setResolvedPlaybook(executionAwarePlaybook);
      setExecutionResult({
        applied: ledgerApplied,
        failed: ledgerFailed,
        skipped,
        preserved: executionAwarePlaybook.totalBlocked,
        personalizationApplied,
        appInstall: appInstallProgress,
        packageKind: "user-resolved",
        packageRefs: executionAwarePlaybook.packageRefs ?? null,
        journal: journalEntries,
      });

      timerRef.current = setTimeout(() => completeStep("execution"), 800);
    };

    exec().catch((err) => {
      console.error("[ExecutionStep] Unexpected execution error:", err);
      // Treat as complete with all failed so the wizard can still advance
      setExecutionResult({
        applied: 0,
        failed: actionQueue.length,
        skipped: 0,
        preserved: resolvedPlaybook?.totalBlocked ?? 0,
        personalizationApplied: false,
        appInstall: {
          requested: selectedAppIds.length,
          installed: 0,
          failed: selectedAppIds.length,
        },
        packageKind: "user-resolved",
        packageRefs: resolvedPlaybook?.packageRefs ?? null,
        journal: [],
      });
      setTimeout(() => completeStep("execution"), 800);
    });

    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No playbook = nothing to execute (checked before useEffect starts)
  if (!resolvedPlaybook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8">
        <AlertCircle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-ink-secondary">No playbook actions resolved. Go back and review your playbook.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-semibold text-ink">Applying Transformations</h2>
        <p className="text-xs text-ink-secondary">Do not shut down your computer</p>
      </div>

      {/* Current action card */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {currentAction ? (
            <motion.div
              key={currentAction}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                boxShadow: "0 0 0 0 rgba(232,69,60,0.0)",
                animation: "executionPulse 1.5s ease-in-out infinite",
              }}
              className="rounded-xl border border-brand-500/25 bg-brand-500/[0.06] px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
                  className="h-4 w-4 shrink-0 rounded-full border-2 border-brand-500 border-t-transparent"
                />
                <span className="flex-1 truncate text-[13px] font-medium text-ink">{currentAction}</span>
                <span className="shrink-0 font-mono-metric text-[10px] text-brand-500/60">
                  {currentIdx + 1}/{totalActions}
                </span>
              </div>
              {/* Expert rationale — why this action is running */}
              {currentActionId && (() => {
                const r = getActionRationale(currentActionId);
                return r.why ? (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-ink-tertiary pl-7">{r.why}</p>
                ) : null;
              })()}
              {currentPhase && (
                <p className="mt-0.5 text-[9px] text-ink-muted pl-7">{currentPhase}</p>
              )}
            </motion.div>
          ) : completed.length === totalActions ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 340, damping: 16 }}
              className="flex items-center justify-center gap-3 rounded-xl border border-success-500/25 bg-success-500/[0.06] px-5 py-3.5"
            >
              <Check className="h-4 w-4 text-success-400" />
              <span className="text-sm font-medium text-success-300">All actions complete</span>
            </motion.div>
          ) : (
            <div className="h-[50px]" />
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="w-full max-w-md">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          <span className="font-mono-metric text-[10px] text-ink-tertiary">{progress}%</span>
          <span className="font-mono-metric text-[10px] text-ink-tertiary">
            {completed.length}/{totalActions}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-center">
        {[
          { label: "Applied",   value: applied,    color: "text-success-400"   },
          { label: "Failed",    value: failCount,  color: "text-danger-400"    },
          { label: "Remaining", value: remaining,  color: "text-ink-secondary" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5">
            <motion.span
              key={stat.value}
              initial={{ scale: 0.75, opacity: 0.4 }}
              animate={{ scale: 1,    opacity: 1   }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
              className={`font-mono-metric text-xl font-semibold ${stat.color}`}
            >
              {stat.value}
            </motion.span>
            <span className="text-[10px] text-ink-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Completed timeline */}
      <div
        ref={timelineRef}
        className="w-full max-w-md overflow-y-auto scrollbar-none"
        style={{ maxHeight: "120px" }}
      >
        <div className="flex flex-col divide-y divide-white/[0.03] px-1">
          {(completed as CompletedAction[]).map((action, i) => (
            <TimelineItem key={`${action.label}-${i}`} action={action} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
