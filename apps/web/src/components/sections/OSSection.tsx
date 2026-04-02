"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Search,
  Cpu,
  Trash2,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Briefcase,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

// Types

interface StatItem {
  value: string;
  numericValue?: number;
  suffix?: string;
  label: string;
}

interface FlowStep {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface PreservedService {
  label: string;
}

// Data

const stats: StatItem[] = [
  { value: "In-Place", label: "No ISO required" },
  { value: "250", numericValue: 250, label: "Optimization actions" },
  { value: "8", numericValue: 8, label: "Machine profiles" },
  { value: "100", numericValue: 100, suffix: "%", label: "Reversible changes" },
];

const flowSteps: FlowStep[] = [
  {
    title: "Assessment",
    description: "System scan and analysis",
    icon: Search,
  },
  {
    title: "Classification",
    description: "Machine profile selection",
    icon: Cpu,
  },
  {
    title: "Cleanup",
    description: "Staged system reduction",
    icon: Trash2,
  },
  {
    title: "Optimization",
    description: "In-place configuration",
    icon: RefreshCw,
  },
  {
    title: "Verification",
    description: "Audit and summary report",
    icon: CheckCircle,
  },
];

const preservedServices: PreservedService[] = [
  { label: "Print Spooler" },
  { label: "Remote Desktop" },
  { label: "SMB Shares" },
  { label: "Group Policy" },
  { label: "VPN Services" },
  { label: "DNS Client" },
];

// Stat Block

function StatBlock({
  stat,
  index,
  isInView,
}: {
  stat: StatItem;
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: duration.slow,
        ease: easing.enter,
        delay: 0.15 + index * 0.1,
      }}
      className="text-center flex-1 min-w-0"
    >
      {stat.numericValue != null ? (
        <AnimatedCounter
          value={stat.numericValue}
          suffix={stat.suffix}
          className="text-3xl font-bold"
        />
      ) : (
        <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">
          {stat.value}
        </span>
      )}
      <p className="mt-2 text-[12px] text-[var(--text-disabled)] uppercase tracking-wide">
        {stat.label}
      </p>
    </motion.div>
  );
}

// Main Component

export function OSSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-10% 0px" });

  const flowRef = useRef<HTMLDivElement>(null);
  const flowInView = useInView(flowRef, { once: true, margin: "-10% 0px" });

  const calloutRef = useRef<HTMLDivElement>(null);
  const calloutInView = useInView(calloutRef, {
    once: true,
    margin: "-10% 0px",
  });

  return (
    <section
      ref={sectionRef}
      id="os"
      className="relative"
      aria-labelledby="os-heading"
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
            id="os-heading"
            variants={staggerChild}
            className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]"
          >
            Transform.
          </motion.h2>

          <motion.p
            variants={staggerChild}
            className="text-4xl md:text-5xl font-bold tracking-tight mt-1"
          >
            <span className="text-[var(--text-primary)]">
              Don&rsquo;t reinstall.
            </span>
          </motion.p>

          <motion.p
            variants={staggerChild}
            className="mt-5 max-w-2xl text-[17px] leading-relaxed text-[var(--text-secondary)]"
          >
            Reshape your current Windows installation in place &mdash; no ISO,
            no data loss, no starting over.
          </motion.p>
        </motion.div>

        {/* Key Metrics Row */}
        <div
          ref={statsRef}
          className="mt-12 flex flex-wrap items-start justify-between gap-y-8"
          role="list"
          aria-label="Key metrics"
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="flex items-start gap-0"
              role="listitem"
            >
              <StatBlock stat={stat} index={i} isInView={statsInView} />
              {/* Vertical divider between stats — not after last */}
              {i < stats.length - 1 && (
                <div
                  className="hidden md:block h-12 w-px bg-border-default mx-8 mt-2 self-center"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {/* Optimization Flow */}
        <div ref={flowRef} className="mt-20">
          <motion.div
            variants={staggerContainer(0.1, 0.1)}
            initial="hidden"
            animate={flowInView ? "visible" : "hidden"}
            className="flex flex-wrap items-start gap-y-6 overflow-x-auto pb-2 -mx-6 px-6 lg:mx-0 lg:px-0"
            role="list"
            aria-label="Optimization flow"
          >
            {flowSteps.map((step, i) => {
              const Icon = step.icon;
              const isLast = i === flowSteps.length - 1;

              return (
                <motion.div
                  key={step.title}
                  variants={staggerChild}
                  className="flex items-center gap-4 flex-shrink-0"
                  role="listitem"
                >
                  {/* Step card */}
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-5 py-4 min-w-[160px]">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)]"
                      aria-hidden="true"
                    >
                      <Icon size={16} className="text-[var(--text-secondary)]" />
                    </span>
                    <div>
                      <span className="text-[14px] font-medium text-[var(--text-primary)] block">
                        {step.title}
                      </span>
                      <span className="text-[12px] text-[var(--text-disabled)]">
                        {step.description}
                      </span>
                    </div>
                  </div>

                  {/* Arrow connector */}
                  {!isLast && (
                    <ArrowRight
                      size={16}
                      className="text-[var(--text-disabled)] flex-shrink-0 mx-1"
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Work PC Preservation */}
        <motion.div
          ref={calloutRef}
          initial={{ opacity: 0, y: 24 }}
          animate={
            calloutInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }
          }
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.2,
          }}
          className="premium-card mt-20 rounded-lg border-l-2 border-l-indigo-400 p-6 md:p-8"
        >
          <div className="flex items-start gap-4">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10"
              aria-hidden="true"
            >
              <Briefcase size={20} className="text-indigo-400" />
            </span>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Work PC Preservation
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-6 max-w-2xl">
                Enterprise services, printing, RDP, and domain workflows are
                automatically protected. OudenOS understands the difference
                between consumer bloat and enterprise infrastructure.
              </p>

              {/* Preserved services grid */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                role="list"
                aria-label="Preserved enterprise services"
              >
                {preservedServices.map((service) => (
                  <span
                    key={service.label}
                    role="listitem"
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--text-secondary)]"
                  >
                    <Shield
                      size={13}
                      className="text-indigo-400 flex-shrink-0"
                      aria-hidden="true"
                    />
                    {service.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
