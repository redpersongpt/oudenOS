"use client";

import { motion } from "framer-motion";
import { easing, duration, spring } from "@/lib/motion";

// ─── Animation Helpers ──────────────────────────────────────────────────────

const fadeSlide = (delay: number) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: duration.slow, ease: easing.enter },
});

const cardReveal = (delay: number) => ({
  initial: { opacity: 0, y: 20, rotateX: 5 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
  transition: { delay, ...spring.smooth },
});

// ─── Background Layers ──────────────────────────────────────────────────────

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* 1. Base surface */}
      <div className="absolute inset-0 bg-surface-base" />

      {/* 2. Depth radials with red bloom */}
      <div className="bg-hero-depth absolute inset-0" />

      {/* 3. Subliminal grid */}
      <div className="bg-grid-subtle absolute inset-0" />

      {/* 4. Cinematic vignette */}
      <div className="vignette absolute inset-0" />

      {/* 5. Floating glow — large, top-right */}
      <div
        className="animate-float-slow absolute -top-20 -right-20 h-[500px] w-[500px] rounded-full bg-brand-500 opacity-[0.03] blur-[100px]"
      />

      {/* 6. Floating glow — small, bottom-left */}
      <div
        className="animate-float-slow absolute -bottom-16 -left-16 h-[300px] w-[300px] rounded-full bg-brand-500 opacity-[0.02] blur-[80px]"
        style={{ animationDelay: "4s" }}
      />
    </div>
  );
}

// ─── Machine Profile Card ───────────────────────────────────────────────────

const specs = [
  { label: "CPU", value: "Ryzen 9 7950X" },
  { label: "GPU", value: "RTX 4090" },
  { label: "RAM", value: "32GB DDR5" },
  { label: "Storage", value: "2TB NVMe" },
] as const;

function MachineProfileCard() {
  return (
    <motion.div
      {...cardReveal(0.4)}
      whileHover={{ y: -2 }}
      className="w-[340px] rounded-lg bg-surface-card p-6"
      style={{ willChange: "transform" }}
    >
      {/* Status */}
      <div className="mb-4 flex items-center gap-2">
        <span className="animate-breathe inline-block h-2 w-2 rounded-full bg-success" />
        <span className="overline text-ink-tertiary">SYSTEM DETECTED</span>
      </div>

      {/* Machine name */}
      <p className="mb-4 text-lg font-semibold text-ink-primary">
        GAMING DESKTOP
      </p>

      <p className="mb-5 font-mono text-xs text-ink-tertiary">92% match confidence</p>

      {/* Spec grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {specs.map((s) => (
          <div key={s.label}>
            <p className="text-[11px] uppercase text-ink-tertiary">{s.label}</p>
            <p className="font-mono text-[13px] text-ink-primary">{s.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Action Preview Card ────────────────────────────────────────────────────

const actions = [
  { name: "Disable Xbox Game Bar", badge: "SAFE", color: "text-brand-400" },
  { name: "Tune CPU Scheduler", badge: "LOW", color: "text-brand-400" },
  { name: "Reduce Telemetry", badge: "SAFE", color: "text-brand-400" },
] as const;

function ActionPreviewCard() {
  return (
    <motion.div
      {...cardReveal(0.65)}
      whileHover={{ y: -2 }}
      className="w-[280px] rounded-lg bg-surface-card p-4"
      style={{ willChange: "transform" }}
    >
      <p className="overline mb-3 text-ink-tertiary">OPTIMIZATION PLAN</p>

      <div className="flex flex-col gap-2.5">
        {actions.map((a) => (
          <div key={a.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="text-ink-tertiary"
                aria-hidden="true"
              >
                <path
                  d="M3.5 7L6 9.5L10.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[12px] text-ink-secondary">{a.name}</span>
            </div>
            <span
              className={`rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-medium ${a.color}`}
            >
              {a.badge}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Benchmark Delta Card ───────────────────────────────────────────────────

function BenchmarkCard() {
  return (
    <motion.div
      {...cardReveal(0.8)}
      whileHover={{ y: -2 }}
      className="w-[160px] rounded-lg bg-surface-card p-3 text-center"
      style={{ willChange: "transform" }}
    >
      <p className="overline mb-1 text-ink-tertiary">BENCHMARK</p>
      <p className="font-mono text-2xl font-bold text-ink-primary">-34%</p>
      <p className="text-[11px] text-ink-tertiary">startup time</p>
    </motion.div>
  );
}

// ─── Product World Visual ───────────────────────────────────────────────────

function ProductVisual() {
  return (
    <div
      className="relative flex min-h-[480px] items-center justify-center lg:min-h-[560px]"
      style={{ perspective: "1000px" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500 opacity-[0.04] blur-[120px]"
        aria-hidden="true"
      />

      {/* Machine Profile — center */}
      <div className="relative">
        <MachineProfileCard />

        {/* Action Preview — below-left */}
        <div className="absolute -bottom-36 -left-12 z-10">
          <ActionPreviewCard />
        </div>

        {/* Benchmark — top-right */}
        <div className="absolute -top-10 -right-24 z-10">
          <BenchmarkCard />
        </div>
      </div>
    </div>
  );
}

