"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={ref} className="relative py-32 lg:py-44">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-16 max-w-[480px]"
        >
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary">
            Simple pricing. No subscriptions.
          </h2>
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-ink-secondary">
            Pay once for Tuning. Use OS for free. No recurring charges.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[760px]">
          {/* OS — Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            className="rounded-xl border border-border bg-surface p-8"
          >
            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-ink-tertiary mb-4">
              redcore · OS
            </p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[2.2rem] font-bold tracking-tight text-ink-primary">
                Free
              </span>
            </div>
            <p className="text-[0.82rem] text-ink-tertiary mb-8">
              Full Windows transformation. No limits.
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Playbook-driven transformation",
                "8 machine profiles",
                "Work PC preservation",
                "Bloatware & telemetry removal",
                "Per-action rollback",
              ].map((f) => (
                <p
                  key={f}
                  className="text-[0.78rem] text-ink-secondary flex items-start gap-2.5"
                >
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-success shrink-0" />
                  {f}
                </p>
              ))}
            </div>

            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-5 py-3 text-[0.82rem] font-medium text-ink-tertiary w-full justify-center">
              Coming soon
            </span>
          </motion.div>

          {/* Tuning — $12.99 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            className="rounded-xl border border-accent/20 bg-surface p-8 relative"
          >
            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-accent mb-4">
              redcore · Tuning
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[2.2rem] font-bold tracking-tight text-ink-primary">
                $12.99
              </span>
            </div>
            <p className="text-[0.72rem] text-ink-muted mb-8">
              One-time purchase · Lifetime license
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Everything in OS, plus:",
                "Deep hardware analysis",
                "CPU, GPU, latency optimization",
                "Timer resolution & scheduler tuning",
                "Benchmark lab (before/after)",
                "Priority support",
              ].map((f, i) => (
                <p
                  key={f}
                  className={`text-[0.78rem] flex items-start gap-2.5 ${i === 0 ? "font-medium text-ink-primary" : "text-ink-secondary"}`}
                >
                  {i > 0 && (
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/50 shrink-0" />
                  )}
                  {f}
                </p>
              ))}
            </div>

            <span className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-5 py-3 text-[0.82rem] font-medium text-ink-tertiary w-full justify-center">
              Coming soon
            </span>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8 text-[0.72rem] text-ink-muted"
        >
          Both products are in active development. Sign up to get notified when they launch.
        </motion.p>
      </div>
    </section>
  );
}
