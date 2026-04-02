// DonationPage
// Post-wizard support page — amount selection, wall of fame, thank-you state.

import { useState } from "react";
import { motion, AnimatePresence, stagger, useAnimate } from "framer-motion";
import { Heart, ExternalLink, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { platform } from "@/lib/platform";

// Mock wall of fame

const SUPPORTERS = [
  { name: "Stefan K.", amount: 25, flag: "🇩🇪" },
  { name: "Maria L.", amount: 10, flag: "🇵🇱" },
  { name: "Alex T.", amount: 5,  flag: "🇬🇧" },
  { name: "Yuki M.", amount: 10, flag: "🇯🇵" },
  { name: "Chris P.", amount: 15, flag: "🇺🇸" },
  { name: "Ana R.", amount: 5,  flag: "🇧🇷" },
  { name: "Dmitri V.", amount: 25, flag: "🇷🇺" },
  { name: "Lena B.", amount: 10, flag: "🇫🇷" },
  { name: "Omar H.", amount: 5,  flag: "🇪🇬" },
  { name: "Sarah W.", amount: 20, flag: "🇨🇦" },
  { name: "Felix G.", amount: 5,  flag: "🇸🇪" },
  { name: "Mia J.", amount: 10, flag: "🇳🇱" },
];

const PRESET_AMOUNTS = [3, 5, 10, 25] as const;

// Thank-you screen

function ThankYouScreen({ amount, onBack }: { amount: number; onBack: () => void }) {
  return (
    <motion.div
      key="thankyou"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center"
    >
      {/* Animated heart */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 340, damping: 14, delay: 0.1 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-sm border border-red-500/30 bg-red-500/10"
      >
        <Heart className="h-9 w-9 fill-red-400 text-red-400" />
        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-sm border border-red-400/30"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8 + i * 0.5, opacity: 0 }}
            transition={{
              duration: 1.4,
              ease: "easeOut",
              repeat: Infinity,
              delay: i * 0.35,
            }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.28, ease: [0.0, 0.0, 0.2, 1.0] }}
        className="space-y-1.5"
      >
        <h2 className="text-xl font-medium text-nd-text-primary">Thank you!</h2>
        <p className="text-sm text-nd-text-secondary">
          Your ${amount} support means everything to this project.
        </p>
        <p className="text-xs text-nd-text-secondary">
          You're now part of the Wall of Fame.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.24 }}
        className="flex gap-3"
      >
        <Button variant="secondary" size="md" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            platform().window.close();
          }}
        >
          Close
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Main component

export function DonationPage() {
  const [selected, setSelected] = useState<number>(5);
  const [custom, setCustom] = useState("");
  const [donated, setDonated] = useState(false);
  const [donatedAmount, setDonatedAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [scope, animate] = useAnimate();

  const effectiveAmount = custom ? parseFloat(custom) || 0 : selected;

  function handleBack() {
    platform().shell.openExternal("https://redcoreos.net");
  }

  async function handleDonate() {
    if (effectiveAmount <= 0) return;
    setLoading(true);

    // Stagger the supporter items out as a departure animation
    await animate(
      "li",
      { opacity: 0, y: -6, scale: 0.97 },
      { duration: 0.18, delay: stagger(0.03) },
    );

    // Simulate async donate (open external URL)
    platform().shell.openExternal(
      `https://redcoreos.net/donate?amount=${effectiveAmount}`,
    );

    setDonatedAmount(effectiveAmount);
    setLoading(false);
    setDonated(true);
  }

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {donated ? (
          <ThankYouScreen
            key="thanks"
            amount={donatedAmount}
            onBack={() => setDonated(false)}
          />
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
            className="flex h-full flex-col gap-5 overflow-hidden px-6 py-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex h-10 w-10 items-center justify-center rounded-sm border border-red-500/30 bg-red-500/10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 340, damping: 16 }}
                >
                  <Heart className="h-5 w-5 text-red-400" />
                </motion.div>
                <div>
                  <h2 className="text-base font-medium text-nd-text-primary">Support redcore</h2>
                  <p className="text-xs text-nd-text-secondary">
                    Help keep it free and open for everyone
                  </p>
                </div>
              </div>
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-nd-text-secondary transition-colors hover:text-nd-text-secondary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>

            {/* Amount selection */}
            <div>
              <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-nd-text-secondary">
                Choose amount
              </p>
              <div className="flex gap-2">
                {PRESET_AMOUNTS.map((amt) => (
                  <motion.button
                    key={amt}
                    onClick={() => { setSelected(amt); setCustom(""); }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 550, damping: 32 }}
                    className={`relative flex-1 rounded-sm border py-2.5 text-sm font-medium transition-colors ${
                      selected === amt && !custom
                        ? "border-brand-500/60 bg-brand-500/15 text-brand-400"
                        : "border-white/[0.08] bg-nd-surface-raised text-nd-text-secondary hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-nd-text-primary"
                    }`}
                  >
                    ${amt}
                    {selected === amt && !custom && (
                      <motion.div
                        layoutId="amount-indicator"
                        className="absolute inset-0 rounded-sm border border-brand-500/40"
                        transition={{ type: "spring", stiffness: 550, damping: 32 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-nd-text-secondary">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      if (e.target.value) setSelected(0);
                    }}
                    placeholder="Custom"
                    className="w-full rounded-sm border border-white/[0.08] bg-nd-surface-raised py-2.5 pl-7 pr-3 text-sm text-nd-text-primary placeholder-ink-tertiary outline-none transition-all focus:border-brand-500/50 focus:bg-nd-surface-raised focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Wall of fame */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-[11px] font-medium uppercase tracking-wider text-nd-text-secondary">
                  Wall of Fame
                </p>
              </div>
              <div
                ref={scope}
                className="flex-1 overflow-y-auto rounded-sm border border-nd-border bg-nd-surface"
              >
                <ul className="p-2 space-y-0.5">
                  {SUPPORTERS.map((s, i) => (
                    <motion.li
                      key={`${s.name}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18, delay: 0.1 + i * 0.04 }}
                      className="flex items-center gap-2.5 rounded-sm px-3 py-2 hover:bg-nd-surface-raised transition-colors"
                    >
                      <span className="text-base leading-none">{s.flag}</span>
                      <span className="flex-1 text-xs font-medium text-nd-text-secondary">
                        {s.name}
                      </span>
                      <span className="text-xs font-medium text-brand-400">${s.amount}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleDonate}
                loading={loading}
                disabled={effectiveAmount <= 0}
                icon={<Heart className="h-4 w-4" />}
                className="flex-1"
              >
                Donate ${effectiveAmount > 0 ? effectiveAmount : "—"}
                <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  platform().window.close();
                }}
              >
                Skip
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
