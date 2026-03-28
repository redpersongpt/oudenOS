// ─── AnalysisTimeline ────────────────────────────────────────────────────────
// Shows the multi-step analysis pipeline progress with animated step states.

import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisStep, StepStatus, AnalysisPipelineState } from "../types.js";
import { ANALYSIS_STEPS } from "../types.js";

// ─── Step icons ───────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <motion.path
        d="M2 5L4.5 7.5L8 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <div className="h-2.5 w-2.5 rounded-full border-[1.5px] border-brand-500 border-t-transparent animate-spin" />
  );
}

// ─── Step node styles ─────────────────────────────────────────────────────────

function StepNode({ status, isLast }: { status: StepStatus; isLast: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          status === "done"    ? "bg-brand-500 border-brand-500 text-white" :
          status === "running" ? "bg-brand-500/10 border-brand-500 text-brand-400" :
          status === "error"   ? "bg-red-500/10 border-red-500 text-red-400" :
                                 "bg-white/[0.03] border-white/[0.12] text-ink-disabled"
        }`}
        animate={status === "running" ? { boxShadow: ["0 0 0 0 rgba(232,37,75,0)", "0 0 0 4px rgba(232,37,75,0.2)", "0 0 0 0 rgba(232,37,75,0)"] } : {}}
        transition={status === "running" ? { duration: 1.5, repeat: Infinity, ease: "easeOut" } : {}}
      >
        {status === "done"    && <CheckIcon />}
        {status === "running" && <SpinnerIcon />}
        {status === "error"   && <span className="text-[8px] font-bold">!</span>}
        {status === "pending" && <div className="h-1.5 w-1.5 rounded-full bg-ink-disabled" />}
      </motion.div>

      {!isLast && (
        <div className="relative mt-0.5 h-6 w-[1.5px] overflow-hidden rounded-full bg-white/[0.06]">
          <AnimatePresence>
            {status === "done" && (
              <motion.div
                className="absolute inset-x-0 top-0 bg-brand-500/40 rounded-full"
                initial={{ height: 0 }}
                animate={{ height: "100%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

interface StepRowProps {
  step: typeof ANALYSIS_STEPS[number];
  status: StepStatus;
  isLast: boolean;
  index: number;
}

function StepRow({ step, status, isLast, index }: StepRowProps) {
  return (
    <motion.div
      className="flex gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
    >
      <StepNode status={status} isLast={isLast} />

      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-2 min-h-[24px]">
          <span className={`text-[12px] font-medium transition-colors duration-200 ${
            status === "running" ? "text-brand-400" :
            status === "done"    ? "text-ink" :
            status === "error"   ? "text-red-400" :
                                   "text-ink-muted"
          }`}>
            {step.label}
          </span>

          <AnimatePresence mode="wait">
            {status === "running" && (
              <motion.span
                key="running"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="px-1.5 py-0.5 rounded text-[9px] border border-brand-500/30 bg-brand-500/10 text-brand-400"
              >
                RUNNING
              </motion.span>
            )}
            {status === "done" && (
              <motion.span
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="px-1.5 py-0.5 rounded text-[9px] border border-green-500/20 bg-green-500/[0.06] text-green-400"
              >
                DONE
              </motion.span>
            )}
            {status === "error" && (
              <motion.span
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-1.5 py-0.5 rounded text-[9px] border border-red-500/20 bg-red-500/[0.06] text-red-400"
              >
                ERROR
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <p className="text-[10px] text-ink-muted leading-relaxed">{step.desc}</p>
      </div>
    </motion.div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function PipelineProgress({ statuses }: { statuses: Record<AnalysisStep, StepStatus> }) {
  const total = ANALYSIS_STEPS.length;
  const done = Object.values(statuses).filter((s) => s === "done").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="space-y-1">
      <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[10px] text-ink-muted">
          {done === total ? "Analysis complete" : "Analyzing system..."}
        </span>
        <span className="text-[10px] font-mono text-ink-disabled">{done}/{total}</span>
      </div>
    </div>
  );
}

// ─── Main AnalysisTimeline ────────────────────────────────────────────────────

interface AnalysisTimelineProps {
  state: Pick<AnalysisPipelineState, "stepStatuses" | "error" | "completedAt" | "profile">;
  compact?: boolean;
  className?: string;
}

export function AnalysisTimeline({ state, compact = false, className = "" }: AnalysisTimelineProps) {
  const { stepStatuses, error, completedAt, profile } = state;
  const isDone = completedAt !== null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-[13px] font-semibold text-ink">
          {isDone ? "Analysis Complete" : "Running Analysis Pipeline"}
        </h3>
        {isDone && profile && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-ink-tertiary mt-0.5"
          >
            Classified as{" "}
            <span className="text-brand-400 font-medium">
              {profile.primary.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
            {" "}·{" "}
            {Math.round(profile.confidence * 100)}% confidence
          </motion.p>
        )}
      </div>

      {/* Progress bar */}
      {!compact && <PipelineProgress statuses={stepStatuses} />}

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-red-500/20 bg-red-500/[0.04] px-3 py-2"
        >
          <p className="text-[11px] text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Steps */}
      <div className="space-y-0">
        {ANALYSIS_STEPS.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            status={stepStatuses[step.id]}
            isLast={i === ANALYSIS_STEPS.length - 1}
            index={i}
          />
        ))}
      </div>

      {/* Completion */}
      <AnimatePresence>
        {isDone && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-xl border border-green-500/20 bg-green-500/[0.04] px-4 py-3 text-center"
          >
            <p className="text-[12px] font-medium text-green-400">
              System analysis complete — recommendations ready
            </p>
            {completedAt && (
              <p className="text-[10px] text-ink-muted mt-0.5">
                Completed at {new Date(completedAt).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
