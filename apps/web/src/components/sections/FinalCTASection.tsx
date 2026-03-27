"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export function FinalCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-32 lg:py-40 overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full opacity-[0.03]"
        style={{
          background: "radial-gradient(ellipse, #E8453C, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[700px] px-6 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease }}
        >
          <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tracking-[-0.03em] leading-[1.1] text-ink-primary">
            Built for the machines
            <br />
            <span className="text-accent">that matter to you.</span>
          </h2>

          <p className="mt-6 mx-auto max-w-[420px] text-[0.95rem] leading-[1.75] text-ink-secondary">
            Start with OS for free. Go deeper with Tuning when you are
            ready.
          </p>

          <div className="mt-10">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 text-[0.88rem] font-semibold text-white transition-all hover:bg-accent-dim"
            >
              Create account
            </a>
          </div>

          <p className="mt-10 font-mono text-[0.65rem] text-ink-muted tracking-wide">
            Windows 10 & 11 · No subscription · 100% reversible
          </p>
        </motion.div>
      </div>
    </section>
  );
}
