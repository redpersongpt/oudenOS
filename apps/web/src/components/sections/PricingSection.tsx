"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Check } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={ref} className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-16 text-center"
        >
          <p className="overline mb-4">Pricing</p>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tracking-[-0.03em] leading-[1.1] text-ink-primary">
            Simple. Honest. No subscriptions.
          </h2>
          <p className="mt-5 mx-auto max-w-[480px] text-[1rem] leading-[1.7] text-ink-secondary">
            Pay once for Tuning. Use OS for free. No recurring charges, no hidden fees, no data selling.
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-[800px] grid-cols-1 md:grid-cols-2 gap-6">
          {/* OS — Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            className="rounded-2xl border border-border bg-surface p-8"
          >
            <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-tertiary mb-3">redcore · OS</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[2.5rem] font-bold tracking-tight text-ink-primary">Free</span>
            </div>
            <p className="text-[0.85rem] text-ink-secondary mb-6">
              Full Windows transformation. No paywall, no limits.
            </p>
            <a href="/downloads/os/redcore-os-setup.exe" className="mb-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-5 py-3 text-[0.85rem] font-semibold text-ink-primary transition-colors hover:border-border-strong">
              Download OS <ArrowRight className="h-4 w-4" />
            </a>
            <ul className="space-y-2.5">
              {[
                "Full playbook-driven transformation",
                "164 optimization actions",
                "8 machine profiles",
                "Work PC preservation",
                "Bloatware & telemetry removal",
                "Edge suppression & cleanup",
                "App setup & personalization",
                "Rollback for every action",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[0.8rem] text-ink-secondary">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Tuning — $12.99 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            className="relative rounded-2xl border border-accent/30 bg-surface p-8"
          >
            {/* Accent glow */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-[0.06]" style={{ background: "radial-gradient(ellipse at 50% 0%, #E8453C, transparent 60%)" }} />

            <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-accent mb-3">redcore · Tuning</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[2.5rem] font-bold tracking-tight text-ink-primary">$12.99</span>
            </div>
            <p className="text-[0.75rem] text-ink-tertiary mb-5">One-time purchase · Lifetime license</p>
            <a href="/profile" className="mb-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-[0.85rem] font-semibold text-white transition-all hover:bg-accent-dim hover:shadow-[0_0_24px_rgba(232,69,60,0.15)]">
              Get Tuning <ArrowRight className="h-4 w-4" />
            </a>
            <ul className="space-y-2.5">
              {[
                "Everything in OS, plus:",
                "Deep hardware analysis engine",
                "Question-driven tuning consultant",
                "CPU, GPU, and latency optimization",
                "Timer resolution & scheduler tuning",
                "BIOS guidance layer",
                "Benchmark Lab (before/after)",
                "Advanced service & process control",
                "Priority support",
              ].map((f, i) => (
                <li key={f} className={`flex items-start gap-2.5 text-[0.8rem] ${i === 0 ? "font-semibold text-ink-primary" : "text-ink-secondary"}`}>
                  {i > 0 && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />}
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
