"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// Types

interface ContrastRow {
  before: string;
  after: string;
}

// Data

const contrastRows: ContrastRow[] = [
  { before: "One-size-fits-all", after: "Hardware-based profiling" },
  { before: "No rollback safety", after: "Snapshot-backed rollback" },
  { before: "Aggressive & blind", after: "Confidence-gated actions" },
  { before: "Settings dump", after: "Guided wizard journey" },
];

// Contrast Bar

function ContrastBar({ row, index }: { row: ContrastRow; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{
        duration: duration.slow,
        ease: easing.enter,
        delay: 0.15 + index * 0.1,
      }}
      className="flex rounded-lg border border-border-default overflow-hidden"
      role="listitem"
    >
      {/* Before */}
      <div className="flex-1 flex items-center gap-3 bg-surface px-5 py-4">
        <X
          size={14}
          className="text-ink-tertiary flex-shrink-0"
          aria-hidden="true"
        />
        <span className="text-[14px] text-ink-tertiary">{row.before}</span>
      </div>

      {/* Divider + arrow */}
      <div
        className="flex items-center justify-center w-10 bg-surface-overlay"
        aria-hidden="true"
      >
        <ArrowRight size={12} className="text-brand-500" />
      </div>

      {/* After */}
      <div className="flex-1 flex items-center gap-3 bg-surface-raised px-5 py-4">
        <Check
          size={14}
          className="text-brand-500 flex-shrink-0"
          aria-hidden="true"
        />
        <span className="text-[14px] text-ink-primary">{row.after}</span>
      </div>
    </motion.div>
  );
}

// Component

export function WhyRedcoreSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      id="why"
      className="relative"
      aria-labelledby="why-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-6 py-28 md:py-36 lg:px-8 lg:py-44">
        {/* Two-column asymmetric layout */}
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[40fr_60fr] lg:gap-20 items-start">
          {/* Left column — editorial */}
          <motion.div
            variants={staggerContainer(0.12, 0)}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <motion.h2
              id="why-heading"
              variants={staggerChild}
              className="text-4xl md:text-5xl font-bold text-ink-primary leading-[1.1]"
            >
              Most tools guess.
            </motion.h2>

            <motion.p
              variants={staggerChild}
              className="text-4xl md:text-5xl font-bold leading-[1.1] mt-1"
            >
              <span className="text-ink-primary">We understand.</span>
            </motion.p>

            <motion.p
              variants={staggerChild}
              className="mt-8 text-[16px] leading-relaxed text-ink-secondary max-w-md"
            >
              Generic optimization tools apply the same aggressive tweaks to
              every machine &mdash; no hardware profiling, no safety net, no
              understanding of what makes your system unique. redcore starts by
              learning your machine, then builds a confidence-rated plan before
              touching a single setting.
            </motion.p>
          </motion.div>

          {/* Right column — contrast visualization */}
          <div
            className="flex flex-col gap-4"
            role="list"
            aria-label="Comparison between generic tools and redcore approach"
          >
            {contrastRows.map((row, i) => (
              <ContrastBar key={row.before} row={row} index={i} />
            ))}
          </div>
        </div>

        {/* Closing statement */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.8,
          }}
          className="mt-16 text-[17px] text-ink-secondary italic max-w-3xl"
        >
          redcore understands your machine before it touches a single setting.
        </motion.p>
      </div>
    </section>
  );
}
