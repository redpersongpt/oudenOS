"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Key, Heart, LogOut, Copy, Check } from "lucide-react";
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
