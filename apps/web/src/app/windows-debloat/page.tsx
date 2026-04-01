import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import {
  PageHero,
  QuickSummary,
  ComparisonBlock,
  TrustBlock,
  CTAStrip,
  RelatedPages,
} from "@/components/seo";
import { getRedcoreOsDownloadState } from "@/lib/downloads";
import { Shield, RotateCcw } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Windows Debloat — Guided, Reversible, Machine-Aware",
  description:
    "Debloat Windows safely with redcore OS. Scans your hardware, guided removal, and full rollback support. No blind scripts, no broken systems.",
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
      "Debloat Windows safely with hardware scanning and full rollback support.",
    url: "https://redcoreos.net/windows-debloat",
    type: "article",
  },
};

function buildJsonLd(downloadUrl: string | null) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "redcore OS",
    operatingSystem: "Windows 10, Windows 11",
    applicationCategory: "UtilitiesApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free Windows optimization tool with step-by-step debloating, hardware scanning, and full rollback support.",
    url: "https://redcoreos.net/redcore-os",
  };
  if (downloadUrl) {
    ld.downloadUrl = downloadUrl;
  }
  return ld;
}

export default async function WindowsDebloatPage() {
  const os = await getRedcoreOsDownloadState();
  const downloadUrl = os.available ? os.url : null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(downloadUrl)) }}
          />

          <PageHero
            overline="Windows Optimization"
            title="Windows Debloat — Guided, Reversible, Machine-Aware"
            description="Every Windows installation ships with software and services most users never asked for. Debloating removes this weight — but doing it blindly breaks things. Here's a better approach."
          />

          <QuickSummary
            items={[
              "What debloating actually means",
              "Why blind debloat scripts are risky",
              "How smart debloating works",
              "What gets removed vs preserved",
              "Work PC and gaming profile differences",
            ]}
          />

          <h2 className="text-xl font-semibold text-ink-primary mt-14 mb-4">
            What debloating actually means
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Debloating is removing or disabling pre-installed software,
            background services, telemetry endpoints, and UI elements that
            consume CPU, memory, disk, and network without providing value.
            On a stock Windows 11 install, there are 150+ background services
            running, dozens of scheduled tasks phoning home, and several
            gigabytes of apps most people never open.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The goal is straightforward: keep what you use, remove what you
            do not, and make sure the system still updates and functions
            correctly afterward.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-14 mb-4">
            Why blind debloat scripts are risky
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The most common approach is running a PowerShell script from
            GitHub or Reddit. These apply a fixed list of registry changes
            and service removals without knowing your hardware or use case.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-6">
            <li>
              <strong className="text-ink-primary">No rollback path.</strong>{" "}
              If a script disables a service your VPN depends on, reverting
              means manually hunting through registry exports or reinstalling.
            </li>
            <li>
              <strong className="text-ink-primary">Hardware-blind.</strong>{" "}
              A script for a gaming rig breaks Wi-Fi power management on a
              laptop or disables GPU scheduling on systems that benefit from it.
            </li>
            <li>
              <strong className="text-ink-primary">Context-blind.</strong>{" "}
              Removing Microsoft Store blocks app installation for users who
              depend on it. Disabling delivery optimization causes problems
              on managed corporate networks.
            </li>
          </ul>

          <ComparisonBlock
            title="What changes vs what stays"
            left={{
              heading: "Typically removed",
              items: [
                "Consumer telemetry and diagnostic data",
                "Pre-installed apps (Clipchamp, News, Solitaire)",
                "Advertising ID and activity tracking",
                "Widgets, Copilot, and AI integrations",
                "Search highlights and web results in Start",
                "Notification suggestions and tips",
                "Unnecessary scheduled tasks",
              ],
            }}
            right={{
              heading: "Always preserved",
              items: [
                "Windows Update functionality",
                "Windows Defender (unless alt AV present)",
                "Hardware drivers and firmware",
                "Print Spooler (on Work PCs)",
                "Remote Desktop (on Work PCs)",
                "VPN and domain services",
                "Store access (configurable)",
              ],
            }}
          />

          <h2 className="text-xl font-semibold text-ink-primary mt-14 mb-4">
            How redcore approaches debloating
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              redcore OS
            </Link>{" "}
            does not apply a fixed script. It runs a hardware and software
            assessment, classifies your machine into one of eight profiles,
            then presents a categorized plan. You review every change before
            anything is applied.
          </p>

          <div className="space-y-4 mt-8 mb-8">
            <TrustBlock
              icon={<Shield className="h-4 w-4 text-accent" />}
              title="Scans your hardware"
              description="Detects CPU, GPU, disk type, network adapters, power source, and installed software before generating recommendations. Laptops get different defaults than desktops."
            />
            <TrustBlock
              icon={<RotateCcw className="h-4 w-4 text-accent" />}
              title="Per-action rollback"
              description="Every change creates a granular restore snapshot. Roll back one change without affecting others — not a system restore point, but individual undo per action."
            />
          </div>

          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Eight profiles determine which changes are safe: Gaming, Work PC,
            Development, Privacy, Minimal, Balanced, Laptop, and Server. A{" "}
            <Link href="/work-pc-debloat" className="text-accent hover:text-accent-bright transition-colors">
              Work PC profile
            </Link>{" "}
            preserves printing, RDP, and Group Policy. A Gaming profile
            prioritizes latency and frame consistency.
          </p>

          <CTAStrip
            title="Ready to debloat safely?"
            description="redcore OS is free. Download it, run the assessment, and review the plan before applying anything."
            primaryAction={{ label: "Download redcore OS", href: downloadUrl ?? "/downloads" }}
            secondaryAction={{ label: "Windows 11 specific guide", href: "/windows-11-debloat" }}
          />

          <RelatedPages
            pages={[
              {
                title: "Windows 11 Debloat",
                description: "Remove Copilot, Recall, telemetry, and Edge nags specific to Windows 11.",
                href: "/windows-11-debloat",
              },
              {
                title: "Work PC Safe Debloat",
                description: "Clean up without breaking corporate infrastructure.",
                href: "/work-pc-debloat",
              },
              {
                title: "Why redcore",
                description: "Scans your PC, adapts to your setup.",
                href: "/why-redcore",
              },
            ]}
          />
        </article>
      </main>
      <FooterSection />
    </>
  );
}
