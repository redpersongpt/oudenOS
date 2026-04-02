import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, AlertCircle, ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { cloudApi, CloudApiRequestError } from "@/lib/cloud-api";

// Motion variants

const pageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 28 },
  },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 22, delay: 0.05 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.18 },
  },
};

// Success illustration

function SuccessIllustration() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 18, delay: 0.15 }}
      className="relative"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl"
      />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20"
      >
        <svg viewBox="0 0 40 40" width="32" height="32" fill="none" aria-hidden="true">
          {/* Lock body */}
          <rect x="8" y="18" width="24" height="16" rx="3" stroke="var(--color-brand-500)" strokeWidth="2.5" />
          {/* Lock shackle */}
          <path
            d="M13 18v-5a7 7 0 0 1 14 0v5"
            stroke="var(--color-brand-500)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Keyhole */}
          <circle cx="20" cy="26" r="2.5" stroke="var(--color-brand-500)" strokeWidth="2" />
          <path
            d="M20 28.5v2.5"
            stroke="var(--color-brand-500)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {/* Mail badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.55 }}
          className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 border-2 border-neutral-950"
        >
          <Mail className="h-3 w-3 text-white" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Component

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await cloudApi.auth.forgotPassword(email.trim());
    } catch (err) {
      // Swallow non-network errors — never reveal whether email exists
      if (err instanceof CloudApiRequestError && err.status === 0) {
        setError("Network error — check your connection and try again.");
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
    // Always show success to prevent email enumeration
    setSubmitted(true);
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 drag-region overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(212,42,69,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="no-drag relative z-10 w-full max-w-[380px] px-5">
        <AnimatePresence mode="wait">
          {!submitted ? (
            /* Request form */
            <motion.div
              key="form"
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit={successVariants.exit}
            >
              <motion.div variants={stagger} initial="hidden" animate="visible">
                {/* Brand */}
                <motion.div variants={fadeUp} className="mb-8 flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center">
                    <LogoMark size={48} />
                  </div>
                  <div className="text-center">
                    <h1 className="text-xl font-bold tracking-tight text-white">
                      Reset password
                    </h1>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Enter your email and we'll send a reset link
                    </p>
                  </div>
                </motion.div>

                {/* Card */}
                <motion.div
                  variants={fadeUp}
                  className="rounded-lg border border-white/[0.05] bg-neutral-900 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
                >
                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2.5">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                          <p className="text-xs leading-relaxed text-red-300">{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-lg border border-neutral-700/70 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      className="w-full"
                    >
                      Send reset link
                    </Button>
                  </form>
                </motion.div>

                {/* Back link */}
                <motion.div variants={fadeUp} className="mt-5 flex justify-center">
                  <Link
                    to="/login"
                    className="flex items-center gap-1.5 text-xs text-neutral-600 transition-colors hover:text-neutral-400"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to sign in
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            /* Success state */
            <motion.div
              key="success"
              variants={successVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-7 text-center"
            >
              <SuccessIllustration />

              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 280, damping: 28 }}
                  className="text-xl font-bold tracking-tight text-white"
                >
                  Check your email
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.28 }}
                  className="text-sm leading-relaxed text-neutral-400"
                >
                  If{" "}
                  <span className="font-medium text-white">{email}</span>{" "}
                  is registered, you'll receive a password reset link shortly.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.58, duration: 0.28 }}
                className="space-y-1.5"
              >
                <p className="text-xs text-neutral-600">
                  Didn't receive it? Check your spam folder, or{" "}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setEmail("");
                    }}
                    className="text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    try again
                  </button>
                  .
                </p>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-xs text-neutral-600 transition-colors hover:text-neutral-400"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
