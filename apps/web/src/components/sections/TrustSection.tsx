"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="trust" ref={ref} className="relative py-32 lg:py-44">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-24 items-start">
          {/* Left — statement */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease }}
          >
            <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary">
              Nothing hidden.
              <br />
              Everything reversible.
            </h2>
            <p className="mt-6 text-[0.95rem] leading-[1.75] text-ink-secondary">
              redcore shows you the exact transformation plan before it
              runs. Every registry key, every service change, every removal
              — visible in real time. Not buried in logs.
            </p>
          </motion.div>

          {/* Right — trust pillars */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.7, ease }}
            className="space-y-8"
          >
            {[
              {
                title: "Per-action rollback",
                body: "A snapshot is created before every change. Restore any action individually or as a batch. Not a system restore point — granular undo.",
              },
              {
                title: "Profile-aware safety",
                body: "Work PCs keep printing, RDP, and Group Policy. Laptops keep battery management. VMs skip hardware tweaks. The plan adapts to what it detects.",
              },
              {
                title: "Expert gating",
                body: "Dangerous actions are never default. Edge removal, WebView2 changes, and CPU mitigation reductions require explicit opt-in.",
              },
              {
                title: "Validation pass",
                body: "After execution, redcore reads back the registry to verify changes applied correctly. Benchmark comparison confirms the impact.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease }}
              >
                <h3 className="text-[0.88rem] font-semibold text-ink-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-[0.82rem] leading-[1.7] text-ink-tertiary">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
