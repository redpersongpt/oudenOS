// ─── SystemAnalysisCard ──────────────────────────────────────────────────────
// Displays one analyzer's result with an animated gauge and status badges.

import { motion } from "framer-motion";
import type {
  HardwareAnalysis,
  SoftwareAnalysis,
  WorkloadAnalysis,
  ThermalAnalysis,
  NetworkAnalysis,
  SecurityAnalysis,
} from "../types.js";

// ─── Animated Gauge ───────────────────────────────────────────────────────────

interface GaugeProps {
  value: number; // 0-100
  color?: string;
  size?: number;
}

function CircularGauge({ value, color = "#E8254B", size = 48 }: GaugeProps) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - value / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-mono text-ink">{value}</span>
      </div>
    </div>
  );
}

// ─── Score color helper ────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "#4ade80";
  if (score >= 50) return "#E8254B";
  return "#f87171";
}

function scoreBadge(score: number): { label: string; className: string } {
  if (score >= 75) return { label: "Good", className: "bg-green-500/10 text-green-400 border-green-500/20" };
  if (score >= 50) return { label: "Fair", className: "bg-brand-500/10 text-brand-400 border-brand-500/20" };
  return { label: "Needs work", className: "bg-red-500/10 text-red-400 border-red-500/20" };
}

// ─── Shared Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-[11px] text-ink-tertiary">{label}</span>
      <span className={`text-[11px] font-mono font-medium ${highlight ? "text-brand-400" : "text-ink-secondary"}`}>
        {value}
      </span>
    </div>
  );
}

function NoteItem({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-1.5 text-[10px] text-ink-muted leading-relaxed">
      <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-brand-500/50" />
      {note}
    </div>
  );
}

// ─── Hardware Card ────────────────────────────────────────────────────────────

interface HardwareAnalysisCardProps {
  analysis: HardwareAnalysis;
  delay?: number;
}

export function HardwareAnalysisCard({ analysis, delay = 0 }: HardwareAnalysisCardProps) {
  const badge = scoreBadge(analysis.overallScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Hardware</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">CPU · GPU · RAM · Storage</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <CircularGauge value={analysis.overallScore} color={scoreColor(analysis.overallScore)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* CPU */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">CPU</p>
          <DetailRow label="Cores / Threads" value={`${analysis.cpu.cores}C / ${analysis.cpu.threads}T`} />
          <DetailRow label="Boost Clock" value={analysis.cpu.boostClockGhz ? `${analysis.cpu.boostClockGhz.toFixed(1)} GHz` : "N/A"} />
          <DetailRow label="Tier" value={analysis.cpu.tier.charAt(0).toUpperCase() + analysis.cpu.tier.slice(1)} highlight={analysis.cpu.tier === "flagship" || analysis.cpu.tier === "high"} />
        </div>
        {/* GPU */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">GPU</p>
          <DetailRow label="VRAM" value={`${analysis.gpu.vramGb.toFixed(0)} GB`} />
          <DetailRow label="Vendor" value={analysis.gpu.vendor.toUpperCase()} />
          <DetailRow label="ReBAR" value={analysis.gpu.resizableBar ? "Enabled" : "Disabled"} highlight={!analysis.gpu.resizableBar} />
        </div>
        {/* RAM */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">RAM</p>
          <DetailRow label="Capacity" value={`${analysis.ram.totalGb.toFixed(0)} GB ${analysis.ram.type}`} />
          <DetailRow label="Speed" value={`${analysis.ram.speedMhz} MHz`} />
          <DetailRow label="XMP/EXPO" value={analysis.ram.xmpEnabled ? "Active" : "Off"} highlight={!analysis.ram.xmpEnabled} />
        </div>
        {/* Storage */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">Storage</p>
          <DetailRow label="Interface" value={analysis.storage.systemDrive.type.toUpperCase()} />
          <DetailRow label="Free Space" value={`${analysis.storage.systemDrive.freePercent.toFixed(0)}%`} highlight={analysis.storage.systemDrive.isLowFreeSpace} />
          <DetailRow label="TRIM" value={analysis.storage.systemDrive.trimEnabled ? "Active" : "Disabled"} />
        </div>
      </div>

      {analysis.summaryNotes.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.04] pt-3">
          {analysis.summaryNotes.map((note, i) => <NoteItem key={i} note={note} />)}
        </div>
      )}
    </motion.div>
  );
}

// ─── Software Card ────────────────────────────────────────────────────────────

export function SoftwareAnalysisCard({ analysis, delay = 0 }: { analysis: SoftwareAnalysis; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      <div>
        <h3 className="text-[13px] font-semibold text-ink">Software</h3>
        <p className="text-[11px] text-ink-tertiary mt-0.5">Windows · Services · Scheduler</p>
      </div>

      <div className="space-y-1">
        <DetailRow label="Windows" value={`${analysis.windows.version} ${analysis.windows.displayVersion} (Build ${analysis.windows.build})`} />
        <DetailRow label="Edition" value={analysis.windows.edition} />
        <DetailRow label="Power Plan" value={analysis.powerPlan} highlight={analysis.powerPlan.toLowerCase().includes("power saver")} />
        {analysis.coreParkingEnabled !== null && (
          <DetailRow label="Core Parking" value={analysis.coreParkingEnabled ? "Enabled" : "Disabled"} highlight={analysis.coreParkingEnabled === true} />
        )}
        {analysis.timerResolutionMs !== null && (
          <DetailRow label="Timer Resolution" value={`${analysis.timerResolutionMs}ms`} highlight={analysis.timerResolutionMs > 1} />
        )}
        {analysis.runningServicesCount !== null && (
          <DetailRow label="Running Services" value={String(analysis.runningServicesCount)} highlight={analysis.runningServicesCount > 200} />
        )}
      </div>

      {analysis.notes.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.04] pt-3">
          {analysis.notes.slice(0, 3).map((note, i) => <NoteItem key={i} note={note} />)}
        </div>
      )}
    </motion.div>
  );
}

