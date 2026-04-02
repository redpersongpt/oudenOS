"use client";

import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  Cpu, Gauge, RotateCcw, Wand2, BarChart3, Settings2,
  Monitor, Shield, Paintbrush, Layers, Fingerprint, RefreshCcw,
  ArrowUp
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const tuningFeatures = [
  { icon: Cpu,      title: "Scans your actual hardware",    body: "Deep hardware and software analysis before any changes." },
  { icon: Layers,   title: "15+ tuning modules",        body: "CPU, GPU, memory, storage, network, display, audio, and more." },
  { icon: BarChart3,title: "Benchmark validation",       body: "Before/after performance comparison for every session." },
  { icon: RotateCcw,title: "Rollback safety",            body: "Complete snapshots before every change, one-click restore." },
  { icon: Wand2,    title: "Wizard-guided flow",         body: "Step-by-step optimization — scan, profile, plan, execute, verify." },
  { icon: Settings2,title: "BIOS guidance",              body: "Profile-aware firmware recommendations for advanced users." },
];

const osFeatures = [
  { icon: Monitor,     title: "No reinstall needed", body: "Reshape your current Windows — no ISO, no reinstall, no data loss." },
  { icon: Shield,      title: "150+ reversible actions", body: "Staged cleanup across services, tasks, privacy, startup, and more." },
  { icon: Fingerprint, title: "Work PC preservation",    body: "Print Spooler, RDP, SMB, Group Policy, VPN — automatically protected." },
  { icon: Gauge,       title: "8 machine profiles",      body: "Gaming, workstation, office, laptop, low-spec — each gets a different path." },
  { icon: RefreshCcw,  title: "Full rollback",            body: "Every change creates a snapshot, every action is reversible." },
  { icon: Paintbrush,  title: "Visual personalization",   body: "Optional dark mode, accent system, taskbar, and Explorer cleanup." },
];

// Feature Card

function FeatureCard({ icon: Icon, title, body, delay, inView }: {
  icon: typeof Cpu;
  title: string;
  body: string;
  delay: number;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6, ease }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group border border-[var(--color-border)] rounded-lg p-7 lg:p-8 cursor-default bg-transparent"
    >
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)]">
        <Icon className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
      </div>
      <h3 className="text-[0.88rem] font-semibold text-[var(--text-primary)] mb-2 group-hover:text-white transition-colors">
        {title}
      </h3>
      <p className="text-[0.8rem] leading-[1.7] text-[var(--text-disabled)]">
        {body}
      </p>
    </motion.div>
  );
}

// Ecosystem Diagram

