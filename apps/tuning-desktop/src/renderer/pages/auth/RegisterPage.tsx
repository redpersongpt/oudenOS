import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Zap, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth-store";

// ─── Motion variants ──────────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 26, mass: 1 },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.12 },
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
  hidden: { opacity: 0, scale: 0.85, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 22, mass: 1 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.18 },
  },
};

// ─── SVG brand icons (same as LoginPage) ─────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zm3.378-3.066c.7-.858 1.17-2.04 1.04-3.23-1.007.04-2.232.675-2.958 1.52-.652.754-1.217 1.96-1.065 3.114 1.12.085 2.265-.572 2.983-1.404z" />
    </svg>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

interface PasswordRequirement {
  label: string;
  met: boolean;
}

function usePasswordStrength(password: string) {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One number", met: /[0-9]/.test(password) },
      { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
    ];
    const score = requirements.filter((r) => r.met).length;
    return { requirements, score };
  }, [password]);
}

const strengthConfig = [
  { label: "", color: "bg-neutral-700", width: "0%" },
  { label: "Weak", color: "bg-red-500", width: "25%" },
  { label: "Fair", color: "bg-orange-500", width: "50%" },
  { label: "Good", color: "bg-amber-400", width: "75%" },
  { label: "Strong", color: "bg-green-500", width: "100%" },
];

// ─── Animated envelope icon ───────────────────────────────────────────────────

