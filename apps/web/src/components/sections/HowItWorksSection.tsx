"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    num: "01",
    title: "Scan",
    body: "Hardware, services, startup, telemetry state, work environment signals.",
  },
  {
    num: "02",
    title: "Classify",
    body: "Gaming desktop, work PC, laptop, low-spec, VM — with confidence scoring.",
  },
  {
    num: "03",
    title: "Plan",
    body: "Profile-aware actions. Work PCs preserve printing and RDP. Gaming desktops get latency tuning.",
  },
  {
    num: "04",
    title: "Execute",
    body: "Live application with per-action rollback snapshots. You see every change as it happens.",
  },
  {
    num: "05",
    title: "Validate",
    body: "Registry read-back, benchmark comparison, transformation report.",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how" ref={ref} className="relative py-32 lg:py-44">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-20 max-w-[480px]"
        >
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary">
            Five steps. Full control.
          </h2>
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-ink-secondary">
            Both products follow the same disciplined flow. Every step is
            guided. Every change is reversible.
          </p>
        </motion.div>

        {/* Vertical steps — editorial, not timeline-grid */}
        <div className="space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.08 * i, duration: 0.6, ease }}
              className="grid grid-cols-[60px_1fr] lg:grid-cols-[80px_180px_1fr] items-baseline border-t border-border py-7"
            >
              <span className="font-mono text-[0.7rem] font-bold text-ink-muted">
                {step.num}
              </span>
              <span className="text-[0.95rem] font-semibold text-ink-primary lg:pr-8">
                {step.title}
              </span>
              <span className="col-start-2 lg:col-start-3 text-[0.85rem] leading-[1.65] text-ink-tertiary mt-1 lg:mt-0">
                {step.body}
              </span>
            </motion.div>
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  );
}
