import type { Metadata } from "next";
import Link from "next/link";
import { Mail, HeartHandshake, Shield, ArrowRight } from "lucide-react";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

export const metadata: Metadata = {
  title: "Support",
  description: "Support, contact, and donation options for redcore.",
  alternates: {
    canonical: "https://redcoreos.net/support",
  },
  openGraph: {
    title: "redcore Support",
    description: "Support, contact, and donation options for redcore.",
    url: "https://redcoreos.net/support",
    type: "website",
    images: [
      {
        url: "/redcore-logo.png",
        width: 1200,
        height: 360,
        alt: "redcore logo",
      },
    ],
  },
};

const contactCards = [
  {
    title: "Support",
    value: "support@redcoreos.net",
    href: "mailto:support@redcoreos.net",
    description: "Product issues, install failures, and troubleshooting help.",
    icon: HeartHandshake,
  },
  {
    title: "Info",
    value: "info@redcoreos.net",
    href: "mailto:info@redcoreos.net",
    description: "General questions, partnerships, and product inquiries.",
    icon: Mail,
  },
  {
    title: "Security",
    value: "security@redcoreos.net",
    href: "mailto:security@redcoreos.net",
    description: "Responsible disclosure for security issues and sensitive reports.",
    icon: Shield,
  },
] as const;

export default function SupportPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-surface-base pt-24">
        <section className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-6 pb-20 sm:px-8 lg:px-16">
          <div className="max-w-3xl">
            <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-accent">
              redcore Support
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-ink-primary sm:text-5xl">
              Need help, want to donate, or just need a real contact path?
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-secondary sm:text-base">
              This page is the public support target used by redcore OS. If the app sends you here,
              you are in the right place. Use the mail paths below for direct contact, or go to the
              donation page if you want to support development financially.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {contactCards.map((card) => {
              const Icon = card.icon;
              return (
                <a
                  key={card.title}
                  href={card.href}
                  className="group rounded-3xl border border-border/70 bg-surface-elevated/60 p-6 transition-colors hover:border-accent/60 hover:bg-surface-elevated"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-ink-primary">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{card.description}</p>
                  <div className="mt-5 flex items-center justify-between gap-3 text-sm text-ink-primary">
                    <span className="truncate">{card.value}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="rounded-[28px] border border-border/70 bg-surface-elevated/60 p-7">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink-primary">
                Donation and Project Support
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-secondary">
                redcore OS is free to download. If it saved you time or fixed your system, the fastest
                way to support the project is through the public donation flow.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/donate"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Open Donation Page
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/downloads"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-ink-primary transition-colors hover:border-accent/50 hover:text-accent"
                >
                  Download Latest Installer
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-border/70 bg-surface-elevated/60 p-7">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink-primary">
                Before You Mail Us
              </h2>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-ink-secondary">
                <li>Include your Windows version, CPU, GPU, and the exact step where the issue happened.</li>
                <li>For installer problems, mention whether the error happened during setup or after launch.</li>
                <li>For OS wizard issues, say which step you were on: assessment, profile, review, execution, or reboot.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
