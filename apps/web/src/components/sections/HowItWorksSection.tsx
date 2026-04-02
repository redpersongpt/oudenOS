"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    num: "01",
    title: "Scan",
    body: "Hardware, services, startup items, telemetry state, work environment signals — read before anything is touched.",
  },
  {
    num: "02",
    title: "Classify",
    body: "Gaming desktop, work PC, laptop, low-spec, VM — classified with confidence scoring, not guesses.",
  },
  {
    num: "03",
    title: "Plan",
    body: "Profile-aware action list. Work PCs keep printing and RDP. Gaming desktops get latency tuning. Nothing blind.",
  },
  {
    num: "04",
    title: "Execute",
    body: "Live application with per-action rollback snapshots. Every change visible in real time as it runs.",
  },
  {
    num: "05",
    title: "Validate",
    body: "Registry read-back, benchmark comparison, full report. You know exactly what changed and why.",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how" ref={ref} className="relative py-32 lg:py-44">
      {/* Subtle left accent */}
      <motion.div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-px"
        style={{ background: "linear-gradient(to bottom, transparent, #666666 30%, #666666 70%, transparent)" }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={inView ? { scaleY: 1, opacity: 0.08 } : {}}
        transition={{ delay: 0.3, duration: 1.5, ease }}
      />

      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-20 max-w-[480px]"
        >
          <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-secondary)] mb-5">
            The process
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            Five steps. Full control.
          </h2>
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-[var(--text-secondary)]">
            Both products follow the same disciplined flow.
            Every step is guided. Every change is reversible.
          </p>
        </motion.div>

        {/* Steps — editorial vertical list */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 + 0.09 * i, duration: 0.6, ease }}
              className="group grid grid-cols-[60px_1fr] lg:grid-cols-[80px_180px_1fr] items-baseline border-t border-[var(--border)] py-7 hover:bg-[var(--surface-raised)]/30 transition-colors duration-200 rounded-sm -mx-3 px-3"
            >
              <span className="font-display text-[0.7rem] font-bold text-[var(--color-ink-tertiary)] group-hover:text-[var(--color-ink-secondary)] transition-colors">
                {step.num}
              </span>
              <span className="text-[0.95rem] font-semibold text-[var(--text-primary)] lg:pr-8">
                {step.title}
              </span>
              <span className="col-start-2 lg:col-start-3 text-[0.85rem] leading-[1.65] text-[var(--text-disabled)] mt-1 lg:mt-0">
                {step.body}
              </span>
            </motion.div>
          ))}
          <motion.div
            className="border-t border-border"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ delay: 0.6, duration: 0.8, ease }}
            style={{ transformOrigin: "left" }}
          />
        </div>
      </div>
    </section>
  );
}
