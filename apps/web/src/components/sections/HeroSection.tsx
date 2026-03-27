"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Download } from "lucide-react";
import { useEffect, useState } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

// ─── Live System Scan Visualization ──────────────────────────────────────────
// Simulates a real-time system analysis — the core UX of redcore

const SCAN_LINES = [
  { delay: 0.8,  text: "$ redcore assess --full", type: "cmd" as const },
  { delay: 1.6,  text: "[scan] Windows 11 Pro 23H2 (Build 22631.4890)", type: "info" as const },
  { delay: 2.2,  text: "[scan] CPU: AMD Ryzen 9 7950X  ·  16C/32T  ·  5.7 GHz", type: "info" as const },
  { delay: 2.7,  text: "[scan] GPU: NVIDIA RTX 4090  ·  24 GB VRAM", type: "info" as const },
  { delay: 3.1,  text: "[scan] RAM: 32 GB DDR5-6000  ·  Dual Channel", type: "info" as const },
  { delay: 3.5,  text: "[scan] Storage: Samsung 990 PRO 2TB  ·  NVMe Gen4", type: "info" as const },
  { delay: 4.0,  text: "[scan] 187 services running  ·  43 startup programs", type: "warn" as const },
  { delay: 4.4,  text: "[scan] 14 telemetry endpoints active", type: "warn" as const },
  { delay: 4.8,  text: "[scan] Copilot enabled  ·  Recall active  ·  Widgets running", type: "warn" as const },
  { delay: 5.3,  text: "[scan] No domain join  ·  No MDM agent  ·  Steam detected", type: "info" as const },
  { delay: 5.8,  text: "", type: "blank" as const },
  { delay: 6.0,  text: "[classify] Profile: Gaming Desktop  ·  confidence: 94%", type: "success" as const },
  { delay: 6.5,  text: "[plan] 164 actions resolved  ·  12 blocked  ·  8 expert-only", type: "success" as const },
  { delay: 7.0,  text: "[plan] Estimated impact: -34% startup time, -2.1 GB RAM", type: "success" as const },
  { delay: 7.5,  text: "", type: "blank" as const },
  { delay: 7.7,  text: "Ready. Awaiting user review before execution.", type: "ready" as const },
];

function LiveScan() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    SCAN_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay * 1000));
    });
    // Cursor blink
    const blink = setInterval(() => setCursorVisible(v => !v), 530);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(blink);
    };
  }, []);

  const colorMap = {
    cmd: "text-accent",
    info: "text-ink-secondary",
    warn: "text-amber-400",
    success: "text-emerald-400",
    blank: "",
    ready: "text-accent font-semibold",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, duration: 1, ease }}
      className="relative w-full max-w-[480px] rounded-xl border border-border bg-surface overflow-hidden shadow-2xl"
    >
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/40" />
        </div>
        <span className="ml-2 font-mono text-[10px] text-ink-muted tracking-wide">
          redcore — system assessment
        </span>
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"
        />
      </div>

      {/* Terminal body */}
      <div className="px-4 py-3 h-[320px] overflow-hidden font-mono text-[11px] leading-[1.8]">
        <AnimatePresence>
          {SCAN_LINES.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`${colorMap[line.type]} ${line.type === "blank" ? "h-3" : ""}`}
            >
              {line.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        <span className={`inline-block w-[7px] h-[14px] bg-accent mt-0.5 ${cursorVisible ? "opacity-80" : "opacity-0"} transition-opacity duration-100`} />
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-2 border-t border-border bg-surface-raised flex items-center justify-between">
        <span className="font-mono text-[9px] text-ink-muted">
          {visibleLines >= SCAN_LINES.length ? "assessment complete" : "scanning..."}
        </span>
        <div className="flex items-center gap-2">
          {visibleLines >= SCAN_LINES.length && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="font-mono text-[9px] text-emerald-400 font-medium"
            >
              164 actions ready
            </motion.span>
          )}
          {visibleLines < SCAN_LINES.length && (
            <div className="h-1 w-16 rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                animate={{ width: `${(visibleLines / SCAN_LINES.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 35%, #222226 0%, #1e1e22 100%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-[15%] right-[5%] h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, #E8254B, transparent 65%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 2.5, delay: 0.8 }}
          className="absolute bottom-[10%] left-[10%] h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, #E8254B, transparent 60%)",
          }}
        />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div>
            <h1
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 5rem)" }}
              className="font-bold tracking-[-0.045em] leading-[0.98]"
            >
              <motion.span
                className="block text-ink-primary"
                initial={{ opacity: 0, y: 60, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.2, duration: 1, ease }}
              >
                F*ck Windows.
              </motion.span>
              <motion.span
                className="block bg-gradient-to-r from-accent via-[#FF3860] to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 60, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.35, duration: 1, ease }}
              >
                Make it usable.
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.8, ease }}
              className="mt-8 max-w-[480px] text-[1.05rem] leading-[1.8] text-ink-secondary"
            >
              redcore turns a bloated install into a system that actually fits
              the machine, the workload, and the user. Guided. Reversible.
              Machine-aware.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.7, ease }}
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
              transition={{ delay: 1.3, duration: 1 }}
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

          {/* Right — Live system scan terminal */}
          <div className="hidden lg:block">
            <LiveScan />
          </div>
        </div>
      </div>
    </section>
  );
}
