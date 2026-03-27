"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Heart } from "lucide-react";

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
          className="mb-16"
        >
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary">
            Pricing
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[760px]">
          {/* Tuning — Premium */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease }}
            className="rounded-xl border border-accent/20 bg-surface p-8 relative"
          >
            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-accent mb-5">
              Premium License
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[2.4rem] font-bold tracking-tight text-ink-primary">
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
                <li
                  key={f}
                  className="text-[0.8rem] text-ink-secondary flex items-start gap-2.5"
                >
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-accent/50 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <span className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-5 py-3 text-[0.82rem] font-medium text-ink-tertiary w-full justify-center">
              Coming soon
            </span>

            <p className="mt-4 text-[0.68rem] text-ink-muted text-center">
              Free tier available with core modules
            </p>
          </motion.div>

          {/* OS — Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            className="rounded-xl border border-border bg-surface p-8"
          >
            <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-success mb-5">
              Free
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[2.4rem] font-bold tracking-tight text-ink-primary">
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
                <li
                  key={f}
                  className="text-[0.8rem] text-ink-secondary flex items-start gap-2.5"
                >
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-success/50 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-5 py-3 text-[0.82rem] font-medium text-ink-tertiary w-full justify-center">
              Coming soon
            </span>

            <div className="mt-6 pt-6 border-t border-border text-center">
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
