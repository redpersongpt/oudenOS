"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Navigation } from "@/components/brand/Navigation";

const ease: [number, number, number, number] = [0, 0, 0.2, 1];
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay },
});

export default function SetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const prefixedUsername =
    session?.user?.email?.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "") ?? "";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setSaving(false);
      return;
    }

    // Update the session so the name shows immediately
    await update({ name: username.trim() });
    router.push("/profile");
  };

  if (status === "loading") {
    return (
      <>
        <Navigation />
        <main className="min-h-screen flex items-center justify-center pt-20">
          <p className="text-[var(--text-disabled)] text-[14px]">Loading...</p>
        </main>
      </>
    );
  }

  if (!session?.user) return null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-16">
        <div className="w-full max-w-sm">
          <motion.h1
            {...fade(0)}
            className="text-2xl font-bold text-[var(--text-primary)] text-center"
          >
            Choose a username
          </motion.h1>
          <motion.p
            {...fade(0.05)}
            className="mt-2 text-[14px] text-[var(--text-secondary)] text-center"
          >
            Welcome to Ouden, {session.user.email}
          </motion.p>

          {error && (
            <motion.p
              {...fade(0.08)}
              className="mt-4 text-center text-[13px] text-red-400"
            >
              {error}
            </motion.p>
          )}

          <motion.form
            {...fade(0.1)}
            onSubmit={handleSubmit}
            className="mt-8 space-y-4"
          >
            <div>
              <label
                htmlFor="username"
                className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username || prefixedUsername}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none focus:border-accent/50 transition-colors"
                placeholder="your-username"
                autoFocus
                maxLength={30}
              />
              <p className="mt-1.5 text-[11px] text-[var(--text-disabled)]">
                Letters, numbers, _ and - only. 2-30 characters.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={saving || username.trim().length < 2}
              className="w-full h-11 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]-dim text-white text-[14px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={!saving ? { y: -1 } : undefined}
              whileTap={!saving ? { scale: 0.98 } : undefined}
            >
              {saving ? "Saving..." : "Continue"}
            </motion.button>
          </motion.form>
        </div>
      </main>
    </>
  );
}
