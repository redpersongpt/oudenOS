"use client";

import { motion } from "framer-motion";
import { ArrowDown, Download } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
      {/* Cinematic background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 35%, #0e0e14 0%, #060608 100%)",
          }}
        />
        {/* Red atmosphere — top right */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute top-[15%] right-[5%] h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, #E8453C, transparent 65%)",
          }}
        />
        {/* Red atmosphere — bottom left */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 2.5, delay: 0.8 }}
          className="absolute bottom-[10%] left-[10%] h-[400px] w-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, #E8453C, transparent 60%)",
          }}
        />
        {/* Grain overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 lg:px-12">
        <h1
          style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)" }}
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
            className="block bg-gradient-to-r from-accent via-[#FF6B5A] to-accent bg-clip-text text-transparent"
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
          className="mt-8 max-w-[520px] text-[1.1rem] leading-[1.8] text-ink-secondary"
        >
          redcore turns a bloated install into a system that actually fits
          the machine, the workload, and the user. Guided. Reversible.
          Machine-aware.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease }}
          className="mt-12 flex flex-col sm:flex-row items-start gap-4"
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
          className="mt-20 flex items-center gap-8"
        >
          {["Windows 10 & 11", "100% reversible", "No subscription"].map((t, i) => (
            <span key={t} className="flex items-center gap-3 text-[0.7rem] font-mono font-medium tracking-wider text-ink-muted">
              {i > 0 && <span className="h-3 w-px bg-border" />}
              {t}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
