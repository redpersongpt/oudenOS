import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Cpu,
  MemoryStick,
  Thermometer,
  Zap,
  ChevronRight,
  ScanSearch,
  Loader2,
  Shield,
  Wifi,
} from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  cardHover,
} from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDeviceStore } from "@/stores/device-store";
import { serviceCall } from "@/lib/api";

// Health score derivation

function deriveHealthScore(
  profile: NonNullable<ReturnType<typeof useDeviceStore.getState>["profile"]>,
): number {
  let score = 100;

  if (!profile.memory.xmpExpoEnabled) score -= 10;
  if (profile.security.bitlockerEnabled) score -= 5;
  if (profile.security.vbsEnabled) score -= 5;

  const primaryDisk = profile.storage[0];
  if (primaryDisk?.healthPercent != null) {
    if (primaryDisk.healthPercent < 80) score -= 15;
    else if (primaryDisk.healthPercent < 95) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function healthLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Attention";
}

function healthArcColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  return "#FF6B6B";
}

// Health Gauge SVG

const ARC_LENGTH = 235.62;

interface HealthGaugeProps {
  score: number;
}

function HealthGauge({ score }: HealthGaugeProps) {
  const color = healthArcColor(score);
  const offset = ARC_LENGTH * (1 - score / 100);

  return (
    <svg
      viewBox="0 0 120 108"
      className="h-[108px] w-[120px]"
      aria-label={`Health score: ${score}`}
    >
      {/* Track */}
      <path
        d="M 24.64 95.36 A 50 50 0 1 1 95.36 95.36"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={9}
        strokeLinecap="round"
      />
      {/* Fill */}
      <motion.path
        d="M 24.64 95.36 A 50 50 0 1 1 95.36 95.36"
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={ARC_LENGTH}
        initial={{ strokeDashoffset: ARC_LENGTH }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: [0.2, 0, 0, 1], delay: 0.4 }}
      />
      {/* Score number */}
      <text
        x="60"
        y="64"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-mono"
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontSize="22"
        fontWeight="600"
        fill="#EDEDEF"
      >
        {score}
      </text>
      {/* Label */}
      <text
        x="60"
        y="80"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Inter, sans-serif"
        fontSize="8"
        fontWeight="500"
        fill="#6B6A65"
        letterSpacing="0.08em"
      >
        {healthLabel(score).toUpperCase()}
      </text>
    </svg>
  );
}

// Opportunity card

interface OpportunityCardProps {
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  risk: "safe" | "low" | "medium" | "high" | "extreme";
  impact: string;
}

function OpportunityCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  desc,
  risk,
  impact,
}: OpportunityCardProps) {
  return (
    <motion.div
      variants={staggerChild}
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <motion.div
        variants={cardHover}
        className="flex items-center gap-4 rounded-lg border border-border bg-surface-overlay p-3.5 cursor-default"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-ink-secondary truncate">{desc}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge variant="risk" risk={risk}>
            {risk}
          </Badge>
          <span className="font-mono text-[10px] text-ink-tertiary">
            {impact}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Heat bar

interface HeatBarProps {
  value: number | null;
  max: number;
  label: string;
}

function HeatBar({ value, max, label }: HeatBarProps) {
  const pct = value !== null ? Math.min(100, (value / max) * 100) : 0;
  const isHot = value !== null && value / max > 0.8;
  const isMed = value !== null && value / max > 0.6;
  const barColor = isHot
    ? "bg-brand-500"
    : isMed
      ? "bg-amber-400"
      : "bg-green-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary">
          {label}
        </span>
        <span className="font-mono text-[10px] text-ink-secondary">
          {value !== null ? `${value}°C` : "—"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.2, 0, 0, 1], delay: 0.6 }}
        />
      </div>
    </div>
  );
}

