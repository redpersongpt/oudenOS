"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Cpu, Gauge, RotateCcw, Wand2, BarChart3, Settings2,
  Monitor, Shield, Paintbrush, Layers, Fingerprint, RefreshCcw
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const tuningFeatures = [
  { icon: Cpu, title: "Machine-aware scanning", body: "Deep hardware and software analysis before any changes." },
  { icon: Layers, title: "15+ tuning modules", body: "CPU, GPU, memory, storage, network, display, audio, and more." },
  { icon: BarChart3, title: "Benchmark validation", body: "Before/after performance comparison for every session." },
  { icon: RotateCcw, title: "Rollback safety", body: "Complete snapshots before every change, one-click restore." },
  { icon: Wand2, title: "Wizard-guided flow", body: "Step-by-step optimization — scan, profile, plan, execute, verify." },
  { icon: Settings2, title: "BIOS guidance", body: "Profile-aware firmware recommendations for advanced users." },
];

const osFeatures = [
  { icon: Monitor, title: "In-place transformation", body: "Reshape your current Windows — no ISO, no reinstall, no data loss." },
  { icon: Shield, title: "150+ reversible actions", body: "Staged cleanup across services, tasks, privacy, startup, and more." },
  { icon: Fingerprint, title: "Work PC preservation", body: "Print Spooler, RDP, SMB, Group Policy, VPN — automatically protected." },
  { icon: Gauge, title: "8 machine profiles", body: "Gaming, workstation, office, laptop, low-spec — each gets a different path." },
  { icon: RefreshCcw, title: "Full rollback", body: "Every change creates a snapshot, every action is reversible." },
  { icon: Paintbrush, title: "Visual personalization", body: "Optional dark mode, accent system, taskbar, and Explorer cleanup." },
];

function FeatureCard({ icon: Icon, title, body, delay, inView, accent }: {
  icon: typeof Cpu;
  title: string;
  body: string;
  delay: number;
  inView: boolean;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-surface p-7 lg:p-8 cursor-default"
    >
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${accent === "red" ? "bg-accent/10" : "bg-success/10"}`}>
        <Icon className={`h-4.5 w-4.5 ${accent === "red" ? "text-accent" : "text-success"}`} />
      </div>
      <h3 className="text-[0.88rem] font-semibold text-ink-primary mb-2 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-[0.8rem] leading-[1.7] text-ink-tertiary">
        {body}
      </p>
    </motion.div>
  );
}

function TuningSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="tuning" ref={ref} className="relative py-28 lg:py-36">
      {/* Subtle red glow */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #E8453C, transparent 65%)" }} />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-14"
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease }}
            className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-accent mb-5"
          >
            redcore · Tuning
          </motion.p>
          <h2 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold tracking-[-0.03em] leading-[1.1] text-ink-primary max-w-[620px]">
            Guided machine optimization with
            benchmark-driven validation.
          </h2>
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-ink-secondary max-w-[520px]">
            Every step wizard-led, every change reversible.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
          {tuningFeatures.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={0.05 * i} inView={inView} accent="red" />
          ))}
        </div>
      </div>
    </section>
  );
}

function OSSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="os" ref={ref} className="relative py-28 lg:py-36">
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #4ade80, transparent 65%)" }} />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease }}
          className="mb-14"
        >
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, ease }}
            className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-success mb-5"
          >
            redcore · OS
          </motion.p>
          <h2 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold tracking-[-0.03em] leading-[1.1] text-ink-primary max-w-[620px]">
            In-place Windows transformation.
          </h2>
          <p className="mt-5 text-[0.95rem] leading-[1.75] text-ink-secondary max-w-[560px]">
            Reshape your current installation without reinstalling — guided
            by machine intelligence, protected by rollback safety.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
          {osFeatures.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={0.05 * i} inView={inView} accent="green" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function EcosystemSection() {
  return (
    <div id="products">
      <TuningSection />
      <OSSection />
    </div>
  );
}
