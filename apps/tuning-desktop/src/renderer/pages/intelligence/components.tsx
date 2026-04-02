// Intelligence Page Sub-components
// Split out to keep IntelligencePage.tsx lean.

import { motion } from "framer-motion";
import { staggerChild, cardHover } from "@redcore/design-system";
import { Badge } from "@/components/ui/Badge";
import type {
  MachineArchetype,
  MachineClassification,
  IntelligentRecommendation,
  IntelligentTuningProfile,
  ClassificationSignal,
} from "@redcore/shared-schema/device-intelligence";
import { ARCHETYPE_META } from "@redcore/shared-schema/device-intelligence";

// Archetype accent color → Tailwind class map

const accentBar: Record<string, string> = {
  red:    "bg-red-500",
  blue:   "bg-blue-500",
  amber:  "bg-amber-500",
  sky:    "bg-sky-400",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green:  "bg-green-500",
};

const accentText: Record<string, string> = {
  red:    "text-red-400",
  blue:   "text-blue-400",
  amber:  "text-amber-400",
  sky:    "text-sky-400",
  orange: "text-orange-400",
  yellow: "text-yellow-400",
  green:  "text-green-400",
};

const accentBorder: Record<string, string> = {
  red:    "border-red-500/30",
  blue:   "border-blue-500/30",
  amber:  "border-amber-500/30",
  sky:    "border-sky-400/30",
  orange: "border-orange-500/30",
  yellow: "border-yellow-500/30",
  green:  "border-green-500/30",
};

const accentGlow: Record<string, string> = {
  red:    "shadow-[0_0_40px_rgba(232,69,60,0.10)]",
  blue:   "shadow-[0_0_40px_rgba(59,130,246,0.10)]",
  amber:  "shadow-[0_0_40px_rgba(245,158,11,0.10)]",
  sky:    "shadow-[0_0_40px_rgba(56,189,248,0.10)]",
  orange: "shadow-[0_0_40px_rgba(249,115,22,0.10)]",
  yellow: "shadow-[0_0_40px_rgba(234,179,8,0.10)]",
  green:  "shadow-[0_0_40px_rgba(34,197,94,0.10)]",
};

const ARCHETYPE_ORDER: MachineArchetype[] = [
  "gaming_desktop",
  "highend_workstation",
  "gaming_laptop",
  "budget_desktop",
  "office_laptop",
  "low_spec_system",
  "vm_cautious",
];

// Premium Archetype Emblem
// Each archetype gets a shield-shaped SVG emblem with its accent color.
// The emblem uses layered geometry: outer shield, inner glyph, subtle glow.
// This replaces basic icon usage for the hero card visual identity.

const EMBLEM_GLYPHS: Record<MachineArchetype, string> = {
  // Shield inner paths — each is a 24x24 viewBox glyph centered in the emblem
  gaming_desktop:      "M12 4l-1.5 3H7l2.5 2-1 3.5L12 10l3.5 2.5-1-3.5L17 7h-3.5z",                    // star/burst
  budget_desktop:      "M6 8h12v8H6zM9 6h6v2H9zM8 16h8v2H8z",                                             // compact tower
  highend_workstation: "M4 7h16v10H4zM7 5h10v2H7zM6 17h12v2H6zM9 9v4M12 9v4M15 9v4",                     // rack unit
  office_laptop:       "M4 8h16v7H4zM7 15h10v2H7zM2 17h20",                                                // laptop open
  gaming_laptop:       "M4 8h16v7H4zM7 15h10v2H7zM2 17h20M11 10l1-2 1 2-2 1 2-1z",                        // laptop + bolt
  low_spec_system:     "M12 4a8 8 0 110 16 8 8 0 010-16zm0 3v5h4",                                         // clock/gauge
  vm_cautious:         "M12 3l9 5v8l-9 5-9-5V8z",                                                          // hexagon/container
};

interface ArchetypeEmblemProps {
  archetype: MachineArchetype;
  accentColor: string;
  size?: number;
}

