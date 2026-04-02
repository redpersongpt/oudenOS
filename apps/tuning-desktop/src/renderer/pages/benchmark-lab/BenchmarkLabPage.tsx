import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, animate as frameAnimate } from "framer-motion";
import ReactECharts from "echarts-for-react";
import {
  Cpu,
  MonitorSmartphone,
  MemoryStick,
  HardDrive,
  Timer,
  Power,
  Play,
  BarChart3,
  Clock,
  CheckCircle2,
  Loader2,
  Square,
  LineChart,
  ChevronDown,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PremiumGate } from "@/components/ui/PremiumGate";

type BenchmarkCategory = "cpu" | "gpu" | "memory" | "storage" | "latency" | "boot";

interface BenchmarkDef {
  id: string;
  category: BenchmarkCategory;
  name: string;
  description: string;
  icon: React.ElementType;
  duration: string;
  durationMs: number;
}

interface BenchmarkResult {
  id: string;
  benchmarkId: string;
  label: string;
  timestamp: string;
  score: number;
  unit: string;
  tag: "before" | "after" | "baseline";
}

const categoryColors: Record<
  BenchmarkCategory,
  { bg: string; icon: string; accent: string }
> = {
  cpu:     { bg: "bg-red-500/10",    icon: "text-red-400",    accent: "#D71921" },
  gpu:     { bg: "bg-blue-500/10",   icon: "text-blue-400",   accent: "#3B82F6" },
  memory:  { bg: "bg-green-500/10",  icon: "text-green-400",  accent: "#22C55E" },
  storage: { bg: "bg-amber-500/10",  icon: "text-amber-400",  accent: "#F59E0B" },
  latency: { bg: "bg-purple-500/10", icon: "text-purple-400", accent: "#8B5CF6" },
  boot:    { bg: "bg-surface-overlay", icon: "text-ink-secondary", accent: "#6B6A65" },
};

const benchmarks: BenchmarkDef[] = [
  { id: "cpu-single",   category: "cpu",     name: "CPU Single-Thread",   description: "Single-core integer and floating point throughput",  icon: Cpu,              duration: "~30s",    durationMs: 3500 },
  { id: "cpu-multi",    category: "cpu",     name: "CPU Multi-Thread",    description: "All-core workload scaling and throughput",           icon: Cpu,              duration: "~45s",    durationMs: 4500 },
  { id: "gpu-render",   category: "gpu",     name: "GPU Render",          description: "3D rendering pipeline stress test",                  icon: MonitorSmartphone,duration: "~60s",    durationMs: 5000 },
  { id: "gpu-frametime",category: "gpu",     name: "GPU Frame Time",      description: "Frame consistency and 1% low analysis",              icon: MonitorSmartphone,duration: "~60s",    durationMs: 5000 },
  { id: "mem-bandwidth",category: "memory",  name: "Memory Bandwidth",    description: "Sequential read/write throughput",                   icon: MemoryStick,      duration: "~20s",    durationMs: 2500 },
  { id: "mem-latency",  category: "memory",  name: "Memory Latency",      description: "Access latency and cache hierarchy test",            icon: MemoryStick,      duration: "~15s",    durationMs: 2000 },
  { id: "disk-seq",     category: "storage", name: "Storage Sequential",  description: "Sequential read/write speed",                        icon: HardDrive,        duration: "~30s",    durationMs: 3000 },
  { id: "disk-random",  category: "storage", name: "Storage Random 4K",   description: "Random 4K IOPS performance",                         icon: HardDrive,        duration: "~30s",    durationMs: 3000 },
  { id: "dpc-latency",  category: "latency", name: "DPC/ISR Latency",     description: "Deferred procedure call latency analysis",           icon: Timer,            duration: "~30s",    durationMs: 3500 },
  { id: "input-latency",category: "latency", name: "Input Latency",       description: "Mouse-to-screen end-to-end latency estimate",        icon: Timer,            duration: "~20s",    durationMs: 2500 },
  { id: "boot-time",    category: "boot",    name: "Boot Time",           description: "Cold boot to desktop measurement",                   icon: Power,            duration: "Reboot",  durationMs: 2500 },
];

const mockScores: Record<string, { value: number; unit: string }> = {
  "cpu-single":    { value: 2198,  unit: "pts"    },
  "cpu-multi":     { value: 24890, unit: "pts"    },
  "gpu-render":    { value: 18420, unit: "pts"    },
  "gpu-frametime": { value: 6.2,   unit: "ms"     },
  "mem-bandwidth": { value: 72400, unit: "MB/s"   },
  "mem-latency":   { value: 14.2,  unit: "ns"     },
  "disk-seq":      { value: 6800,  unit: "MB/s"   },
  "disk-random":   { value: 890,   unit: "K IOPS" },
  "dpc-latency":   { value: 5.1,   unit: "µs"     },
  "input-latency": { value: 2.8,   unit: "ms"     },
  "boot-time":     { value: 12.4,  unit: "s"      },
};

