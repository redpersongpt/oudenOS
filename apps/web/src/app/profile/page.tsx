"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Key, Heart, LogOut, Copy, Check, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

interface License {
  id: string;
  product: string;
  licenseKey: string;
  status: string;
  createdAt: string;
  machineId: string | null;
}

const ease: [number, number, number, number] = [0, 0, 0.2, 1];
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay },
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md text-ink-tertiary hover:text-ink-primary hover:bg-surface-raised transition-colors cursor-pointer"
      title="Copy license key"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/license")
        .then((r) => r.json())
        .then((data) => setLicenses(data.licenses || []))
        .catch(() => {});
    }
  }, [session]);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const body = await res.json().catch(() => ({ error: "Unable to change password" }));
      if (!res.ok) {
        setPasswordError(body.error ?? "Unable to change password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      setPasswordSuccess(body.message ?? "Password updated successfully.");
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <>
        <Navigation />
        <main className="min-h-screen flex items-center justify-center pt-20">
          <p className="text-ink-tertiary text-[14px]">Loading...</p>
        </main>
      </>
    );
  }

  if (!session?.user) return null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div {...fade(0)} className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-2xl font-bold text-ink-primary">
                {session.user.name || "Your Profile"}
              </h1>
              <p className="text-[14px] text-ink-secondary mt-1">
                {session.user.email}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="inline-flex items-center gap-2 text-[13px] text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </motion.div>

          {/* Password */}
          <motion.section {...fade(0.08)} className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-ink-tertiary" />
                <h2 className="text-lg font-semibold text-ink-primary">Password</h2>
              </div>
              <button
                type="button"
                onClick={() => setPasswordOpen((value) => !value)}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-secondary hover:text-ink-primary transition-colors"
              >
                {passwordOpen ? "Close" : "Change password"}
                {passwordOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {passwordSuccess && (
              <p className="mb-3 text-[13px] text-emerald-400">{passwordSuccess}</p>
            )}

            {passwordOpen && (
              <form onSubmit={handlePasswordChange} className="rounded-xl border border-border bg-surface p-6 space-y-4">
                <p className="text-[14px] leading-6 text-ink-secondary">
                  Update your password here. If you signed in with Google and do not have a password yet, leave current password empty.
                </p>

                {passwordError && (
                  <p className="text-[13px] text-red-400">{passwordError}</p>
                )}

                <div>
                  <label htmlFor="currentPassword" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-surface-card border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                    placeholder="Leave blank if this account has no password yet"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-surface-card border border-border text-[14px] text-ink-primary placeholder:text-ink-tertiary outline-none focus:border-accent/50 transition-colors"
                    placeholder="Create a new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-ink-secondary mb-1.5">
                    Confirm new password
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

                <div className="flex items-center justify-between gap-3 pt-2">
                  <p className="text-[12px] text-ink-tertiary">
                    Changing your password signs out other sessions.
                  </p>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-accent hover:bg-accent-dim disabled:opacity-70 text-white text-[13px] font-medium cursor-pointer transition-colors"
                  >
                    {passwordLoading ? "Saving..." : "Save password"}
                  </button>
                </div>
              </form>
            )}
          </motion.section>

          {/* License Keys */}
          <motion.section {...fade(0.1)} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-ink-tertiary" />
              <h2 className="text-lg font-semibold text-ink-primary">License Keys</h2>
            </div>

            {licenses.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center">
                <p className="text-[14px] text-ink-secondary mb-4">
                  No license keys yet. Buy redcore · Tuning once and your license key will appear here.
                </p>
                <a
                  href="/redcore-tuning"
                  className="inline-flex items-center justify-center h-10 px-6 text-[13px] font-medium rounded-lg text-ink-primary border border-border bg-surface-raised hover:border-border-strong transition-colors"
                >
                  Buy redcore · Tuning — $12.99 one-time
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {licenses.map((lic) => (
                  <div key={lic.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-ink-tertiary uppercase tracking-wider">
                        redcore · Tuning
                      </span>
                      <span className={`text-[11px] font-medium uppercase tracking-wider ${
                        lic.status === "active" ? "text-accent" : "text-ink-tertiary"
                      }`}>
                        {lic.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[15px] font-mono text-ink-primary tracking-wider">
                        {lic.licenseKey}
                      </code>
                      <CopyButton text={lic.licenseKey} />
                    </div>
                    <p className="text-[12px] text-ink-tertiary mt-2">
                      Purchased {new Date(lic.createdAt).toLocaleDateString()}
                      {lic.machineId && ` · Activated on ${lic.machineId}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Donations */}
          <motion.section {...fade(0.2)}>
            <div className="flex items-center gap-2 mb-4">
              <Heart size={16} className="text-ink-tertiary" />
              <h2 className="text-lg font-semibold text-ink-primary">Support</h2>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-[14px] text-ink-secondary mb-4">
                redcore · OS is free. Support development with a donation.
              </p>
              <a
                href="/donate"
                className="inline-flex items-center justify-center gap-2 h-10 px-6 text-[13px] font-medium rounded-lg text-ink-primary cursor-pointer border border-border hover:border-border-strong transition-colors"
              >
                <Heart size={14} />
                Donate
              </a>
            </div>
          </motion.section>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
