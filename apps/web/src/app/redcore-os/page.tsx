import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import {
  PageHero,
  QuickSummary,
  ProcessSteps,
  TrustBlock,
  ComparisonBlock,
  CTAStrip,
  RelatedPages,
} from "@/components/seo";
import { getRedcoreOsDownloadState } from "@/lib/downloads";
import { RotateCcw, Monitor } from "lucide-react";

export const metadata: Metadata = {
  title: "OudenOS — Free Windows Optimization Tool",
  description:
    "Free Windows optimization tool. 250 reversible actions, 8 profiles, Work PC safe, full rollback. Scans your hardware, builds a plan, optimizes your system.",
  keywords: [
    "ouden os",
    "windows optimization tool",
    "free windows optimizer",
    "windows debloat tool",
    "windows optimization",
    "reversible windows changes",
  ],
  alternates: {
    canonical: "https://ouden.cc/redcore-os",
  },
  openGraph: {
    title: "OudenOS — Free Windows Optimization Tool",
    description:
      "Scan your hardware, build a plan, transform your system. Free, guided, reversible.",
    url: "https://ouden.cc/redcore-os",
    type: "website",
  },
};

function buildJsonLd(downloadUrl: string | null, version: string | null) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OudenOS",
    operatingSystem: "Windows 10, Windows 11",
    applicationCategory: "UtilitiesApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Free Windows optimization tool with step-by-step debloating, 8 profiles, 250 actions, and full rollback support.",
    url: "https://ouden.cc/redcore-os",
    softwareVersion: version ?? "1.0",
    featureList: [
      "Scans your hardware first",
      "5 PC profiles",
      "250 reversible changes",
      "Undo any change",
      "Safe for work PCs",
      "Kills telemetry",
    ],
  };
  // Only emit downloadUrl when a real validated artifact URL exists
  if (downloadUrl) {
    ld.downloadUrl = downloadUrl;
  }
  return ld;
}

export default async function RedcoreOSPage() {
  const os = await getRedcoreOsDownloadState();
  const downloadUrl = os.available ? os.url : null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <article>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(downloadUrl, os.version)) }}
          />

          <PageHero
            overline="Product"
            title="OudenOS — Free Windows Optimization Tool"
            description="OudenOS is a desktop application that scans your Windows system, builds a hardware-aware optimization plan, and applies reversible changes across privacy, performance, shell customization, and bloatware removal. It is free to use."
          />

          <QuickSummary
            items={[
              "Free — no account, no subscription, no license key",
              "Installer-like wizard with guided step-by-step flow",
              "250 categorized actions across privacy, performance, gaming, network, shell",
              "8 profiles: Gaming, Work PC, Development, Privacy, Minimal, Balanced, Laptop, Server",
              "Hardware-based hardware scanning before any changes",
              "Full rollback support with granular undo",
              "Work PC preservation for corporate environments",
              "Not open source — proprietary, free product",
            ]}
          />

          <ProcessSteps
            steps={[
              {
                title: "Scan",
                description:
                  "OudenOS scans your CPU, GPU, disk type (NVMe/SSD/HDD), RAM, network adapters, power source, and installed software. This determines which optimizations are safe and beneficial for your specific machine.",
              },
              {
                title: "Classify",
                description:
                  "Based on scan results, Ouden identifies your machine type — laptop vs desktop, gaming vs workstation, personal vs corporate. Domain membership, MDM agents, and enterprise software are detected automatically.",
              },
              {
                title: "Plan",
                description:
                  "You choose from 8 profiles and see the full list of actions grouped by category: privacy, performance, shell, services, apps, networking, security, and startup. Each action shows what it does and whether it is enabled or skipped for your profile.",
              },
              {
                title: "Execute",
                description:
                  "After you approve the plan, a system restore point is created first. Every modification is logged for rollback. Changes are applied in dependency order with validation checks.",
              },
              {
                title: "Validate",
                description:
                  "After execution, Ouden verifies that critical services are running, network connectivity is intact, and no expected functionality was disrupted. Issues are flagged for immediate rollback.",
              },
            ]}
          />

          <ComparisonBlock
            title="What changes vs what stays"
            left={{
              heading: "Changed or removed",
              items: [
                "Telemetry and diagnostic data collection",
                "Copilot, Recall, and AI features",
                "Pre-installed consumer apps",
                "Widgets, suggestions, and ad notifications",
                "Unnecessary background services",
                "Edge browser forcing and protocol hijacking",
                "Scheduled tasks that waste CPU cycles",
                "Visual effects that hurt performance",
              ],
            }}
            right={{
              heading: "Always preserved",
              items: [
                "Windows Update functionality",
                "Windows Defender (configurable)",
                "Hardware drivers and kernel components",
                "System stability services",
                "Profile-specific tools (Xbox, Teams, WSL)",
                "Corporate infrastructure (Work PC profile)",
                "Network connectivity and VPN",
                "User files and application data",
              ],
            }}
          />

          <TrustBlock
            icon={<RotateCcw className="h-5 w-5" />}
            title="Full rollback at every level"
            description="Every change is logged with exact registry keys, service states, and file modifications. Roll back individual actions or the entire optimization. A system restore point is created before execution begins."
          />

          <TrustBlock
            icon={<Monitor className="h-5 w-5" />}
            title="Work PC safe"
            description="The Work PC profile preserves Group Policy, MDM enrollment, VPN configurations, Windows Defender for Endpoint, domain trust relationships, Print Spooler, RDP, and SMB. Corporate machines stay compliant."
          />

          <CTAStrip
            title="Download OudenOS"
            description="Free. No account required. Scan, review, apply, rollback. Windows 10 (21H2+) and Windows 11 supported."
            primaryAction={{
              label: "Go to downloads",
              href: downloadUrl ?? "/downloads",
            }}
            secondaryAction={{
              label: "See Ouden.Tuning",
              href: "/redcore-tuning",
            }}
          />

          <RelatedPages
            pages={[
              {
                title: "Downloads",
                description: "Download the latest OudenOS build. Free, no account required.",
                href: "/downloads",
              },
              {
                title: "Ouden.Tuning",
                description:
                  "Hardware-level optimization. CPU scheduler, timer resolution, GPU tuning, memory management. $12.99 one-time.",
                href: "/redcore-tuning",
              },
              {
                title: "Windows Debloat",
                description:
                  "General guide to debloating Windows — what to remove, what to keep.",
                href: "/windows-debloat",
              },
              {
                title: "Why Ouden",
                description:
                  "How Ouden compares to blind debloat scripts and registry hacks.",
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
