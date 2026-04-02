"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// Types

interface WizardStep {
  label: string;
  status: "completed" | "current" | "upcoming";
}

interface ActionItem {
  name: string;
  risk: "SAFE" | "LOW" | "MEDIUM";
  enabled: boolean;
}

interface PhilosophyItem {
  title: string;
  description: string;
}

// Data

const steps: WizardStep[] = [
  { label: "SCAN", status: "completed" },
  { label: "PROFILE", status: "completed" },
  { label: "ANALYZE", status: "completed" },
  { label: "PLAN", status: "current" },
  { label: "EXECUTE", status: "upcoming" },
  { label: "VERIFY", status: "upcoming" },
];

const actions: ActionItem[] = [
  { name: "Disable Xbox Game Bar", risk: "SAFE", enabled: true },
  { name: "Optimize Power Plan", risk: "LOW", enabled: true },
  { name: "Reduce Startup Programs", risk: "SAFE", enabled: true },
  { name: "Tune Memory Management", risk: "MEDIUM", enabled: true },
];

const philosophy: PhilosophyItem[] = [
  { title: "Assess First", description: "Scan before action." },
  { title: "Validate Always", description: "Benchmark before and after." },
  { title: "Rollback Ready", description: "One click to restore." },
];

// Risk badge styles

const riskConfig: Record<ActionItem["risk"], { text: string; bg: string }> = {
  SAFE:   { text: "text-green-400",  bg: "bg-green-500/10"  },
  LOW:    { text: "text-yellow-400", bg: "bg-yellow-500/10" },
  MEDIUM: { text: "text-amber-400",  bg: "bg-amber-500/10"  },
};

// Sub-components

function StepCircle({ step, index }: { step: WizardStep; index: number }) {
  const isCompleted = step.status === "completed";
  const isCurrent = step.status === "current";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={[
          "flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-mono font-bold transition-colors",
          isCompleted
            ? "bg-brand-500/15 text-brand-500 border border-brand-500/20"
            : isCurrent
              ? "bg-brand-500 text-white"
              : "bg-surface-overlay text-ink-tertiary border border-border-default",
        ].join(" ")}
      >
        {isCompleted ? <Check size={12} strokeWidth={3} /> : index + 1}
      </div>
      <span
        className={[
          "text-[10px] font-mono uppercase tracking-wider",
          isCurrent ? "text-brand-500" : isCompleted ? "text-ink-secondary" : "text-ink-tertiary",
        ].join(" ")}
      >
        {step.label}
      </span>
    </div>
  );
}

function StepRail() {
  return (
    <div className="bg-surface px-6 py-3 flex items-center justify-center">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.label} className="flex items-center">
            <StepCircle step={step} index={i} />
            {!isLast && (
              <div
                className={[
                  "w-6 sm:w-10 h-px mx-1.5 mt-[-16px]",
                  step.status === "completed" ? "bg-brand-500/30" : "bg-border-default",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  const risk = riskConfig[item.risk];
  const isWarning = item.risk === "MEDIUM";

  return (
    <div className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3">
      {/* Status icon */}
      <span aria-hidden="true">
        <Check size={14} className="text-ink-tertiary" strokeWidth={2} />
      </span>

      {/* Name */}
      <span className="flex-1 text-[14px] text-ink-primary font-medium truncate">
        {item.name}
      </span>

      {/* Risk badge */}
      <span
        className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${risk.text} ${risk.bg}`}
      >
        {item.risk}
      </span>

      {/* Toggle switch */}
      <div
        className={[
          "flex-shrink-0 w-8 h-[18px] rounded-full relative transition-colors",
          item.enabled ? "bg-brand-500" : "bg-surface-overlay",
        ].join(" ")}
        aria-hidden="true"
      >
        <div
          className={[
            "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform",
            item.enabled ? "left-[16px]" : "left-[2px]",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

function WizardWindow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: duration.dramatic, ease: easing.emphasized }}
      className="relative max-w-3xl mx-auto"
    >
      {/* Subtle float animation */}
      <div className="animate-float-slow">
        <div
          className="premium-card glow-surface rounded-lg overflow-hidden"
          style={{
            transform: "perspective(1200px) rotateX(2deg)",
          }}
        >
          {/* Window chrome */}
          <div className="bg-surface-raised h-10 flex items-center px-4">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
              <span className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
              <span className="w-2 h-2 rounded-full bg-[#28C840]" />
            </div>
            <span className="flex-1 text-center text-[12px] text-ink-tertiary font-mono">
              redcore
            </span>
            <div className="w-[36px]" />
          </div>

          {/* Step rail */}
          <StepRail />

          {/* Content */}
          <div className="bg-bg p-6">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-brand-500 font-mono text-[12px]">Step 4</span>
              <span className="text-lg font-semibold text-ink-primary">
                Optimization Plan
              </span>
            </div>

            <div className="space-y-2">
              {actions.map((item) => (
                <ActionRow key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="bg-surface-raised px-6 py-3 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] text-ink-tertiary"
              tabIndex={-1}
              aria-hidden="true"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            {/* Progress bar */}
            <div className="flex-1 mx-6">
              <div className="h-1 rounded-full bg-surface-overlay overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: "67%" }}
                />
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 rounded-lg bg-brand-500 px-3.5 py-1.5 text-[13px] font-semibold text-white"
              tabIndex={-1}
              aria-hidden="true"
            >
              Continue
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main Component

export function WizardSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      id="wizard"
      className="relative py-16 md:py-20 lg:py-24"
      aria-labelledby="wizard-heading"
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
            id="wizard-heading"
            variants={staggerChild}
            className="mt-4 text-4xl md:text-5xl font-bold text-ink-primary leading-tight"
          >
            Not a control panel.
            <br className="hidden sm:block" />
            <span className="text-ink-primary">A guided journey.</span>
          </motion.h2>
        </motion.div>

        {/* Wizard Mock UI */}
        <div className="mt-16">
          <WizardWindow />
        </div>

        {/* Philosophy Row */}
        <motion.div
          variants={staggerContainer(0.1, 0.4)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-20 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0"
        >
          {philosophy.map((item, i) => (
            <motion.div
              key={item.title}
              variants={staggerChild}
              className={[
                "text-center px-6",
                i < philosophy.length - 1 ? "md:border-r md:border-border-default" : "",
              ].join(" ")}
            >
              <p className="text-[15px] font-medium text-ink-primary">{item.title}</p>
              <p className="mt-1 text-[13px] text-ink-tertiary">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
