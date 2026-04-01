"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Download } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function FinalCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-32 lg:py-44 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        {/* Center glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[700px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(ellipse, #E8254B, transparent 55%)" }}
        />
        {/* Top edge accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-20"
          style={{ background: "linear-gradient(90deg, transparent 0%, #E8254B 30%, #FF3860 50%, #E8254B 70%, transparent 100%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-[900px] px-6 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease }}
        >
          {/* Overline */}
          <motion.p
            className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.18em] text-accent mb-8"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.05, duration: 0.6 }}
          >
            Get started
          </motion.p>

          <h2 className="text-[clamp(2.2rem,4.5vw,3.6rem)] font-bold tracking-[-0.038em] leading-[1.06] text-ink-primary">
            Built for the machines
            <br />
            <span className="bg-gradient-to-r from-accent to-[#FF3860] bg-clip-text text-transparent">
              that matter to you.
            </span>
          </h2>

          <p className="mt-7 mx-auto max-w-[440px] text-[1rem] leading-[1.75] text-ink-secondary">
            Start with OS for free. Go deeper with Tuning when you are ready.
            No subscription ever.
          </p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6, ease }}
          >
            {/* Primary */}
            <motion.a
              href="/downloads"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-[0.92rem] font-semibold text-white relative overflow-hidden shadow-lg shadow-accent/25"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
              <Download className="h-4 w-4" />
              Download Free
            </motion.a>

            {/* Secondary */}
            <motion.a
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-4 text-[0.88rem] font-medium text-ink-tertiary border border-border rounded-xl hover:border-border-strong hover:text-ink-secondary transition-all duration-200"
              whileHover={{ y: -1 }}
            >
              Create account
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.a>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-10 font-mono text-[0.65rem] text-ink-muted tracking-wider"
          >
            Windows 10 & 11 · No subscription · Every change undoable
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
