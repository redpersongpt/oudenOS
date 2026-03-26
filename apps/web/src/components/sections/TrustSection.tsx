"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  BarChart3,
  RotateCcw,
  ShieldCheck,
  Lock,
  RefreshCw,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrustItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface BenchmarkMetric {
  label: string;
  beforeWidth: number;
  afterWidth: number;
  improvement: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const trustItems: TrustItem[] = [
  {
    title: "Benchmark Validation",
    description: "Before/after comparison for every session.",
    icon: BarChart3,
  },
  {
    title: "Rollback Safety",
    description: "Complete snapshots before every change.",
    icon: RotateCcw,
  },
  {
    title: "Confidence Gating",
    description: "Actions gated by profile and machine match.",
    icon: ShieldCheck,
  },
  {
    title: "Work PC Blocking",
    description: "Enterprise services automatically locked.",
    icon: Lock,
  },
  {
    title: "Reboot Resume",
    description: "Multi-reboot operations resume seamlessly.",
    icon: RefreshCw,
  },
  {
    title: "Audit Trail",
    description: "Every action logged with outcomes and rollback paths.",
    icon: FileText,
  },
];

const benchmarkMetrics: BenchmarkMetric[] = [
  { label: "Startup Time", beforeWidth: 100, afterWidth: 66, improvement: "-34%" },
  { label: "Memory Usage", beforeWidth: 100, afterWidth: 78, improvement: "-22%" },
  { label: "CPU Idle Load", beforeWidth: 100, afterWidth: 52, improvement: "-48%" },
  { label: "Disk Queue", beforeWidth: 100, afterWidth: 39, improvement: "-61%" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function TrustCard({ item }: { item: TrustItem }) {
  const Icon = item.icon;

  return (
    <motion.div
      variants={staggerChild}
      className="rounded-lg bg-surface-card border border-border-default p-6 transition-colors duration-300 hover:border-border-strong"
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-overlay"
        aria-hidden="true"
      >
        <Icon className="w-5 h-5 text-ink-tertiary" />
      </span>
      <h3 className="text-[15px] font-medium text-ink-primary mt-4">
        {item.title}
      </h3>
      <p className="text-[13px] text-ink-secondary mt-1.5 leading-relaxed">
        {item.description}
      </p>
    </motion.div>
  );
}

function BenchmarkBar({
  metric,
  index,
  isInView,
}: {
  metric: BenchmarkMetric;
  index: number;
  isInView: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-ink-secondary">{metric.label}</span>
        <span className="text-[13px] font-mono text-brand-500">
          {metric.improvement}
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Before */}
        <div className="h-2 rounded-full bg-surface-base overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-surface-overlay"
            initial={{ width: "0%" }}
            animate={isInView ? { width: `${metric.beforeWidth}%` } : { width: "0%" }}
            transition={{
              duration: duration.slow,
              ease: easing.enter,
              delay: 0.2 + index * 0.1,
            }}
          />
        </div>

        {/* After */}
        <div className="h-2 rounded-full bg-surface-base overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-500"
            initial={{ width: "0%" }}
            animate={isInView ? { width: `${metric.afterWidth}%` } : { width: "0%" }}
            transition={{
              duration: duration.slow,
              ease: easing.enter,
              delay: 0.35 + index * 0.1,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TrustSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-10% 0px" });

  const benchmarkRef = useRef<HTMLDivElement>(null);
  const benchmarkInView = useInView(benchmarkRef, {
    once: true,
    margin: "-10% 0px",
  });

  return (
    <section
      ref={sectionRef}
      id="trust"
      className="relative py-16 md:py-20 lg:py-24 overflow-hidden"
      aria-labelledby="trust-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* ─── Header ─── */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="trust-heading"
            variants={staggerChild}
            className="mt-4 text-4xl md:text-5xl font-bold leading-tight"
          >
            <span className="text-ink-primary">Engineering discipline.</span>
            <br />
            <span className="text-ink-primary">Not tweak superstition.</span>
          </motion.h2>
        </motion.div>

        {/* ─── Trust Grid ─── */}
        <motion.div
          ref={cardsRef}
          variants={staggerContainer(0.06, 0.1)}
          initial="hidden"
          animate={cardsInView ? "visible" : "hidden"}
          className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4"
          role="list"
          aria-label="Trust and safety features"
        >
          {trustItems.map((item) => (
            <div key={item.title} role="listitem">
              <TrustCard item={item} />
            </div>
          ))}
        </motion.div>

        {/* ─── Benchmark Mock ─── */}
        <motion.div
          ref={benchmarkRef}
          initial={{ opacity: 0, y: 24 }}
          animate={benchmarkInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.1,
          }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-medium text-ink-primary">
              Benchmark Results
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-surface-overlay" aria-hidden="true" />
                <span className="text-[11px] text-ink-tertiary">Before</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-brand-500" aria-hidden="true" />
                <span className="text-[11px] text-ink-tertiary">After</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {benchmarkMetrics.map((metric, i) => (
              <BenchmarkBar
                key={metric.label}
                metric={metric}
                index={i}
                isInView={benchmarkInView}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
