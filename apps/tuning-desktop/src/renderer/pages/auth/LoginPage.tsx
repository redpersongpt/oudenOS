import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth-store";
import { LOGIN_URL, openExternalUrl } from "@/lib/external-links";

// Motion variants

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
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
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

// SVG brand icons

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// Component

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    const ok = await login(email, password);
    if (ok) navigate(from, { replace: true });
  }

  function handleOAuth() {
    openExternalUrl(`${LOGIN_URL}?provider=google`);
    setOauthNotice("Google sign-in opened in your browser.");
    setTimeout(() => setOauthNotice(null), 3500);
  }

  const displayError = error;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 drag-region overflow-hidden">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(215,25,33,0.07) 0%, transparent 65%)",
        }}
      />

      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="no-drag relative z-10 w-full max-w-[400px] px-5"
      >
        <motion.div variants={stagger} initial="hidden" animate="visible">
          {/* Brand */}
          <motion.div variants={fadeUp} className="mb-8 flex flex-col items-center gap-3">
            <div className="flex items-center justify-center">
              <LogoMark size={48} />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-neutral-300">
                Ouden<span className="font-normal text-neutral-500">.Tuning</span>
              </h1>
              <p className="mt-0.5 text-xs text-neutral-500">Welcome back</p>
            </div>
          </motion.div>

          {/* Card */}
          <motion.div
            variants={fadeUp}
            className="rounded-lg border border-white/[0.05] bg-neutral-900 p-6 shadow-[0_12px_48px_rgba(0,0,0,0.55)]"
          >
            {/* Error banner */}
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
                  <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                    <p className="text-xs leading-relaxed text-red-300">{displayError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {oauthNotice && !displayError && (
                <motion.div
                  key="oauth-notice"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2.5">
                    <p className="text-xs leading-relaxed text-brand-200">{oauthNotice}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OAuth */}
            <div className="space-y-2.5">
              <OAuthButton
                onClick={handleOAuth}
                icon={<GoogleIcon />}
                label="Continue with Google"
              />
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
                    className="w-full rounded-lg border border-neutral-700/70 bg-neutral-800/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700/70 bg-neutral-800/60 py-2.5 pl-9 pr-10 text-sm text-white placeholder-neutral-600 outline-none transition-all focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
                    placeholder="••••••••"
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
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => setRememberMe((v) => !v)}
                  className="flex items-center gap-2 group"
                  aria-pressed={rememberMe}
                >
                  {/* Toggle track */}
                  <div
                    className={`relative flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                      rememberMe ? "bg-brand-500" : "bg-neutral-700"
                    }`}
                  >
                    <motion.div
                      animate={{ x: rememberMe ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 550, damping: 32 }}
                      className="absolute h-4 w-4 rounded-full bg-white shadow-sm"
                    />
                  </div>
                  <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors">
                    Remember me
                  </span>
                </button>

                <Link
                  to="/forgot-password"
                  className="text-xs text-neutral-500 transition-colors hover:text-brand-400"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="mt-1 w-full"
              >
                Sign in
              </Button>
            </form>
          </motion.div>

          {/* Sign up link */}
          <motion.p variants={fadeUp} className="mt-5 text-center text-xs text-neutral-600">
            No account?{" "}
            <Link
              to="/register"
              className="font-medium text-brand-400 transition-colors hover:text-brand-300"
            >
              Create one — it's free
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// OAuth button

interface OAuthButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function OAuthButton({ onClick, icon, label }: OAuthButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.05)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 550, damping: 32 }}
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-neutral-700/80 bg-neutral-800/50 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors"
    >
      {icon}
      {label}
    </motion.button>
  );
}
