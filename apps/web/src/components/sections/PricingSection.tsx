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
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(ellipse, #ffffff, transparent 55%)" }} />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-20"
        >
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.035em] leading-[1.05] text-[var(--text-primary)]" style={{ fontFamily: "var(--font-display)" }}>
            One price. No tricks.
          </h2>
          <p className="mt-5 text-[1rem] leading-[1.75] text-[var(--text-secondary)] max-w-[440px] mx-auto">
            OS is free. Tuning is a one-time purchase. No subscriptions, no recurring fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[880px] mx-auto">

          {/* OudenOS — FREE */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-9 lg:p-10 overflow-hidden"
          >
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-muted/20">
                  <Shield className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold text-[var(--text-primary)]">OudenOS</p>
                  <p className="font-mono text-[0.65rem] text-[var(--text-disabled)] tracking-wide">FREE</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[3rem] font-bold tracking-tight text-[var(--text-primary)] leading-none font-display">$0</span>
              </div>
              <p className="text-[0.78rem] text-[var(--text-disabled)] mb-8">
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
                  <li key={f} className="text-[0.82rem] text-[var(--text-secondary)] flex items-start gap-3">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-[var(--text-disabled)]" />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.a
                href="https://github.com/redpersongpt/redcoreOS/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-4 text-[0.88rem] font-semibold text-black w-full justify-center hover:bg-[#E8E8E8] transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Download className="h-4 w-4" />
                Download OudenOS
              </motion.a>
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
              <p className="text-[0.72rem] text-[var(--text-disabled)]">Love OudenOS?</p>
              <a href="/donate" className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-ink-secondary)] hover:text-white transition-colors">
                <Heart className="h-3 w-3" />
                Donate
              </a>
            </div>
          </motion.div>

          {/* Ouden.Tuning — $12.99 */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-9 lg:p-10 overflow-hidden"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.4, ease }}
              className="absolute top-4 right-4 font-mono text-[0.55rem] font-bold uppercase tracking-[0.18em] text-white bg-white/15 rounded-full px-3 py-1"
            >
              Recommended
            </motion.div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 border border-[var(--color-border)]">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[0.95rem] font-bold text-[var(--text-primary)]">Ouden.Tuning</p>
                  <p className="font-mono text-[0.65rem] text-[var(--color-ink-secondary)] tracking-wide">ONE-TIME PURCHASE</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[3rem] font-bold tracking-tight text-[var(--text-primary)] leading-none font-display">$12</span>
                <span className="text-[1.5rem] font-bold text-[var(--text-disabled)] font-display">.99</span>
              </div>
              <p className="text-[0.78rem] text-[var(--text-disabled)] mb-8">
                Per machine · Lifetime license · No subscription
              </p>

              <div className="h-px bg-[var(--color-border)] mb-8" />

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
                  <li key={f} className={`text-[0.82rem] flex items-start gap-3 ${i === 0 ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                    {i > 0 && <Check className="h-4 w-4 mt-0.5 shrink-0 text-white" />}
                    {f}
                  </li>
                ))}
              </ul>

              <span className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-4 text-[0.88rem] font-semibold text-black w-full justify-center">
                Coming soon
              </span>

              <p className="mt-4 text-[0.68rem] text-[var(--text-disabled)] text-center">
                Free tier with core modules available at launch
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