export function ArchetypeEmblem({ archetype, accentColor, size = 64 }: ArchetypeEmblemProps) {
  const strokeColor =
    accentColor === "red"    ? "#D42A45" :
    accentColor === "blue"   ? "#3B82F6" :
    accentColor === "amber"  ? "#F59E0B" :
    accentColor === "sky"    ? "#38BDF8" :
    accentColor === "orange" ? "#F97316" :
    accentColor === "yellow" ? "#EAB308" :
                               "#22C55E";
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="flex-shrink-0">
      {/* Outer glow */}
      <defs>
        <filter id={`glow-${archetype}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
        <linearGradient id={`grad-${archetype}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path
        d="M24 4L40 12V28C40 34 33 40 24 44C15 40 8 34 8 28V12L24 4Z"
        fill={`url(#grad-${archetype})`}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* Inner glyph */}
      <g transform="translate(12, 12)" opacity="0.85">
        <path
          d={EMBLEM_GLYPHS[archetype]}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Subtle top highlight */}
      <path
        d="M24 4L40 12V16C40 16 32 14 24 14S8 16 8 16V12L24 4Z"
        fill="white"
        opacity="0.04"
      />
    </svg>
  );
}

// Confidence Ring

const RING = 2 * Math.PI * 26; // circumference for r=26

interface ConfidenceRingProps {
  confidence: number;
  accentColor: string;
}

export function ConfidenceRing({ confidence, accentColor }: ConfidenceRingProps) {
  const pct = Math.round(confidence * 100);
  const offset = RING * (1 - confidence);
  const colorClass = accentText[accentColor] ?? "text-ink-secondary";
  const strokeColor =
    accentColor === "red"    ? "#D42A45" :
    accentColor === "blue"   ? "#3B82F6" :
    accentColor === "amber"  ? "#F59E0B" :
    accentColor === "sky"    ? "#38BDF8" :
    accentColor === "orange" ? "#F97316" :
    accentColor === "yellow" ? "#EAB308" :
                               "#22C55E";

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle
          cx="32" cy="32" r="26"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />
        <motion.circle
          cx="32" cy="32" r="26"
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={RING}
          initial={{ strokeDashoffset: RING }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.2, 0, 0, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono text-sm font-semibold leading-none ${colorClass}`}>
          {pct}%
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-tertiary">
          conf
        </span>
      </div>
    </div>
  );
}

// Hero Archetype Card

interface HeroCardProps {
  meta: typeof ARCHETYPE_META[MachineArchetype];
  confidence: number;
}

export function HeroCard({ meta, confidence, archetype }: HeroCardProps & { archetype: MachineArchetype }) {
  const border = accentBorder[meta.accentColor] ?? "border-white/[0.06]";
  const glow   = accentGlow[meta.accentColor]   ?? "";

  return (
    <motion.div
      variants={staggerChild}
      className={`rounded-lg border bg-white/[0.04] p-6 ${border} ${glow}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <ArchetypeEmblem archetype={archetype} accentColor={meta.accentColor} size={72} />
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1.5">
              Machine Archetype
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink leading-tight">
              {meta.label}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary max-w-[480px]">
              {meta.tagline}
            </p>
          </div>
        </div>
        <ConfidenceRing confidence={confidence} accentColor={meta.accentColor} />
      </div>
      <div className="mt-4 ml-[92px] flex items-center gap-2">
        <span className="text-xs text-ink-tertiary">Suggested preset</span>
        <Badge variant="default">
          {meta.suggestedPreset.charAt(0).toUpperCase() + meta.suggestedPreset.slice(1)}
        </Badge>
      </div>
    </motion.div>
  );
}

// Signal Card

interface SignalCardProps {
  signal: ClassificationSignal;
  archetypeMeta: typeof ARCHETYPE_META[MachineArchetype];
}