function EcosystemDiagram({ inView }: { inView: boolean }) {
  const layers = [
    {
      label: "Your Windows 10 / 11",
      badge: "Foundation",
      badgeStyle: "text-[var(--text-disabled)] bg-transparent border border-border/50",
      pills: ["Stock install", "Untouched data", "Your apps"],
      desc: "Left unchanged — Ouden only changes what needs changing",
      borderStyle: "border-border/40",
      bgStyle: "bg-transparent",
      delay: 0.1,
    },
    {
      label: "OudenOS",
      badge: "Free",
      badgeStyle: "text-[var(--text-secondary)] bg-ink-muted/20 border border-border",
      pills: ["150+ actions", "8 profiles", "Privacy", "Rollback", "Work-safe"],
      desc: "Debloat, optimize, clean, protect",
      borderStyle: "border-border",
      bgStyle: "bg-transparent",
      delay: 0.25,
    },
    {
      label: "Ouden.Tuning",
      badge: "$12.99 one-time",
      badgeStyle: "text-[var(--accent)] bg-[var(--accent)]/10 border border-accent/20",
      pills: ["CPU tuning", "GPU latency", "Benchmark lab", "BIOS guidance", "Timer resolution"],
      desc: "Hardware-level optimization on top of OudenOS",
      borderStyle: "border-accent/40",
      bgStyle: "bg-transparent",
      delay: 0.4,
    },
  ];
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mx-auto max-w-[740px]">
      {/* Vertical connector line */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-accent/30 via-border to-transparent"
        style={{ top: 0, bottom: 0 }}
        initial={{ scaleY: 0, originY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ delay: 0.5, duration: 1.2, ease }}
      />

      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-[var(--accent)]/20 blur-2xl"
          initial={{ opacity: 0, y: -12 }}
          animate={inView ? { opacity: [0, 1, 0.55, 0], y: [0, 120, 250, 340] } : {}}
          transition={{ delay: 0.55, duration: 1.8, ease }}
          aria-hidden="true"
        />
      )}

      <div className="space-y-3 relative">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.label}
            layout
            initial={{ opacity: 0, x: i % 2 === 0 ? 32 : -32 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: layer.delay, duration: 0.7, ease }}
          >
            <div className={`relative rounded-lg border ${layer.borderStyle} ${layer.bgStyle} p-6 overflow-hidden`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Layer info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[0.92rem] font-bold text-[var(--text-primary)]">{layer.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ${layer.badgeStyle}`}>
                      {layer.badge}
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-[var(--text-disabled)] leading-relaxed hidden sm:block">
                    {layer.desc}
                  </p>
                </div>

                {/* Pills */}
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {layer.pills.map((pill) => (
                    <span key={pill}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[0.65rem] font-medium text-[var(--text-disabled)]">
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Arrow between layers */}
            {i < layers.length - 1 && (
              <motion.div
                className="flex justify-center py-1"
                initial={{ opacity: 0, y: 4 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: layer.delay + 0.3, duration: 0.4 }}
              >
                <ArrowUp className="h-4 w-4 text-[var(--accent)]/40" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Caption */}
      <motion.p
        className="mt-6 text-center text-[0.72rem] font-mono text-[var(--text-disabled)] tracking-wide"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        Tuning extends OS — both products, one system
      </motion.p>
    </div>
  );
}

// Section Header

function SectionHeader({ label, title, subtitle, inView, delay = 0 }: {
  label: string;
  title: string;
  subtitle: string;
  inView: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.7, ease }}
      className="mb-14"
    >
      <motion.p
        initial={{ opacity: 0, x: -20 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, ease, delay: delay + 0.05 }}
        className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-[var(--accent)] mb-5"
      >
        {label}
      </motion.p>
      <h2 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold tracking-[-0.03em] leading-[1.1] text-[var(--text-primary)] max-w-[620px]">
        {title}
      </h2>
      <p className="mt-5 text-[0.95rem] leading-[1.75] text-[var(--text-secondary)] max-w-[520px]">
        {subtitle}
      </p>
    </motion.div>
  );
}

// Tuning Section

function TuningSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="tuning" ref={ref} className="relative py-28 lg:py-36">
      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <SectionHeader
          label="Ouden.Tuning"
          title="Hardware-level optimization with benchmark validation."
          subtitle="Every step wizard-led, every change reversible."
          inView={inView}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tuningFeatures.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={0.05 * i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

// OS Section

function OSSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section id="os" ref={ref} className="relative py-28 lg:py-36">
      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        <SectionHeader
          label="OudenOS"
          title="Fix your Windows without reinstalling."
          subtitle="Scans your PC, shows you exactly what it'll change, and lets you undo everything."
          inView={inView}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {osFeatures.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={0.05 * i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Ecosystem Intro

function EcosystemIntro() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-32 lg:py-40 overflow-hidden">
      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease }}
            className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[var(--accent)] mb-6"
          >
            The ecosystem
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.8, ease }}
            className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tracking-[-0.035em] leading-[1.08] text-[var(--text-primary)]"
          >
            Two products. One system.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.7, ease }}
            className="mt-6 mx-auto max-w-[480px] text-[0.95rem] leading-[1.75] text-[var(--text-secondary)]"
          >
            OudenOS handles the cleanup. Ouden.Tuning goes deeper.
          </motion.p>
        </div>

        {/* The diagram */}
        <EcosystemDiagram inView={inView} />
      </div>
    </section>
  );
}

// Export

export function EcosystemSection() {
  return (
    <div id="products">
      <EcosystemIntro />
      <TuningSection />
      <OSSection />
    </div>
  );
}
