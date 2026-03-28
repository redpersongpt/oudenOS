// ─── Execution Step ───────────────────────────────────────────────────────────
// Live mission control — applies actions, streams progress, shows timeline.

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, Zap } from "lucide-react";
import {
  spring,
  progressFill,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { useTuningStore } from "@/stores/tuning-store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ActionOutcome } from "@redcore/shared-schema/tuning";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompletedEntry {
  id: string;
  name: string;
  category: string;
  outcome: ActionOutcome;
}

// ─── Log item ─────────────────────────────────────────────────────────────────

const LOG_COLOR = {
  info:    "text-ink-secondary",
  warn:    "text-amber-400",
  success: "text-green-400",
  error:   "text-brand-400",
} as const;

// ─── Outcome icon ─────────────────────────────────────────────────────────────

function OutcomeIcon({ status }: { status: ActionOutcome["status"] }) {
  if (status === "success")     return <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" strokeWidth={1.5} />;
  if (status === "failed")      return <XCircle className="h-4 w-4 text-brand-400 shrink-0" strokeWidth={1.5} />;
  return <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={1.5} />;
}

// ─── Success celebration ──────────────────────────────────────────────────────

function SuccessState({ total, failed, onContinue }: {
  total: number;
  failed: number;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.bounce}
      className="flex flex-col items-center gap-6 py-8 text-center"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring.bounce, delay: 0.1 }}
        className="relative"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 border border-green-500/25">
          <CheckCircle2 className="h-12 w-12 text-green-400" strokeWidth={1.25} />
        </div>
        {/* Glow */}
        <div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl -z-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...spring.smooth }}
        className="space-y-2"
      >
        <h2 className="text-[26px] font-bold text-ink">All Changes Applied</h2>
        <p className="text-[14px] text-ink-secondary">
          {total - failed} of {total} actions completed successfully.
          {failed > 0 && ` ${failed} failed — check the log for details.`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button size="lg" onClick={onContinue} icon={<Zap className="h-4 w-4" />}>
          Continue
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExecutionStep() {
  const { goNext, selectedActions } = useWizardStore();
  const { plan, addLog, logs } = useTuningStore();
  const { addCompletedAction } = useWizardStore();

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<CompletedEntry[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [logsOpen, setLogsOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  const planActions = plan?.actions ?? [];
  const selected    = planActions.filter((pa) => selectedActions.includes(pa.actionId));
  const total       = selected.length;
  const current     = selected[currentIdx] ?? null;

  // Auto-scroll logs
  useEffect(() => {
    if (logsOpen) logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, logsOpen]);

  // Auto-start
  useEffect(() => {
    cancelledRef.current = false;
    if (phase === "idle" && selected.length > 0) {
      void runAll();
    }
    return () => {
      cancelledRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAll() {
    setPhase("running");
    let failed = 0;

    for (let i = 0; i < selected.length; i++) {
      if (cancelledRef.current) return;
      const pa = selected[i]!;
      setCurrentIdx(i);
      setProgress(Math.round((i / selected.length) * 100));
      addLog("info", `Applying: ${pa.action.name}`);

      try {
        const outcome = (await window.redcore.service.call("tuning.applyAction", {
          actionId: pa.actionId,
        })) as ActionOutcome;

        if (cancelledRef.current) return;

        if (outcome.status === "failed") failed++;

        setCompleted((prev) => [
          ...prev,
          { id: pa.actionId, name: pa.action.name, category: pa.action.category, outcome },
        ]);
        addCompletedAction(pa.actionId);
        addLog(
          outcome.status === "success" ? "success" : outcome.status === "failed" ? "error" : "warn",
          `${pa.action.name}: ${outcome.status}${outcome.error ? ` — ${outcome.error}` : ""}`
        );
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        failed++;
        const msg = err instanceof Error ? err.message : "Unknown error";
        addLog("error", `${pa.action.name}: exception — ${msg}`);
        setCompleted((prev) => [
          ...prev,
          {
            id: pa.actionId,
            name: pa.action.name,
            category: pa.action.category,
            outcome: {
              actionId: pa.actionId,
              status: "failed",
              appliedAt: new Date().toISOString(),
              changesApplied: [],
              validationPassed: false,
              validationDetails: null,
              error: msg,
            },
          },
        ]);
      }
    }

    if (cancelledRef.current) return;
    setFailedCount(failed);
    setProgress(100);
    setPhase("done");
  }

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex min-h-full flex-col px-10 py-12"
      >
        <div className="w-full max-w-2xl mx-auto">
          <SuccessState total={total} failed={failedCount} onContinue={() => goNext()} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-10 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto space-y-7"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Step 13 — Execute
          </p>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            Applying Optimizations
          </h1>
        </motion.div>

        {/* Overall progress bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <div className="flex justify-between text-xs text-ink-tertiary">
            <span>{completed.length} of {total} actions</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              variants={progressFill}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              custom={progress}
            />
          </div>
        </motion.div>

        {/* Current action card */}
        <AnimatePresence mode="wait">
          {current && phase === "running" && (
            <motion.div
              key={current.actionId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={spring.smooth}
              className="rounded-xl border border-brand-800/60 bg-brand-950/40 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-ink-tertiary uppercase tracking-wider">Applying now</p>
                  <p className="text-base font-semibold text-ink">{current.action.name}</p>
                </div>
                <Badge variant="info">{current.action.category}</Badge>
              </div>

              <p className="text-xs leading-relaxed text-ink-secondary">{current.action.description}</p>

              <div className="flex items-center gap-2">
                <motion.div
                  className="h-2 w-2 rounded-full bg-brand-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="text-xs text-brand-400 font-medium">Applying...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="grid grid-cols-4 gap-2"
        >
          {[
            { label: "Applied",  value: completed.filter((c) => c.outcome.status === "success").length, color: "text-green-400" },
            { label: "Partial",  value: completed.filter((c) => c.outcome.status === "partial").length,  color: "text-amber-400" },
            { label: "Failed",   value: failedCount,                                                       color: "text-brand-400" },
            { label: "Remaining", value: Math.max(0, total - completed.length),                            color: "text-ink-secondary" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center"
            >
              <p className={`text-2xl font-mono font-semibold ${color}`}>{value}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-tertiary mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Completed timeline */}
        {completed.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">Completed</p>
            <div className="space-y-1 max-h-44 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence initial={false}>
                {[...completed].reverse().map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={spring.snappy}
                    className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <OutcomeIcon status={entry.outcome.status} />
                    <span className="flex-1 text-xs text-ink-secondary truncate">{entry.name}</span>
                    <span className="text-[10px] text-ink-tertiary uppercase">{entry.category}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Live log stream */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-xl border border-white/[0.07] overflow-hidden">
          <button
            onClick={() => setLogsOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
          >
            <span className="text-xs font-medium text-ink-secondary">Technical Log</span>
            <motion.div animate={{ rotate: logsOpen ? 180 : 0 }} transition={spring.snappy}>
              <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" strokeWidth={1.5} />
            </motion.div>
          </button>

          <motion.div
            initial={false}
            animate={{ height: logsOpen ? 160 : 0 }}
            transition={spring.smooth}
            className="overflow-hidden"
          >
            <div className="h-40 overflow-y-auto bg-[#0a0a0d] px-4 py-3 font-mono text-[11px] space-y-0.5">
              {logs.map((entry, i) => (
                <div key={i} className="flex gap-2.5 leading-relaxed">
                  <span className="text-ink-tertiary shrink-0">{entry.timestamp}</span>
                  <span className={LOG_COLOR[entry.level]}>{entry.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
