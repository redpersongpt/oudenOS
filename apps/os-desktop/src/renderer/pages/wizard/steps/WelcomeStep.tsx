import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { LogoHero } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const FEATURES = [
  "Kill bloatware",
  "Stop telemetry",
  "Faster boot",
  "Lower latency",
  "Fix frame drops",
  "Clean registry",
];

const TAGLINES = [
  "We hate Windows, and you should too.",
  "Your PC, minus the Microsoft tax.",
  "What Windows should have been.",
  "No scripts. No guessing. Just results.",
  "Because 27GB for an OS is still insane.",
  "Fed up with bloated debloaters?",
];

export function WelcomeStep() {
  const { goNext } = useWizardStore();
  const [adminState, setAdminState] = useState<{ checked: boolean; isAdmin: boolean; platform: string }>({
    checked: false, isAdmin: true, platform: "unknown",
  });
  const [logoClicks, setLogoClicks] = useState(0);
  const [taglineIdx, setTaglineIdx] = useState(0);

  const handleLogoClick = useCallback(() => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 7) {
      setLogoClicks(0);
      const win = window as unknown as { redcore?: { shell?: { openExternal: (url: string) => void } } };
      win.redcore?.shell?.openExternal(RICKROLL_URL);
    }
  }, [logoClicks]);

  useEffect(() => {
    const win = window as unknown as { redcore?: { service?: { status: () => Promise<{ isAdmin: boolean; platform: string }> } } };
    win.redcore?.service?.status().then((s) => {
      setAdminState({ checked: true, isAdmin: s.isAdmin, platform: s.platform });
    }).catch(() => {
      setAdminState({ checked: true, isAdmin: false, platform: "unknown" });
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full w-full overflow-hidden">

      {/* ── Left decorative sidebar ── */}
      <div className="hidden sm:flex w-[48px] shrink-0 flex-col items-center justify-between py-6 border-r border-white/[0.04]">
        <div className="flex flex-col items-center gap-3">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="w-1 h-1 rounded-full bg-brand-500"
            />
          ))}
        </div>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 60 }}
          transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-px bg-gradient-to-b from-brand-500/20 to-transparent"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 1.2 }}
          className="text-[7px] font-mono text-ink-muted tracking-widest [writing-mode:vertical-lr] rotate-180"
        >
          redcore
        </motion.p>
      </div>

      {/* ── Main content area ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1.0] }}
        className="flex flex-1 flex-col items-center justify-center px-8 relative"
      >
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Center glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(232,37,75,0.05) 0%, transparent 55%)" }}
          />
          {/* Corner accent lines */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 right-0 h-px w-[120px] origin-right"
            style={{ background: "linear-gradient(90deg, transparent, rgba(232,37,75,0.15))" }}
          />
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 right-0 w-px h-[80px] origin-top"
            style={{ background: "linear-gradient(180deg, rgba(232,37,75,0.15), transparent)" }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 h-px w-[100px] origin-left"
            style={{ background: "linear-gradient(90deg, rgba(232,37,75,0.1), transparent)" }}
          />
          {/* Floating dots */}
          {[
            { x: "10%", y: "25%", delay: 1.0, size: 3 },
            { x: "85%", y: "20%", delay: 1.3, size: 2 },
            { x: "15%", y: "75%", delay: 1.5, size: 2 },
            { x: "80%", y: "70%", delay: 1.1, size: 3 },
            { x: "50%", y: "12%", delay: 1.4, size: 2 },
          ].map((dot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.12, scale: 1 }}
              transition={{ delay: dot.delay, duration: 0.6 }}
              className="absolute rounded-full bg-brand-500"
              style={{ left: dot.x, top: dot.y, width: dot.size, height: dot.size }}
            />
          ))}
        </div>

        {/* Logo */}
        <motion.div
          onClick={handleLogoClick}
          className="cursor-default select-none relative z-10"
          initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
        >
          <motion.div
            className="absolute inset-[-12px] rounded-2xl"
            animate={{
              boxShadow: [
                "0 0 20px rgba(232,37,75,0.0)",
                "0 0 30px rgba(232,37,75,0.15)",
                "0 0 20px rgba(232,37,75,0.0)",
              ],
            }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
          />
          <LogoHero size={56} />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-[24px] font-bold tracking-tight text-ink relative z-10"
        >
          red<span className="text-brand-400">core</span>{" "}
          <span className="font-normal text-ink-secondary">OS</span>
        </motion.h1>

        {/* Rotating tagline */}
        <div className="mt-1.5 h-5 relative z-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-[11px] text-ink-muted italic text-center"
            >
              {TAGLINES[taglineIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Feature pills — all brand color */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-4 flex flex-wrap justify-center gap-1.5 relative z-10 max-w-[340px]"
        >
          {FEATURES.map((text, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-full border border-brand-500/10 bg-brand-500/[0.04] px-2.5 py-1"
            >
              <span className="text-[9px] font-medium text-brand-400/80">{text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Admin warning */}
        {adminState.checked && !adminState.isAdmin && adminState.platform === "win32" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 max-w-sm relative z-10"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div>
              <p className="text-[11px] font-semibold text-amber-300">Not running as Administrator</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-amber-400/80">
                Right-click the app and select &quot;Run as administrator&quot; for full functionality.
              </p>
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 200, damping: 16 }}
          className="mt-5 relative z-20"
        >
          <Button variant="primary" size="lg" onClick={goNext} icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
            Begin Assessment
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-4 text-[9px] text-ink-muted relative z-10"
        >
          Every change undoable · Snapshot before every change · Nothing leaves your machine
        </motion.p>
      </motion.div>

      {/* ── Right decorative sidebar ── */}
      <div className="hidden sm:flex w-[48px] shrink-0 flex-col items-center justify-between py-6 border-l border-white/[0.04]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 1 }}
          className="text-[7px] font-mono text-ink-muted tracking-widest [writing-mode:vertical-lr]"
        >
          v0.2.0
        </motion.div>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 80 }}
          transition={{ delay: 1, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-px bg-gradient-to-b from-transparent via-brand-500/15 to-transparent"
        />
        <div className="flex flex-col items-center gap-3">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              transition={{ delay: 1.2 + i * 0.15 }}
              className="w-1 h-1 rounded-full bg-brand-500"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
