// ─── Benchmark & Measurement Schemas ────────────────────────────────────────

export type BenchmarkType =
  | "cpu_responsiveness"
  | "cpu_throughput"
  | "gpu_synthetic"
  | "gpu_frametime"
  | "memory_bandwidth"
  | "memory_latency"
  | "storage_sequential"
  | "storage_random"
  | "boot_time"
  | "startup_impact"
  | "dpc_latency"
  | "network_throughput"
  | "thermal_sustained"
  | "composite";

export type BenchmarkStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BenchmarkConfig {
  type: BenchmarkType;
  durationSeconds: number;
  warmupSeconds: number;
  iterations: number;
  parameters: Record<string, string | number | boolean>;
}

export interface BenchmarkMetric {
  name: string;
  value: number;
  unit: string;
  lowerIsBetter: boolean;
}

export interface BenchmarkResult {
  id: string;
  deviceProfileId: string;
  type: BenchmarkType;
  config: BenchmarkConfig;
  status: BenchmarkStatus;
  startedAt: string;
  completedAt: string | null;
  metrics: BenchmarkMetric[];
  rawDataPath: string | null; // path to CSV/JSON trace
  tags: string[];             // "pre-tuning", "post-tuning", "baseline"
  tuningPlanId: string | null;
  error: string | null;
}

export interface BenchmarkComparison {
  baselineId: string;
  comparisonId: string;
  deltas: BenchmarkDelta[];
  overallVerdict: "improved" | "regressed" | "neutral" | "mixed";
  confidenceNote: string;
}

export interface BenchmarkDelta {
  metricName: string;
  baselineValue: number;
  comparisonValue: number;
  deltaAbsolute: number;
  deltaPercent: number;
  unit: string;
  improved: boolean;
  significant: boolean; // above noise threshold
}

export interface BottleneckAnalysis {
  deviceProfileId: string;
  analyzedAt: string;
  bottlenecks: Bottleneck[];
  summary: string;
}

export interface Bottleneck {
  component: string;      // "CPU single-thread", "GPU", "VRAM", "RAM", "storage", "thermal"
  severity: "none" | "minor" | "moderate" | "severe";
  confidence: number;     // 0-1
  description: string;
  recommendation: string | null;
  relatedMetrics: BenchmarkMetric[];
}