// ─── Workload Card ────────────────────────────────────────────────────────────

const WORKLOAD_COLORS: Record<string, string> = {
  gaming: "text-brand-400",
  work: "text-sky-400",
  development: "text-purple-400",
  content_creation: "text-amber-400",
  general: "text-ink-secondary",
};

export function WorkloadAnalysisCard({ analysis, delay = 0 }: { analysis: WorkloadAnalysis; delay?: number }) {
  const color = WORKLOAD_COLORS[analysis.primary] ?? "text-ink";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Workload Profile</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">Usage pattern detection</p>
        </div>
        <div className="text-right">
          <p className={`text-[13px] font-semibold ${color}`}>
            {analysis.primary.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </p>
          <p className="text-[10px] text-ink-muted">{Math.round(analysis.confidence * 100)}% confidence</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {analysis.signals.slice(0, 4).map((sig, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
              sig.strength === "strong" ? "bg-brand-500" :
              sig.strength === "medium" ? "bg-brand-500/50" : "bg-white/20"
            }`} />
            <span className="text-[11px] text-ink-secondary">{sig.indicator}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Thermal Card ─────────────────────────────────────────────────────────────

const THERMAL_COLORS: Record<string, string> = {
  cool: "text-green-400",
  warm: "text-amber-400",
  hot: "text-orange-400",
  critical: "text-red-400",
  unknown: "text-ink-muted",
};

export function ThermalAnalysisCard({ analysis, delay = 0 }: { analysis: ThermalAnalysis; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Thermal</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">CPU & GPU temperatures</p>
        </div>
        {analysis.isThrottling && (
          <span className="px-2 py-0.5 rounded-md border text-[10px] font-medium bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
            Throttling
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className={`text-2xl font-bold font-mono ${THERMAL_COLORS[analysis.cpuRating]}`}>
            {analysis.cpuTempC !== null ? `${analysis.cpuTempC}°` : "—"}
          </p>
          <p className="text-[10px] text-ink-muted mt-0.5">CPU</p>
          <p className={`text-[10px] ${THERMAL_COLORS[analysis.cpuRating]}`}>
            {analysis.cpuRating === "unknown" ? "No data" : analysis.cpuRating.toUpperCase()}
          </p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold font-mono ${THERMAL_COLORS[analysis.gpuRating]}`}>
            {analysis.gpuTempC !== null ? `${analysis.gpuTempC}°` : "—"}
          </p>
          <p className="text-[10px] text-ink-muted mt-0.5">GPU</p>
          <p className={`text-[10px] ${THERMAL_COLORS[analysis.gpuRating]}`}>
            {analysis.gpuRating === "unknown" ? "No data" : analysis.gpuRating.toUpperCase()}
          </p>
        </div>
      </div>

      {analysis.notes.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.04] pt-3">
          {analysis.notes.slice(0, 2).map((note, i) => <NoteItem key={i} note={note} />)}
        </div>
      )}
    </motion.div>
  );
}

