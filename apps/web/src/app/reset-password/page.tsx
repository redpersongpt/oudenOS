"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

const ease: [number, number, number, number] = [0, 0, 0.2, 1];
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay },
});

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    setToken(nextToken);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Reset link is missing or invalid.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unable to reset password" }));
        setError(body.error ?? "Unable to reset password");
        return;
      }

      setCompleted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-sm">
          <motion.h1 {...fade(0)} className="text-2xl font-bold text-ink-primary text-center">
            Reset password
          </motion.h1>
          <motion.p {...fade(0.05)} className="mt-2 text-[14px] text-ink-secondary text-center">
            Choose a new password for your redcore account.
          </motion.p>

          {error && (
            <motion.p {...fade(0.08)} className="mt-4 text-center text-[13px] text-red-400">
              {error}
            </motion.p>
          )}

          {!token && !error && (
            <motion.p {...fade(0.08)} className="mt-4 text-center text-[13px] text-red-400">
              Reset link is missing or invalid.
            </motion.p>
          )}

          {completed ? (
            <motion.div {...fade(0.12)} className="mt-8 rounded-2xl border border-border bg-surface-card p-6 text-center">
              <p className="text-[14px] leading-6 text-ink-secondary">
                Your password has been reset. You can sign in with the new password now.
              </p>
              <Link href="/login" className="mt-5 inline-flex text-[13px] font-medium text-accent hover:text-accent-bright transition-colors">
                Go to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.form {...fade(0.1)} onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg bg-surface-card border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="Create a new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg bg-surface-card border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="Repeat the new password"
                />
              </div>

              <motion.button
                type="submit"
                disabled={!token || loading}
                className="w-full h-11 rounded-lg bg-accent hover:bg-accent-dim disabled:opacity-70 text-white text-[14px] font-medium cursor-pointer transition-colors"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Resetting..." : "Reset password"}
              </motion.button>
            </motion.form>
          )}

          <motion.p {...fade(0.2)} className="mt-6 text-center text-[13px] text-ink-tertiary">
            Need a fresh link?{" "}
            <Link href="/forgot-password" className="text-accent hover:text-accent-bright transition-colors">
              Request another reset email
            </Link>
          </motion.p>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
