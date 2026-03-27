"use client";

import { motion } from "framer-motion";
import { ArrowDown, Download } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;
const smooth = [0.25, 0.1, 0.25, 1] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

// ─── Pill config ─────────────────────────────────────────────────────────────

const PILLS = [
  { label: "Debloat",           x: -185, y: -130, delay: 0.7,  floatY: 6,  floatDur: 3.2 },
  { label: "Better Frame Times",x:  155, y: -120, delay: 0.85, floatY: -5, floatDur: 3.6 },
  { label: "No Input Lag",      x: -200, y: -30,  delay: 1.0,  floatY: -7, floatDur: 3.0 },
  { label: "Privacy Hardened",  x:  180, y: -20,  delay: 1.15, floatY: 5,  floatDur: 3.4 },
  { label: "Work PC Safe",      x: -170, y:  70,  delay: 1.3,  floatY: 6,  floatDur: 3.8 },
  { label: "Full Rollback",     x:  165, y:  80,  delay: 1.45, floatY: -6, floatDur: 3.1 },
  { label: "164 Actions",       x: -120, y:  160, delay: 1.6,  floatY: -5, floatDur: 3.5 },
  { label: "8 Profiles",        x:  120, y:  160, delay: 1.75, floatY: 7,  floatDur: 3.3 },
  { label: "−34% Boot Time",    x:    0, y: -170, delay: 0.9,  floatY: 5,  floatDur: 3.7 },
  { label: "Zero Telemetry",    x:    0, y:  190, delay: 1.5,  floatY: -6, floatDur: 2.9 },
];

// All pills finish entrance by t=2.0s (delay + 0.5s duration)
// Logo finishes at t=2.0s as well

// ─── Floating Pill ───────────────────────────────────────────────────────────

function Pill({ label, x, y, delay, floatY, floatDur }: typeof PILLS[number]) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: smooth }}
    >
      <motion.div
        animate={{ y: [0, floatY, 0] }}
        transition={{ repeat: Infinity, duration: floatDur, ease: "easeInOut" }}
        className="rounded-full border border-border bg-surface/80 backdrop-blur-sm px-4 py-1.5 whitespace-nowrap"
      >
        <span className="text-[11px] font-medium tracking-wide text-ink-secondary">
          {label}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── Hexagon Mark ────────────────────────────────────────────────────────────

function HexagonMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 1.2, ease: smooth }}
      className="relative"
    >
      {/* Ambient pulse */}
      <motion.div
        animate={{
          opacity: [0.04, 0.1, 0.04],
          scale: [0.92, 1.08, 0.92],
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute inset-[-60px] rounded-full"
        style={{ background: "radial-gradient(circle, #E8254B, transparent 60%)" }}
      />

      <svg width="180" height="180" viewBox="0 0 200 200" fill="none" className="relative">
        {/* Hex outline — draws in */}
        <motion.path
          d="M100 15L175 57.5v85L100 185 25 142.5v-85L100 15z"
          stroke="#E8254B"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1.4, ease: smooth }}
        />

        {/* Hex fill */}
        <motion.path
          d="M100 15L175 57.5v85L100 185 25 142.5v-85L100 15z"
          fill="#E8254B"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        />

        {/* Outer orbital — draws in */}
        <motion.circle
          cx="100" cy="100" r="60"
          stroke="#E8254B"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.25 }}
          transition={{ delay: 0.6, duration: 1.2, ease: smooth }}
        />

        {/* Inner orbital */}
        <motion.circle
          cx="100" cy="100" r="42"
          stroke="#E8254B"
          strokeWidth="0.8"
          fill="none"
          strokeDasharray="4 6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 1, duration: 0.6 }}
        />

        {/* Core — pops in */}
        <motion.circle
          cx="100" cy="100" r="24"
          fill="#E8254B"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5, type: "spring", stiffness: 220, damping: 18 }}
        />

        {/* Core inner ring — standby breathe */}
        <motion.circle
          cx="100" cy="100" r="24"
          stroke="white"
          strokeWidth="0.5"
          fill="none"
          animate={{ r: [24, 27, 24], opacity: [0.3, 0.1, 0.3] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />

        {/* Orbiting dot 1 */}
        <motion.circle
          cx="160" cy="100" r="3"
          fill="#E8254B"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0.8, 0.3] }}
          transition={{ delay: 1.3, duration: 0.5 }}
        />
        <motion.circle
          cx="160" cy="100" r="3"
          fill="#E8254B"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
          className="opacity-60"
        />

        {/* Orbiting dot 2 — counter direction */}
        <motion.circle
          cx="40" cy="100" r="2.5"
          fill="#E8254B"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
          className="opacity-30"
        />

        {/* Accent tick marks */}
        <motion.line x1="142" y1="46" x2="152" y2="40" stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} transition={{ delay: 1.5, duration: 0.3 }} />
        <motion.line x1="48" y1="154" x2="58" y2="160" stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1.6, duration: 0.3 }} />
      </svg>

      {/* Standby: subtle hex rotation */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: [0, 3, -3, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

// ─── Hero Visual Composition ─────────────────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative w-[440px] h-[440px] flex items-center justify-center">
      {/* Center hexagon */}
      <HexagonMark />

      {/* Orbiting pills */}
      {PILLS.map((pill) => (
        <Pill key={pill.label} {...pill} />
      ))}

      {/* Connecting lines — subtle radial lines from center to pill area */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 440 440">
        {PILLS.map((pill, i) => (
          <motion.line
            key={i}
            x1="220" y1="220"
            x2={220 + pill.x * 0.5} y2={220 + pill.y * 0.5}
            stroke="#E8254B"
            strokeWidth="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.06 }}
            transition={{ delay: pill.delay + 0.2, duration: 0.5 }}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 40% 45%, #252529 0%, #1e1e22 100%)" }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 2.5, delay: 0.5 }}
          className="absolute top-[10%] right-[15%] h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 60%)" }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.025 }}
          transition={{ duration: 3, delay: 1 }}
          className="absolute bottom-[5%] left-[5%] h-[400px] w-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 55%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center min-h-[80vh]">
          {/* Left — Copy */}
          <div className="pt-16 lg:pt-0">
            <h1
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
              className="font-bold tracking-[-0.045em] leading-[0.98]"
            >
              <motion.span
                className="block text-ink-primary"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.15, duration: 1, ease }}
              >
                F*ck Windows.
              </motion.span>
              <motion.span
                className="block bg-gradient-to-r from-accent via-[#FF3860] to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.3, duration: 1, ease }}
              >
                Make it usable.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-ink-secondary"
            >
              redcore turns a bloated install into a system that actually fits
              the machine, the workload, and the user. Guided. Reversible.
              Machine-aware.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7, ease }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              <motion.button
                onClick={() => scrollTo("pricing")}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-[0.92rem] font-semibold text-white cursor-pointer relative overflow-hidden"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <Download className="h-4 w-4" />
                Get redcore
              </motion.button>
              <motion.button
                onClick={() => scrollTo("products")}
                className="inline-flex items-center gap-2 px-4 py-4 text-[0.92rem] font-medium text-ink-tertiary transition-colors hover:text-ink-primary cursor-pointer"
                whileHover={{ y: -1 }}
              >
                See what it does
                <motion.span
                  animate={{ y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <ArrowDown className="h-4 w-4" />
                </motion.span>
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="mt-14 flex items-center gap-8"
            >
              {["Windows 10 & 11", "100% reversible", "No subscription"].map((t, i) => (
                <span key={t} className="flex items-center gap-3 text-[0.7rem] font-mono font-medium tracking-wider text-ink-muted">
                  {i > 0 && <span className="h-3 w-px bg-border" />}
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — Hexagon + pills constellation */}
          <div className="hidden lg:flex items-center justify-center">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
