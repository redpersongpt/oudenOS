"use client";

import { motion } from "framer-motion";
import { ArrowDown, Download } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;
const smooth = [0.4, 0, 0.2, 1] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

// ─── Pills — 6 only, clean orbit positions ──────────────────────────────────

const PILLS = [
  { label: "Debloat",            angle: 270, radius: 190, delay: 0.8  },
  { label: "Better Frame Times", angle: 330, radius: 195, delay: 1.0  },
  { label: "No Input Lag",       angle: 30,  radius: 190, delay: 1.2  },
  { label: "Privacy Hardened",   angle: 90,  radius: 185, delay: 1.4  },
  { label: "Full Rollback",      angle: 150, radius: 195, delay: 1.1  },
  { label: "Work PC Safe",       angle: 210, radius: 190, delay: 0.9  },
];

function pillPosition(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

// ─── Single Pill ─────────────────────────────────────────────────────────────

function Pill({ label, angle, radius, delay }: typeof PILLS[number]) {
  const { x, y } = pillPosition(angle, radius);
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{ opacity: 1, scale: 1, x, y }}
      transition={{
        delay,
        duration: 1,
        ease,
        opacity: { delay, duration: 0.6 },
        scale: { delay, duration: 0.8, type: "spring", stiffness: 120, damping: 14 },
      }}
    >
      {/* Glow behind pill */}
      <motion.div
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ repeat: Infinity, duration: 3 + Math.random() * 2, ease: "easeInOut" }}
        className="absolute inset-[-8px] rounded-full blur-xl"
        style={{ background: "radial-gradient(circle, rgba(232,37,75,0.2), transparent 70%)" }}
      />
      <motion.div
        animate={{
          y: [0, -4, 0, 3, 0],
          x: [0, 2, 0, -2, 0],
        }}
        transition={{ repeat: Infinity, duration: 6 + Math.random() * 3, ease: "easeInOut" }}
        className="relative rounded-full border border-accent/20 bg-surface/90 backdrop-blur-md px-5 py-2 whitespace-nowrap shadow-lg shadow-accent/5"
      >
        <span className="text-[11px] font-semibold tracking-wide text-ink-primary/80">
          {label}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─── Hexagon Mark — Large ────────────────────────────────────────────────────

function HexagonMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay: 0.2, duration: 1.5, ease }}
      className="relative"
    >
      {/* Ambient glow — large, soft */}
      <motion.div
        animate={{
          opacity: [0.06, 0.14, 0.06],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="absolute inset-[-100px] rounded-full"
        style={{ background: "radial-gradient(circle, #E8254B, transparent 55%)" }}
      />

      {/* Secondary glow ring */}
      <motion.div
        animate={{ opacity: [0.03, 0.07, 0.03] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
        className="absolute inset-[-60px] rounded-full border border-accent/10"
      />

      <svg width="260" height="260" viewBox="0 0 260 260" fill="none" className="relative">
        {/* Outer hex — draws in */}
        <motion.path
          d="M130 18L228 74.5v113L130 244 32 187.5v-113L130 18z"
          stroke="url(#hexGrad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.6, ease: smooth }}
        />

        {/* Hex fill glow */}
        <motion.path
          d="M130 18L228 74.5v113L130 244 32 187.5v-113L130 18z"
          fill="url(#hexFillGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        />

        {/* Outer orbital ring */}
        <motion.circle
          cx="130" cy="131" r="80"
          stroke="#E8254B"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.2 }}
          transition={{ delay: 0.5, duration: 1.4, ease: smooth }}
        />

        {/* Inner dashed orbital */}
        <motion.circle
          cx="130" cy="131" r="56"
          stroke="#E8254B"
          strokeWidth="0.6"
          fill="none"
          strokeDasharray="3 8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        />

        {/* Spinning dashed ring — standby */}
        <motion.circle
          cx="130" cy="131" r="56"
          stroke="#E8254B"
          strokeWidth="0.6"
          fill="none"
          strokeDasharray="3 8"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          style={{ transformOrigin: "130px 131px" }}
          className="opacity-[0.08]"
        />

        {/* Core — spring pop */}
        <motion.circle
          cx="130" cy="131" r="34"
          fill="url(#coreGrad)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 180, damping: 16 }}
        />

        {/* Core inner glow ring — breathe */}
        <motion.circle
          cx="130" cy="131" r="34"
          stroke="white"
          strokeWidth="0.8"
          fill="none"
          animate={{ r: [34, 38, 34], opacity: [0.25, 0.08, 0.25] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        />

        {/* Core shimmer */}
        <motion.circle
          cx="130" cy="131" r="20"
          fill="white"
          animate={{ opacity: [0.08, 0.15, 0.08] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        />

        {/* Orbiting dot — clockwise */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
          style={{ transformOrigin: "130px 131px" }}
        >
          <motion.circle
            cx="210" cy="131" r="3.5"
            fill="#E8254B"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1.5, duration: 0.4 }}
          />
          <motion.circle
            cx="210" cy="131" r="8"
            fill="none"
            stroke="#E8254B"
            strokeWidth="0.5"
            className="opacity-20"
          />
        </motion.g>

        {/* Orbiting dot — counter-clockwise */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
          style={{ transformOrigin: "130px 131px" }}
        >
          <motion.circle
            cx="50" cy="131" r="2.5"
            fill="#E8254B"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 1.8, duration: 0.4 }}
          />
        </motion.g>

        {/* Accent tick marks */}
        <motion.line x1="186" y1="56" x2="198" y2="49" stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.4 }} transition={{ delay: 1.4, duration: 0.4, ease }} />
        <motion.line x1="62" y1="206" x2="74" y2="213" stroke="#E8254B" strokeWidth="1.5" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.2 }} transition={{ delay: 1.6, duration: 0.4, ease }} />

        {/* Gradients */}
        <defs>
          <linearGradient id="hexGrad" x1="32" y1="18" x2="228" y2="244">
            <stop offset="0%" stopColor="#E8254B" />
            <stop offset="50%" stopColor="#FF3860" />
            <stop offset="100%" stopColor="#E8254B" />
          </linearGradient>
          <radialGradient id="hexFillGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8254B" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#E8254B" stopOpacity="0.02" />
          </radialGradient>
          <radialGradient id="coreGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FF3860" />
            <stop offset="100%" stopColor="#E8254B" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

// ─── Hero Visual ─────────────────────────────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative w-[480px] h-[480px] flex items-center justify-center">
      <HexagonMark />
      {PILLS.map((pill) => (
        <Pill key={pill.label} {...pill} />
      ))}
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 42% 45%, #28282d 0%, #1e1e22 100%)" }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          transition={{ duration: 3, delay: 0.3 }}
          className="absolute top-[5%] right-[10%] h-[700px] w-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 55%)" }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 3, delay: 1 }}
          className="absolute bottom-[0%] left-[5%] h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, #E8254B, transparent 50%)" }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1240px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center min-h-[85vh]">
          {/* Left */}
          <div className="pt-16 lg:pt-0">
            <h1
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
              className="font-bold tracking-[-0.045em] leading-[0.98]"
            >
              <motion.span
                className="block text-ink-primary"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.1, duration: 1, ease }}
              >
                F*ck Windows.
              </motion.span>
              <motion.span
                className="block bg-gradient-to-r from-accent via-[#FF3860] to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.25, duration: 1, ease }}
              >
                Make it usable.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.8, ease }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-ink-secondary"
            >
              redcore turns a bloated install into a system that actually fits
              the machine, the workload, and the user. Guided. Reversible.
              Machine-aware.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.7, ease }}
              className="mt-10 flex flex-col sm:flex-row items-start gap-4"
            >
              <motion.button
                onClick={() => scrollTo("pricing")}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-8 py-4 text-[0.92rem] font-semibold text-white cursor-pointer relative overflow-hidden shadow-lg shadow-accent/20"
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
              transition={{ delay: 1.1, duration: 1 }}
              className="mt-14 flex items-center gap-8"
            >
              {["Windows 10 & 11", "100% reversible", "No subscription"].map((t, i) => (
                <span key={t} className="flex items-center gap-3 text-[0.7rem] font-mono font-medium tracking-wider text-ink-muted">
                  {i > 0 && <span className="h-3 w-px bg-accent/20" />}
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right */}
          <div className="hidden lg:flex items-center justify-center">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
