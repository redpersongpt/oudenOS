"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart, Download, Check } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="pricing" ref={ref} className="relative py-32 lg:py-44">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(ellipse, #E8453C, transparent 60%)" }} />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-16"
        >
          <h2 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold tracking-[-0.03em] leading-[1.1] text-ink-primary">
            Pricing
          </h2>
          <p className="mt-4 text-[0.95rem] text-ink-secondary">
            Pay once for Tuning. Use OS for free. No subscriptions.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px]">
          {/* Tuning — Premium */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-accent/25 bg-surface p-8 overflow-hidden"
          >
            {/* Accent glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-[200px] w-[200px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #E8453C, transparent 60%)" }} />

            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-accent mb-5 relative">
              Premium License
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[2.6rem] font-bold tracking-tight text-ink-primary">
                $12.99
              </span>
            </div>
            <p className="text-[0.72rem] text-ink-muted mb-8">
              one-time purchase, per machine
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "All 8 machine profiles",
                "15+ tuning modules",
                "Benchmark lab",
                "BIOS guidance",
                "Unlimited rollback history",
                "Lifetime license key",
                "Priority support",
              ].map((f) => (
                <li key={f} className="text-[0.8rem] text-ink-secondary flex items-start gap-2.5">
                  <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
                  {f}
                </li>
              ))}
            </ul>

            <span className="inline-flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-5 py-3.5 text-[0.84rem] font-medium text-ink-tertiary w-full justify-center">
              Coming soon
            </span>

            <p className="mt-4 text-[0.68rem] text-ink-muted text-center">
              Free tier available with core modules
            </p>
          </motion.div>

          {/* OS — Free */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative rounded-2xl border border-success/20 bg-surface p-8 overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-20 -left-20 h-[200px] w-[200px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #4ade80, transparent 60%)" }} />

            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-success mb-5 relative">
              Free
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[2.6rem] font-bold tracking-tight text-ink-primary">
                Free
              </span>
            </div>
            <p className="text-[0.72rem] text-ink-muted mb-8">
              forever, for everyone
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "In-place Windows transformation",
                "All 150+ actions",
                "8 machine profiles",
                "Work PC preservation",
                "Full rollback support",
                "Community-driven",
              ].map((f) => (
                <li key={f} className="text-[0.8rem] text-ink-secondary flex items-start gap-2.5">
                  <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>

            <motion.a
              href="/downloads/os/redcore-os-setup.exe"
              className="inline-flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-5 py-3.5 text-[0.84rem] font-semibold text-success w-full justify-center hover:bg-success/15 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="h-4 w-4" />
              Download Free
            </motion.a>

            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-[0.72rem] text-ink-muted mb-3">
                Love redcore · OS? Support development.
              </p>
              <a
                href="/donate"
                className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-accent hover:text-accent-bright transition-colors"
              >
                <Heart className="h-3 w-3" />
                Support with a Donation
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
