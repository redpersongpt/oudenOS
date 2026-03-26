"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, Layers, ChevronRight, Download } from "lucide-react";
import { staggerContainer, staggerChild, duration, easing } from "@/lib/motion";

export function EcosystemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  return (
    <section id="ecosystem" className="relative">
      <div className="section-divide" aria-hidden="true" />

      <div ref={ref} className="mx-auto max-w-7xl px-6 py-16 md:py-20 lg:px-8 lg:py-24">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mb-14"
        >
          <motion.h2
            variants={staggerChild}
            className="text-4xl md:text-5xl font-bold tracking-tight text-ink-primary"
          >
            Two precision instruments.
          </motion.h2>
          <motion.p
            variants={staggerChild}
            className="text-4xl md:text-5xl font-light tracking-tight text-ink-secondary mt-1"
          >
            One coherent system.
          </motion.p>
        </motion.div>

        {/* Two product cards */}
        <motion.div
          variants={staggerContainer(0.15, 0.1)}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* ─── redcore · Tuning ─── */}
          <motion.div variants={staggerChild} className="premium-card rounded-lg p-8">
            <div className="flex items-center gap-3 mb-2">
              <Activity size={18} className="text-brand-500" />
              <h3 className="text-xl font-semibold text-ink-primary">redcore · Tuning</h3>
            </div>
            <p className="text-[14px] text-ink-secondary mb-5">
              Wizard-led tuning that profiles your hardware, builds a confidence-rated plan,
              and validates every change with before/after benchmarks.
            </p>

            <ul className="flex flex-col gap-2 mb-6">
              {["Wizard-guided optimization", "Benchmark-validated results", "Rollback-safe execution"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ChevronRight size={13} className="text-brand-500 shrink-0" />
                  <span className="text-[13px] text-ink-primary">{item}</span>
                </li>
              ))}
            </ul>

            {/* Pricing + CTA */}
            <div className="border-t border-border-default pt-5 mt-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[12px] text-ink-tertiary uppercase tracking-wider">Free version available</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[13px] text-ink-secondary">Premium:</span>
                    <span className="text-lg font-bold text-ink-primary" style={{ fontVariantNumeric: "tabular-nums" }}>$12.99</span>
                    <span className="text-[13px] text-ink-tertiary">one-time</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 text-[13px] font-medium rounded-lg text-ink-primary cursor-pointer border border-border-default hover:border-border-strong transition-colors">
                  <Download size={14} />
                  Free Download
                </button>
                <button className="flex-1 inline-flex items-center justify-center h-10 px-4 text-[13px] font-medium rounded-lg text-white cursor-pointer bg-brand-500 hover:bg-brand-600 transition-colors">
                  Buy License
                </button>
              </div>
            </div>
          </motion.div>

          {/* ─── redcore · OS ─── */}
          <motion.div variants={staggerChild} className="premium-card rounded-lg p-8 relative">
            {/* Free badge */}
            <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-500 text-[11px] font-medium uppercase tracking-wider">
              Free
            </span>

            <div className="flex items-center gap-3 mb-2">
              <Layers size={18} className="text-ink-secondary" />
              <h3 className="text-xl font-semibold text-ink-primary">redcore · OS</h3>
            </div>
            <p className="text-[14px] text-ink-secondary mb-5">
              Profile-aware system reduction, staged cleanup, and Work PC preservation.
              Transform your existing installation without reinstalling.
            </p>

            <ul className="flex flex-col gap-2 mb-6">
              {["In-place transformation", "Work PC preservation", "150+ reversible actions"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ChevronRight size={13} className="text-ink-tertiary shrink-0" />
                  <span className="text-[13px] text-ink-primary">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="border-t border-border-default pt-5 mt-auto">
              <div className="mb-4">
                <span className="text-[12px] text-brand-500 uppercase tracking-wider font-medium">
                  Completely free &amp; open source
                </span>
                <p className="text-[13px] text-ink-tertiary mt-0.5">Forever, for everyone</p>
              </div>
              <button className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 text-[13px] font-medium rounded-lg text-white cursor-pointer bg-brand-500 hover:bg-brand-600 transition-colors">
                <Download size={14} />
                Download redcore · OS
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
