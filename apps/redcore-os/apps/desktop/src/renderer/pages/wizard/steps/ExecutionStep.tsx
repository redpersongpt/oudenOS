// ─── Execution Step ───────────────────────────────────────────────────────────
// Live execution screen. No bottom bar (WizardShell suppresses it).
// Current action card with pulse, completed timeline, progress bar + stats.
// Calls execute.applyAction for each action via window.redcore.service.call.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

// ─── Mock action list ─────────────────────────────────────────────────────────

const MOCK_ACTIONS = [
  "Disable SysMain (Superfetch)",
  "Disable Windows Search indexer",
  "Remove OneDrive startup entry",
  "Disable Windows Error Reporting",
  "Clear temp files",
  "Disable DiagTrack telemetry",
  "Disable CEIP scheduled tasks",
  "Set power plan to High Performance",
  "Disable Cortana background process",
  "Remove Xbox Game Bar telemetry tasks",
  "Disable Windows Customer Experience telemetry",
  "Optimize network adapter settings",
  "Disable automatic delivery optimization",
  "Set visual effects to best performance",
  "Remove startup delays",
];

interface CompletedAction {
  label: string;
  status: "applied" | "failed";
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({ action, index }: { action: CompletedAction; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex items-center gap-2.5 py-1"
    >
      {action.status === "applied" ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success-400" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger-400" />
      )}
      <span className="text-[11px] text-neutral-500 truncate">{action.label}</span>
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
  const { plan, completeStep, setExecutionResult } = useWizardStore();
  const totalActions = plan?.totalActions ?? MOCK_ACTIONS.length;
  const actionList   = MOCK_ACTIONS.slice(0, totalActions);

  const [currentIdx,    setCurrentIdx]    = useState(-1);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [completed,     setCompleted]     = useState<CompletedAction[]>([]);
  const [failed,        setFailed]        = useState(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started   = useRef(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const applied   = completed.filter((c) => c.status === "applied").length;
  const remaining = Math.max(0, totalActions - completed.length - (currentAction ? 1 : 0));
  const progress  = totalActions > 0
    ? Math.round((completed.length / totalActions) * 100)
    : 0;

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const exec = async () => {
      for (let i = 0; i < actionList.length; i++) {
        const label = actionList[i];

        setCurrentIdx(i);
        setCurrentAction(label);

        // Attempt real IPC
        let status: "applied" | "failed" = "applied";
        try {
          if (typeof window !== "undefined" && (window as unknown as { redcore?: unknown }).redcore) {
            const win = window as unknown as {
              redcore: { service: { call: (method: string, params: object) => Promise<{ status: string }> } };
            };
            const result = await win.redcore.service.call("execute.applyAction", { actionId: label });
            status = result.status === "ok" ? "applied" : "failed";
          } else {
            // Simulate execution time
            await new Promise<void>((resolve) => {
              timerRef.current = setTimeout(resolve, 260 + Math.random() * 160);
            });
          }
        } catch {
          status = "failed";
        }

        setCurrentAction(null);
        if (status === "failed") setFailed((f) => f + 1);
        setCompleted((prev) => [...prev, { label, status }]);

        // Scroll timeline to bottom
        requestAnimationFrame(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
          }
        });
      }

      // Done
      const finalApplied = actionList.length - failed;
      setExecutionResult({
        applied:   finalApplied,
        failed:    failed,
        skipped:   0,
        preserved: 0,
      });

      timerRef.current = setTimeout(() => completeStep("execution"), 800);
    };

    exec();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h2 className="text-lg font-semibold text-neutral-100">Applying Transformations</h2>
        <p className="text-xs text-neutral-500">Do not shut down your computer</p>
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
              className="flex items-center gap-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.06] px-5 py-3.5"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
                className="h-4 w-4 shrink-0 rounded-full border-2 border-brand-500 border-t-transparent"
              />
              <span className="flex-1 truncate text-sm text-neutral-200">{currentAction}</span>
              <span className="shrink-0 font-mono-metric text-[10px] text-brand-500/60">
                {currentIdx + 1}/{totalActions}
              </span>
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
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          <span className="font-mono-metric text-[10px] text-neutral-600">{progress}%</span>
          <span className="font-mono-metric text-[10px] text-neutral-600">
            {completed.length}/{totalActions}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-center">
        {[
          { label: "Applied",   value: applied,   color: "text-success-400" },
          { label: "Failed",    value: failed,    color: "text-danger-400"  },
          { label: "Remaining", value: remaining, color: "text-neutral-400" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5">
            <span className={`font-mono-metric text-xl font-semibold ${stat.color}`}>
              {stat.value}
            </span>
            <span className="text-[10px] text-neutral-700">{stat.label}</span>
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
          {completed.map((action, i) => (
            <TimelineItem key={`${action.label}-${i}`} action={action} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