// ─── Network Card ─────────────────────────────────────────────────────────────

export function NetworkAnalysisCard({ analysis, delay = 0 }: { analysis: NetworkAnalysis; delay?: number }) {
  const qualityColors: Record<string, string> = {
    excellent: "text-green-400",
    good: "text-brand-400",
    fair: "text-amber-400",
    poor: "text-red-400",
    unknown: "text-ink-muted",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Network</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">{analysis.primaryAdapterName}</p>
        </div>
        <span className={`text-[12px] font-semibold ${qualityColors[analysis.connectionQuality]}`}>
          {analysis.connectionQuality.toUpperCase()}
        </span>
      </div>

      <div className="space-y-1">
        <DetailRow label="Type" value={analysis.primaryAdapterType.toUpperCase()} highlight={analysis.isWifi} />
        {analysis.speedDescription && (
          <DetailRow label="Speed" value={analysis.speedDescription} />
        )}
        {analysis.rssQueues !== null && (
          <DetailRow label="RSS Queues" value={String(analysis.rssQueues)} highlight={analysis.rssQueues < 4} />
        )}
      </div>

      {analysis.notes.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.04] pt-3">
          {analysis.notes.slice(0, 2).map((note, i) => <NoteItem key={i} note={note} />)}
        </div>
      )}
    </motion.div>
  );
}

// ─── Security Card ────────────────────────────────────────────────────────────

export function SecurityAnalysisCard({ analysis, delay = 0 }: { analysis: SecurityAnalysis; delay?: number }) {
  const postureColors: Record<string, string> = {
    hardened: "text-green-400",
    standard: "text-brand-400",
    minimal: "text-amber-400",
    exposed: "text-red-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">Security</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">Secure Boot · TPM · VBS/HVCI</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-semibold ${postureColors[analysis.posture]}`}>
            {analysis.posture.charAt(0).toUpperCase() + analysis.posture.slice(1)}
          </span>
          <CircularGauge value={analysis.score} color={scoreColor(analysis.score)} size={40} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Secure Boot", active: analysis.secureBoot },
          { label: "TPM", active: analysis.tpmPresent },
          { label: "BitLocker", active: analysis.bitlockerEnabled },
          { label: "VBS", active: analysis.vbsEnabled },
          { label: "HVCI", active: analysis.hvciEnabled },
          { label: "Virt.", active: analysis.virtualizationEnabled },
        ].map(({ label, active }) => (
          <div key={label} className={`flex items-center gap-1 rounded-md px-2 py-1.5 border ${active ? "border-green-500/20 bg-green-500/[0.06]" : "border-white/[0.04] bg-transparent"}`}>
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${active ? "bg-green-400" : "bg-ink-disabled"}`} />
            <span className={`text-[10px] ${active ? "text-green-400" : "text-ink-muted"}`}>{label}</span>
          </div>
        ))}
      </div>

      {analysis.hvciPerformanceImpact && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
          <p className="text-[10px] text-amber-400">HVCI active — CPU overhead may affect performance</p>
        </div>
      )}
    </motion.div>
  );
}
