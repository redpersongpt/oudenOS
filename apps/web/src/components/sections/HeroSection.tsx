"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowDown, Download } from "lucide-react";
import { useEffect, useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;
const smooth = [0.25, 0.1, 0.25, 1] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function Counter({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(count, value, {
        duration: 1.8,
        ease: [0.16, 1, 0.3, 1],
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [count, value, delay]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v.toString() + suffix;
    });
    return unsubscribe;
  }, [rounded, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─── Orbiting Hexagon Mark ───────────────────────────────────────────────────

function HexagonMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, duration: 1.2, ease: smooth }}
      className="relative"
    >
      {/* Outer glow pulse */}
      <motion.div
        animate={{ opacity: [0.03, 0.08, 0.03], scale: [0.95, 1.05, 0.95] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute inset-[-40px] rounded-full"
        style={{ background: "radial-gradient(circle, #E8254B, transparent 65%)" }}
      />

      <svg width="200" height="200" viewBox="0 0 200 200" fill="none" className="relative">
        {/* Hex outline */}
        <motion.path
          d="M100 15L175 57.5v85L100 185 25 142.5v-85L100 15z"
          stroke="#E8254B"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.5, ease: smooth }}
        />

        {/* Hex fill */}
        <motion.path
          d="M100 15L175 57.5v85L100 185 25 142.5v-85L100 15z"
          fill="#E8254B"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        />

        {/* Orbital ring */}
        <motion.circle
          cx="100" cy="100" r="55"
          stroke="#E8254B"
          strokeWidth="1.2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.35 }}
          transition={{ delay: 0.8, duration: 1.2, ease: smooth }}
        />

        {/* Inner core */}
        <motion.circle
          cx="100" cy="100" r="28"
          fill="#E8254B"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
        />

        {/* Orbiting dot */}
        <motion.circle
          cx="155" cy="100" r="4"
          fill="#E8254B"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0.5], rotate: 360 }}
          transition={{ delay: 1.5, duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
        />

        {/* Accent notches */}
        <motion.line
          x1="140" y1="48" x2="152" y2="41"
          stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.4, duration: 0.4 }}
        />
        <motion.line
          x1="48" y1="152" x2="60" y2="159"
          stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ delay: 1.6, duration: 0.4 }}
        />
      </svg>
    </motion.div>
  );
}

// ─── System Detection Card ───────────────────────────────────────────────────

function SystemCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.2, duration: 0.9, ease }}
      className="w-[280px] rounded-xl border border-border bg-surface/80 backdrop-blur-sm p-5"
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2.5 mb-4">
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-2 w-2 rounded-full bg-emerald-400"
        />
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-ink-muted">
          System detected
        </span>
      </div>

      {/* Profile */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="text-[1rem] font-bold text-ink-primary"
      >
        Gaming Desktop
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        className="mt-0.5 font-mono text-[10px] text-ink-tertiary"
      >
        94% confidence · Ryzen 9 · RTX 4090
      </motion.p>

      {/* Specs grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {[
          ["CPU", "Ryzen 9 7950X"],
          ["GPU", "RTX 4090"],
          ["RAM", "32 GB DDR5"],
          ["Disk", "2 TB NVMe"],
        ].map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2 + i * 0.12, duration: 0.4, ease }}
          >
            <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-ink-muted">{k}</p>
            <p className="font-mono text-[11px] text-ink-secondary">{v}</p>
          </motion.div>
        ))}
      </div>

      {/* Optimization preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.6, duration: 0.6 }}
        className="mt-4 pt-3 border-t border-border"
      >
        <p className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-accent mb-2">
          Optimization plan
        </p>
        {[
          ["Disable Game DVR", "Safe"],
          ["Tune CPU Scheduler", "Low"],
          ["Reduce Telemetry", "Safe"],
        ].map(([name, risk], i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.8 + i * 0.15, duration: 0.3 }}
            className="flex items-center justify-between py-1"
          >
            <span className="text-[10px] text-ink-secondary">{name}</span>
            <span className={`font-mono text-[9px] font-medium ${risk === "Safe" ? "text-emerald-400" : "text-amber-400"}`}>
              {risk}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Floating Stat Pill ──────────────────────────────────────────────────────

function StatPill({ label, value, suffix, delay, className }: {
  label: string; value: number; suffix: string; delay: number; className: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease }}
      className={`rounded-xl border border-border bg-surface/90 backdrop-blur-sm px-4 py-3 text-center ${className}`}
    >
      <p className="font-mono text-[1.4rem] font-bold text-ink-primary leading-none">
        <Counter value={value} suffix={suffix} delay={delay} />
      </p>
      <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.1em] text-ink-muted">{label}</p>
    </motion.div>
  );
}

// ─── Hero Visual Composition ─────────────────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative w-[420px] h-[460px]">
      {/* Hexagon mark — centered */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <HexagonMark />
      </div>

      {/* System card — bottom left */}
      <div className="absolute bottom-0 left-0">
        <SystemCard />
      </div>

      {/* Stat pills — floating around */}
      <div className="absolute top-2 right-0">
        <StatPill label="Actions" value={164} suffix="" delay={2.2} className="" />
      </div>
      <div className="absolute top-[140px] right-[-10px]">
        <StatPill label="Boot time" value={34} suffix="%" delay={2.5} className="" />
      </div>
      <div className="absolute bottom-[90px] right-[20px]">
        <StatPill label="Profiles" value={8} suffix="" delay={2.8} className="" />
      </div>
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 40% 45%, #252529 0%, #1e1e22 100%)" }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.06 }}
          transition={{ duration: 2.5, delay: 0.5 }}
          className="absolute top-[10%] right-[15%] h-[600px] w-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 60%)" }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.025 }}
          transition={{ duration: 3, delay: 1 }}
          className="absolute bottom-[5%] left-[5%] h-[400px] w-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 55%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-20 items-center min-h-[80vh]">
          {/* Left — Copy */}
          <div className="pt-16 lg:pt-0">
            <h1
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
              className="font-bold tracking-[-0.045em] leading-[0.98]"
            >
              <motion.span
                className="block text-ink-primary"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.15, duration: 1, ease }}
              >
                F*ck Windows.
              </motion.span>
              <motion.span
                className="block bg-gradient-to-r from-accent via-[#FF3860] to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.3, duration: 1, ease }}
              >
                Make it usable.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-ink-secondary"
            >
              redcore turns a bloated install into a system that actually fits
              the machine, the workload, and the user. Guided. Reversible.
              Machine-aware.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7, ease }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              <motion.button
                onClick={() => scrollTo("pricing")}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-[0.92rem] font-semibold text-white cursor-pointer relative overflow-hidden"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                <Download className="h-4 w-4" />
                Get redcore
              </motion.button>
              <motion.button
                onClick={() => scrollTo("products")}
                className="inline-flex items-center gap-2 px-4 py-4 text-[0.92rem] font-medium text-ink-tertiary transition-colors hover:text-ink-primary cursor-pointer"
                whileHover={{ y: -1 }}
              >
                See what it does
                <motion.span
                  animate={{ y: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <ArrowDown className="h-4 w-4" />
                </motion.span>
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 1 }}
              className="mt-14 flex items-center gap-8"
            >
              {["Windows 10 & 11", "100% reversible", "No subscription"].map((t, i) => (
                <span key={t} className="flex items-center gap-3 text-[0.7rem] font-mono font-medium tracking-wider text-ink-muted">
                  {i > 0 && <span className="h-3 w-px bg-border" />}
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — Visual composition */}
          <div className="hidden lg:block">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
