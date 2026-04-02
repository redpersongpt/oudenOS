"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { easing, duration } from "@/lib/motion";
import {
  Activity,
  ShieldOff,
  Rocket,
  Wifi,
  Settings,
} from "lucide-react";

// Types

interface StatCard {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  detail: string;
}

interface ComparisonRow {
  label: string;
  before: number;
  after: number;
  unit: string;
  lowerIsBetter: boolean;
}

// Data

const STAT_CARDS: StatCard[] = [
  {
    icon: Activity,
    value: 40,
    suffix: "+",
    label: "Services Disabled",
    detail: "from 287 running",
  },
  {
    icon: Rocket,
    value: 15,
    suffix: "+",
    label: "Startup Items Removed",
    detail: "faster cold boot",
  },
  {
    icon: Wifi,
    value: 70,
    suffix: "+",
    label: "Telemetry Endpoints Blocked",
    detail: "privacy by default",
  },
  {
    icon: Settings,
    value: 200,
    suffix: "+",
    label: "Registry Keys Optimized",
    detail: "latency & responsiveness",
  },
];

const COMPARISONS: ComparisonRow[] = [
  {
    label: "Idle RAM",
    before: 4.2,
    after: 2.1,
    unit: "GB",
    lowerIsBetter: true,
  },
  {
    label: "Boot time",
    before: 18,
    after: 11,
    unit: "s",
    lowerIsBetter: true,
  },
  {
    label: "Background services",
    before: 112,
    after: 68,
    unit: "",
    lowerIsBetter: true,
  },
];

// Animated Counter Hook

function useCountUp(
  target: number,
  isActive: boolean,
  durationMs = 1800,
): number {
  const [current, setCurrent] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive) return;
    if (prefersReducedMotion) {
      setCurrent(target);
      return;
    }

    let startTime: number | null = null;
    let rafId: number;

    function tick(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, isActive, durationMs, prefersReducedMotion]);

  return current;
}

// Stat Card Component

function StatCardItem({
  stat,
  index,
  inView,
}: {
  stat: StatCard;
  index: number;
  inView: boolean;
}) {
  const count = useCountUp(stat.value, inView, 1800 + index * 200);
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        delay: 0.1 + index * 0.08,
        duration: duration.slow,
        ease: easing.enter,
      }}
      className="group relative rounded-lg border border-border/60 bg-surface/80 p-5 backdrop-blur-sm transition-colors hover:border-accent/25"
    >
      {/* Subtle glow on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
        style={{ boxShadow: "inset 0 0 40px rgba(255, 255, 255, 0.03)" }}
      />

      <div className="relative">
        <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-[var(--surface-raised)]/80">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
        </div>

        <div className="flex items-baseline gap-0.5">
          <span className="font-mono text-[1.75rem] font-bold tracking-tight text-[var(--text-primary)]">
            {count}
          </span>
          <span className="font-mono text-[0.85rem] font-semibold text-[var(--accent)]">
            {stat.suffix}
          </span>
        </div>

        <p className="mt-1 text-[0.8rem] font-semibold text-[var(--text-secondary)]">
          {stat.label}
        </p>
        <p className="mt-0.5 text-[0.68rem] text-[var(--text-disabled)]">{stat.detail}</p>
      </div>
    </motion.div>
  );
}

// Comparison Bar

function ComparisonBar({
  row,
  index,
  inView,
}: {
  row: ComparisonRow;
  index: number;
  inView: boolean;
}) {
  const maxVal = Math.max(row.before, row.after);
  const beforePct = (row.before / maxVal) * 100;
  const afterPct = (row.after / maxVal) * 100;
  const reduction = row.lowerIsBetter
    ? Math.round(((row.before - row.after) / row.before) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{
        delay: 0.3 + index * 0.12,
        duration: duration.slow,
        ease: easing.enter,
      }}
      className="rounded-lg border border-border/50 bg-surface/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[0.8rem] font-semibold text-[var(--text-primary)]">
          {row.label}
        </span>
        {reduction > 0 && (
          <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-[0.6rem] font-bold text-[var(--accent)]">
            -{reduction}%
          </span>
        )}
      </div>

      {/* Before bar */}
      <div className="mb-1.5 flex items-center gap-3">
        <span className="w-12 shrink-0 text-right font-mono text-[0.65rem] text-[var(--text-disabled)]">
          Before
        </span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-ink-muted/50"
            initial={{ width: 0 }}
            animate={inView ? { width: `${beforePct}%` } : {}}
            transition={{
              delay: 0.5 + index * 0.12,
              duration: duration.slower,
              ease: easing.emphasized,
            }}
          />
        </div>
        <span className="w-14 shrink-0 font-mono text-[0.7rem] text-[var(--text-disabled)]">
          {row.before}
          {row.unit}
        </span>
      </div>

      {/* After bar */}
      <div className="flex items-center gap-3">
        <span className="w-12 shrink-0 text-right font-mono text-[0.65rem] text-[var(--accent)]">
          After
        </span>
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-dim to-accent"
            initial={{ width: 0 }}
            animate={inView ? { width: `${afterPct}%` } : {}}
            transition={{
              delay: 0.65 + index * 0.12,
              duration: duration.slower,
              ease: easing.emphasized,
            }}
          />
        </div>
        <span className="w-14 shrink-0 font-mono text-[0.7rem] font-semibold text-[var(--text-primary)]">
          {row.after}
          {row.unit}
        </span>
      </div>
    </motion.div>
  );
}

// Main Section

export function BenchmarkSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section ref={sectionRef} className="relative py-28 lg:py-36 overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(ellipse, #ffffff, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        {/* Header */}
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: duration.slow, ease: easing.enter }}
            className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[var(--accent)] mb-5"
          >
            Measured Impact
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              delay: 0.1,
              duration: duration.slower,
              ease: easing.enter,
            }}
            className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold tracking-[-0.03em] leading-[1.1] text-[var(--text-primary)]"
          >
            Before and after.
            <span className="block text-[var(--text-secondary)] font-normal">
              Same PC, less garbage running in the background.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{
              delay: 0.2,
              duration: duration.slow,
              ease: easing.enter,
            }}
            className="mt-5 mx-auto max-w-[480px] text-[0.88rem] leading-[1.75] text-[var(--text-secondary)]"
          >
            Tested on stock Windows 11 23H2. Balanced profile. Results vary by hardware.
          </motion.p>
        </div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_CARDS.map((stat, i) => (
            <StatCardItem
              key={stat.label}
              stat={stat}
              index={i}
              inView={inView}
            />
          ))}
        </div>

        {/* Before / After comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{
            delay: 0.25,
            duration: duration.slow,
            ease: easing.enter,
          }}
          className="mt-14"
        >
          <div className="mb-6 flex items-center gap-3">
            <ShieldOff className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-[0.88rem] font-bold text-[var(--text-primary)]">
              Before &amp; After
            </h3>
            <span className="rounded-full border border-border/60 bg-[var(--surface-raised)]/80 px-2.5 py-0.5 font-mono text-[0.55rem] text-[var(--text-disabled)]">
              balanced profile
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-3">
            {COMPARISONS.map((row, i) => (
              <ComparisonBar
                key={row.label}
                row={row}
                index={i}
                inView={inView}
              />
            ))}
          </div>
        </motion.div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: duration.slow }}
          className="mt-8 text-center font-mono text-[0.65rem] text-[var(--text-disabled)] tracking-wide"
        >
          Results vary by hardware and profile. All changes reversible.
        </motion.p>
      </div>
    </section>
  );
}
