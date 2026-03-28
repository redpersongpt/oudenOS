// ─── RecommendationList ──────────────────────────────────────────────────────
// Prioritized, filterable list of recommendations with risk badges and toggles.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Recommendation, OptimizationCategory, RiskLevel } from "../types.js";

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    safe:   "bg-green-500/10 text-green-400 border-green-500/20",
    low:    "bg-sky-500/10 text-sky-400 border-sky-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high:   "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${styles[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<OptimizationCategory, string> = {
  cpu: "CPU",
  gpu: "GPU",
  memory: "Memory",
  storage: "Storage",
  network: "Network",
  security: "Security",
  startup: "Startup",
  services: "Services",
  power: "Power",
  scheduler: "Scheduler",
};

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-4 w-7 items-center rounded-full border transition-colors duration-200 focus:outline-none ${
        checked ? "bg-brand-500 border-brand-400" : "bg-white/[0.06] border-white/[0.1]"
      }`}
    >
      <motion.span
        layout
        className="absolute h-2.5 w-2.5 rounded-full bg-white shadow"
        style={{ left: checked ? "calc(100% - 12px)" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

// ─── Impact bar ───────────────────────────────────────────────────────────────

function ImpactBar({ value, disabled }: { value: number; disabled: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-[3px] w-12 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${disabled ? "bg-white/20" : "bg-brand-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value * 2, 100)}%` }} // max 50% impact → full bar
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <span className={`text-[10px] font-mono ${disabled ? "text-ink-disabled" : "text-ink-secondary"}`}>
        +{value}%
      </span>
    </div>
  );
}

// ─── Recommendation Item ──────────────────────────────────────────────────────

interface RecommendationItemProps {
  rec: Recommendation;
  index: number;
  onToggle: (id: string) => void;
}

function RecommendationItem({ rec, index, onToggle }: RecommendationItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={`rounded-lg border transition-colors duration-200 ${
        rec.isEnabled
          ? "border-white/[0.07] bg-white/[0.02]"
          : "border-white/[0.03] bg-transparent opacity-50"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Priority indicator */}
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${
          rec.priority >= 8 ? "bg-brand-500/20 text-brand-400" :
          rec.priority >= 5 ? "bg-white/[0.06] text-ink-secondary" :
          "bg-transparent text-ink-muted"
        }`}>
          {rec.priority}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-[12px] font-medium text-ink text-left hover:text-brand-400 transition-colors"
            >
              {rec.title}
            </button>
            <RiskBadge level={rec.riskLevel} />
            <span className="text-[9px] text-ink-muted border border-white/[0.06] px-1.5 py-0.5 rounded">
              {CATEGORY_LABELS[rec.category]}
            </span>
            {rec.requiresReboot && (
              <span className="text-[9px] text-amber-400/70 border border-amber-500/20 px-1.5 py-0.5 rounded">
                Reboot
              </span>
            )}
          </div>

          <p className="text-[11px] text-ink-tertiary leading-relaxed line-clamp-2">
            {rec.description}
          </p>

          <ImpactBar value={rec.impactEstimate} disabled={!rec.isEnabled} />

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="text-[11px] text-ink-secondary leading-relaxed pt-1 border-t border-white/[0.04] mt-1">
                  <span className="text-ink-tertiary">Why: </span>{rec.rationale}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Toggle checked={rec.isEnabled} onChange={() => onToggle(rec.id)} />
      </div>
    </motion.div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<OptimizationCategory | "all"> = [
  "all", "cpu", "gpu", "memory", "storage", "power", "scheduler", "network", "security", "services"
];

// ─── Main RecommendationList ──────────────────────────────────────────────────

interface RecommendationListProps {
  recommendations: Recommendation[];
  onToggle: (id: string) => void;
  onToggleAll?: (enabled: boolean) => void;
  className?: string;
}

export function RecommendationList({
  recommendations,
  onToggle,
  onToggleAll,
  className = "",
}: RecommendationListProps) {
  const [activeFilter, setActiveFilter] = useState<OptimizationCategory | "all">("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");

  const filtered = recommendations.filter((r) => {
    const categoryMatch = activeFilter === "all" || r.category === activeFilter;
    const riskMatch = riskFilter === "all" || r.riskLevel === riskFilter;
    return categoryMatch && riskMatch;
  });

  const enabledCount = recommendations.filter((r) => r.isEnabled).length;
  const totalImpact = recommendations
    .filter((r) => r.isEnabled)
    .reduce((sum, r) => sum + r.impactEstimate * r.confidence, 0);

  // Only show categories that have recommendations
  const presentCategories = ALL_CATEGORIES.filter(
    (c) => c === "all" || recommendations.some((r) => r.category === c)
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-medium text-ink">
            {enabledCount} of {recommendations.length} recommendations enabled
          </p>
          <p className="text-[10px] text-ink-tertiary mt-0.5">
            Estimated improvement: ~{Math.round(Math.min(totalImpact, 50))}%
          </p>
        </div>
        {onToggleAll && (
          <div className="flex gap-2">
            <button
              onClick={() => onToggleAll(true)}
              className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
            >
              Enable all
            </button>
            <span className="text-ink-disabled">·</span>
            <button
              onClick={() => onToggleAll(false)}
              className="text-[11px] text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              Disable all
            </button>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {presentCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors duration-150 ${
              activeFilter === cat
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/30"
                : "bg-white/[0.03] text-ink-muted border border-white/[0.06] hover:text-ink-secondary"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            {cat !== "all" && (
              <span className="ml-1 opacity-60">
                {recommendations.filter((r) => r.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Risk filter */}
      <div className="flex gap-1">
        {(["all", "safe", "low", "medium", "high"] as const).map((risk) => (
          <button
            key={risk}
            onClick={() => setRiskFilter(risk)}
            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors border ${
              riskFilter === risk
                ? "border-brand-500/30 bg-brand-500/10 text-brand-400"
                : "border-white/[0.06] text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {risk === "all" ? "All risks" : risk.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-[12px] text-ink-muted"
            >
              No recommendations match current filters
            </motion.p>
          ) : (
            filtered.map((rec, i) => (
              <RecommendationItem key={rec.id} rec={rec} index={i} onToggle={onToggle} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
