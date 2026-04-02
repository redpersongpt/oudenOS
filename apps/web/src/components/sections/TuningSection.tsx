"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Activity,
  Cpu,
  ClipboardList,
  Zap,
  BarChart3,
  ShieldCheck,
  Monitor,
  HardDrive,
  Wifi,
  BatteryCharging,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// Types

interface TuningStep {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface TuningModule {
  title: string;
  description: string;
  icon: LucideIcon;
}

// Data

const tuningSteps: TuningStep[] = [
  {
    number: 1,
    title: "Scan",
    description: "Deep hardware analysis",
    icon: Activity,
  },
  {
    number: 2,
    title: "Profile",
    description: "Machine classification",
    icon: Cpu,
  },
  {
    number: 3,
    title: "Plan",
    description: "Confidence-rated plan",
    icon: ClipboardList,
  },
  {
    number: 4,
    title: "Optimize",
    description: "Module-by-module tuning",
    icon: Zap,
  },
  {
    number: 5,
    title: "Benchmark",
    description: "Before/after validation",
    icon: BarChart3,
  },
  {
    number: 6,
    title: "Verify",
    description: "Rollback-safe audit",
    icon: ShieldCheck,
  },
];

const tuningModules: TuningModule[] = [
  {
    title: "CPU & Scheduler",
    description: "Thread priority, power plan, and scheduler optimization",
    icon: Cpu,
  },
  {
    title: "GPU & Display",
    description: "Driver tuning, render latency, and display scaling",
    icon: Monitor,
  },
  {
    title: "Memory & Cache",
    description: "Page file, prefetch, and memory management",
    icon: Activity,
  },
  {
    title: "Storage & I/O",
    description: "Disk queue depth, TRIM, and filesystem tuning",
    icon: HardDrive,
  },
  {
    title: "Network & Latency",
    description: "TCP/UDP tuning, DNS, and adapter optimization",
    icon: Wifi,
  },
  {
    title: "Power & Thermal",
    description: "Throttle prevention and thermal policy control",
    icon: BatteryCharging,
  },
];

// Timeline Step

function StepNode({
  step,
  index,
  isLast,
  isInView,
}: {
  step: TuningStep;
  index: number;
  isLast: boolean;
  isInView: boolean;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: duration.slow,
        ease: easing.enter,
        delay: 0.15 + index * 0.1,
      }}
      className="flex flex-col items-center text-center relative"
    >
      {/* Numbered circle */}
      <div className="flex items-center gap-3 lg:flex-col lg:gap-2">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={
            isInView
              ? { scale: 1, opacity: 1 }
              : { scale: 0.6, opacity: 0 }
          }
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.25 + index * 0.1,
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 text-[13px] font-mono font-medium flex-shrink-0"
        >
          {step.number}
        </motion.div>

        <div className="flex items-center gap-2 lg:flex-col lg:gap-1">
          <Icon
            size={16}
            className="text-ink-secondary flex-shrink-0"
            aria-hidden="true"
          />
          <span className="text-[15px] font-medium text-ink-primary whitespace-nowrap">
            {step.title}
          </span>
        </div>
      </div>

      <p className="text-[13px] text-ink-secondary mt-1.5 hidden lg:block max-w-[120px]">
        {step.description}
      </p>

      {/* Connector line — horizontal on desktop */}
      {!isLast && (
        <div
          className="hidden lg:block absolute top-5 left-[calc(50%+28px)] w-[calc(100%-16px)] h-px"
          aria-hidden="true"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{
              duration: duration.slow,
              ease: easing.emphasized,
              delay: 0.3 + index * 0.1,
            }}
            className="line-h h-px w-full origin-left"
          />
        </div>
      )}
    </motion.div>
  );
}

// Module Card

