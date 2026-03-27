import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Windows Debloat — Guided, Reversible, Machine-Aware",
  description:
    "Debloat Windows safely with redcore OS. Machine-aware scanning, guided removal, and full rollback support. No blind scripts, no broken systems.",
  keywords: [
    "windows debloat",
    "windows debloater",
    "debloat windows",
    "windows debloat tool",
    "safe windows debloat",
    "reversible debloat",
  ],
  alternates: {
    canonical: "https://redcoreos.net/windows-debloat",
  },
  openGraph: {
    title: "Windows Debloat — Guided, Reversible, Machine-Aware | redcore",
    description:
      "Debloat Windows safely with machine-aware scanning and full rollback support.",
    url: "https://redcoreos.net/windows-debloat",
    type: "article",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "redcore OS",
  operatingSystem: "Windows 10, Windows 11",
  applicationCategory: "UtilitiesApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free Windows transformation tool with guided debloating, machine-aware scanning, and full rollback support.",
  url: "https://redcoreos.net/redcore-os",
  downloadUrl: "https://redcoreos.net/downloads/os/redcore-os-setup.exe",
};

export default function WindowsDebloatPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Windows Optimization
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Windows Debloat — Guided, Reversible, Machine-Aware
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            Every Windows installation ships with software and services most
            users never asked for. Debloating removes this unnecessary weight
            to reclaim resources, reduce attack surface, and make your system
            feel like it belongs to you again.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            What debloating actually means
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Debloating is the process of removing or disabling pre-installed
            software, background services, telemetry endpoints, and UI elements
            that consume CPU, memory, disk, and network without providing value
            to the user. On a stock Windows 11 install, there are typically
            150+ background services running, dozens of scheduled tasks
            phoning home, and several gigabytes of apps most people never open.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The goal is straightforward: keep what you use, remove what you
            do not, and make sure the system still updates and functions
            correctly afterward.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Why blind debloat scripts are risky
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The most common approach to debloating is running a PowerShell
            script found on GitHub or Reddit. These scripts typically apply a
            fixed list of registry changes and service removals without knowing
            anything about your specific hardware, installed software, or use
            case.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The problems with this approach are real:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-4">
            <li>
              <strong className="text-ink-primary">No rollback path.</strong>{" "}
              If a script disables a service your VPN client depends on, or
              removes a component your employer&apos;s MDM requires, reverting
              means manually hunting through registry exports or reinstalling.
            </li>
            <li>
              <strong className="text-ink-primary">Hardware-blind.</strong>{" "}
              A script written for a desktop gaming rig will break Wi-Fi
              power management on a laptop, or disable GPU scheduling on a
              system that benefits from it.
            </li>
            <li>
              <strong className="text-ink-primary">Context-blind.</strong>{" "}
              Disabling Windows Update delivery optimization saves bandwidth
              at home but causes problems on managed corporate networks.
              Removing Microsoft Store blocks app installation for users who
              depend on it.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            How redcore approaches debloating differently
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              redcore OS
            </Link>{" "}
            does not apply a fixed script. It runs a hardware and software
            assessment first, builds a machine-specific profile, then presents
            a categorized plan of every change it intends to make. You review
            the plan before anything is applied.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Key differences from traditional debloat tools:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-4">
            <li>
              <strong className="text-ink-primary">Machine-aware.</strong>{" "}
              The tool detects your CPU, GPU, disk type, network adapters,
              power source, and installed software before generating
              recommendations. Laptop users get different defaults than
              desktop users.
            </li>
            <li>
              <strong className="text-ink-primary">Profile-driven.</strong>{" "}
              Eight profiles (Gaming, Work PC, Development, Privacy, Minimal,
              Balanced, Laptop, and Server) determine which changes are safe
              for your use case. A Work PC profile preserves corporate
              infrastructure. A Gaming profile prioritizes latency and
              frame consistency.
            </li>
            <li>
              <strong className="text-ink-primary">Fully reversible.</strong>{" "}
              Every change creates a restore point and logs exactly what was
              modified. Rolling back is a single action, not a guessing game.
            </li>
            <li>
              <strong className="text-ink-primary">Transparent.</strong>{" "}
              You see every registry key, every service, every scheduled task
              before it is touched. Nothing happens without your approval.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            What gets removed
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-6">
            The specific changes depend on your profile and hardware, but
            typical debloating actions include: removing pre-installed apps
            (Clipchamp, News, Solitaire, etc.), disabling telemetry and
            diagnostic data collection, stopping advertising ID tracking,
            removing Widgets and Copilot integration, disabling search
            highlights and web results in Start, taming notifications and
            suggestion prompts, and optimizing service startup types for
            services you are not using.
          </p>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              Ready to debloat safely?
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              redcore OS is free. Download it, run the assessment, review the
              plan, and apply only what makes sense for your machine.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Download redcore OS
              </Link>
              <Link
                href="/windows-11-debloat"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
              >
                Windows 11 specific guide
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
