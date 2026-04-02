import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { spring } from "@redcore/design-system";
import { LogoMark } from "@/components/brand/Logo";

type Phase = "logo" | "text" | "bar" | "exit";

export function SplashPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 500);
    const t2 = setTimeout(() => setPhase("bar"), 900);
    const t3 = setTimeout(() => setPhase("exit"), 2200);
    const t4 = setTimeout(
      () => navigate("/onboarding", { replace: true }),
      2600
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [navigate]);

  const isVisible = phase === "logo" || phase === "text" || phase === "bar";

  return (
    <motion.div
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #1A1917 0%, #0D0C0B 100%)",
      }}
      animate={phase === "exit" ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Pulsing rings */}
      <AnimatePresence>
        {isVisible && (
          <>
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-brand-500/10"
                initial={{ width: 80, height: 80, opacity: 0 }}
                animate={{
                  width: 80 + i * 60,
                  height: 80 + i * 60,
                  opacity: [0, 0.4, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.4,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-5">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...spring.bounce, delay: 0.05 }}
          className="relative flex items-center justify-center"
        >
          <LogoMark size={72} />
        </motion.div>

        {/* Brand text */}
        <AnimatePresence>
          {(phase === "text" || phase === "bar" || phase === "exit") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col items-center gap-1"
            >
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Ouden<span className="font-normal text-neutral-500">.Tuning</span>
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                Precision Performance
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom loading bar */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-neutral-800">
        <AnimatePresence>
          {(phase === "bar" || phase === "exit") && (
            <motion.div
              className="h-full bg-brand-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.4, ease: [0.2, 0, 0.8, 1] }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