function ModuleCard({ module }: { module: TuningModule }) {
  const Icon = module.icon;

  return (
    <motion.div
      variants={staggerChild}
      className="rounded-lg bg-surface border border-border-default p-5 transition-colors duration-200 hover:border-border-strong"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <Icon
          size={18}
          className="text-ink-tertiary flex-shrink-0"
          aria-hidden="true"
        />
        <h4 className="text-[15px] font-medium text-ink-primary">
          {module.title}
        </h4>
      </div>
      <p className="text-[13px] text-ink-secondary leading-relaxed">
        {module.description}
      </p>
    </motion.div>
  );
}

// Main Component

export function TuningSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInView = useInView(timelineRef, {
    once: true,
    margin: "-10% 0px",
  });

  const modulesRef = useRef<HTMLDivElement>(null);
  const modulesInView = useInView(modulesRef, {
    once: true,
    margin: "-10% 0px",
  });

  const biosRef = useRef<HTMLDivElement>(null);
  const biosInView = useInView(biosRef, { once: true, margin: "-10% 0px" });

  return (
    <section
      ref={sectionRef}
      id="tuning"
      className="relative overflow-hidden"
      aria-labelledby="tuning-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6 py-28 md:py-36 lg:px-8 lg:py-44">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="tuning-heading"
            variants={staggerChild}
            className="text-4xl md:text-5xl font-bold tracking-tight text-ink-primary"
          >
            Guided optimization.
          </motion.h2>

          <motion.p
            variants={staggerChild}
            className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-secondary"
          >
            From first scan to final benchmark. Every step validated, every
            change reversible.
          </motion.p>
        </motion.div>

        {/* Tuning Journey — horizontal timeline */}
        <div ref={timelineRef} className="mt-16">
          {/* Desktop: horizontal grid */}
          <div className="hidden lg:grid lg:grid-cols-6 lg:gap-6">
            {tuningSteps.map((step, i) => (
              <StepNode
                key={step.title}
                step={step}
                index={i}
                isLast={i === tuningSteps.length - 1}
                isInView={timelineInView}
              />
            ))}
          </div>

          {/* Mobile/Tablet: vertical list */}
          <div className="flex flex-col gap-5 lg:hidden" role="list" aria-label="Tuning journey steps">
            {tuningSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={
                    timelineInView
                      ? { opacity: 1, x: 0 }
                      : { opacity: 0, x: -20 }
                  }
                  transition={{
                    duration: duration.slow,
                    ease: easing.enter,
                    delay: 0.1 + i * 0.08,
                  }}
                  className="flex items-center gap-4"
                  role="listitem"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 text-[13px] font-mono font-medium flex-shrink-0">
                    {step.number}
                  </div>
                  <Icon
                    size={16}
                    className="text-ink-secondary flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-[15px] font-medium text-ink-primary">
                      {step.title}
                    </span>
                    <p className="text-[13px] text-ink-secondary">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Module Grid */}
        <motion.div
          ref={modulesRef}
          variants={staggerContainer(0.06, 0.1)}
          initial="hidden"
          animate={modulesInView ? "visible" : "hidden"}
          className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          role="list"
          aria-label="Tuning modules"
        >
          {tuningModules.map((module) => (
            <div key={module.title} role="listitem">
              <ModuleCard module={module} />
            </div>
          ))}
        </motion.div>

        {/* BIOS Guidance Callout */}
        <motion.div
          ref={biosRef}
          initial={{ opacity: 0, y: 24 }}
          animate={
            biosInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }
          }
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.2,
          }}
          className="premium-card mt-12 rounded-lg border-l-2 border-l-amber-500 p-6 md:p-8"
        >
          <div className="flex items-start gap-4">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10"
              aria-hidden="true"
            >
              <Shield size={20} className="text-amber-500" />
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-ink-primary">
                  BIOS Guidance
                </h3>
                <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-500">
                  Expert Mode
                </span>
              </div>
              <p className="text-[14px] text-ink-secondary leading-relaxed max-w-2xl">
                Profile-aware BIOS recommendations for enthusiasts &mdash;
                voltage, timing, and firmware settings tailored to your exact
                hardware.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
