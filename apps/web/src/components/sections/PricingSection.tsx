"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart, Download, Check, Zap, Shield, ArrowRight } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="pricing" ref={ref} className="relative py-36 lg:py-48">
      {/* Dramatic ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(ellipse, #E8254B, transparent 55%)" }} />
        <div className="absolute left-[20%] bottom-0 h-[400px] w-[400px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, #4ade80, transparent 60%)" }} />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        {/* Header */}
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
            OS is free. Tuning is a one-time purchase. No subscriptions, no recurring fees, no data selling.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[880px] mx-auto">

          {/* ── redcore OS — Free ── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="relative rounded-2xl border border-border bg-gradient-to-b from-surface to-[#222226] p-9 lg:p-10 overflow-hidden"
          >
            {/* Green ambient */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-[200px] w-[200px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #4ade80, transparent 60%)" }} />

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold text-ink-primary">redcore · OS</p>
                  <p className="font-mono text-[0.65rem] text-success tracking-wide">FREE FOREVER</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[3rem] font-bold tracking-tight text-ink-primary leading-none">$0</span>
              </div>
              <p className="text-[0.78rem] text-ink-muted mb-8">
                Full Windows transformation. No limits. No account required.
              </p>

              <div className="h-px bg-border mb-8" />

              <ul className="space-y-3.5 mb-10">
                {[
                  "In-place Windows transformation",
                  "All 150+ reversible actions",
                  "8 machine profiles",
                  "Work PC preservation",
                  "Bloatware & telemetry removal",
                  "Full rollback support",
                ].map((f) => (
                  <li key={f} className="text-[0.82rem] text-ink-secondary flex items-start gap-3">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.a
                href="/downloads/os/redcore-os-setup.exe"
                className="inline-flex items-center gap-2.5 rounded-xl bg-success/10 border border-success/25 px-6 py-4 text-[0.88rem] font-semibold text-success w-full justify-center hover:bg-success/15 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download className="h-4 w-4" />
                Download Free
              </motion.a>
            </div>

            {/* Donate nudge */}
            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
              <p className="text-[0.72rem] text-ink-muted">
                Love redcore · OS?
              </p>
              <a
                href="/donate"
                className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-accent hover:text-accent-bright transition-colors"
              >
                <Heart className="h-3 w-3" />
                Donate
              </a>
            </div>
          </motion.div>

          {/* ── redcore Tuning — $12.99 ── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
            className="relative rounded-2xl border border-accent/25 bg-gradient-to-b from-surface to-[#222226] p-9 lg:p-10 overflow-hidden"
          >
            {/* Red ambient */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-[200px] w-[200px] rounded-full opacity-[0.08]" style={{ background: "radial-gradient(circle, #E8254B, transparent 60%)" }} />

            {/* Popular tag */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.4, ease }}
              className="absolute top-4 right-4 font-mono text-[0.55rem] font-bold uppercase tracking-[0.18em] text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1"
            >
              Recommended
            </motion.div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
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

              <div className="h-px bg-accent/10 mb-8" />

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

              <span className="inline-flex items-center gap-2.5 rounded-xl border border-accent/20 bg-accent/5 px-6 py-4 text-[0.88rem] font-medium text-ink-tertiary w-full justify-center">
                Coming soon
              </span>

              <p className="mt-4 text-[0.68rem] text-ink-muted text-center">
                Free tier with core modules available at launch
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 text-center text-[0.75rem] text-ink-muted"
        >
          Both products are in active development. Create an account to get notified at launch.
        </motion.p>
      </div>
    </section>
  );
}