// Page

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    profile,
    scanning,
    scanProgress,
    scanPhase,
    setScanning,
    setProfile,
  } = useDeviceStore();

  // TODO: Subscribe to scan.progress when Rust event emission is wired

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await serviceCall("scan.hardware", {});
      setProfile(result);
    } catch (error) {
      console.error("[Dashboard] Scan failed:", error);
      setScanning(false);
    }
  };

  const healthScore = profile ? deriveHealthScore(profile) : null;
  const cpuTemp = profile?.thermal?.cpuTempC ?? null;
  const gpuTemp = profile?.thermal?.gpuTempC ?? null;

  const thermalStatus =
    cpuTemp !== null && gpuTemp !== null
      ? cpuTemp > 90 || gpuTemp > 85
        ? "Alert"
        : "OK"
      : null;

  // Build opportunity list from profile
  const opportunities: OpportunityCardProps[] = [];
  if (profile) {
    if (!profile.memory.xmpExpoEnabled) {
      opportunities.push({
        icon: MemoryStick,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-400",
        title: "XMP / EXPO Not Enabled",
        desc: `RAM at ${profile.memory.speedMhz} MHz — XMP profile available in BIOS`,
        risk: "low",
        impact: "~30% bandwidth",
      });
    }
    if (profile.gpus[0] && !profile.gpus[0].resizableBar) {
      opportunities.push({
        icon: Cpu,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-400",
        title: "Resizable BAR Disabled",
        desc: "Enable ReBAR in BIOS for improved VRAM throughput",
        risk: "safe",
        impact: "GPU throughput",
      });
    }
    if (profile.security.vbsEnabled) {
      opportunities.push({
        icon: Shield,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-400",
        title: "VBS / HVCI Active",
        desc: "Virtualisation-based security adds 5–15% CPU overhead",
        risk: "medium",
        impact: "CPU overhead",
      });
    }
    opportunities.push({
      icon: Zap,
      iconBg: "bg-green-500/10",
      iconColor: "text-green-400",
      title: "Timer Resolution",
      desc: "GlobalTimerResolutionRequests available on this build",
      risk: "safe",
      impact: "~2ms latency",
    });
    opportunities.push({
      icon: Cpu,
      iconBg: "bg-surface-overlay",
      iconColor: "text-ink-secondary",
      title: "Win32PrioritySeparation",
      desc: "Current: 0x02 (default) → Recommended: 0x26 (gaming)",
      risk: "low",
      impact: "Scheduler boost",
    });
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Machine Identity Hero */}
      <motion.div variants={staggerChild}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink">
              {profile ? profile.cpu.brand.split("@")[0]?.trim() ?? profile.cpu.brand : "Your Machine"}
            </h1>
            <p className="mt-1 text-[13px] text-ink-secondary">
              {profile
                ? `${profile.gpus[0]?.name ?? "No GPU"} — ${Math.round(profile.memory.totalMb / 1024)} GB ${profile.memory.type} — Windows ${profile.windows.displayVersion}`
                : "Scan your hardware to begin optimization."}
            </p>
          </div>
          {!scanning && !profile && (
            <Button
              variant="primary"
              size="md"
              onClick={handleScan}
              icon={<Zap className="h-4 w-4" />}
            >
              Scan Hardware
            </Button>
          )}
        </div>
      </motion.div>

      {/* Row 1: Health Gauge + Quick Metrics */}
      <motion.div
        variants={staggerChild}
        className="grid grid-cols-4 gap-4"
      >
        {/* Health Gauge card */}
        <Card className="col-span-1">
          <div className="flex flex-col items-center justify-center px-5 py-5 gap-3">
            <AnimatePresence mode="wait">
              {scanning ? (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="relative h-[108px] w-[120px] flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
                  </div>
                  <p className="text-xs font-medium text-ink-secondary">
                    {scanPhase || "Scanning…"}
                  </p>
                </motion.div>
              ) : healthScore !== null ? (
                <motion.div
                  key="score"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-2"
                >
                  <HealthGauge score={healthScore} />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                    System Health
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex h-[108px] w-[120px] items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/[0.12]">
                      <ScanSearch
                        className="h-7 w-7 text-ink-tertiary"
                        strokeWidth={1.5}
                      />
                    </div>
                  </div>
                  <p className="text-center text-xs font-medium text-ink-secondary">
                    Run a scan
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!scanning && (
              <Button
                variant={profile ? "secondary" : "primary"}
                size="sm"
                onClick={handleScan}
                icon={<Zap className="h-3.5 w-3.5" />}
                className="w-full"
              >
                {profile ? "Re-scan" : "Scan Now"}
              </Button>
            )}
          </div>
        </Card>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: 0.05 }}>
          <MetricCard
            label="CPU Temp"
            value={cpuTemp ?? "—"}
            unit={cpuTemp !== null ? "°C" : ""}
            trend={
              cpuTemp !== null ? (cpuTemp > 85 ? "down" : "neutral") : "neutral"
            }
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: 0.10 }}>
          <MetricCard
            label="GPU Temp"
            value={gpuTemp ?? "—"}
            unit={gpuTemp !== null ? "°C" : ""}
            trend={
              gpuTemp !== null ? (gpuTemp > 80 ? "down" : "neutral") : "neutral"
            }
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: 0.15 }}>
          <MetricCard
            label="System RAM"
            value={
              profile ? `${Math.round(profile.memory.totalMb / 1024)} GB` : "—"
            }
            unit=""
            trend="neutral"
            trendValue={
              profile?.memory.type ? profile.memory.type : undefined
            }
          />
        </motion.div>
      </motion.div>

      {/* Row 2: Opportunities (2-col) + System/Thermal (1-col) */}
      <div className="grid grid-cols-3 gap-4">
        {/* Optimization Opportunities */}
        <motion.div variants={staggerChild} className="col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-semibold text-ink">
                    Optimization Opportunities
                  </h2>
                  {profile && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500/15 px-1.5 text-[10px] font-semibold text-brand-400 border border-brand-500/20">
                      {opportunities.length}
                    </span>
                  )}
                </div>
                {profile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/tuning")}
                  >
                    View Plan
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Scanning progress strip */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mb-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-ink-tertiary uppercase tracking-wider">
                      {scanPhase || "Scanning hardware…"}
                    </span>
                    <span className="font-mono text-[10px] text-ink-secondary">
                      {scanProgress}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <motion.div
                      className="h-full rounded-full bg-brand-500"
                      animate={{ width: `${scanProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <CardContent>
              <AnimatePresence mode="wait">
                {!profile ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-10 gap-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-surface-overlay">
                      <ScanSearch
                        className="h-5 w-5 text-ink-tertiary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <p className="text-xs text-ink-secondary">
                      Run a scan to see machine-specific recommendations
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2.5"
                  >
                    {opportunities.map((op) => (
                      <OpportunityCard key={op.title} {...op} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* System + Thermal sidebar */}
        <motion.div variants={staggerChild} className="flex flex-col gap-4">
          {/* System Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">
                  System Info
                </h2>
                {!profile && !scanning && (
                  <Button variant="secondary" size="sm" onClick={handleScan}>
                    <ScanSearch className="h-3.5 w-3.5" />
                    Scan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(
                  [
                    { label: "CPU", value: profile?.cpu.brand ?? "—" },
                    { label: "GPU", value: profile?.gpus[0]?.name ?? "—" },
                    {
                      label: "RAM",
                      value: profile
                        ? `${Math.round(profile.memory.totalMb / 1024)} GB ${profile.memory.type}`
                        : "—",
                    },
                    {
                      label: "Windows",
                      value: profile
                        ? `${profile.windows.version} ${profile.windows.displayVersion}`
                        : "—",
                    },
                    {
                      label: "Build",
                      value: profile?.windows.build.toString() ?? "—",
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="shrink-0 text-xs font-medium text-ink-tertiary">
                      {item.label}
                    </span>
                    <span className="max-w-[160px] truncate text-right text-xs text-ink-secondary">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Thermal */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-ink-tertiary" />
                <h2 className="text-sm font-semibold text-ink">
                  Thermal
                </h2>
                {thermalStatus && (
                  <Badge
                    variant={thermalStatus === "OK" ? "info" : "default"}
                    className="ml-auto"
                  >
                    {thermalStatus}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <HeatBar value={cpuTemp} max={100} label="CPU" />
                <HeatBar value={gpuTemp} max={95} label="GPU" />
                {!profile && (
                  <p className="text-center text-xs text-ink-tertiary">
                    No data — scan to read temperatures
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Activity Timeline */}
      <motion.div variants={staggerChild}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-ink-tertiary" />
                <h2 className="text-sm font-semibold text-ink">
                  Activity Timeline
                </h2>
              </div>
              <Badge variant="default">No entries</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-white/[0.12] bg-surface-overlay">
                <Activity
                  className="h-5 w-5 text-ink-tertiary"
                  strokeWidth={1.5}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-ink-secondary">
                  No optimization history yet
                </p>
                <p className="mt-1 text-xs text-ink-tertiary">
                  Run your first scan to get started. Applied tweaks will appear here.
                </p>
              </div>
              {profile && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/tuning")}
                  icon={<Wifi className="h-3.5 w-3.5" />}
                >
                  Generate Tuning Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