const mockResults: BenchmarkResult[] = [
  { id: "r1", benchmarkId: "cpu-single",    label: "CPU Single-Thread", timestamp: "2026-03-23 11:42", score: 2145,  unit: "pts",  tag: "before" },
  { id: "r2", benchmarkId: "cpu-multi",     label: "CPU Multi-Thread",  timestamp: "2026-03-23 11:43", score: 24890, unit: "pts",  tag: "before" },
  { id: "r3", benchmarkId: "mem-bandwidth", label: "Memory Bandwidth",  timestamp: "2026-03-23 11:44", score: 72400, unit: "MB/s", tag: "before" },
  { id: "r4", benchmarkId: "dpc-latency",   label: "DPC/ISR Latency",   timestamp: "2026-03-23 11:45", score: 8.2,   unit: "µs",   tag: "before" },
  { id: "r5", benchmarkId: "cpu-single",    label: "CPU Single-Thread", timestamp: "2026-03-23 14:10", score: 2198,  unit: "pts",  tag: "after"  },
  { id: "r6", benchmarkId: "dpc-latency",   label: "DPC/ISR Latency",   timestamp: "2026-03-23 14:12", score: 5.1,   unit: "µs",   tag: "after"  },
];

const categories: Array<{ id: BenchmarkCategory | "all"; label: string }> = [
  { id: "all",     label: "All"     },
  { id: "cpu",     label: "CPU"     },
  { id: "gpu",     label: "GPU"     },
  { id: "memory",  label: "Memory"  },
  { id: "storage", label: "Storage" },
  { id: "latency", label: "Latency" },
  { id: "boot",    label: "Boot"    },
];

const trendDates = ["Mar 19", "Mar 20", "Mar 21", "Mar 22", "Mar 23"];

// Count-up number animation
function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const ctrl = frameAnimate(0, to, {
      duration: 1.2,
      ease: [0.2, 0.0, 0.0, 1.0],
      onUpdate(v) {
        if (!ref.current) return;
        ref.current.textContent =
          decimals > 0
            ? v.toFixed(decimals)
            : v >= 1000
              ? Math.round(v).toLocaleString()
              : Math.round(v).toString();
      },
    });
    return () => ctrl.stop();
  }, [to, decimals]);
  return <span ref={ref} className="tabular-nums">0</span>;
}

