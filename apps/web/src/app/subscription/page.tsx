"use client";

import { useEffect, useState } from "react";
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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const value =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("success") === "1"
        : false;
    setSuccess(value);
  }, []);

  const title = success ? "Subscription Updated" : "Subscription Portal";
  const message = success
    ? "Stripe finished successfully. Return to redcore Tuning and refresh your profile to pull the latest tier."
    : "You can manage billing from the secure portal, then return to the desktop app.";

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-md">
          <motion.h1 {...fade(0)} className="text-2xl font-bold text-ink-primary text-center">
            {title}
          </motion.h1>
          <motion.p {...fade(0.05)} className="mt-2 text-[14px] text-ink-secondary text-center">
            {message}
          </motion.p>

          <motion.div {...fade(0.12)} className="mt-8 rounded-2xl border border-border bg-surface-card p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Link href="/downloads" className="text-[13px] font-medium text-accent hover:text-accent-bright transition-colors">
                Download redcore OS
              </Link>
              <Link href="/redcore-tuning" className="text-[13px] font-medium text-accent hover:text-accent-bright transition-colors">
                View redcore Tuning
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
