// ─── Benchmark Runners ──────────────────────────────────────────────────────
// Wrappers for benchmark/stress/telemetry providers.
// Each runner implements a common interface and is invoked by the Rust service.

import type { BenchmarkType, BenchmarkConfig, BenchmarkMetric } from "@redcore/shared-schema/benchmark";

export interface BenchmarkRunner {
  type: BenchmarkType;
  name: string;
  description: string;
  defaultConfig: BenchmarkConfig;
  metrics: string[];
}

export const runners: BenchmarkRunner[] = [
  {
    type: "cpu_responsiveness",
    name: "CPU Responsiveness",
    description: "Measures scheduler latency and thread wake timing using high-priority thread timing loops.",
    defaultConfig: { type: "cpu_responsiveness", durationSeconds: 30, warmupSeconds: 5, iterations: 3, parameters: {} },
    metrics: ["avg_latency_us", "p99_latency_us", "max_latency_us"],
  },
  {
    type: "storage_random",
    name: "Storage Random I/O",
    description: "Random 4K read/write performance using direct I/O Win32 file APIs.",
    defaultConfig: { type: "storage_random", durationSeconds: 30, warmupSeconds: 5, iterations: 1, parameters: { blockSize: 4096, queueDepth: 1 } },
    metrics: ["read_iops", "write_iops", "avg_latency_us"],
  },
  {
    type: "boot_time",
    name: "Boot Time",
    description: "Parses Windows Event Log for boot duration measurement.",
    defaultConfig: { type: "boot_time", durationSeconds: 0, warmupSeconds: 0, iterations: 1, parameters: {} },
    metrics: ["total_boot_ms", "kernel_boot_ms", "user_boot_ms"],
  },
  {
    type: "dpc_latency",
    name: "DPC/ISR Latency",
    description: "ETW-based trace for DPC and ISR timing to identify latency offenders.",
    defaultConfig: { type: "dpc_latency", durationSeconds: 60, warmupSeconds: 0, iterations: 1, parameters: {} },
    metrics: ["max_dpc_us", "avg_dpc_us", "max_isr_us", "top_offender"],
  },
  {
    type: "memory_latency",
    name: "Memory Latency",
    description: "Pointer-chasing memory latency benchmark.",
    defaultConfig: { type: "memory_latency", durationSeconds: 10, warmupSeconds: 3, iterations: 3, parameters: {} },
    metrics: ["avg_latency_ns", "bandwidth_gbps"],
  },
];
