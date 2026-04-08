// Execution Step
// Live execution screen. No bottom bar (WizardShell suppresses it).
// Reads included actions from resolvedPlaybook, executes each via IPC.
// Calls execute.applyAction for each action via the platform service bridge.

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { ActionDecisionProvenance, ExecutionJournalEntry } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { useLogStore } from "@/stores/log-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";
import { buildExecutionJournalContext } from "@/lib/package-journal";
import { buildMockResolvedPlaybook } from "@/lib/mock-playbook";

// Spinning quotes — personality while you wait

const SPINNING_QUOTES = [
  "backing up your stuff first, obviously...",
  "petting windows gently...",
  "cortana's packing her bags...",
  "teaching windows what 'no' means...",
  "removing apps you literally never opened...",
  "edge is throwing a tantrum rn...",
  "windows update can't touch you here...",
  "candy crush again? seriously microsoft?",
  "bing called. we hung up.",
  "bill gates is mildly annoyed...",
  "solitaire had a good run lmfao...",
  "remember when PCs just... worked?",
  "one does not simply debloat windows...",
  "200+ background services btw. two hundred.",
  "undoing microsoft's life choices...",
  "windows is basically an ad platform at this point...",
  "45GB for an OS. let that sink in.",
  "bye cortana, won't miss you...",
  "who even asked for a weather widget?",
  "onedrive can go drive itself...",
  "no microsoft, i don't want edge. stop asking.",
  "removing bing integration #17...",
  "game bar? nah we're good...",
  "disabling 'helpful' tips that help nobody...",
  "win11 start menu: less is more right?",
  "smartscreen, i AM the smart one here...",
  "microsoft rewards? more like microsoft tax...",
  "widget panel of doom: eliminated.",
  "clippy's spiritual successor: also eliminated.",
  "tweaking your package ( ͡° ͜ʖ ͡°)",
  "your RAM just sighed with relief...",
  "whispering sweet nothings to your CPU...",
  "the registry is shaking rn...",
  "your SSD is doing a happy dance...",
  "negotiating with the kernel...",
  "feeding your CPU some redbull...",
  "your disk I/O just hit a new PR...",
  "compiling happiness.exe...",
  "sudo make me a sandwich...",
  "rm -rf /bloat...",
  "git commit -m 'bye bloat'...",
  "broke student energy, donate if you can ( ͡° ͜ʖ ͡°)",
  "this is what freedom feels like...",
  "removing digital cholesterol...",
  "reject bloat, return to performance...",
  "your PC is about to feel brand new...",
  "making task manager proud...",
  "unfriending microsoft telemetry...",
  "sending clippy into retirement...",
  "if you're reading this you're patient af...",
  "grab a coffee, we're cooking...",
  "trust the process...",
  "this PC is gonna be FAST...",
  "almost as satisfying as peeling screen protectors...",
  "your future self will thank you for this...",
  "doing what microsoft should've done from day one...",
  "free your PC, free your mind...",
  "cheaper than buying a new PC tbh...",
  "less bloat = less heat = quieter fans...",
  "you're basically a hacker now congrats...",
  "loading... jk we're actually working...",
  "fun fact: fresh windows uses 4GB RAM idle. FOUR.",
  "after this: probably 1.8GB idle. you're welcome.",
  "we're not deleting System32. probably.",
  "the FPS gods smile upon you...",
  "edge is crying in the corner...",
  "satya nadella has left the chat...",
  "plot twist: windows was the bloatware all along...",
];

// Types

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
  errorMessage?: string;
  packageSourceRef: string | null;
  provenanceRef: string | null;
}

// Animated counter using spring physics
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 90, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v).toString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}

// Stat tile — clean with icon indicator
function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "danger";
}) {
  const valueColor =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "danger"
        ? "text-[#FF6B6B]"
        : "text-[var(--text-display)]";

  const dotColor =
    tone === "success"
      ? "bg-[var(--success)]"
      : tone === "danger"
        ? "bg-[#FF6B6B]"
        : "bg-[var(--text-disabled)]";

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] rounded-sm px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{label}</span>
      </div>
      <p className={`font-data text-[26px] leading-none ${valueColor}`}>
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </p>
    </div>
  );
}

