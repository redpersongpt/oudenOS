"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

/* ── Tuning Product ─────────────────────────────────────────────────────── */

function TuningSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="tuning" ref={ref} className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-6"
        >
          <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-accent mb-4">
            redcore · Tuning
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary max-w-[600px]">
            Guided machine optimization with benchmark-driven validation.
          </h2>
          <p className="mt-4 text-[0.95rem] leading-[1.75] text-ink-secondary max-w-[540px]">
            Every step wizard-led, every change reversible.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          {[
            {
              title: "Machine-aware scanning",
              body: "Deep hardware and software analysis before any changes.",
            },
            {
              title: "15+ tuning modules",
              body: "CPU, GPU, memory, storage, network, display, audio, and more.",
            },
            {
              title: "Benchmark validation",
              body: "Before/after performance comparison for every session.",
            },
            {
              title: "Rollback safety",
              body: "Complete snapshots before every change, one-click restore.",
            },
            {
              title: "Wizard-guided flow",
              body: "Step-by-step optimization — scan, profile, plan, execute, verify.",
            },
            {
              title: "BIOS guidance",
              body: "Profile-aware firmware recommendations for advanced users.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.05 * i, duration: 0.5, ease }}
              className="bg-surface p-8"
            >
              <h3 className="text-[0.85rem] font-semibold text-ink-primary mb-2">
                {item.title}
              </h3>
              <p className="text-[0.8rem] leading-[1.65] text-ink-tertiary">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── OS Product ─────────────────────────────────────────────────────────── */

function OSSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="os" ref={ref} className="relative py-32 lg:py-40">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-6"
        >
          <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-success mb-4">
            redcore · OS
          </p>
          <h2 className="text-[clamp(1.6rem,3vw,2.4rem)] font-bold tracking-[-0.03em] leading-[1.12] text-ink-primary max-w-[620px]">
            In-place Windows transformation.
          </h2>
          <p className="mt-4 text-[0.95rem] leading-[1.75] text-ink-secondary max-w-[560px]">
            Reshape your current installation without reinstalling — guided
            by machine intelligence, protected by rollback safety.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
          {[
            {
              title: "In-place transformation",
              body: "Reshape your current Windows — no ISO, no reinstall, no data loss.",
            },
            {
              title: "150+ reversible actions",
              body: "Staged cleanup across services, tasks, privacy, startup, and more.",
            },
            {
              title: "Work PC preservation",
              body: "Print Spooler, RDP, SMB, Group Policy, VPN — automatically protected.",
            },
            {
              title: "8 machine profiles",
              body: "Gaming, workstation, office, laptop, low-spec — each gets a different path.",
            },
            {
              title: "Full rollback",
              body: "Every change creates a snapshot, every action is reversible.",
            },
            {
              title: "Visual personalization",
              body: "Optional dark mode, accent system, taskbar, and Explorer cleanup.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.05 * i, duration: 0.5, ease }}
              className="bg-surface p-8"
            >
              <h3 className="text-[0.85rem] font-semibold text-ink-primary mb-2">
                {item.title}
              </h3>
              <p className="text-[0.8rem] leading-[1.65] text-ink-tertiary">
                {item.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Combined Export ─────────────────────────────────────────────────────── */

export function EcosystemSection() {
  return (
    <div id="products">
      <TuningSection />
      <OSSection />
    </div>
  );
}
