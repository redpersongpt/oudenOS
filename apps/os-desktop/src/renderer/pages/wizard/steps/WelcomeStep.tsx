import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Cpu, Sparkles, AlertTriangle, Zap, Eye, Wrench } from "lucide-react";
import { LogoHero } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/wizard-store";

// Easter egg: click the logo 7 times
const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const FEATURES = [
  { icon: Shield, text: "Privacy hardening", color: "text-emerald-400" },
  { icon: Cpu, text: "Performance boost", color: "text-brand-400" },
  { icon: Sparkles, text: "System cleanup", color: "text-purple-400" },
  { icon: Eye, text: "Telemetry control", color: "text-amber-400" },
  { icon: Wrench, text: "Registry tuning", color: "text-sky-400" },
  { icon: Zap, text: "Latency fixes", color: "text-brand-400" },
];

// Rotating taglines under the title
const TAGLINES = [
  "We hate Windows, and you should too.",
  "Your PC, minus the Microsoft tax.",
  "Debloat. Optimize. Take back control.",
  "What Windows should have been.",
  "No scripts. No guessing. Just results.",
  "Because 27GB for an OS is still insane.",
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

  // Rotate taglines
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center px-10 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(232,37,75,0.06) 0%, transparent 60%)" }}
        />
      </motion.div>

      {/* Logo with pulse animation */}
      <motion.div
        onClick={handleLogoClick}
        className="cursor-default select-none relative z-10"
        initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
      >
        {/* Breathing glow behind logo */}
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

      {/* Title with stagger */}
      <motion.h1
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-[24px] font-bold tracking-tight text-ink relative z-10"
      >
        red<span className="text-brand-400">core</span> <span className="font-normal text-ink-secondary">OS</span>
      </motion.h1>

      {/* Rotating tagline */}
      <div className="mt-2 h-5 relative z-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={taglineIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.6, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-[12px] text-ink-tertiary italic text-center"
          >
            {TAGLINES[taglineIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mt-3 max-w-xs text-center text-[12px] leading-relaxed text-ink-secondary relative z-10"
      >
        Machine-aware Windows optimization.
        <br />Guided wizard, full rollback, nothing hidden.
      </motion.p>

      {/* Feature pills — 2 rows of 3 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-5 grid grid-cols-3 gap-1.5 relative z-10"
      >
        {FEATURES.map(({ icon: Icon, text, color }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5"
          >
            <Icon className={`h-3 w-3 ${color}`} />
            <span className="text-[9px] font-medium text-ink-secondary">{text}</span>
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
              Right-click the app and select "Run as administrator" for full functionality.
            </p>
          </div>
        </motion.div>
      )}

      {/* CTA button with glow */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, type: "spring", stiffness: 200, damping: 16 }}
        className="mt-5 relative z-10"
      >
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              "0 0 0 rgba(232,37,75,0)",
              "0 4px 20px rgba(232,37,75,0.25)",
              "0 0 0 rgba(232,37,75,0)",
            ],
          }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, delay: 1 }}
        />
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
        100% reversible · Snapshot before every change · No data leaves your machine
      </motion.p>
    </motion.div>
  );
}
