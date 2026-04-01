"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, Download } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const ease = [0.16, 1, 0.3, 1] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

// ─── Dot Grid Background ────────────────────────────────────────────────────

function DotGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#f0f0f4" />
        </pattern>
        <radialGradient id="dots-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="dots-mask">
          <rect width="100%" height="100%" fill="url(#dots-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" mask="url(#dots-mask)" />
    </svg>
  );
}

// ─── Pills — positioned around hex, CSS float (no React stutter) ────────────

const PILLS = [
  { label: "Debloat",            angle: 270, r: 148 },
  { label: "Better Frame Times", angle: 336, r: 152 },
  { label: "No Input Lag",       angle: 42,  r: 148 },
  { label: "Privacy Hardened",   angle: 108, r: 152 },
  { label: "Full Rollback",      angle: 174, r: 148 },
  { label: "Work PC Safe",       angle: 222, r: 152 },
];

function Pill({ label, angle, r, i }: { label: string; angle: number; r: number; i: number }) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * r;
  const y = Math.sin(rad) * r;

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      transition={{
        delay: 0.6 + i * 0.12,
        duration: 1.2,
        ease,
      }}
    >
      <div
        className="pill-float rounded-full border border-accent/15 bg-surface/90 backdrop-blur-md px-4 py-1.5 whitespace-nowrap shadow-lg shadow-black/20"
        style={{ animationDelay: `${i * 0.4}s` }}
      >
        <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-ink-primary/80">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Hexagon ─────────────────────────────────────────────────────────────────

function HexagonMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: 0.15, duration: 1.4, ease }}
      className="relative hex-breathe"
    >
      {/* Ambient glow */}
      <div className="absolute inset-[-90px] rounded-full hex-glow" style={{ background: "radial-gradient(circle, #E8254B, transparent 55%)" }} />

      <svg width="260" height="260" viewBox="0 0 260 260" fill="none" className="relative">
        {/* Hex outline */}
        <motion.path
          d="M130 18L228 74.5v113L130 244 32 187.5v-113L130 18z"
          stroke="url(#hg)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
        />
        {/* Hex fill */}
        <motion.path
          d="M130 18L228 74.5v113L130 244 32 187.5v-113L130 18z"
          fill="url(#hf)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        />
        {/* Outer orbit */}
        <motion.circle cx="130" cy="131" r="80" stroke="#E8254B" strokeWidth="1" fill="none"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.2 }}
          transition={{ delay: 0.4, duration: 1.4, ease: [0.4, 0, 0.2, 1] }} />
        {/* Inner orbit — CSS spin */}
        <circle cx="130" cy="131" r="56" stroke="#E8254B" strokeWidth="0.6" fill="none"
          strokeDasharray="3 8" className="opacity-[0.1] orbit-spin" />
        {/* Core */}
        <motion.circle cx="130" cy="131" r="34" fill="url(#cg)"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6, type: "spring", stiffness: 180, damping: 16 }} />
        {/* Core breathe ring */}
        <circle cx="130" cy="131" r="34" stroke="white" strokeWidth="0.8" fill="none" className="core-breathe" />
        {/* Core shimmer */}
        <circle cx="130" cy="131" r="18" fill="white" className="core-shimmer" />
        {/* Orbiting dot CW */}
        <g className="orbit-cw" style={{ transformOrigin: "130px 131px" }}>
          <circle cx="210" cy="131" r="3" fill="#E8254B" className="opacity-60" />
        </g>
        {/* Orbiting dot CCW */}
        <g className="orbit-ccw" style={{ transformOrigin: "130px 131px" }}>
          <circle cx="50" cy="131" r="2" fill="#E8254B" className="opacity-25" />
        </g>
        {/* Tick marks */}
        <motion.line x1="186" y1="56" x2="198" y2="49" stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.3, duration: 0.4 }} />
        <motion.line x1="62" y1="206" x2="74" y2="213" stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1.5, duration: 0.4 }} />
        <defs>
          <linearGradient id="hg" x1="32" y1="18" x2="228" y2="244">
            <stop offset="0%" stopColor="#E8254B" /><stop offset="50%" stopColor="#FF3860" /><stop offset="100%" stopColor="#E8254B" />
          </linearGradient>
          <radialGradient id="hf" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8254B" stopOpacity="0.08" /><stop offset="100%" stopColor="#E8254B" stopOpacity="0.02" />
          </radialGradient>
          <radialGradient id="cg" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FF3860" /><stop offset="100%" stopColor="#E8254B" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

