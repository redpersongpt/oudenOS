"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  staggerContainer,
  staggerChild,
  heroTextReveal,
  duration,
  easing,
} from "@/lib/motion";

// ─── Main Component ──────────────────────────────────────────────────────────

export function FinalCTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-16 md:py-20 lg:py-24 overflow-hidden"
      aria-label="Call to action"
    >
      <div className="section-divide" aria-hidden="true" />

      {/* ─── Background ─── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="bg-section-glow absolute inset-0" />
        <div className="bg-grid-micro absolute inset-0" />

        {/* Large blurred brand orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-brand-500/[0.03] blur-[120px]"
        />
      </div>

      {/* ─── Content ─── */}
      <motion.div
        variants={staggerContainer(0.12, 0)}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="relative z-10 max-w-3xl mx-auto text-center px-6"
      >
        <motion.h2
          variants={heroTextReveal}
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-ink-primary"
        >
          Take control.
        </motion.h2>

        <motion.p
          variants={staggerChild}
          className="mt-6 text-xl text-ink-secondary"
        >
          Your machine. Your rules. Precisely optimized.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.5,
          }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#ecosystem"
            className="inline-flex items-center gap-1.5 text-[19px] font-medium text-brand-400 cursor-pointer transition-colors duration-200 hover:text-brand-300"
          >
            Download Tuning
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="mt-px"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a
            href="#ecosystem"
            className="inline-flex items-center gap-1.5 text-[19px] font-medium text-ink-secondary cursor-pointer transition-colors duration-200 hover:text-ink-primary"
          >
            Explore the ecosystem
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="mt-px"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.7,
          }}
          className="mt-8 text-[12px] text-ink-tertiary font-mono"
        >
          Free to start. Windows 10/11. No bloatware.
        </motion.p>
      </motion.div>
    </section>
  );
}
