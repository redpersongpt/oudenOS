// ─── Benchmark Step ───────────────────────────────────────────────────────────
// Baseline performance measurement before optimization.
// Runs system benchmark and displays metric cards.

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import {
  spring,
} from "@redcore/design-system";
import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BenchmarkResult } from "@redcore/shared-schema/benchmark";

// ─── Metric display config ────────────────────────────────────────────────────

interface MetricDisplay {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}

const DISPLAYED_METRICS: MetricDisplay[] = [
  { key: "sleep1_median_us",        label: "Timer Resolution",     unit: "µs",   lowerIsBetter: true  },
  { key: "thread_spawn_median_us",  label: "Thread Spawn",         unit: "µs",   lowerIsBetter: true  },
  { key: "seq_write_mbps",          label: "Sequential Write",     unit: "MB/s", lowerIsBetter: false },
  { key: "seq_read_mbps",           label: "Sequential Read",      unit: "MB/s", lowerIsBetter: false },
  { key: "random_4k_write_iops",    label: "Random 4K Write",      unit: "IOPS", lowerIsBetter: false },
];

const RUNNING_LABELS = [
  "Probing timer resolution...",
  "Measuring thread spawn latency...",
  "Running sequential I/O pass...",
  "Sampling random IOPS...",
  "Calculating DPC latency...",
  "Aggregating results...",
];

// ─── Pulsing orbit animation ──────────────────────────────────────────────────

function BenchmarkOrb() {
  return (
    <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-brand-500/20"
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Mid ring */}
      <motion.div
        className="absolute inset-4 rounded-full border border-brand-500/35"
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      {/* Inner core */}
      <motion.div
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/30"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Activity className="h-7 w-7 text-brand-400" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type BenchState = "idle" | "running" | "complete";

export function BenchmarkStep() {
  const { goNext, skipStep, currentStep } = useWizardStore();
  const [state, setState] = useState<BenchState>("idle");
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [runLabel, setRunLabel] = useState(RUNNING_LABELS[0]);
  const labelIndexRef = useRef(0);
  const cancelledRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  async function handleRun() {
    setState("running");
    labelIndexRef.current = 0;

    intervalRef.current = setInterval(() => {
      labelIndexRef.current = (labelIndexRef.current + 1) % RUNNING_LABELS.length;
      setRunLabel(RUNNING_LABELS[labelIndexRef.current]);
    }, 1800);

    try {
      const res = await window.redcore.service.call("benchmark.run", {
        config: {
          type: "composite",
          durationSeconds: 10,
          warmupSeconds: 2,
          iterations: 3,
          parameters: {},
        },
        tags: ["baseline", "wizard"],
      });
      if (!cancelledRef.current) {
        setResult(res as BenchmarkResult);
        setState("complete");
      }
    } catch {
      if (!cancelledRef.current) {
        setState("idle");
      }
    } finally {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }

  function getMetricValue(key: string): number | null {
    if (!result) return null;
    return result.metrics.find((m) => m.name === key)?.value ?? null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-10 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto space-y-10"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Step 9 — Validate
          </p>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">
            System Benchmark
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            Measure baseline performance to validate optimization impact.
          </p>
        </motion.div>

        {/* Idle / Running state */}
        <AnimatePresence mode="wait">
          {state !== "complete" && (
            <motion.div
              key="bench-idle-running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col items-center gap-8 py-6"
            >
              {state === "running" ? (
                <>
                  <BenchmarkOrb />
                  <motion.div
                    key={runLabel}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center space-y-1"
                  >
                    <p className="text-sm font-medium text-ink">{runLabel}</p>
                    <p className="text-xs text-ink-tertiary">Do not close the application</p>
                  </motion.div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                    <Activity className="h-9 w-9 text-ink-tertiary" strokeWidth={1.25} />
                  </div>
                  <p className="max-w-xs text-sm text-ink-secondary leading-relaxed">
                    Run a short benchmark to capture your system's current performance
                    profile. This takes approximately 15 seconds.
                  </p>
                  <Button size="lg" onClick={handleRun} icon={<Activity className="h-4 w-4" />}>
                    Run Benchmark
                  </Button>
                  <button
                    onClick={() => skipStep(currentStep)}
                    className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Complete — metric cards */}
          {state === "complete" && (
            <motion.div
              key="bench-complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.smooth}
              className="space-y-6"
            >
              <motion.div
                
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              >
                {DISPLAYED_METRICS.map((m) => {
                  const val = getMetricValue(m.key);
                  return (
                    <motion.div
                      key={m.key}
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 space-y-3"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-tertiary">
                        {m.label}
                      </p>
                      <p className="font-mono text-xl font-semibold text-ink">
                        {val !== null ? val.toLocaleString() : "—"}
                        <span className="ml-1 text-xs font-normal text-ink-tertiary">{m.unit}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        {m.lowerIsBetter ? (
                          <TrendingDown className="h-3 w-3 text-green-400" strokeWidth={2} />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-green-400" strokeWidth={2} />
                        )}
                        <span className="text-[10px] text-ink-tertiary">
                          {m.lowerIsBetter ? "Lower is better" : "Higher is better"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="rounded-lg border border-green-800/40 bg-green-900/10 px-4 py-3"
              >
                <p className="text-xs text-green-400 leading-relaxed">
                  Benchmark complete. Run again after applying changes to compare your before and after metrics.
                </p>
              </motion.div>

              <div className="flex items-center justify-between pt-2">
                <Badge variant="success">Baseline captured</Badge>
                <Button
                  size="md"
                  onClick={() => goNext()}
                  icon={<ChevronRight className="h-4 w-4" />}
                  iconPosition="right"
                >
                  Continue to Summary
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