function HeroVisual() {
  return (
    <div className="relative w-[420px] h-[420px] xl:w-[460px] xl:h-[460px] flex items-center justify-center">
      <HexagonMark />
      {PILLS.map((p, i) => <Pill key={p.label} {...p} i={i} />)}
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax: content drifts up and fades as user scrolls
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const visualOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Base gradient */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 42% 45%, #28282d 0%, #1e1e22 100%)" }} />

        {/* Dot grid */}
        <DotGrid />

        {/* Diagonal decorative lines — left */}
        <svg className="absolute left-[5%] top-[15%] opacity-[0.04]" width="200" height="400" viewBox="0 0 200 400">
          {[0,1,2,3,4,5].map(i => (
            <motion.line key={i} x1={30+i*28} y1="0" x2={0+i*28} y2="400" stroke="#f0f0f4" strokeWidth="0.8"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.5 + i*0.15, duration: 1.5, ease }} />
          ))}
        </svg>
        {/* Diagonal decorative lines — right */}
        <svg className="absolute right-[5%] top-[20%] opacity-[0.04]" width="200" height="400" viewBox="0 0 200 400">
          {[0,1,2,3,4,5].map(i => (
            <motion.line key={i} x1={170-i*28} y1="0" x2={200-i*28} y2="400" stroke="#f0f0f4" strokeWidth="0.8"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.5 + i*0.15, duration: 1.5, ease }} />
          ))}
        </svg>

        {/* Red ambient blooms */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.07 }} transition={{ duration: 3, delay: 0.3 }}
          className="absolute top-[5%] right-[10%] h-[700px] w-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 55%)" }} />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.03 }} transition={{ duration: 3, delay: 1 }}
          className="absolute bottom-[0%] left-[5%] h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 50%)" }} />

        {/* Horizontal accent line at the bottom of hero */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, #E8254B 30%, #FF3860 50%, #E8254B 70%, transparent 100%)" }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.3 }}
          transition={{ delay: 1.8, duration: 1.2, ease }}
        />
      </div>

      {/* Main content with parallax */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-16 2xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center min-h-[85vh]">

          {/* ── Left: text ── */}
          <motion.div
            className="pt-20 lg:pt-0"
            style={{ y: contentY, opacity: contentOpacity }}
          >
            {/* Pre-badge */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05, duration: 0.6, ease }}
              className="mb-7 inline-flex items-center gap-2.5"
            >
              <span className="h-px w-8 bg-accent" />
              <span className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent">
                Windows Optimization
              </span>
            </motion.div>

            <h1 style={{ fontSize: "clamp(2.8rem, 5.5vw, 5.2rem)" }} className="font-bold tracking-[-0.045em] leading-[0.96]">
              <motion.span className="block text-ink-primary"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.1, duration: 1, ease }}>
                We Hate W*ndows,
              </motion.span>
              <motion.span className="block bg-gradient-to-r from-accent via-[#FF3860] to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.25, duration: 1, ease }}>
                And You Should Too.
              </motion.span>
            </h1>

            <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.8, ease }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-ink-secondary">
              Fed up with bloated debloaters and broken scripts?
              redcore gives Windows the clean pass it should have had.
              <span className="block mt-3 text-[0.9rem] leading-[1.7] text-ink-tertiary">
                We all want better FPS. Nobody wants a broken install.
              </span>
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7, ease }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <motion.button onClick={() => scrollTo("pricing")}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-[0.92rem] font-semibold text-white cursor-pointer relative overflow-hidden shadow-lg shadow-accent/25"
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <Download className="h-4 w-4" />
                Get redcore
              </motion.button>
              <motion.a href="https://github.com/redpersongpt/redcoreOS" target="_blank" rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-4 text-[0.92rem] font-medium text-ink-secondary transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-ink-primary cursor-pointer backdrop-blur-sm"
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <GithubIcon className="h-4 w-4" />
                <span>View on GitHub</span>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold text-accent">Open Source</span>
              </motion.a>
            </motion.div>

            {/* Trust signals */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 1 }}
              className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3">
              {["Open Source", "Windows 10 & 11", "Every change undoable", "No subscription"].map((t, i) => (
                <span key={t} className="flex items-center gap-3 text-[0.7rem] font-mono font-medium tracking-wider text-ink-muted">
                  {i > 0 && <span className="h-3 w-px bg-accent/20" />}
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* ── Right: visual ── */}
          <motion.div
            className="hidden lg:flex items-center justify-center"
            style={{ y: visualY, opacity: visualOpacity }}
          >
            <HeroVisual />
          </motion.div>
        </div>
      </div>

      {/* Scroll cue — only visible above fold */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        style={{ opacity: contentOpacity }}
      >
        <motion.div
          className="w-px h-8 bg-gradient-to-b from-accent/40 to-transparent"
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
