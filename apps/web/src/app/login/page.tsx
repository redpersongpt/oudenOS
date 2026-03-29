"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getProviders, signIn } from "next-auth/react";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const ease: [number, number, number, number] = [0, 0, 0.2, 1];
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay },
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const router = useRouter();
  const attemptedProviderRef = useRef(false);

  useEffect(() => {
    getProviders()
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    const provider =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("provider")
        : null;
    if (provider !== "google" || attemptedProviderRef.current || !googleEnabled) {
      return;
    }

    attemptedProviderRef.current = true;
    void signIn("google", { callbackUrl: "/profile" });
  }, [googleEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/profile");
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-sm">
          <motion.h1 {...fade(0)} className="text-2xl font-bold text-ink-primary text-center">
            Sign in
          </motion.h1>
          <motion.p {...fade(0.05)} className="mt-2 text-[14px] text-ink-secondary text-center">
            Welcome back to redcore
          </motion.p>

          {error && (
            <motion.p {...fade(0.08)} className="mt-4 text-center text-[13px] text-red-400">
              {error}
            </motion.p>
          )}

          <motion.form
            {...fade(0.1)}
            onSubmit={handleSubmit}
            className="mt-8 space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-surface-card border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-surface-card border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                placeholder="Your password"
              />
              <div className="mt-2 text-right">
                <Link href="/forgot-password" className="text-[12px] text-accent hover:text-accent-bright transition-colors">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <motion.button
              type="submit"
              className="w-full h-11 rounded-lg bg-accent hover:bg-accent-dim text-white text-[14px] font-medium cursor-pointer transition-colors"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Sign in
            </motion.button>
          </motion.form>

          <motion.div {...fade(0.2)} className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-ink-tertiary">or</span>
            <div className="flex-1 h-px bg-border" />
          </motion.div>

          {googleEnabled && (
            <motion.div {...fade(0.25)}>
              <motion.button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/profile" })}
                className="w-full h-10 rounded-lg bg-surface-card border border-border text-[13px] font-medium text-ink-secondary cursor-pointer transition-colors hover:border-border-strong inline-flex items-center justify-center gap-2.5"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <GoogleIcon />
                Continue with Google
              </motion.button>
            </motion.div>
          )}

          <motion.p {...fade(0.3)} className="mt-6 text-center text-[13px] text-ink-tertiary">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent hover:text-accent-bright transition-colors">
              Create one
            </Link>
          </motion.p>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
