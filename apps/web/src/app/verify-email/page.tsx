"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import { getCloudApiBaseUrl } from "@/lib/cloud-api";

const ease: [number, number, number, number] = [0, 0, 0.2, 1];
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay },
});

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    if (!token) {
      setError("Verification link is missing or invalid.");
      setDone(true);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(`${getCloudApiBaseUrl()}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((body as { error?: string }).error ?? "Unable to verify email.");
        } else {
          setMessage((body as { message?: string }).message ?? "Email verified successfully.");
        }
      } catch {
        setError("Network error while verifying your email.");
      } finally {
        setDone(true);
      }
    })();
  }, []);

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-sm">
          <motion.h1 {...fade(0)} className="text-2xl font-bold text-ink-primary text-center">
            Verify Email
          </motion.h1>
          <motion.p {...fade(0.05)} className="mt-2 text-[14px] text-ink-secondary text-center">
            {error || message}
          </motion.p>

          {done && (
            <motion.div {...fade(0.12)} className="mt-8 rounded-2xl border border-border bg-surface-card p-6 text-center">
              <Link href="/login" className="inline-flex text-[13px] font-medium text-accent hover:text-accent-bright transition-colors">
                Continue to sign in
              </Link>
            </motion.div>
          )}
        </div>
      </main>
      <FooterSection />
    </>
  );
}