export function SignalCard({ signal, archetypeMeta }: SignalCardProps) {
  const barColor = accentBar[archetypeMeta.accentColor] ?? "bg-ink-tertiary";

  return (
    <motion.div
      variants={staggerChild}
      className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3.5 space-y-2.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink leading-snug">{signal.factor}</p>
        <span className="font-mono text-[10px] text-ink-tertiary shrink-0">
          w={signal.weight.toFixed(2)}
        </span>
      </div>
      <p className="text-[11px] text-ink-secondary truncate font-mono">{signal.value}</p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(100, signal.weight * 100)}%` }}
          transition={{ duration: 0.8, ease: [0.2, 0, 0, 1], delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

// Score Bar Row

interface ScoreBarProps {
  score: number;
  isPrimary: boolean;
  accentColor: string;
  label: string;
}

export function ScoreBar({ label, score, isPrimary, accentColor }: ScoreBarProps) {
  const barColor = isPrimary
    ? (accentBar[accentColor] ?? "bg-ink-tertiary")
    : "bg-white/[0.12]";
  const pct = Math.round(score * 100);

  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-36 shrink-0 truncate text-xs font-medium ${
          isPrimary ? "text-ink" : "text-ink-secondary"
        }`}
      >
        {label}
      </span>
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.2, 0, 0, 1], delay: 0.1 }}
        />
      </div>
      <span className="font-mono text-[11px] text-ink-tertiary w-8 text-right">
        {pct}
      </span>
    </div>
  );
}

// Score Breakdown

interface ScoreBreakdownProps {
  classification: MachineClassification;
  archetypeMeta: typeof ARCHETYPE_META[MachineArchetype];
  allMeta: Record<MachineArchetype, typeof ARCHETYPE_META[MachineArchetype]>;
}

export function ScoreBreakdown({ classification, archetypeMeta, allMeta }: ScoreBreakdownProps) {
  return (
    <div className="space-y-2.5">
      {ARCHETYPE_ORDER.map((arch) => (
        <ScoreBar
          key={arch}
          label={allMeta[arch].label}
          score={classification.scores[arch] ?? 0}
          isPrimary={arch === classification.primary}
          accentColor={archetypeMeta.accentColor}
        />
      ))}
    </div>
  );
}

// Recommendation Card

const confidenceBadgeVariant = (c: string): "success" | "warning" | "default" => {
  if (c === "high")    return "success";
  if (c === "medium")  return "warning";
  return "default";
};

const confidenceLabel: Record<string, string> = {
  high:         "High",
  medium:       "Medium",
  caution:      "Caution",
  analyze_only: "Analyze",
};

interface RecommendationCardProps {
  rec: IntelligentRecommendation;
  compact?: boolean;
}

export function RecommendationCard({ rec, compact = false }: RecommendationCardProps) {
  const relevancePct = Math.round(rec.relevance * 100);

  return (
    <motion.div
      variants={staggerChild}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <motion.div
        variants={cardHover}
        className={`rounded-lg border border-white/[0.06] bg-white/[0.04] ${
          compact ? "p-3" : "p-4"
        } space-y-2.5`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-ink leading-snug ${compact ? "text-xs" : "text-sm"}`}>
              {rec.actionName}
            </p>
            {!compact && (
              <p className="mt-1 text-xs text-ink-secondary leading-relaxed line-clamp-2">
                {rec.reason}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={confidenceBadgeVariant(rec.confidence)}>
              {confidenceLabel[rec.confidence] ?? rec.confidence}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              initial={{ width: "0%" }}
              animate={{ width: `${relevancePct}%` }}
              transition={{ duration: 0.7, ease: [0.2, 0, 0, 1], delay: 0.15 }}
            />
          </div>
          <span className="font-mono text-[10px] text-ink-tertiary w-7 text-right">
            {relevancePct}%
          </span>
          <Badge variant="default" className="text-[10px] px-2 py-0">
            {rec.category}
          </Badge>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Profile export helpers

export { ARCHETYPE_ORDER, accentBar, accentText, accentBorder };
export type { IntelligentTuningProfile, MachineClassification };
