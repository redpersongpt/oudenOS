"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Download } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

// Dot Grid Background

function DotGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none"
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

// Static technical grid composition for right side

function TechnicalComposition() {
  const size = 96;

  return (
    <div className="relative flex items-center justify-center w-[320px] h-[320px]">
      {/* Outer alignment lines */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Horizontal rule top */}
        <div className="absolute top-[20%] left-0 right-0 h-px bg-[#222222]" />
        {/* Horizontal rule bottom */}
        <div className="absolute bottom-[20%] left-0 right-0 h-px bg-[#222222]" />
        {/* Vertical rule left */}
        <div className="absolute left-[20%] top-0 bottom-0 w-px bg-[#222222]" />
        {/* Vertical rule right */}
        <div className="absolute right-[20%] top-0 bottom-0 w-px bg-[#222222]" />
        {/* Corner crosshair TL */}
        <div className="absolute top-[20%] left-[20%] w-3 h-px bg-[#E8254B]/50 -translate-y-px" />
        <div className="absolute top-[20%] left-[20%] w-px h-3 bg-[#E8254B]/50" />
        {/* Corner crosshair TR */}
        <div className="absolute top-[20%] right-[20%] w-3 h-px bg-[#E8254B]/50 -translate-y-px" />
        <div className="absolute top-[20%] right-[20%] w-px h-3 bg-[#E8254B]/50 right-0" style={{ right: "20%" }} />
        {/* Corner crosshair BL */}
        <div className="absolute bottom-[20%] left-[20%] w-3 h-px bg-[#E8254B]/50" />
        <div className="absolute bottom-[20%] left-[20%] w-px h-3 bg-[#E8254B]/50 bottom-0" style={{ bottom: "20%" }} />
        {/* Corner crosshair BR */}
        <div className="absolute bottom-[20%] right-[20%] w-3 h-px bg-[#E8254B]/50" />
        <div className="absolute bottom-[20%] right-[20%] w-px h-3 bg-[#E8254B]/50 bottom-0" style={{ bottom: "20%" }} />
      </div>

      {/* Central mark — open ring + accent dot */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
        className="relative"
      >
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path
            d="M 82.14 66.08 A 32 32 0 1 1 77.1 39.9"
            stroke="#E8E8E8"
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="77.1" cy="39.9" r={4.5} fill="#E8254B" />
        </svg>
      </motion.div>

      {/* Status readout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.4 }}
        className="absolute bottom-[calc(20%+8px)] left-[calc(20%+8px)] right-[calc(20%+8px)]"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#444444]">SYS</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#E8254B]">READY</span>
        </div>
      </motion.div>

      {/* Coordinate labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut", delay: 0.5 }}
        className="absolute top-[calc(20%+4px)] left-[calc(20%+4px)]"
      >
        <span className="font-mono text-[8px] text-[#333333]">0,0</span>
      </motion.div>
    </div>
  );
}

// Hero Section

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[#000000]"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Dot grid */}
        <DotGrid />

        {/* Diagonal decorative lines — left */}
        <svg className="absolute left-[5%] top-[15%] opacity-[0.04]" width="200" height="400" viewBox="0 0 200 400">
          {[0,1,2,3,4,5].map(i => (
            <motion.line key={i} x1={30+i*28} y1="0" x2={0+i*28} y2="400" stroke="#f0f0f4" strokeWidth="0.8"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i*0.1, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }} />
          ))}
        </svg>
        {/* Diagonal decorative lines — right */}
        <svg className="absolute right-[5%] top-[20%] opacity-[0.04]" width="200" height="400" viewBox="0 0 200 400">
          {[0,1,2,3,4,5].map(i => (
            <motion.line key={i} x1={170-i*28} y1="0" x2={200-i*28} y2="400" stroke="#f0f0f4" strokeWidth="0.8"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i*0.1, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }} />
          ))}
        </svg>

        {/* Bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-[#1A1A1A]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-16 2xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center min-h-[85vh]">

          {/* Left: text */}
          <motion.div
            className="pt-20 lg:pt-0"
            style={{ opacity: contentOpacity }}
          >
            {/* Pre-badge */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05, duration: 0.25, ease: "easeOut" }}
              className="mb-7 inline-flex items-center gap-2.5"
            >
              <span className="h-px w-8 bg-[#E8254B]" />
              <span className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[#E8254B]">
                Windows Optimization
              </span>
            </motion.div>

            <h1 className="font-bold leading-[0.96]" style={{ fontSize: "clamp(2.8rem, 5.5vw, 5.2rem)" }}>
              <motion.span
                className="block text-[var(--color-ink-primary)] tracking-[-0.045em]"
                style={{ fontFamily: "var(--font-doto), monospace" }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25, ease: "easeOut" }}
              >
                YOUR SYSTEM.
              </motion.span>
              <motion.span
                className="block tracking-[-0.045em]"
                style={{ color: "#E8254B", fontFamily: "var(--font-doto), monospace" }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
              >
                UNDER CONTROL.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.25, ease: "easeOut" }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-[var(--color-ink-secondary)]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Ouden scans your hardware, builds a profile-specific plan, and applies reversible changes. Free OS optimization + paid Tuning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.25, ease: "easeOut" }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              <button
                onClick={() => scrollTo("pricing")}
                className="inline-flex items-center gap-2.5 rounded-lg bg-[#E8254B] px-8 py-4 text-[0.92rem] font-semibold text-white cursor-pointer transition-colors duration-200 hover:bg-[#C41E3E]"
              >
                <Download className="h-4 w-4" />
                Get Ouden
              </button>
              <a
                href="https://github.com/redpersongpt/redcoreOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-lg border border-[#333333] px-6 py-4 text-[0.92rem] font-medium text-[var(--color-ink-secondary)] transition-colors duration-200 hover:border-[#444444] hover:text-[var(--color-ink-primary)] cursor-pointer"
              >
                <GithubIcon className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.25, ease: "easeOut" }}
              className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              {["OPEN SOURCE", "WIN 10 & 11", "SNAPSHOTS", "NO SUBSCRIPTION"].map((t, i) => (
                <span key={t} className="flex items-center gap-3 text-[0.65rem] font-mono font-medium tracking-[0.12em] text-[var(--color-ink-tertiary)]">
                  {i > 0 && <span className="h-3 w-px bg-[#E8254B]" />}
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: static technical composition */}
          <motion.div
            className="hidden lg:flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
            style={{ opacity: contentOpacity }}
          >
            <TechnicalComposition />
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.25, ease: "easeOut" }}
        style={{ opacity: contentOpacity }}
      >
        <span className="font-mono text-[var(--color-ink-tertiary)] text-xs">↓</span>
      </motion.div>
    </section>
  );
}
