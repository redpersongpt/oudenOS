// Execution Step
// Live execution screen. No bottom bar (WizardShell suppresses it).
// Reads included actions from resolvedPlaybook, executes each via IPC.
// Calls execute.applyAction for each action via the platform service bridge.

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useT, type TFunction } from "@/i18n";
import spinnerQuotesTr from "@/i18n/spinner-quotes-tr.json";
import { useWizardStore } from "@/stores/wizard-store";
import type { ActionDecisionProvenance, ExecutionJournalEntry } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { useLogStore } from "@/stores/log-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";
import { buildExecutionJournalContext } from "@/lib/package-journal";
import { buildMockResolvedPlaybook } from "@/lib/mock-playbook";
import { serviceCall } from "@/lib/service";
import { platform } from "@/lib/platform";
import { isLiveWindows } from "@/lib/runtime";
import {
  classifyActionCall,
  classifyPersonalizationResult,
  describeRestorePoint,
  describeSkippedStepsEn,
  reasonLabelKey,
  type StepNote,
} from "@/lib/service-errors";
import { estimateRemainingMs, etaBucket } from "@/lib/eta";
import { useRuntimeStore } from "@/stores/runtime-store";
import { startOver } from "@/stores/session";

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
  risk: string;
  requiresReboot: boolean;
  provenance: ActionDecisionProvenance | null;
}

