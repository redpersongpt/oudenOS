"use client";

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

export default function SubscriptionPage() {
  const success =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("success") === "1"
      : false;

  const title = success ? "License Updated" : "License Portal";
  const message = success
    ? "Purchase completed. Return to Ouden.Tuning and refresh your profile to pull the latest license state."
    : "Use this portal to manage your one-time Ouden.Tuning license, then return to the desktop app.";

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-md">
          <motion.h1 {...fade(0)} className="text-2xl font-bold text-[var(--text-primary)] text-center">
            {title}
          </motion.h1>
          <motion.p {...fade(0.05)} className="mt-2 text-[14px] text-[var(--text-secondary)] text-center">
            {message}
          </motion.p>

          <motion.div {...fade(0.12)} className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Link href="/downloads" className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent)]-bright transition-colors">
                Download OudenOS
              </Link>
              <Link href="/redcore-tuning" className="text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent)]-bright transition-colors">
                View Ouden.Tuning
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
