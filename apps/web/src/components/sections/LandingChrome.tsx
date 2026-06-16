"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export function LandingChrome() {
  return null;
}

export function SectionSeparator({
  label,
  note,
}: {
  label: string;
  note: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const reduceMotion = useReducedMotion();

  return (
    <div ref={ref} className="relative mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-16 2xl:px-24">
      <div className="flex items-center gap-3 py-8 lg:py-12">
        <motion.div
          className="h-px flex-1 bg-gradient-to-r from-transparent via-border/80 to-transparent"
          initial={reduceMotion ? false : { scaleX: 0, originX: 0 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ delay: 0.05, duration: 0.9, ease }}
        />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.1, duration: 0.55, ease }}
          className="relative overflow-hidden rounded-full border border-border/70 bg-surface/90 px-4 py-2 shadow-lg shadow-black/10 backdrop-blur-md"
        >
          {!reduceMotion && (
            <motion.span
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ opacity: [0.3, 0.9, 0.3], scaleX: [0.9, 1, 0.9] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] font-mono font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-secondary)]">
              {label}
            </span>
            <span className="text-[0.62rem] text-[var(--text-disabled)]">{note}</span>
          </div>
        </motion.div>

        <motion.div
          className="h-px flex-1 bg-gradient-to-l from-transparent via-border/80 to-transparent"
          initial={reduceMotion ? false : { scaleX: 0, originX: 1 }}
          animate={inView ? { scaleX: 1 } : {}}
          transition={{ delay: 0.05, duration: 0.9, ease }}
        />
      </div>
    </div>
  );
}
