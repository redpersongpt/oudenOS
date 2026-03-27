"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function FinalCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-32 lg:py-44 overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(ellipse, #E8254B, transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[700px] px-6 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease }}
        >
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-[-0.035em] leading-[1.08] text-ink-primary">
            Built for the machines
            <br />
            <span className="bg-gradient-to-r from-accent to-[#FF3860] bg-clip-text text-transparent">
              that matter to you.
            </span>
          </h2>

          <p className="mt-7 mx-auto max-w-[420px] text-[1rem] leading-[1.75] text-ink-secondary">
            Start with OS for free. Go deeper with Tuning when you are
            ready.
          </p>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6, ease }}
          >
            <motion.a
              href="/register"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-[0.92rem] font-semibold text-white relative overflow-hidden"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              Create account
              <ArrowRight className="h-4 w-4" />
            </motion.a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 font-mono text-[0.65rem] text-ink-muted tracking-wider"
          >
            Windows 10 & 11 · No subscription · 100% reversible
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
