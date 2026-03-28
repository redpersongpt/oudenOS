// ─── SystemAnalysisPanel ─────────────────────────────────────────────────────
// Compact system analysis panel for the os-desktop wizard.
// Shows the pipeline timeline + top recommendations inline.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  AnalysisTimeline,
  HardwareAnalysisCard,
  SoftwareAnalysisCard,
  WorkloadAnalysisCard,
  RecommendationList,
} from "@redcore/system-analyzer/components";
import type { AnalysisPipelineState } from "@redcore/system-analyzer";

interface SystemAnalysisPanelProps {
  pipelineState: AnalysisPipelineState;
  isRunning: boolean;
  onToggleRecommendation: (id: string) => void;
}

export function SystemAnalysisPanel({
  pipelineState,
  isRunning,
  onToggleRecommendation,
}: SystemAnalysisPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = pipelineState.completedAt !== null;
  const topRecs = pipelineState.recommendations.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${
            isDone ? "bg-green-400" : isRunning ? "bg-brand-500 animate-pulse" : "bg-ink-disabled"
          }`} />
          <span className="text-[12px] font-medium text-ink">
            {isDone ? "System Analysis Complete" : isRunning ? "Analyzing System…" : "System Analysis"}
          </span>
          {isDone && pipelineState.profile && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-brand-500/20 bg-brand-500/10 text-brand-400">
              {pipelineState.profile.primary.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-ink-tertiary" />
          : <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
        }
      </button>

      {/* Collapsed progress bar */}
      {!expanded && isRunning && (
        <div className="px-4 pb-3">
          <div className="relative h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
              animate={{ width: `${(Object.values(pipelineState.stepStatuses).filter(s => s === "done").length / 6) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] p-4 space-y-5">
              {/* Analysis timeline */}
              <AnalysisTimeline state={pipelineState} compact />

              {/* Analysis cards — shown when scan is done */}
              {pipelineState.analysis && (
                <div className="grid grid-cols-1 gap-3">
                  <HardwareAnalysisCard analysis={pipelineState.analysis.hardware} />
                  <div className="grid grid-cols-2 gap-3">
                    <WorkloadAnalysisCard analysis={pipelineState.analysis.workload} />
                    <SoftwareAnalysisCard analysis={pipelineState.analysis.software} />
                  </div>
                </div>
              )}

              {/* Top recommendations */}
              {isDone && topRecs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider">
                    Top Recommendations
                  </p>
                  <RecommendationList
                    recommendations={topRecs}
                    onToggle={onToggleRecommendation}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