// Timeline item — card-style row
function TimelineItem({ action, index }: { action: CompletedAction; index: number }) {
  const failed = action.status === "failed";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={
        failed
          ? { opacity: 1, y: 0, x: [0, -3, 3, -2, 2, 0] }
          : { opacity: 1, y: 0 }
      }
      transition={{ duration: 0.2, delay: 0.02, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${
        failed ? "bg-[#FF6B6B]/[0.04]" : index % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
      }`}
    >
      {/* Status indicator */}
      <div className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
        failed ? "bg-[#FF6B6B]/10" : "bg-[var(--success)]/10"
      }`}>
        {failed ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 3l4 4M7 3l-4 4" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <motion.path
              d="M2.5 5l2 2 3-3"
              stroke="var(--success)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, delay: 0.05 }}
            />
          </svg>
        )}
      </div>

      {/* Action name */}
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] truncate ${failed ? "text-[#FF6B6B]/80" : "text-[var(--text-primary)]"}`}>
          {action.label}
        </p>
        {failed && action.errorMessage && (
          <p className="text-[9px] text-[#FF6B6B]/40 truncate mt-0.5" title={action.errorMessage}>
            {action.errorMessage}
          </p>
        )}
      </div>

      {/* Status badge */}
      <span className={`shrink-0 text-[9px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
        failed
          ? "bg-[#FF6B6B]/10 text-[#FF6B6B]/70"
          : "bg-[var(--success)]/10 text-[var(--success)]/70"
      }`}>
        {failed ? "fail" : "ok"}
      </span>
    </motion.div>
  );
}

// Spinning Quote — italic, fade transition
function SpinningQuote({ isActive }: { isActive: boolean }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * SPINNING_QUOTES.length));

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setIdx((prev) => {
        let next: number;
        do { next = Math.floor(Math.random() * SPINNING_QUOTES.length); } while (next === prev && SPINNING_QUOTES.length > 1);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={idx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.7, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35, ease: [0.0, 0.0, 0.2, 1.0] }}
        className="text-[11px] italic text-[var(--text-secondary)] select-none text-center mt-2"
      >
        {SPINNING_QUOTES[idx]}
      </motion.p>
    </AnimatePresence>
  );
}

// Component

export function ExecutionStep() {
  const { detectedProfile, resolvedPlaybook, personalization, demoMode, completeStep, setExecutionResult, setResolvedPlaybook } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const addLogEntry = useLogStore((state) => state.addEntry);
  const effectivePersonalization = useMemo(
    () => resolveEffectivePersonalization(detectedProfile?.id, personalization, answers),
    [answers, detectedProfile?.id, personalization],
  );

  // In demo mode, if no playbook was resolved (e.g. service unavailable), build a mock
  useEffect(() => {
    if (demoMode && !resolvedPlaybook) {
      const profile = detectedProfile?.id ?? "gaming_desktop";
      const mock = buildMockResolvedPlaybook(profile, "aggressive");
      setResolvedPlaybook(mock);
    }
  }, [demoMode, resolvedPlaybook, detectedProfile?.id, setResolvedPlaybook]);

  // Build action queue from resolved playbook
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

  const totalActions = actionQueue.length + 1; // +1 for personalization

  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [_currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase]   = useState<string | null>(null);
  const [completed,     setCompleted]     = useState<CompletedAction[]>([]);
  const [completionTruth, setCompletionTruth] = useState<string | null>(null);
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

  const isDone = !currentAction && completed.length === totalActions;

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

      addLogEntry({ level: "info", category: "Execution", message: `Starting execution with ${actionQueue.length} actions` });

      // Create DB-backed execution plan (service ledger)
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
            packageId: playbook.packageRefs?.packageId ?? "ouden-os",
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

      // Phase 1: Apply playbook actions
      for (let i = 0; i < actionQueue.length; i++) {
        if (controller.signal.aborted) return;
        const action = actionQueue[i];
        const startedAt = new Date().toISOString();

        setCurrentAction(action.name);
        setCurrentActionId(action.id);
        setCurrentPhase(action.phase);

        // Mark started in DB ledger
        serviceCall("ledger.markStarted", { planId, actionId: action.id }).catch(() => {});

        addLogEntry({ level: "info", category: "Action", message: `Starting: ${action.name}`, details: `actionId=${action.id}, phase=${action.phase}` });

        let status: "applied" | "failed" = "failed";
        let errorMessage: string | null = null;
        const isExpert = action.provenance?.expertOnly ?? false;
        const result = await serviceCall<Record<string, unknown>>("execute.applyAction", {
          actionId: action.id,
          ...(isExpert ? { expertConfirmed: true } : {}),
          journalContext: action.provenance
            ? buildExecutionJournalContext(playbook, action.provenance, detectedProfile?.id)
            : undefined,
        });
        const resultData = result.ok ? result.data : null;
        if (result.ok) {
          const rpcStatus = typeof result.data.status === "string" ? result.data.status : "failed";
          const nestedFailures = typeof result.data.failed === "number" ? result.data.failed : 0;
          status = rpcStatus === "success" && nestedFailures === 0 ? "applied" : "failed";
          if (status === "failed") {
            errorMessage =
              (typeof result.data.error === "string" ? result.data.error : null)
              ?? (typeof result.data.message === "string" ? result.data.message : null)
              ?? (typeof result.data.errorMessage === "string" ? result.data.errorMessage : null)
              ?? `Action returned status="${rpcStatus}" with ${nestedFailures} nested failure(s)`;
          }
          // In demo mode, add a small delay so the UI can render each step visibly
          if (demoMode) {
            await new Promise<void>((resolve) => {
              timerRef.current = setTimeout(resolve, 30 + Math.random() * 50);
            });
          }
        } else if (demoMode) {
          // Service call failed in demo — fake success
          await new Promise<void>((resolve) => {
            timerRef.current = setTimeout(resolve, 30 + Math.random() * 50);
          });
          status = "applied";
        } else {
          errorMessage = result.error ?? "Service call failed";
        }

        if (controller.signal.aborted) return;
        setCurrentAction(null);
        if (status === "failed") {
          localFailed++;
          addLogEntry({ level: "error", category: "Action", message: `Failed: ${action.name}`, details: errorMessage ?? undefined });
        } else {
          addLogEntry({ level: "success", category: "Action", message: `Applied: ${action.name}` });
        }

        // Record result in DB ledger (fire-and-forget)
        serviceCall("ledger.recordResult", {
          planId,
          result: {
            actionId: action.id,
            status: status === "applied" ? "success" : "failed",
            rollbackSnapshotId: null,
            errorMessage,
            durationMs: null,
          },
        }).catch(() => {});

        const finishedAt = new Date().toISOString();
        const completedEntry: CompletedAction = {
          label: action.name,
          actionId: action.id,
          status,
          errorMessage: errorMessage ?? undefined,
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
          errorMessage,
        };
        journalEntries.push(journalEntry);
        setCompleted((prev) => [...prev, completedEntry]);
        operationIndex += 1;

        setTimeout(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
          }
        }, 0);
      }

      if (controller.signal.aborted) return;

      // Phase 2: Apply personalization
      addLogEntry({ level: "info", category: "Personalization", message: "Applying personalization settings" });
      let personalizationFailed = false;
      let personalizationApplied = false;
      const personalizationStartedAt = new Date().toISOString();
      try {
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
      addLogEntry({
        level: personalizationFailed ? "error" : "success",
        category: "Personalization",
        message: personalizationFailed ? "Personalization failed" : "Personalization applied",
      });
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
          errorMessage: personalizationFailed ? "Personalization apply failed." : undefined,
          packageSourceRef: playbook.packageRefs?.decisionSummaryRef ?? null,
          provenanceRef: null,
        },
      ]);
      operationIndex += 1;

      if (controller.signal.aborted) return;

      // Done: complete ledger plan, then read authoritative final state
      await serviceCall("ledger.completePlan", { planId }).catch(() => {});

      // Query ledger for authoritative final counts — fail loud if unavailable
      const ledgerResult = await serviceCall<{
        totalCompleted?: number;
        totalFailed?: number;
        totalRemaining?: number;
        status?: string;
        steps?: Array<{ actionId: string; status: string }>;
      }>("ledger.query", { planId });

      const ledgerIsAuthoritative = ledgerResult.ok
        && typeof ledgerResult.data?.totalCompleted === "number"
        && typeof ledgerResult.data?.totalFailed === "number";

      if (!ledgerIsAuthoritative) {
        console.warn(
          "[ExecutionStep] DEGRADED: ledger.query failed or returned incomplete data. " +
          "Final counts are from renderer-local journal, NOT service-authoritative. " +
          `ledger.ok=${ledgerResult.ok}, planId=${planId}`
        );
      }

      const ledgerApplied = ledgerIsAuthoritative
        ? ledgerResult.data!.totalCompleted!
        : journalEntries.filter((entry) => entry.status === "applied").length;
      const ledgerFailed = ledgerIsAuthoritative
        ? ledgerResult.data!.totalFailed!
        : journalEntries.filter((entry) => entry.status === "failed").length;

      const skipped = personalizationFailed ? 1 : 0;
      const executionJournalRef = playbook.packageRefs?.executionJournalRef ?? "state/execution-journal.json";
      const journalIndexMap = new Map(journalEntries.map((entry, idx) => [entry.id, idx]));
      const actionProvenance = (playbook.actionProvenance ?? []).map((entry) => {
        const matchingJournalRefs = journalEntries
          .filter((journalEntry) => journalEntry.actionId === entry.actionId)
          .map((journalEntry) => {
            const idx = journalIndexMap.get(journalEntry.id);
            return `${executionJournalRef}#/entries/${idx ?? 0}`;
          });
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
      setCompletionTruth(ledgerIsAuthoritative ? "Verified by service" : "Local summary only");
      setResolvedPlaybook(executionAwarePlaybook);
      setExecutionResult({
        applied: ledgerApplied,
        failed: ledgerFailed,
        skipped,
        preserved: executionAwarePlaybook.totalBlocked,
        personalizationApplied,
        packageKind: "user-resolved",
        packageRefs: executionAwarePlaybook.packageRefs ?? null,
        journal: journalEntries,
        truthSource: ledgerIsAuthoritative ? "ledger" : "local",
      });

      addLogEntry({
        level: "info",
        category: "Execution",
        message: `Execution complete — ${ledgerApplied} applied, ${ledgerFailed} failed, ${skipped} skipped`,
        details: `truthSource=${ledgerIsAuthoritative ? "ledger" : "local"}`,
      });

      timerRef.current = setTimeout(() => completeStep("execution"), demoMode ? 200 : 800);
    };

    exec().catch((err) => {
      console.error("[ExecutionStep] Unexpected execution error:", err);
      addLogEntry({ level: "error", category: "Execution", message: "Unexpected execution error", details: err instanceof Error ? err.message : String(err) });
      // Treat as complete with all failed so the wizard can still advance
      setExecutionResult({
        applied: 0,
        failed: actionQueue.length,
        skipped: 0,
        preserved: resolvedPlaybook?.totalBlocked ?? 0,
        personalizationApplied: false,
        packageKind: "user-resolved",
        packageRefs: resolvedPlaybook?.packageRefs ?? null,
        journal: [],
      });
      setTimeout(() => completeStep("execution"), demoMode ? 200 : 800);
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
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="var(--text-display)" strokeWidth="1.5" opacity="0.3" />
          <path d="M16 10v7M16 21v1" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-[var(--text-secondary)]">No plan is ready to apply. Go back and review it first.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--black)]"
    >
      {/* Subtle dot-grid background */}
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-20 pointer-events-none" />

      <div className="relative z-10 flex h-full min-h-0 flex-col items-center px-6 py-5 overflow-y-auto">
        <div className="flex w-full max-w-[640px] min-h-0 flex-1 flex-col items-center">

          {/* Minimal header */}
          <p className="nd-label-sm text-[var(--text-secondary)]">APPLYING CHANGES</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Step {completed.length + (currentAction ? 1 : 0)} of {totalActions}
          </p>

          {/* Thin progress bar */}
          <div className="w-full h-[3px] bg-[var(--border)] rounded-full mt-4">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: isDone && failCount === 0 ? "var(--success)" : "var(--text-display)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between w-full mt-1.5">
            <span className="text-[10px] text-[var(--text-secondary)] font-data">{progress}%</span>
            <span className="text-[10px] text-[var(--text-secondary)] font-data">{remaining} remaining</span>
          </div>

          {/* Current action card */}
          <div className="mt-5 w-full border border-[var(--border)] bg-[var(--surface)] rounded-sm px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAction ?? "done"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <p className="nd-label-sm text-[var(--text-secondary)]">{currentPhase ?? "Preparing"}</p>
                <p className="mt-1 text-[14px] text-[var(--text-display)] truncate">
                  {currentAction ?? (isDone ? "Done" : "Starting...")}
                </p>
              </motion.div>
            </AnimatePresence>
            <SpinningQuote isActive={!isDone} />
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-2 w-full">
            <StatTile label="Applied" value={applied} tone="success" />
            <StatTile label="Failed" value={failCount} tone="danger" />
            <StatTile label="Remaining" value={remaining} />
          </div>

          {/* Timeline */}
          <div className="mt-4 w-full border border-[var(--border)] rounded-sm flex-1 min-h-0">
            <div className="px-3 py-2 border-b border-[var(--border)] flex justify-between items-center">
              <span className="nd-label-sm text-[var(--text-secondary)]">Activity</span>
              <span className="text-[10px] text-[var(--text-disabled)] font-data">{completed.length}</span>
            </div>
            <div
              ref={timelineRef}
              className="overflow-y-auto max-h-[220px] scrollbar-thin px-3 py-1"
            >
              <div className="flex flex-col gap-0.5">
                {(completed as CompletedAction[]).map((action, i) => (
                  <TimelineItem key={`${action.label}-${i}`} action={action} index={i} />
                ))}
                {completed.length === 0 && (
                  <p className="py-6 text-center text-[11px] text-[var(--text-disabled)]">
                    Waiting for first action...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Completion state */}
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-4 text-center"
            >
              <p className={`text-sm ${failCount > 0 ? "text-[var(--text-display)]" : "text-[var(--success)]"}`}>
                {failCount > 0 ? "Completed with issues" : "All changes applied successfully"}
              </p>
              {completionTruth && (
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">{completionTruth}</p>
              )}
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