// ─── Proof Line ─────────────────────────────────────────────────────────────

const proofItems = ["Windows 10/11", "8 Machine Profiles", "100% Reversible"];

function ProofLine() {
  return (
    <motion.div
      {...fadeSlide(0.85)}
      className="flex items-center gap-0"
    >
      {proofItems.map((item, i) => (
        <div
          key={item}
          className={`px-4 font-mono text-[12px] uppercase tracking-wide text-ink-tertiary ${
            i < proofItems.length - 1 ? "border-r border-border-default" : ""
          }`}
        >
          {item}
        </div>
      ))}
    </motion.div>
  );
}

// ─── Hero Section ───────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="noise relative min-h-screen overflow-hidden">
      <HeroBackground />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 items-center gap-0 px-6 pt-24 pb-16 lg:grid-cols-[1fr_1.1fr] lg:px-12 lg:pt-0 lg:pb-0">
        {/* ── Left Column: Editorial Block ── */}
        <div className="flex flex-col items-start">
          {/* Headline */}
          <h1
            className="mb-0 font-bold tracking-[-0.03em] leading-[1.05]"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 5.5rem)",
            }}
          >
            <motion.span
              className="block text-ink-primary"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: duration.slow, ease: easing.enter }}
              style={{ willChange: "transform" }}
            >
              Understand
            </motion.span>
            <motion.span
              className="block text-ink-primary"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: duration.slow, ease: easing.enter }}
              style={{ willChange: "transform" }}
            >
              your machine.
            </motion.span>
            <motion.span
              className="block text-brand-500"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: duration.slow, ease: easing.enter }}
              style={{ willChange: "transform" }}
            >
              Transform it.
            </motion.span>
          </h1>

          {/* Body */}
          <motion.p
            {...fadeSlide(0.55)}
            className="mt-8 max-w-[480px] text-[17px] leading-[1.65] text-ink-secondary"
          >
            Machine-aware optimization and in-place OS transformation. Two
            precision instruments, one ecosystem — guided by what your hardware
            actually needs.
          </motion.p>

          {/* CTA cluster — Apple-style link CTAs */}
          <motion.div
            {...fadeSlide(0.7)}
            className="mt-10 flex flex-col sm:flex-row gap-5"
          >
            <motion.a
              href="#ecosystem"
              className="inline-flex items-center gap-1.5 text-[17px] font-medium text-brand-400 cursor-pointer transition-colors duration-200 hover:text-brand-300"
              whileHover={{ x: 2 }}
              transition={spring.snappy}
            >
              Download Tuning
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-px"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.a>
            <motion.a
              href="#ecosystem"
              className="inline-flex items-center gap-1.5 text-[17px] font-medium text-ink-secondary cursor-pointer transition-colors duration-200 hover:text-ink-primary"
              whileHover={{ x: 2 }}
              transition={spring.snappy}
            >
              Explore the ecosystem
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-px"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.a>
          </motion.div>
        </div>

        {/* ── Right Column: Product World ── */}
        <div className="mt-16 lg:mt-0">
          <ProductVisual />
        </div>
      </div>

      {/* Section divider */}
    </section>
  );
}
