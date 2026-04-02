"use client";

import { FormEvent, useState } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unable to send reset email" }));
        setError(body.error ?? "Unable to send reset email");
        return;
      }

      setSubmitted(true);
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
            Forgot password
          </motion.h1>
          <motion.p {...fade(0.05)} className="mt-2 text-[14px] text-ink-secondary text-center">
            Enter your email and we&apos;ll send you a secure reset link.
          </motion.p>

          {error && (
            <motion.p {...fade(0.08)} className="mt-4 text-center text-[13px] text-red-400">
              {error}
            </motion.p>
          )}

          {submitted ? (
            <motion.div {...fade(0.12)} className="mt-8 rounded-lg border border-border bg-surface p-6 text-center">
              <p className="text-[14px] leading-6 text-ink-secondary">
                If an account with that email exists, a reset link has been sent. Check your inbox and spam folder.
              </p>
              <Link href="/login" className="mt-5 inline-flex text-[13px] font-medium text-accent hover:text-accent-bright transition-colors">
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.form {...fade(0.1)} onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg bg-surface border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-accent hover:bg-accent-dim disabled:opacity-70 text-white text-[14px] font-medium cursor-pointer transition-colors"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Sending..." : "Send reset link"}
              </motion.button>
            </motion.form>
          )}

          <motion.p {...fade(0.2)} className="mt-6 text-center text-[13px] text-ink-tertiary">
            Remembered it?{" "}
            <Link href="/login" className="text-accent hover:text-accent-bright transition-colors">
              Sign in
            </Link>
          </motion.p>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