interface CompletedAction {
  label: string;
  actionId: string;
  status: "applied" | "skipped" | "failed";
  errorMessage?: string;
  packageSourceRef: string | null;
  provenanceRef: string | null;
  /** sub-steps the service skipped (status partial / skipped), with reason codes */
  skippedSteps?: StepNote[];
  /** -23: not applicable on this system (shown as skipped, not failed) */
  notApplicable?: boolean;
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
function TimelineItem({ action, index, t }: { action: CompletedAction; index: number; t: TFunction }) {
  const failed = action.status === "failed";
  const skipped = action.status === "skipped";
  const [showSteps, setShowSteps] = useState(false);
  const steps = action.skippedSteps ?? [];
  const stepNote = steps.length > 0 && !failed;
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
        failed ? "bg-[#FF6B6B]/10" : skipped ? "bg-[var(--text-disabled)]/10" : "bg-[var(--success)]/10"
      }`}>
        {failed ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 3l4 4M7 3l-4 4" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : skipped ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2.5 5h5" stroke="var(--text-disabled)" strokeWidth="1.5" strokeLinecap="round" />
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
        <p className={`text-[11px] truncate ${failed ? "text-[#FF6B6B]/80" : skipped ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
          {action.label}
        </p>
        {failed && action.errorMessage && (
          <p className="text-[9px] text-[#FF6B6B]/60 truncate mt-0.5" title={action.errorMessage}>
            {action.errorMessage}
          </p>
        )}
        {skipped && action.notApplicable && (
          <p className="text-[9px] text-[var(--text-disabled)] truncate mt-0.5" title={action.errorMessage}>{t("execution.notApplicable")}</p>
        )}
        {stepNote && (
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            aria-expanded={showSteps}
            className="mt-0.5 text-[9px] text-[var(--text-disabled)] underline-offset-2 hover:underline"
          >
            {t("execution.skippedSteps", { count: steps.length })}
          </button>
        )}
        {stepNote && showSteps && (
          <ul className="mt-0.5 space-y-0.5">
            {steps.map((s, i) => (
              <li key={i} className="text-[9px] text-[var(--text-secondary)] break-words">
                {s.type}{s.target ? ` [${s.target}]` : ""}: {t(reasonLabelKey(s.reason))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status badge */}
      <span className={`shrink-0 text-[9px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
        failed
          ? "bg-[#FF6B6B]/10 text-[#FF6B6B]/70"
          : skipped
            ? "bg-[var(--text-disabled)]/10 text-[var(--text-secondary)]"
            : "bg-[var(--success)]/10 text-[var(--success)]/70"
      }`}>
        {failed ? t("execution.badge.fail") : skipped ? t("execution.badge.skip") : t("execution.badge.ok")}
      </span>
    </motion.div>
  );
}

// Spinning Quote — italic, fade transition
function SpinningQuote({ isActive }: { isActive: boolean }) {
  const { lang } = useT();
  const quotes = lang === "tr" ? (spinnerQuotesTr as string[]) : SPINNING_QUOTES;
  // Index against the active list: the Turkish list is shorter than the English one.
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * quotes.length));

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setIdx((prev) => {
        let next: number;
        do { next = Math.floor(Math.random() * quotes.length); } while (next === prev && quotes.length > 1);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isActive, quotes.length]);

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
        {quotes[idx % quotes.length]}
      </motion.p>
    </AnimatePresence>
  );
}

// Component

// Guards against two concurrent apply loops (StrictMode double effects in dev,
// HMR remounts). Module-level so it survives remounts of the component.
let activeRunToken: symbol | null = null;

export function ExecutionStep() {
  const { t } = useT();
  const {
    detectedProfile, resolvedPlaybook, personalization, demoMode, playbookPreset,
    completeStep, setExecutionResult, setResolvedPlaybook, setExecuting, setLastRun, acknowledgedActionIds,
  } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const addLogEntry = useLogStore((state) => state.addEntry);
  const refreshRuntime = useRuntimeStore((s) => s.refresh);
  const effectivePersonalization = useMemo(
    () => resolveEffectivePersonalization(detectedProfile?.id, personalization, answers),
    [answers, detectedProfile?.id, personalization],
  );

  // In demo (preview) mode, if no playbook was resolved, build a mock.
  useEffect(() => {
    if (demoMode && !resolvedPlaybook) {
      const profile = detectedProfile?.id ?? "gaming_desktop";
      const mock = buildMockResolvedPlaybook(profile, playbookPreset ?? "balanced");
      setResolvedPlaybook(mock);
    }
  }, [demoMode, resolvedPlaybook, detectedProfile?.id, playbookPreset, setResolvedPlaybook]);

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
            risk: action.risk,
            requiresReboot: action.requiresReboot,
            provenance: provenanceByAction.get(action.id) ?? null,
          });
        }
      }
    }
    return queue;
  }, [resolvedPlaybook]);

  const totalActions = actionQueue.length + 1; // +1 for personalization

  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase]   = useState<string | null>(null);
  const [completed,     setCompleted]     = useState<CompletedAction[]>([]);
  const [durations,     setDurations]     = useState<number[]>([]);
  const [completionTruth, setCompletionTruth] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [elevationNeeded, setElevationNeeded] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const applied   = completed.filter((c) => c.status === "applied").length;
  const failCount = completed.filter((c) => c.status === "failed").length;
  const skippedCount = completed.filter((c) => c.status === "skipped").length;
  const remaining = Math.max(0, totalActions - completed.length - (currentAction ? 1 : 0));
  const progress  = totalActions > 0
    ? Math.round((completed.length / totalActions) * 100)
    : 0;
  const eta = etaBucket(estimateRemainingMs(durations, remaining + (currentAction ? 1 : 0)));

  const isDone = !currentAction && (completed.length === totalActions || blockingError !== null);
  const playbookReady = resolvedPlaybook !== null;

  useEffect(() => {
    if (!playbookReady || activeRunToken !== null) return;
    const token = Symbol("execution-run");
    activeRunToken = token;
    let cancelled = false;
    const isCancelled = () => cancelled;

    const exec = async () => {
      const playbook = resolvedPlaybook;
      if (!playbook) return;

      // Never apply a sample profile/plan to a real Windows machine.
      const runtime = await refreshRuntime();
      if (isCancelled()) return;
      if (demoMode && isLiveWindows(runtime)) {
        setRefusal(t("execution.refused.demoOnLive"));
        addLogEntry({ level: "error", category: "Execution", message: "Refused: plan was built from sample data on a live Windows system" });
        return;
      }

      setExecuting(true);
      void platform().app.setBusy(true);

      let operationIndex = 0;
      const runStartedAt = new Date().toISOString();
      const journalEntries: ExecutionJournalEntry[] = [];
      let stoppedBy: string | null = null;

      addLogEntry({ level: "info", category: "Execution", message: `Starting execution with ${actionQueue.length} actions` });

      // Create DB-backed execution plan (service ledger)
      const planId = playbook.packageRefs?.planId ?? `plan-${Date.now()}`;
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
        requiresReboot: action.provenance?.requiresReboot ?? action.requiresReboot,
        packageSourceRef: action.provenance?.packageSourceRef ?? null,
        provenanceRef: action.provenance?.packageSourceRef ?? null,
        questionKeys: action.provenance?.sourceQuestionIds ?? [],
        selectedValues: (action.provenance?.sourceOptionValues ?? []).map(String),
      }));
      const ledger = await serviceCall("ledger.createPlan", {
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
      if (!ledger.ok) {
        addLogEntry({ level: "warn", category: "Execution", message: "Could not create the service ledger plan (resume after restart may be unavailable)", details: ledger.error });
      }
      if (isCancelled()) return;

      // Safety: try a Windows restore point once before applying anything. This
      // can take a minute or two; the shell allows it 5 minutes.
      if (!demoMode) {
        setCurrentPhase(t("execution.phase.safety"));
        setCurrentAction(t("execution.restorePoint.creating"));
        const rp = describeRestorePoint(
          await serviceCall("system.createRestorePoint", { description: "oudenOS pre-optimization restore point" }),
        );
        if (isCancelled()) return;
        if (rp.status === "created") {
          addLogEntry({ level: "success", category: "Safety", message: "Windows restore point created" });
        } else if (rp.status === "throttled") {
          setRestoreNotice(t("execution.restorePoint.throttled"));
          addLogEntry({ level: "info", category: "Safety", message: "Windows already created a restore point in the last 24 hours", details: rp.detail ?? undefined });
        } else if (rp.status === "unavailable") {
          setRestoreNotice(t("execution.restorePoint.unavailable"));
          addLogEntry({ level: "warn", category: "Safety", message: "No restore point: System Protection is turned off — oudenOS undo snapshots still apply", details: rp.detail ?? undefined });
        } else {
          setRestoreNotice(t("execution.restorePoint.failed"));
          addLogEntry({
            level: "warn",
            category: "Safety",
            message: "No Windows restore point — oudenOS rollback snapshots still apply",
            details: rp.detail ?? undefined,
          });
        }
        setCurrentAction(null);
      }

      // Phase 1: Apply playbook actions
      for (let i = 0; i < actionQueue.length; i++) {
        if (isCancelled()) return;
        const action = actionQueue[i];
        const startedAt = new Date().toISOString();

        setCurrentAction(action.name);
        setCurrentPhase(action.phase);

        serviceCall("ledger.markStarted", { planId, actionId: action.id }).catch(() => {});
        addLogEntry({ level: "info", category: "Action", message: `Starting: ${action.name}`, details: `actionId=${action.id}, phase=${action.phase}` });

        // Confirm only what the user explicitly acknowledged at Final Review
        // (high / extreme / expert-only actions listed by name above the
        // checkbox). Anything else is sent unconfirmed and the service's own
        // backstop refuses it.
        const confirmed = acknowledgedActionIds.includes(action.id);
        const result = await serviceCall<Record<string, unknown>>("execute.applyAction", {
          actionId: action.id,
          ...(confirmed ? { expertConfirmed: true } : {}),
          journalContext: action.provenance
            ? buildExecutionJournalContext(playbook, action.provenance, detectedProfile?.id)
            : undefined,
        });
        const resultData = result.ok ? result.data : null;

        let status: "applied" | "skipped" | "failed";
        let errorMessage: string | null;
        let blocking = false;
        let needsElevation = false;
        let notApplicable = false;
        let steps: StepNote[] = [];
        if (result.ok || !demoMode) {
          const outcome = classifyActionCall(result);
          status = outcome.status;
          errorMessage = outcome.errorMessage;
          blocking = outcome.blocking;
          needsElevation = outcome.needsElevation;
          notApplicable = outcome.notApplicable;
          steps = outcome.skippedSteps;
          if (demoMode) {
            await new Promise<void>((resolve) => {
              timerRef.current = setTimeout(resolve, 30 + Math.random() * 50);
            });
          }
        } else {
          // demoMode only (never on live Windows — refused above): simulate.
          await new Promise<void>((resolve) => {
            timerRef.current = setTimeout(resolve, 30 + Math.random() * 50);
          });
          status = "applied";
          errorMessage = null;
        }

        if (isCancelled()) return;
        setCurrentAction(null);
        if (status === "failed") {
          addLogEntry({ level: "error", category: "Action", message: `Failed: ${action.name}`, details: errorMessage ?? undefined });
        } else if (status === "skipped") {
          addLogEntry({
            level: "info",
            category: "Action",
            message: notApplicable ? `Not applicable on this system: ${action.name}` : `Skipped: ${action.name}`,
            details: errorMessage ?? describeSkippedStepsEn(steps) ?? "No change made.",
          });
        } else {
          addLogEntry({
            level: "success",
            category: "Action",
            message: steps.length > 0 ? `Applied: ${action.name} (${steps.length} step(s) skipped)` : `Applied: ${action.name}`,
            details: describeSkippedStepsEn(steps) ?? undefined,
          });
        }

        serviceCall("ledger.recordResult", {
          planId,
          result: {
            actionId: action.id,
            status: status === "applied" ? "success" : status === "skipped" ? "skipped" : "failed",
            rollbackSnapshotId: typeof resultData?.snapshotId === "string" ? resultData.snapshotId : null,
            errorMessage,
            durationMs: null,
          },
        }).catch(() => {});

        const finishedAt = new Date().toISOString();
        const durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
        const completedEntry: CompletedAction = {
          label: action.name,
          actionId: action.id,
          status,
          errorMessage: errorMessage ?? undefined,
          packageSourceRef: action.provenance?.packageSourceRef ?? null,
          provenanceRef: action.provenance?.packageSourceRef ?? null,
          skippedSteps: steps,
          notApplicable,
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
          durationMs,
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
          skippedSteps: steps,
          notApplicable,
        };
        journalEntries.push(journalEntry);
        setCompleted((prev) => [...prev, completedEntry]);
        setDurations((prev) => [...prev, durationMs]);
        operationIndex += 1;

        setTimeout(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
          }
        }, 0);

        if (needsElevation) {
          // -403: the service is not elevated — every further action would fail
          // the same way. Stop and offer "Restart as administrator".
          stoppedBy = errorMessage ?? t("execution.elevation.title");
          setElevationNeeded(true);
          addLogEntry({ level: "error", category: "Execution", message: "Stopped: oudenOS is not running as administrator", details: errorMessage ?? undefined });
          break;
        }
        if (blocking) {
          // The service could not restore this action's snapshot: the system may
          // be half-changed. Stop here; nothing else is applied.
          stoppedBy = errorMessage ?? t("execution.blocking.title");
          addLogEntry({ level: "error", category: "Execution", message: "Stopped: automatic rollback failed", details: errorMessage ?? undefined });
          break;
        }
      }

      if (isCancelled()) return;

      // Phase 2: Apply personalization (skipped when applying was stopped)
      let personalizationApplied = false;
      let personalizationSnapshotId: string | null = null;
      if (!stoppedBy) {
        addLogEntry({ level: "info", category: "Personalization", message: "Applying personalization settings" });
        const personalizationStartedAt = new Date().toISOString();
        setCurrentAction(t("execution.personalization.applying"));
        setCurrentPhase(t("execution.phase.personalization"));
        const pers = classifyPersonalizationResult(
          await serviceCall("personalize.apply", {
            profile: detectedProfile?.id ?? "gaming_desktop",
            options: effectivePersonalization,
          }),
        );
        if (isCancelled()) return;
        personalizationApplied = pers.applied;
        personalizationSnapshotId = pers.snapshotId;
        setCurrentAction(null);
        const personalizationFinishedAt = new Date().toISOString();
        const personalizationStatus = pers.applied ? "applied" : "failed";
        const persSkippedText = describeSkippedStepsEn(pers.skippedItems, 12);
        addLogEntry({
          level: pers.applied ? "success" : "error",
          category: "Personalization",
          message: pers.applied
            ? pers.skippedItems.length > 0
              ? `Personalization applied (${pers.skippedItems.length} item(s) skipped — protected by Windows)`
              : "Personalization applied"
            : "Personalization failed",
          details: [pers.errorMessage, persSkippedText, pers.widgetsProtected ? "Widgets button is protected by Windows (UCPD): change it in Settings > Personalization > Taskbar." : null]
            .filter(Boolean)
            .join(" | ") || undefined,
        });
        journalEntries.push({
          id: "journal.personalization.apply",
          kind: "personalization",
          actionId: "personalize.apply",
          label: t("execution.personalization.label"),
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
          errorMessage: pers.errorMessage,
          skippedSteps: pers.skippedItems,
          widgetsProtected: pers.widgetsProtected,
        });
        setCompleted((prev) => [
          ...prev,
          {
            label: t("execution.personalization.label"),
            actionId: "personalize.apply",
            status: personalizationStatus,
            errorMessage: pers.errorMessage ?? undefined,
            packageSourceRef: playbook.packageRefs?.decisionSummaryRef ?? null,
            provenanceRef: null,
            skippedSteps: pers.skippedItems,
          },
        ]);
        if (pers.needsElevation) setElevationNeeded(true);
        operationIndex += 1;
      } else {
        setBlockingError(stoppedBy);
      }

      // Done: complete ledger plan, then read authoritative final state
      await serviceCall("ledger.completePlan", { planId }).catch(() => {});

      const ledgerResult = await serviceCall<{
        totalCompleted?: number;
        totalFailed?: number;
        totalRemaining?: number;
        status?: string;
        steps?: Array<{ actionId: string; status: string }>;
      }>("ledger.query", { planId });
      if (isCancelled()) return;

      const ledgerIsAuthoritative = ledgerResult.ok
        && typeof ledgerResult.data?.totalCompleted === "number"
        && typeof ledgerResult.data?.totalFailed === "number";

      if (!ledgerIsAuthoritative) {
        console.warn(
          "[ExecutionStep] DEGRADED: ledger.query failed or returned incomplete data. " +
          `Final counts are from the renderer journal. ledger.ok=${ledgerResult.ok}, planId=${planId}`
        );
      }

      const ledgerApplied = ledgerIsAuthoritative
        ? ledgerResult.data!.totalCompleted!
        : journalEntries.filter((entry) => entry.status === "applied").length;
      const ledgerFailed = ledgerIsAuthoritative
        ? ledgerResult.data!.totalFailed!
        : journalEntries.filter((entry) => entry.status === "failed").length;

      const skipped = journalEntries.filter((entry) => entry.status === "skipped").length;
      const appliedIds = new Set(journalEntries.filter((e) => e.status === "applied").map((e) => e.actionId));
      const rebootRequiredCount = actionQueue.filter((a) => a.requiresReboot && appliedIds.has(a.id)).length;
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
      const executionAwarePlaybook = { ...playbook, actionProvenance };
      setCompletionTruth(ledgerIsAuthoritative ? t("execution.truth.verified") : t("execution.truth.local"));
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
        startedAt: runStartedAt,
        personalizationSnapshotId,
        blockingError: stoppedBy,
        rebootRequiredCount,
      });
      setLastRun({
        finishedAt: new Date().toISOString(),
        applied: ledgerApplied,
        failed: ledgerFailed,
        skipped,
        rebootRequiredCount,
        profileId: detectedProfile?.id ?? null,
        preset: playbook.preset ?? null,
        startedAt: runStartedAt,
        personalizationSnapshotId,
      });

      addLogEntry({
        level: stoppedBy ? "error" : "info",
        category: "Execution",
        message: `Execution ${stoppedBy ? "stopped" : "complete"} — ${ledgerApplied} applied, ${ledgerFailed} failed, ${skipped} skipped (${operationIndex} operations)`,
        details: `truthSource=${ledgerIsAuthoritative ? "ledger" : "local"}`,
      });

      setExecuting(false);
      void platform().app.setBusy(false);
      // A blocking failure waits for the user; otherwise continue automatically.
      if (!stoppedBy) {
        timerRef.current = setTimeout(() => completeStep("execution"), demoMode ? 200 : 800);
      }
    };

    exec()
      .catch((err) => {
        console.error("[ExecutionStep] Unexpected execution error:", err);
        addLogEntry({ level: "error", category: "Execution", message: "Unexpected execution error", details: err instanceof Error ? err.message : String(err) });
        setBlockingError(err instanceof Error ? err.message : String(err));
        setExecutionResult({
          applied: 0,
          failed: actionQueue.length,
          skipped: 0,
          preserved: resolvedPlaybook?.totalBlocked ?? 0,
          personalizationApplied: false,
          packageKind: "user-resolved",
          packageRefs: resolvedPlaybook?.packageRefs ?? null,
          journal: [],
          blockingError: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        if (activeRunToken === token) activeRunToken = null;
        setExecuting(false);
        void platform().app.setBusy(false);
      });

    return () => {
      // StrictMode / remount: the cancelled run stops at its next checkpoint (the
      // first one is before any service call), so the next mount may start.
      cancelled = true;
      if (activeRunToken === token) activeRunToken = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // The run starts once, as soon as a plan exists.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookReady]);

  if (refusal) {
    return (
      <div role="alert" className="flex min-h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">{t("execution.refused.title")}</h2>
        <p className="max-w-md text-sm text-[var(--text-secondary)]">{refusal}</p>
        <button
          onClick={() => startOver()}
          className="mt-2 rounded-sm px-4 py-2 text-[12px] font-medium"
          style={{ background: "var(--text-display)", color: "var(--black)" }}
        >
          {t("common.startOver")}
        </button>
      </div>
    );
  }

  // No playbook = nothing to execute
  if (!resolvedPlaybook) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-8">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="14" stroke="var(--text-display)" strokeWidth="1.5" opacity="0.3" />
          <path d="M16 10v7M16 21v1" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-[var(--text-secondary)]">{t("execution.noPlan")}</p>
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
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-20 pointer-events-none" />

      <div className="relative z-10 flex h-full min-h-0 flex-col items-center px-6 py-5 overflow-y-auto">
        <div className="flex w-full max-w-[640px] min-h-0 flex-1 flex-col items-center">

          <p className="nd-label-sm text-[var(--text-secondary)]">{t("execution.header.applyingChanges")}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t("execution.header.step", { current: Math.min(totalActions, completed.length + (currentAction ? 1 : 0)), total: totalActions })}
          </p>

          <div
            className="w-full h-[3px] bg-[var(--border)] rounded-full mt-4"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={t("execution.header.applyingChanges")}
          >
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
            <span className="text-[10px] text-[var(--text-secondary)] font-data">
              {t("execution.progress.remaining", { count: remaining })}
              {!isDone && eta && (
                <>
                  {" · "}
                  {eta.unit === "lessThanMinute" ? t("execution.eta.lessThanMinute") : t("execution.eta.minutes", { count: eta.minutes })}
                </>
              )}
            </span>
          </div>

          {/* Current action card */}
          <div className="mt-5 w-full border border-[var(--border)] bg-[var(--surface)] rounded-sm px-4 py-3" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAction ?? "done"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <p className="nd-label-sm text-[var(--text-secondary)]">{currentPhase ?? t("execution.card.preparing")}</p>
                <p className="mt-1 text-[14px] text-[var(--text-display)] truncate">
                  {currentAction ?? (isDone ? t("execution.card.done") : t("execution.card.starting"))}
                </p>
              </motion.div>
            </AnimatePresence>
            <SpinningQuote isActive={!isDone} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 w-full">
            <StatTile label={t("execution.stat.applied")} value={applied} tone="success" />
            <StatTile label={t("execution.stat.failed")} value={failCount} tone="danger" />
            <StatTile label={t("execution.stat.remaining")} value={remaining} />
          </div>

          <div className="mt-4 w-full border border-[var(--border)] rounded-sm flex-1 min-h-0">
            <div className="px-3 py-2 border-b border-[var(--border)] flex justify-between items-center">
              <span className="nd-label-sm text-[var(--text-secondary)]">{t("execution.timeline.activity")}</span>
              <span className="text-[10px] text-[var(--text-disabled)] font-data">{completed.length}</span>
            </div>
            <div
              ref={timelineRef}
              className="overflow-y-auto max-h-[220px] scrollbar-thin px-3 py-1"
            >
              <div className="flex flex-col gap-0.5">
                {completed.map((action, i) => (
                  <TimelineItem key={`${action.label}-${i}`} action={action} index={i} t={t} />
                ))}
                {completed.length === 0 && (
                  <p className="py-6 text-center text-[11px] text-[var(--text-disabled)]">
                    {t("execution.timeline.waiting")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {restoreNotice && (
            <p role="status" className="mt-3 w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              {restoreNotice}
            </p>
          )}

          {elevationNeeded && !currentAction && (
            <div role="alert" className="mt-4 w-full rounded-sm border border-white/[0.16] bg-white/[0.04] px-4 py-3">
              <p className="text-[12px] font-semibold text-[var(--text-display)]">{t("execution.elevation.title")}</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{t("execution.elevation.body")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void platform().app.relaunchAsAdmin()}
                  className="rounded-sm px-4 py-2 text-[12px] font-medium"
                  style={{ background: "var(--text-display)", color: "var(--black)" }}
                >
                  {t("welcome.admin.relaunch")}
                </button>
                <button
                  onClick={() => completeStep("execution")}
                  className="rounded-sm px-4 py-2 text-[12px] text-[var(--text-secondary)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {t("execution.blocking.continue")}
                </button>
              </div>
            </div>
          )}

          {blockingError && !elevationNeeded && !currentAction && (
            <div role="alert" className="mt-4 w-full rounded-sm border border-[#FF6B6B]/40 bg-[#FF6B6B]/[0.06] px-4 py-3">
              <p className="text-[12px] font-semibold text-[var(--text-display)]">{t("execution.blocking.title")}</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{t("execution.blocking.body")}</p>
              <p className="mt-1 break-words font-mono text-[10px] text-[#FF6B6B]/80">{blockingError}</p>
              <button
                onClick={() => completeStep("execution")}
                className="mt-3 rounded-sm px-4 py-2 text-[12px] font-medium"
                style={{ background: "var(--text-display)", color: "var(--black)" }}
              >
                {t("execution.blocking.continue")}
              </button>
            </div>
          )}

          {isDone && !blockingError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-4 text-center"
            >
              <p className={`text-sm ${
                failCount > 0
                  ? "text-[var(--text-display)]"
                  : applied === 0 && skippedCount > 0
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--success)]"
              }`}>
                {failCount > 0
                  ? t("execution.done.withIssues")
                  : applied === 0 && skippedCount > 0
                    ? t("execution.done.allSkipped")
                    : skippedCount > 0
                      ? t("execution.done.appliedWithSkipped", { count: skippedCount })
                      : t("execution.done.success")}
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