export function BenchmarkLabPage() {
  const [activeCategory, setActiveCategory] = useState<BenchmarkCategory | "all">("all");
  const [runningId, setRunningId]     = useState<string | null>(null);
  const [progress, setProgress]       = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [runningAll, setRunningAll]   = useState(false);
  const [showTrend, setShowTrend]     = useState(false);
  const abortRef = useRef(false);

  const filtered =
    activeCategory === "all"
      ? benchmarks
      : benchmarks.filter((b) => b.category === activeCategory);

  // Compute before/after comparisons from mock results
  const comparisons = benchmarks
    .filter((b) => {
      const before = mockResults.find((r) => r.benchmarkId === b.id && r.tag === "before");
      const after  = mockResults.find((r) => r.benchmarkId === b.id && r.tag === "after");
      return before && after;
    })
    .map((b) => {
      const before   = mockResults.find((r) => r.benchmarkId === b.id && r.tag === "before")!;
      const after    = mockResults.find((r) => r.benchmarkId === b.id && r.tag === "after")!;
      const delta    = after.score - before.score;
      const pct      = parseFloat(((delta / before.score) * 100).toFixed(1));
      const isLower  = b.id.includes("latency");
      const improved = isLower ? delta < 0 : delta > 0;
      return { benchmark: b, before, after, delta, pct, improved };
    });

  // Benchmark runner
  const runBenchmark = useCallback(async (id: string): Promise<void> => {
    const bench = benchmarks.find((b) => b.id === id);
    if (!bench) return;
    setRunningId(id);
    setProgress(0);
    const start = Date.now();
    const dur   = bench.durationMs;
    return new Promise((resolve) => {
      const tick = () => {
        if (abortRef.current) { setRunningId(null); resolve(); return; }
        const pct = Math.min(((Date.now() - start) / dur) * 100, 100);
        setProgress(pct);
        if (pct < 100) {
          requestAnimationFrame(tick);
        } else {
          setCompletedIds((prev) => new Set([...prev, id]));
          setRunningId(null);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }, []);

  const handleRun = (id: string) => {
    if (runningId) return;
    abortRef.current = false;
    runBenchmark(id);
  };

  const handleRunAll = async () => {
    if (runningAll || runningId) return;
    abortRef.current = false;
    setRunningAll(true);
    for (const bench of benchmarks) {
      if (abortRef.current) break;
      await runBenchmark(bench.id);
    }
    setRunningAll(false);
  };

  const handleStop = () => {
    abortRef.current = true;
    setRunningId(null);
    setRunningAll(false);
  };

  // ECharts: Before/After delta bar chart
  const comparisonChartOption = {
    backgroundColor: "transparent",
    grid: { left: "1%", right: "10%", top: "4%", bottom: "4%", containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "none" },
      backgroundColor: "#1A1A1F",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#EDEDEF" },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0]!;
        return `<div style="font-size:12px"><b>${p.name}</b><br/>${p.value > 0 ? "+" : ""}${p.value}%</div>`;
      },
    },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => `${v > 0 ? "+" : ""}${v}%`, fontSize: 10, color: "#6B6A65" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)", type: "dashed" as const } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: comparisons.map((c) => c.benchmark.name),
      axisLabel: { fontSize: 11, color: "#6B6A65" },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        data: comparisons.map((c) => ({
          value: c.pct,
          itemStyle: {
            color: c.improved ? "#22C55E" : "#D71921",
            borderRadius: c.pct >= 0 ? [0, 6, 6, 0] : [6, 0, 0, 6],
          },
          label: {
            show: true,
            position: c.pct >= 0 ? ("right" as const) : ("left" as const),
            formatter: () => `${c.pct > 0 ? "+" : ""}${c.pct}%`,
            fontSize: 10,
            color: "#6B6A65",
          },
        })),
      },
    ],
  };

  // ECharts: Historical trend line chart
  const trendChartOption = {
    backgroundColor: "transparent",
    grid: { left: "4%", right: "4%", top: "20%", bottom: "14%", containLabel: true },
    legend: {
      top: 0,
      textStyle: { fontSize: 11, color: "#6B6A65" },
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#1A1A1F",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#EDEDEF" },
    },
    xAxis: {
      type: "category" as const,
      data: trendDates,
      axisLabel: { fontSize: 10, color: "#6B6A65" },
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { fontSize: 10, color: "#6B6A65" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)", type: "dashed" as const } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: "CPU Single (pts)",
        type: "line" as const,
        smooth: true,
        data: [2050, 2090, 2110, 2145, 2198],
        lineStyle: { color: "#D71921", width: 2 },
        itemStyle: { color: "#D71921" },
        symbol: "circle",
        symbolSize: 5,
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(232,69,60,0.12)" },
              { offset: 1, color: "rgba(0,0,0,0)" },
            ],
          },
        },
      },
      {
        name: "DPC Latency (µs)",
        type: "line" as const,
        smooth: true,
        data: [9.1, 8.8, 8.5, 8.2, 5.1],
        lineStyle: { color: "#3B82F6", width: 2 },
        itemStyle: { color: "#3B82F6" },
        symbol: "circle",
        symbolSize: 5,
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59,130,246,0.10)" },
              { offset: 1, color: "rgba(0,0,0,0)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <PremiumGate feature="benchmark_lab">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* Header */}
        <motion.div variants={staggerChild}>
          <Card>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <BarChart3 className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Benchmark Lab</h2>
                  <p className="text-xs text-ink-tertiary">
                    {completedIds.size > 0
                      ? `${completedIds.size} / ${benchmarks.length} benchmarks completed`
                      : "Measure and compare system performance before and after tuning"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm">Export Results</Button>
                {runningAll ? (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Square className="h-3 w-3 fill-current" />}
                    onClick={handleStop}
                  >
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    icon={
                      runningId && !runningAll
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Play className="h-3.5 w-3.5" />
                    }
                    onClick={handleRunAll}
                    disabled={!!runningId && !runningAll}
                  >
                    Run All
                  </Button>
                )}
              </div>
            </div>

            {/* Run-all progress strip */}
            <AnimatePresence>
              {runningAll && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-5 pb-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-500 rounded-full"
                        animate={{ width: `${(completedIds.size / benchmarks.length) * 100}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-ink-tertiary shrink-0">
                      {completedIds.size}/{benchmarks.length}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Category tabs */}
        <motion.div variants={staggerChild}>
          <div className="flex gap-1 rounded-lg bg-surface-overlay border border-border p-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="relative flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
              >
                {activeCategory === cat.id && (
                  <motion.div
                    layoutId="bench-cat-tab"
                    className="absolute inset-0 rounded-lg bg-surface border border-white/[0.08] shadow-sm"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span
                  className={`relative z-10 ${
                    activeCategory === cat.id ? "text-ink" : "text-ink-tertiary"
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Benchmark cards */}
        <motion.div variants={staggerChild} className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((bench) => {
              const Icon     = bench.icon;
              const colors   = categoryColors[bench.category];
              const isRunning = runningId === bench.id;
              const isDone    = completedIds.has(bench.id);
              const score     = mockScores[bench.id];

              return (
                <motion.div
                  key={bench.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                >
                  <Card
                    className={`transition-shadow ${
                      isRunning ? "ring-2 ring-brand-300 shadow-[0_0_0_3px_rgba(232,69,60,0.08)]" : ""
                    }`}
                  >
                    <div className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colors.bg} border-white/[0.08]`}
                        >
                          <Icon className={`h-4 w-4 ${colors.icon}`} strokeWidth={1.5} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink leading-snug">
                                {bench.name}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-tertiary leading-relaxed">
                                {bench.description}
                              </p>
                            </div>

                            {/* Score / actions */}
                            <div className="flex items-center gap-2 shrink-0 mt-0.5">
                              {isDone && score ? (
                                <motion.div
                                  initial={{ opacity: 0, x: 6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="text-right"
                                >
                                  <p className="text-sm font-mono font-semibold text-ink flex items-baseline gap-0.5">
                                    <CountUp
                                      to={score.value}
                                      decimals={score.value < 100 ? 1 : 0}
                                    />
                                    <span className="text-[10px] font-normal text-ink-tertiary ml-0.5">
                                      {score.unit}
                                    </span>
                                  </p>
                                </motion.div>
                              ) : !isRunning ? (
                                <span className="text-xs text-ink-tertiary font-mono tabular-nums">
                                  {bench.duration}
                                </span>
                              ) : null}

                              {isDone ? (
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 border border-green-500/20">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                </div>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={
                                    isRunning
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <Play className="h-3 w-3" />
                                  }
                                  onClick={() => handleRun(bench.id)}
                                  disabled={!!runningId}
                                >
                                  {isRunning ? "Running" : "Run"}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Per-card progress bar */}
                          <AnimatePresence>
                            {isRunning && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: colors.accent }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ ease: "linear", duration: 0.05 }}
                                    />
                                  </div>
                                  <span className="text-[10px] tabular-nums text-ink-tertiary w-6 text-right">
                                    {Math.round(progress)}%
                                  </span>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Before / After comparison chart */}
        {comparisons.length > 0 && (
          <motion.div variants={staggerChild}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">
                      Before / After Comparison
                    </h2>
                    <p className="text-xs text-ink-tertiary mt-0.5">
                      Score delta (%) after applying tuning actions
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-tertiary">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-sm bg-green-500" />
                      Improved
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
                      Regressed
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ReactECharts
                  option={comparisonChartOption}
                  style={{ height: Math.max(100, comparisons.length * 46) }}
                  opts={{ renderer: "svg" }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Historical trends (collapsible) */}
        <motion.div variants={staggerChild}>
          <Card>
            <CardHeader className="pb-4">
              <button
                className="flex w-full items-center justify-between"
                onClick={() => setShowTrend((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-ink-tertiary" strokeWidth={1.5} />
                  <h2 className="text-sm font-semibold text-ink">Historical Trends</h2>
                  <Badge variant="info">5-day</Badge>
                </div>
                <motion.div
                  animate={{ rotate: showTrend ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-ink-tertiary" />
                </motion.div>
              </button>
            </CardHeader>
            <AnimatePresence initial={false}>
              {showTrend && (
                <motion.div
                  key="trend-chart"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <CardContent>
                    <ReactECharts
                      option={trendChartOption}
                      style={{ height: 220 }}
                      opts={{ renderer: "svg" }}
                    />
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Results history */}
        <motion.div variants={staggerChild}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Results History</h2>
                <span className="text-xs text-ink-tertiary">{mockResults.length} results</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{result.label}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-tertiary">
                        <Clock className="h-3 w-3" />
                        {result.timestamp}
                      </div>
                    </div>
                    <p className="text-sm font-mono font-semibold text-ink">
                      {result.score}{" "}
                      <span className="text-xs font-normal text-ink-tertiary">{result.unit}</span>
                    </p>
                    <Badge variant={result.tag === "after" ? "info" : "default"}>
                      {result.tag}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PremiumGate>
  );
}
