"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export function EcosystemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="products" ref={ref} className="relative py-32 lg:py-44">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        {/* Section lead */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-24 max-w-[520px]"
        >
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary">
            Two products, one ecosystem.
          </h2>
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-ink-secondary">
            OS cleans and transforms your Windows installation. Tuning goes
            deeper into hardware-specific optimization. Both analyze your
            machine first.
          </p>
        </motion.div>

        {/* Product comparison — editorial layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px rounded-xl overflow-hidden bg-border">
          {/* OS */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            className="bg-surface p-10 lg:p-12"
          >
            <div className="flex items-baseline justify-between mb-8">
              <h3 className="text-[1.15rem] font-bold text-ink-primary">
                redcore · OS
              </h3>
              <span className="font-mono text-[0.7rem] font-medium text-success tracking-wide">
                Free
              </span>
            </div>

            <p className="text-[0.88rem] leading-[1.7] text-ink-secondary mb-8">
              An installer-style wizard that transforms your current Windows
              installation. Removes bloatware, hardens privacy, suppresses
              telemetry, and configures the system based on your detected
              machine profile. Work PCs keep what they need.
            </p>

            <ul className="space-y-3 text-[0.8rem] text-ink-tertiary">
              {[
                "Playbook-driven transformation flow",
                "8 machine profiles with confidence scoring",
                "Work PC preservation (printing, RDP, domain)",
                "Bloatware, telemetry, and Edge cleanup",
                "Per-action rollback snapshots",
                "Hands into Tuning when ready",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-ink-muted shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Tuning */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            className="bg-surface p-10 lg:p-12"
          >
            <div className="flex items-baseline justify-between mb-8">
              <h3 className="text-[1.15rem] font-bold text-ink-primary">
                redcore · Tuning
              </h3>
              <span className="font-mono text-[0.7rem] font-medium text-accent tracking-wide">
                $12.99 · once
              </span>
            </div>

            <p className="text-[0.88rem] leading-[1.7] text-ink-secondary mb-8">
              A guided optimization consultant. Analyzes your hardware in
              depth, asks what matters to you, builds a custom tuning plan,
              and applies it with live validation. CPU scheduling, GPU
              settings, timer resolution, latency paths — machine-specific.
            </p>

            <ul className="space-y-3 text-[0.8rem] text-ink-tertiary">
              {[
                "Deep hardware analysis engine",
                "Question-driven tuning consultant",
                "CPU, GPU, and latency optimization",
                "Timer resolution and scheduler tuning",
                "Benchmark lab with before/after comparison",
                "Advanced service and process control",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/40 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
