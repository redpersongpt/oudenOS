"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Cpu, Shield, Wand2, Gauge, RotateCcw, Monitor } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

type RailItem = {
  label: string;
  note: string;
  icon: typeof Cpu;
};

const leftRail: RailItem[] = [
  { label: "Machine-aware", note: "Scan before you touch", icon: Cpu },
  { label: "Rollback", note: "Snapshots built in", icon: RotateCcw },
  { label: "Privacy", note: "Tight by default", icon: Shield },
];

const rightRail: RailItem[] = [
  { label: "Latency", note: "Tuned for feel", icon: Gauge },
  { label: "Layered", note: "OS + Tuning", icon: Wand2 },
  { label: "Windows", note: "Your install, refined", icon: Monitor },
];

function SideRail({
  side,
  items,
}: {
  side: "left" | "right";
  items: RailItem[];
}) {
  const reduceMotion = useReducedMotion();
  const alignClass = side === "left" ? "items-start" : "items-end";
  const cardAlignClass = side === "left" ? "text-left" : "text-right";
  const iconAlignClass = side === "left" ? "justify-start" : "justify-end";

  return (
    <div
      className={[
        "pointer-events-none fixed inset-y-24 hidden 2xl:flex w-52 flex-col justify-between",
        side === "left" ? "left-6" : "right-6",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border/80 to-transparent" />
      <div className="relative flex h-full flex-col justify-between py-2">
        {items.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: side === "left" ? -18 : 18, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              delay: 0.45 + index * 0.12,
              duration: 0.7,
              ease,
            }}
            className={`flex ${alignClass}`}
          >
            <div
              className={[
                "w-[170px] rounded-[1.2rem] border border-border/70 bg-surface/80 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-md",
                cardAlignClass,
              ].join(" ")}
            >
              <div
                className={[
                  "mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface-raised/80",
                  iconAlignClass,
                ].join(" ")}
              >
                <item.icon className="h-3.5 w-3.5 text-accent" />
              </div>
              <p className="text-[0.8rem] font-semibold text-ink-primary">
                {item.label}
              </p>
              <p className="mt-1 text-[0.66rem] leading-[1.5] text-ink-tertiary">
                {item.note}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      {!reduceMotion && (
        <motion.div
          className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export function LandingChrome() {
  return (
    <>
      <SideRail side="left" items={leftRail} />
      <SideRail side="right" items={rightRail} />
    </>
  );
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
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent"
              animate={{ opacity: [0.3, 0.9, 0.3], scaleX: [0.9, 1, 0.9] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <div className="flex items-center gap-2">
            <span className="text-[0.62rem] font-mono font-semibold uppercase tracking-[0.2em] text-accent">
              {label}
            </span>
            <span className="text-[0.62rem] text-ink-muted">{note}</span>
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