function EnvelopeIllustration() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.1 }}
      className="relative"
    >
      {/* Outer glow ring */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl"
      />
      {/* Icon container */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/10 border border-brand-500/20"
      >
        {/* SVG envelope */}
        <svg viewBox="0 0 48 48" width="40" height="40" fill="none" aria-hidden="true">
          <rect x="4" y="10" width="40" height="28" rx="3" stroke="#E8254B" strokeWidth="2.5" />
          <path d="M4 13l20 14 20-14" stroke="#E8254B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            d="M14 32l8-6M34 32l-8-6"
            stroke="#E8254B"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.4}
          />
        </svg>
        {/* Check badge */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.6 }}
          className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-green-500 border-2 border-neutral-900"
        >
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuthStore();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const { requirements, score } = usePasswordStrength(password);
  const strength = strengthConfig[score];
  const showStrength = password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    clearError();

    if (password !== confirm) {
      setFieldError("Passwords do not match.");
      return;
    }
    if (score < 2) {
      setFieldError("Please choose a stronger password.");
      return;
    }
    if (!termsAccepted) {
      setFieldError("You must accept the Terms of Service.");
      return;
    }

    const ok = await register(email, password, displayName);
    if (ok) {
      setRegistered(true);
      // Navigate to dashboard after a brief success moment
      setTimeout(() => navigate("/dashboard", { replace: true }), 3500);
    }
  }

  const displayError = fieldError || error;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 drag-region overflow-hidden">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(232,37,75,0.07) 0%, transparent 65%)",
        }}
      />

      <div className="no-drag relative z-10 w-full max-w-[400px] px-5">
        <AnimatePresence mode="wait">
          {!registered ? (
            /* ── Registration form ─────────────────────────────────────── */
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-[0_0_28px_rgba(232,37,75,0.38)]">
                    <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <h1 className="text-xl font-bold tracking-tight text-white">
                      redcore<span className="text-brand-400">-Tuning</span>
                    </h1>
                    <p className="mt-0.5 text-xs text-neutral-500">Create your account</p>
                  </div>
                </motion.div>

                {/* Card */}
                <motion.div
                  variants={fadeUp}
                  className="rounded-2xl border border-white/[0.05] bg-neutral-900 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
                >
                  {/* Error */}
                  <AnimatePresence>
                    {displayError && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-start gap-2 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2.5">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                          <p className="text-xs leading-relaxed text-red-300">{displayError}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* OAuth */}
                  <div className="space-y-2.5">
                    <OAuthButton icon={<GoogleIcon />} label="Sign up with Google" />
                    <OAuthButton icon={<AppleIcon />} label="Sign up with Apple" />
                  </div>

                  {/* Divider */}
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-neutral-800" />
                    <span className="text-[11px] font-medium tracking-wide text-neutral-600 uppercase">
                      or
                    </span>
                    <div className="h-px flex-1 bg-neutral-800" />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Name */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Name{" "}
                        <span className="font-normal text-neutral-600">(optional)</span>
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          autoComplete="name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full rounded-xl border border-neutral-700/70 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
                          placeholder="Your name"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-neutral-700/70 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    {/* Password + strength */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-neutral-700/70 bg-neutral-800/60 py-2.5 pl-9 pr-10 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
                          placeholder="Create a strong password"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Strength indicator */}
                      <AnimatePresence>
                        {showStrength && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22 }}
                            className="mt-2.5 overflow-hidden"
                          >
                            {/* Bar track */}
                            <div className="mb-1.5 flex items-center gap-2">
                              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                                <motion.div
                                  className={`h-full rounded-full ${strength.color}`}
                                  animate={{ width: strength.width }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 220,
                                    damping: 28,
                                  }}
                                />
                              </div>
                              {score > 0 && (
                                <motion.span
                                  key={strength.label}
                                  initial={{ opacity: 0, x: 4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`min-w-[42px] text-right text-[11px] font-medium ${
                                    score === 1
                                      ? "text-red-400"
                                      : score === 2
                                        ? "text-orange-400"
                                        : score === 3
                                          ? "text-amber-400"
                                          : "text-green-400"
                                  }`}
                                >
                                  {strength.label}
                                </motion.span>
                              )}
                            </div>

                            {/* Requirements checklist */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                              {requirements.map((req) => (
                                <div
                                  key={req.label}
                                  className="flex items-center gap-1.5"
                                >
                                  <motion.div
                                    animate={{
                                      backgroundColor: req.met
                                        ? "#22c55e"
                                        : "rgba(255,255,255,0.08)",
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full"
                                  >
                                    {req.met ? (
                                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                                    ) : (
                                      <X className="h-2 w-2 text-neutral-500" strokeWidth={3} />
                                    )}
                                  </motion.div>
                                  <span
                                    className={`text-[11px] transition-colors ${
                                      req.met ? "text-neutral-300" : "text-neutral-600"
                                    }`}
                                  >
                                    {req.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                        Confirm password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                          type={showConfirm ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          className={`w-full rounded-xl border bg-neutral-800/60 py-2.5 pl-9 pr-10 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:ring-2 ${
                            confirm && confirm !== password
                              ? "border-red-700/70 focus:border-red-600/60 focus:ring-red-500/15"
                              : confirm && confirm === password
                                ? "border-green-700/70 focus:border-green-600/60 focus:ring-green-500/15"
                                : "border-neutral-700/70 focus:border-brand-500/60 focus:ring-brand-500/15"
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300"
                        >
                          {showConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Terms checkbox */}
                    <div className="pt-0.5">
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <div className="mt-0.5">
                          <motion.div
                            onClick={() => setTermsAccepted((v) => !v)}
                            animate={{
                              backgroundColor: termsAccepted
                                ? "#E8254B"
                                : "rgba(255,255,255,0.05)",
                              borderColor: termsAccepted
                                ? "#E8254B"
                                : "rgba(255,255,255,0.12)",
                            }}
                            transition={{ duration: 0.15 }}
                            className="flex h-4 w-4 items-center justify-center rounded border"
                          >
                            {termsAccepted && (
                              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                            )}
                          </motion.div>
                        </div>
                        <span className="text-xs leading-relaxed text-neutral-500">
                          I agree to the{" "}
                          <a
                            href="#"
                            className="text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a
                            href="#"
                            className="text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            Privacy Policy
                          </a>
                        </span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={loading}
                      className="mt-1 w-full"
                    >
                      Create account
                    </Button>
                  </form>
                </motion.div>

                {/* Sign in link */}
                <motion.p
                  variants={fadeUp}
                  className="mt-5 text-center text-xs text-neutral-600"
                >
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-brand-400 transition-colors hover:text-brand-300"
                  >
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            </motion.div>
          ) : (
            /* ── Email verification success ────────────────────────────── */
            <motion.div
              key="success"
              variants={successVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center gap-8 text-center"
            >
              <EnvelopeIllustration />

              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, type: "spring", stiffness: 280, damping: 28 }}
                  className="text-2xl font-bold tracking-tight text-white"
                >
                  Check your inbox
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.3 }}
                  className="text-sm leading-relaxed text-neutral-400"
                >
                  We sent a verification link to{" "}
                  <span className="font-medium text-white">{email}</span>
                  .<br />
                  Click it to activate your account.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className="space-y-2 text-center"
              >
                <p className="text-xs text-neutral-600">
                  Didn't receive it?{" "}
                  <button className="text-brand-400 hover:text-brand-300 transition-colors">
                    Resend email
                  </button>
                </p>
                <Link
                  to="/login"
                  className="block text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                >
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

// ─── OAuth button ─────────────────────────────────────────────────────────────

interface OAuthButtonProps {
  icon: React.ReactNode;
  label: string;
}

function OAuthButton({ icon, label }: OAuthButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={() => {}}
      whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.05)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 550, damping: 32 }}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-700/80 bg-neutral-800/50 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors"
    >
      {icon}
      {label}
    </motion.button>
  );
}
