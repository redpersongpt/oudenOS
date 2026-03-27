"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden pb-24 lg:pb-32">
      {/* Atmospheric depth */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, #0c0c10 0%, #060608 100%)",
          }}
        />
        <div
          className="absolute top-[20%] right-[10%] h-[400px] w-[400px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #E8453C, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 lg:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.14em] text-ink-tertiary mb-8"
        >
          Windows performance ecosystem
        </motion.p>

        <h1
          style={{ fontSize: "clamp(2.6rem, 5.5vw, 5rem)" }}
          className="font-bold tracking-[-0.04em] leading-[1.02] max-w-[900px]"
        >
          <motion.span
            className="block text-ink-primary"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease }}
          >
            Know what your machine
          </motion.span>
          <motion.span
            className="block text-ink-primary"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.9, ease }}
          >
            needs.{" "}
            <span className="text-accent">Then do it.</span>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7, ease }}
          className="mt-8 max-w-[520px] text-[1.05rem] leading-[1.75] text-ink-secondary"
        >
          redcore reads your hardware, detects your use case, and builds a
          transformation plan specific to your system. Not presets.
          Not scripts. A guided, reversible process.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease }}
          className="mt-12 flex flex-col sm:flex-row items-start gap-4"
        >
          <a
            href="#pricing"
            className="inline-flex items-center gap-2.5 rounded-lg bg-accent px-7 py-3.5 text-[0.88rem] font-semibold text-white transition-all hover:bg-accent-dim"
          >
            Get redcore
          </a>
          <a
            href="#products"
            className="inline-flex items-center gap-2 px-2 py-3.5 text-[0.88rem] font-medium text-ink-tertiary transition-colors hover:text-ink-primary"
          >
            See what it does
            <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-20 flex items-center gap-8 text-[0.7rem] font-mono font-medium tracking-wide text-ink-muted"
        >
          <span>Windows 10 & 11</span>
          <span className="h-3 w-px bg-border" />
          <span>100% reversible</span>
          <span className="h-3 w-px bg-border" />
          <span>No subscription</span>
        </motion.div>
      </div>
    </section>
  );
}
