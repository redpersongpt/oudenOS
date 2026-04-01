"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Activity, Cpu, Zap, BarChart3, ShieldCheck, Settings } from "lucide-react";
import { duration, easing } from "@/lib/motion";

const features = [
  { icon: Activity, title: "Scans your hardware", desc: "Deep hardware and software analysis before any changes" },
  { icon: Cpu, title: "15+ tuning modules", desc: "CPU, GPU, memory, storage, network, display, audio, and more" },
  { icon: BarChart3, title: "Benchmark validation", desc: "Before/after performance comparison for every session" },
  { icon: ShieldCheck, title: "Rollback safety", desc: "Complete snapshots before every change, one-click restore" },
  { icon: Zap, title: "Wizard-guided flow", desc: "Step-by-step optimization — scan, profile, plan, execute, verify" },
  { icon: Settings, title: "BIOS guidance", desc: "Profile-aware firmware recommendations for advanced users" },
];

export function TuningProductSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} id="tuning" className="relative py-16 md:py-20 lg:py-24">
      <div className="section-divide" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-start">
          {/* Left — Product info */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: duration.slow, ease: easing.enter }}
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                redcore · Tuning
              </h2>
              <p className="mt-4 text-lg text-ink-secondary max-w-xl">
                Guided machine optimization with benchmark-driven validation.
                Every step wizard-led, every change reversible.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: duration.slow, ease: easing.enter, delay: 0.15 }}
              className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8"
            >
              {features.map((f) => (
                <div key={f.title} className="flex gap-3">
                  <f.icon size={18} className="text-ink-tertiary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[15px] font-medium text-ink-primary">{f.title}</p>
                    <p className="text-[13px] text-ink-secondary mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Pricing card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: duration.slow, ease: easing.enter, delay: 0.2 }}
            className="premium-card rounded-lg p-8 lg:sticky lg:top-28"
          >
            <p className="text-[13px] font-medium text-ink-tertiary uppercase tracking-wider">Premium License</p>

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-ink-primary" style={{ fontVariantNumeric: "tabular-nums" }}>
                $12.99
              </span>
            </div>
            <p className="text-[13px] text-ink-tertiary mt-1">one-time purchase, per machine</p>

            <div className="mt-6 space-y-3">
              {[
                "All 8 machine profiles",
                "15+ tuning modules",
                "Benchmark lab",
                "BIOS guidance",
                "Unlimited rollback history",
                "Lifetime license key",
                "Priority support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-brand-500 shrink-0">
                    <path d="M3.5 7L6 9.5L10.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[14px] text-ink-primary">{item}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-8 w-full inline-flex items-center justify-center h-12 px-8 text-[14px] font-medium rounded-lg text-white cursor-pointer transition-colors duration-200 bg-brand-500 hover:bg-brand-600"
            >
              Buy License
            </button>

            <p className="mt-3 text-center text-[12px] text-ink-tertiary">
              Free tier available with core modules
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
