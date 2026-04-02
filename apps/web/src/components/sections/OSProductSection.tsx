"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Layers, Shield, Briefcase, HardDrive, RefreshCw, Paintbrush } from "lucide-react";
import { duration, easing } from "@/lib/motion";

const features = [
  { icon: Layers, title: "In-place optimization", desc: "Reshape your current Windows — no ISO, no reinstall, no data loss" },
  { icon: Shield, title: "250 reversible actions", desc: "Staged cleanup across services, tasks, privacy, startup, and more" },
  { icon: Briefcase, title: "Work PC preservation", desc: "Print Spooler, RDP, SMB, Group Policy, VPN — automatically protected" },
  { icon: HardDrive, title: "8 machine profiles", desc: "Gaming, workstation, office, laptop, low-spec — each gets a different path" },
  { icon: RefreshCw, title: "Full rollback", desc: "Every change creates a snapshot, every action is reversible" },
  { icon: Paintbrush, title: "Visual personalization", desc: "Optional dark mode, accent system, taskbar, and Explorer cleanup" },
];

export function OSProductSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} id="os" className="relative py-16 md:py-20 lg:py-24">
      <div className="section-divide" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-16 items-start">
          {/* Left — Free badge card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: duration.slow, ease: easing.enter, delay: 0.2 }}
            className="premium-card rounded-lg p-8 lg:sticky lg:top-28"
          >
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-500 text-[11px] font-medium uppercase tracking-wider">
              Open Source
            </span>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-brand-500">Free</span>
            </div>
            <p className="text-[13px] text-[var(--text-disabled)] mt-1">forever, for everyone</p>

            <div className="mt-6 space-y-3">
              {[
                "In-place Windows optimization",
                "All 250 actions",
                "8 machine profiles",
                "Work PC preservation",
                "Full rollback support",
                "Community-driven",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-brand-500 shrink-0">
                    <path d="M3.5 7L6 9.5L10.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[14px] text-[var(--text-primary)]">{item}</span>
                </div>
              ))}
            </div>

            <a
              href="/downloads"
              className="mt-8 w-full inline-flex items-center justify-center h-12 px-8 text-[14px] font-medium rounded-lg text-white cursor-pointer transition-colors duration-200 bg-brand-500 hover:bg-brand-600"
            >
              Download Free
            </a>

            <div className="mt-5 pt-5 border-t border-[var(--border)]">
              <p className="text-[12px] text-[var(--text-disabled)] text-center mb-3">
                Love OudenOS? Support development.
              </p>
              <a
                href="/donate"
                className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-[12px] font-medium rounded-lg text-[var(--text-secondary)] cursor-pointer transition-colors duration-200 border border-[var(--border)] hover:border-[var(--border-visible)] hover:text-[var(--text-primary)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                Support with a Donation
              </a>
            </div>
          </motion.div>

          {/* Right — Product info */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: duration.slow, ease: easing.enter }}
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                OudenOS
              </h2>
              <p className="mt-4 text-lg text-[var(--text-secondary)] max-w-xl">
                In-place Windows optimization. Reshape your current installation
                without reinstalling — guided by machine intelligence, protected by
                rollback safety. Free and open source.
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
                  <f.icon size={18} className="text-[var(--text-disabled)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[15px] font-medium text-[var(--text-primary)]">{f.title}</p>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
