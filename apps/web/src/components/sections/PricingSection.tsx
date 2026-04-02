"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart, Download, Check, Zap, Shield } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="pricing" ref={ref} className="relative py-36 lg:py-48">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(ellipse, #E8254B, transparent 55%)" }} />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-20"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.035em] leading-[1.05] text-ink-primary">
            One price. No tricks.
          </h2>
          <p className="mt-5 text-[1rem] leading-[1.75] text-ink-secondary max-w-[440px] mx-auto">
            OS is free. Tuning is a one-time purchase. No subscriptions, no recurring fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[880px] mx-auto">

          {/* redcore OS — FREE */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            className="relative rounded-lg border border-border bg-surface p-9 lg:p-10 overflow-hidden"
          >
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-muted/20">
                  <Shield className="h-5 w-5 text-ink-secondary" />
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold text-ink-primary">redcore · OS</p>
                  <p className="font-mono text-[0.65rem] text-ink-tertiary tracking-wide">FREE</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[3rem] font-bold tracking-tight text-ink-primary leading-none">$0</span>
              </div>
              <p className="text-[0.78rem] text-ink-muted mb-8">
                Full Windows optimization. No limits. No account required.
              </p>

              <div className="h-px bg-border mb-8" />

              <ul className="space-y-3.5 mb-10">
                {[
                  "Optimize without reinstalling",
                  "All 250+ reversible actions",
                  "8 machine profiles",
                  "Work PC preservation",
                  "Bloatware & telemetry removal",
                  "Full rollback support",
                ].map((f) => (
                  <li key={f} className="text-[0.82rem] text-ink-secondary flex items-start gap-3">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-ink-tertiary" />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.a
                href="https://github.com/redpersongpt/redcoreOS/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-6 py-4 text-[0.88rem] font-semibold text-ink-primary w-full justify-center hover:bg-border/30 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download className="h-4 w-4" />
                Download Free
              </motion.a>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
              <p className="text-[0.72rem] text-ink-muted">Love redcore · OS?</p>
              <a href="/donate" className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-accent hover:text-accent-bright transition-colors">
                <Heart className="h-3 w-3" />
                Donate
              </a>
            </div>
          </motion.div>

          {/* redcore Tuning — $12.99 — HERO CARD */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            className="relative rounded-lg border-2 border-accent/40 bg-gradient-to-b from-[#2a2229] to-surface p-9 lg:p-10 overflow-hidden shadow-xl shadow-accent/10"
          >
            {/* Accent glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-[220px] w-[220px] rounded-full opacity-[0.1]" style={{ background: "radial-gradient(circle, #E8254B, transparent 60%)" }} />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-[150px] w-[150px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #E8254B, transparent 60%)" }} />

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.4, ease }}
              className="absolute top-4 right-4 font-mono text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white bg-accent rounded-full px-3 py-1 shadow-lg shadow-accent/30"
            >
              Recommended
            </motion.div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 border border-accent/20">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold text-ink-primary">redcore · Tuning</p>
                  <p className="font-mono text-[0.65rem] text-accent tracking-wide">ONE-TIME PURCHASE</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[3rem] font-bold tracking-tight text-ink-primary leading-none">$12</span>
                <span className="text-[1.5rem] font-bold text-ink-tertiary">.99</span>
              </div>
              <p className="text-[0.78rem] text-ink-muted mb-8">
                Per machine · Lifetime license · No subscription
              </p>

              <div className="h-px bg-accent/15 mb-8" />

              <ul className="space-y-3.5 mb-10">
                {[
                  "Everything in OS, plus:",
                  "15+ deep tuning modules",
                  "CPU, GPU & latency optimization",
                  "Timer resolution & scheduler tuning",
                  "Benchmark lab (before/after)",
                  "BIOS guidance layer",
                  "Lifetime license key",
                  "Priority support",
                ].map((f, i) => (
                  <li key={f} className={`text-[0.82rem] flex items-start gap-3 ${i === 0 ? "font-semibold text-ink-primary" : "text-ink-secondary"}`}>
                    {i > 0 && <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />}
                    {f}
                  </li>
                ))}
              </ul>

              <span className="inline-flex items-center gap-2.5 rounded-lg bg-accent px-6 py-4 text-[0.88rem] font-semibold text-white w-full justify-center shadow-lg shadow-accent/25">
                Coming soon
              </span>

              <p className="mt-4 text-[0.68rem] text-ink-muted text-center">
                Free tier with core modules available at launch
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
