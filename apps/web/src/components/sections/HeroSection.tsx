"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Download } from "lucide-react";
import { HeroScene } from "@/components/ui/HeroScene";

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
      className="relative flex min-h-[100dvh] items-center overflow-hidden bg-transparent"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Dot grid */}
        <DotGrid />

        {/* Diagonal decorative lines -- left */}
        <svg className="absolute left-[5%] top-[15%] opacity-[0.04]" width="200" height="400" viewBox="0 0 200 400">
          {[0,1,2,3,4,5].map(i => (
            <motion.line key={i} x1={30+i*28} y1="0" x2={0+i*28} y2="400" stroke="#f0f0f4" strokeWidth="0.8"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ delay: 0.3 + i*0.1, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }} />
          ))}
        </svg>
        {/* Diagonal decorative lines -- right */}
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

      {/* Main content -- 2-column grid on desktop */}
      <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 sm:px-8 lg:px-16 2xl:px-24">
        <motion.div
          className="pt-24 lg:pt-32 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center gap-12 lg:gap-16"
          style={{ opacity: contentOpacity }}
        >
          {/* Left column -- text content */}
          <div className="max-w-[680px]">
            <h1 className="font-bold leading-[0.96]" style={{ fontSize: "clamp(2.8rem, 5.5vw, 5.2rem)" }}>
              {/* clipPath reveal animation for headlines */}
              <motion.span
                className="block text-[var(--color-ink-primary)] tracking-[-0.045em]"
                style={{ fontFamily: "var(--font-display), monospace" }}
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                YOUR SYSTEM.
              </motion.span>
              <motion.span
                className="block tracking-[-0.045em] text-white"
                style={{ fontFamily: "var(--font-display), monospace" }}
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              >
                UNDER CONTROL.
              </motion.span>
            </h1>

            {/* Body text fades in from left */}
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-[var(--color-ink-secondary)]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Ouden scans your hardware, builds a profile-specific plan, and applies reversible changes. Free OS optimization + paid Tuning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              {/* Get Ouden -- white bg, black text */}
              <motion.button
                onClick={() => scrollTo("pricing")}
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-[0.92rem] font-semibold text-black cursor-pointer transition-colors duration-200 hover:bg-[#E8E8E8]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Download className="h-4 w-4" />
                Get Ouden
              </motion.button>
              <a
                href="https://github.com/redpersongpt/redcoreOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full border border-[#333333] px-6 py-4 text-[0.92rem] font-medium text-[var(--color-ink-secondary)] transition-colors duration-200 hover:border-[#444444] hover:text-[var(--color-ink-primary)] cursor-pointer"
              >
                <GithubIcon className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>
            </motion.div>

            {/* Trust signals with staggered fade-in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.25, ease: "easeOut" }}
              className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              {["OPEN SOURCE", "WIN 10 & 11", "SNAPSHOTS", "NO SUBSCRIPTION"].map((t, i) => (
                <motion.span
                  key={t}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 + i * 0.06, duration: 0.3, ease: "easeOut" }}
                  className="flex items-center gap-3 text-[0.65rem] font-mono font-medium tracking-[0.12em] text-[var(--color-ink-tertiary)]"
                >
                  {i > 0 && <span className="h-3 w-px bg-[#666666]" />}
                  {t}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Right column -- 3D Ouden ring (desktop only) */}
          <motion.div
            className="hidden lg:flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <HeroScene />
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.25, ease: "easeOut" }}
        style={{ opacity: contentOpacity }}
      >
        <span className="font-mono text-[var(--color-ink-tertiary)] text-xs">&darr;</span>
      </motion.div>
    </section>
  );
}
