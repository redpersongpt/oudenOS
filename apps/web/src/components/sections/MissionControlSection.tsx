"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// Types

interface CompletedAction {
  name: string;
  time: string;
}

interface StatItem {
  label: string;
  value: string;
  colorClass: string;
}

// Data

const completedActions: CompletedAction[] = [
  { name: "Remove Xbox Game Bar", time: "1.2s" },
  { name: "Disable Cortana Background", time: "0.8s" },
  { name: "Optimize Power Plan", time: "2.1s" },
  { name: "Clean Startup Programs", time: "1.5s" },
  { name: "Reduce Service Overhead", time: "0.9s" },
];

const stats: StatItem[] = [
  { label: "APPLIED", value: "12", colorClass: "text-ink-tertiary" },
  { label: "FAILED", value: "0", colorClass: "text-ink-tertiary" },
  { label: "SKIPPED", value: "2", colorClass: "text-warning" },
  { label: "REMAINING", value: "4", colorClass: "text-ink-secondary" },
];

// Sub-components

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-breathe" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 relative" aria-hidden="true">
      <span
        className="absolute inset-0 rounded-full border-2 border-brand-500/20"
      />
      <span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin"
      />
    </span>
  );
}

function TimelineItem({
  action,
  index,
  isInView,
}: {
  action: CompletedAction;
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
      transition={{
        duration: duration.normal,
        ease: easing.enter,
        delay: 0.5 + index * 0.06,
      }}
      className="flex items-center gap-3 py-2"
    >
      <CheckCircle size={14} className="text-ink-tertiary flex-shrink-0" aria-hidden="true" />
      <span className="flex-1 text-[13px] text-ink-secondary">{action.name}</span>
      <span className="text-[11px] font-mono text-ink-tertiary ml-auto">{action.time}</span>
    </motion.div>
  );
}

// Main Component

export function MissionControlSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      id="execution"
      className="relative py-16 md:py-20 lg:py-24"
      aria-labelledby="execution-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="execution-heading"
            variants={staggerChild}
            className="mt-4 text-4xl md:text-5xl font-bold text-ink-primary leading-tight"
          >
            Mission control for your machine.
          </motion.h2>
        </motion.div>

        {/* Execution Panel */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 0.2 }}
          className="mt-16 max-w-4xl mx-auto premium-card glow-brand-edge rounded-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-surface-raised px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LiveDot />
              <span className="text-[13px] font-medium text-ink-primary">
                Execution in Progress
              </span>
            </div>
            <span className="font-mono text-ink-secondary text-[13px]">12 / 18</span>
          </div>

          {/* Current action */}
          <div className="px-6 pt-5">
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
              transition={{ duration: duration.slow, ease: easing.enter, delay: 0.4 }}
              className="bg-surface rounded-lg p-4 border-l-2 border-brand-500"
            >
              <div className="flex items-center gap-3">
                <Spinner />
                <span className="text-[14px] font-medium text-ink-primary">
                  Disabling Windows Telemetry Tasks
                </span>
              </div>
              <p className="mt-2 text-[12px] text-ink-tertiary pl-7">
                3 of 5 registry keys
              </p>
            </motion.div>
          </div>

          {/* Timeline */}
          <div className="px-6 py-4" role="list" aria-label="Completed actions">
            {completedActions.map((action, i) => (
              <div key={action.name} role="listitem">
                <TimelineItem action={action} index={i} isInView={isInView} />
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="px-6 py-4 border-t border-border-default">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: duration.slow, ease: easing.enter, delay: 0.8 }}
              className="grid grid-cols-4 gap-4"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className={`text-xl font-mono font-bold ${stat.colorClass}`}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-ink-tertiary uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Progress */}
          <div className="px-6 pb-5">
            <div
              className="h-1.5 rounded-full bg-surface-overlay overflow-hidden"
              role="progressbar"
              aria-valuenow={67}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Execution progress"
            >
              <motion.div
                className="h-full rounded-full bg-brand-500"
                initial={{ width: "0%" }}
                animate={isInView ? { width: "67%" } : { width: "0%" }}
                transition={{
                  duration: duration.hero,
                  ease: easing.emphasized,
                  delay: 0.9,
                }}
              />
            </div>
            <p className="text-[11px] text-ink-tertiary mt-1.5">67% complete</p>
          </div>
        </motion.div>

        {/* Trust Line */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 1.0 }}
          className="mt-10 text-center text-[15px] text-ink-tertiary max-w-2xl mx-auto"
        >
          Every action creates a rollback snapshot. Every result is validated.
        </motion.p>
      </div>
    </section>
  );
}
