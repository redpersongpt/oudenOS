"use client";

import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import React, { useRef } from "react";
import { ArrowUp } from "lucide-react";

// Custom SVG icons — 20x20, stroke-based, currentColor
function IconCrosshair({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className={className}>
      <circle cx="10" cy="10" r="6" /><circle cx="10" cy="10" r="2" /><path d="M10 2v4M10 14v4M2 10h4M14 10h4" />
    </svg>
  );
}
function IconLayers({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2L2 7l8 5 8-5-8-5z" /><path d="M2 10l8 5 8-5" /><path d="M2 13l8 5 8-5" />
    </svg>
  );
}
function IconBarChart({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className={className}>
      <path d="M4 16V10M8 16V6M12 16V8M16 16V4" />
    </svg>
  );
}
function IconRotate({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 10a6 6 0 0110.5-4" /><path d="M16 10a6 6 0 01-10.5 4" /><path d="M14.5 3v3h3" /><path d="M5.5 17v-3h-3" />
    </svg>
  );
}
function IconSteps({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 16h4v-4h4V8h4V4h4" /><circle cx="4" cy="16" r="1" fill="currentColor" /><circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="8" r="1" fill="currentColor" /><circle cx="16" cy="4" r="1" fill="currentColor" />
    </svg>
  );
}
function IconTerminal({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="16" height="14" rx="2" /><path d="M5 10l3 2-3 2" /><path d="M10 14h5" />
    </svg>
  );
}
function IconMonitorCheck({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="16" height="11" rx="2" /><path d="M7 9l2 2 4-4" /><path d="M8 17h4" />
    </svg>
  );
}
function IconShieldLines({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2L3 6v4c0 4.4 3 8 7 10 4-2 7-5.6 7-10V6l-7-4z" /><path d="M7 10h6M7 13h6" />
    </svg>
  );
}
function IconLock({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6a3 3 0 016 0v3" /><circle cx="10" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}
function IconGrid({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="7" height="7" rx="1" /><rect x="11" y="2" width="7" height="7" rx="1" /><rect x="2" y="11" width="7" height="7" rx="1" /><rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconRewind({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 10a6 6 0 1112 0 6 6 0 01-12 0z" /><path d="M10 7v3l-2 1" /><path d="M4 4v3h3" />
    </svg>
  );
}
function IconPalette({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2a8 8 0 00-1 15.9c1 .1 1.5-.5 1.5-1.2v-1c0-1 .7-1.5 1.2-1.2 2.3 1.2 5.3-.3 5.3-3.5A8 8 0 0010 2z" /><circle cx="7" cy="8" r="1.2" fill="currentColor" /><circle cx="12" cy="7" r="1.2" fill="currentColor" /><circle cx="7" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconGauge({ className }: { className?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" className={className}>
      <path d="M10 18a8 8 0 110-16 8 8 0 010 16z" /><path d="M10 10l3-5" /><circle cx="10" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

const ease = [0.16, 1, 0.3, 1] as const;

const tuningFeatures = [
  { icon: IconCrosshair, title: "Scans your actual hardware",    body: "Deep hardware and software analysis before any changes." },
  { icon: IconLayers,    title: "15+ tuning modules",        body: "CPU, GPU, memory, storage, network, display, audio, and more." },
  { icon: IconBarChart,  title: "Benchmark validation",       body: "Before/after performance comparison for every session." },
  { icon: IconRotate,    title: "Rollback safety",            body: "Complete snapshots before every change, one-click restore." },
  { icon: IconSteps,     title: "Wizard-guided flow",         body: "Step-by-step optimization — scan, profile, plan, execute, verify." },
  { icon: IconTerminal,  title: "BIOS guidance",              body: "Profile-aware firmware recommendations for advanced users." },
];

const osFeatures = [
  { icon: IconMonitorCheck, title: "No reinstall needed", body: "Reshape your current Windows — no ISO, no reinstall, no data loss." },
  { icon: IconShieldLines,  title: "150+ reversible actions", body: "Staged cleanup across services, tasks, privacy, startup, and more." },
  { icon: IconLock,         title: "Work PC preservation",    body: "Print Spooler, RDP, SMB, Group Policy, VPN — automatically protected." },
  { icon: IconGrid,         title: "8 machine profiles",      body: "Gaming, workstation, office, laptop, low-spec — each gets a different path." },
  { icon: IconRewind,       title: "Full rollback",            body: "Every change creates a snapshot, every action is reversible." },
  { icon: IconPalette,      title: "Visual personalization",   body: "Optional dark mode, accent system, taskbar, and Explorer cleanup." },
];

// Feature Card

function FeatureCard({ icon: Icon, title, body, delay, inView }: {
  icon: React.ComponentType<{ className?: string }>;
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
      whileHover={{ y: -6, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }}
      className="group border border-[var(--color-border)] rounded-lg p-7 lg:p-8 cursor-default bg-transparent"
    >
      <motion.div
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)]"
        whileHover={{ rotate: 5, transition: { type: "spring", stiffness: 300, damping: 15 } }}
      >
        <Icon className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
      </motion.div>
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
      badgeStyle: "text-white bg-white/10 border border-[var(--color-border)]",
      pills: ["CPU tuning", "GPU latency", "Benchmark lab", "BIOS guidance", "Timer resolution"],
      desc: "Hardware-level optimization on top of OudenOS",
      borderStyle: "border-[var(--color-border)]",
      bgStyle: "bg-transparent",
      delay: 0.4,
    },
  ];
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mx-auto max-w-[740px]">
      {/* Vertical connector line */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-white/20 via-border to-transparent"
        style={{ top: 0, bottom: 0 }}
        initial={{ scaleY: 0, originY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ delay: 0.5, duration: 1.2, ease }}
      />

      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-white/15 blur-2xl"
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
                <ArrowUp className="h-4 w-4 text-[var(--color-ink-tertiary)]" />
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
        className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-secondary)] mb-5"
      >
        {label}
      </motion.p>
      <h2 className="text-[clamp(1.7rem,3.2vw,2.6rem)] font-bold tracking-[-0.03em] leading-[1.1] text-[var(--text-primary)] max-w-[620px]" style={{ fontFamily: "var(--font-display)" }}>
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
            className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-secondary)] mb-6"
          >
            The ecosystem
          </motion.p>
          <motion.h2
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={inView ? { clipPath: "inset(0 0% 0 0)" } : {}}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tracking-[-0.035em] leading-[1.08] text-[var(--text-primary)]"
            style={{ fontFamily: "var(--font-display)" }}
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
