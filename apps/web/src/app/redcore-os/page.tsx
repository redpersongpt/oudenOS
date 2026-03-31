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
  title: "redcore OS — Free Windows Transformation Tool",
  description:
    "Free Windows transformation tool. Playbook-driven flow, 8 profiles, 150+ actions, Work PC preservation, full rollback. Scans your hardware, builds a plan, transforms your system.",
  keywords: [
    "redcore os",
    "windows transformation tool",
    "free windows optimizer",
    "windows debloat tool",
    "machine-aware windows optimization",
    "reversible windows changes",
  ],
  alternates: {
    canonical: "https://redcoreos.net/redcore-os",
  },
  openGraph: {
    title: "redcore OS — Free Windows Transformation Tool",
    description:
      "Scan your hardware, build a plan, transform your system. Free, guided, reversible.",
    url: "https://redcoreos.net/redcore-os",
    type: "website",
  },
};

function buildJsonLd(downloadUrl: string | null, version: string | null) {
  const ld: Record<string, unknown> = {
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
      "Free Windows transformation tool with guided debloating, 8 profiles, 150+ actions, and full rollback support.",
    url: "https://redcoreos.net/redcore-os",
    softwareVersion: version ?? "1.0",
    featureList: [
      "Machine-aware hardware scanning",
      "8 optimization profiles",
      "150+ system actions",
      "Full rollback support",
      "Work PC preservation",
      "Privacy hardening",
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
            title="redcore OS — Free Windows Transformation Tool"
            description="redcore OS is a desktop application that scans your Windows system, builds a hardware-aware optimization plan, and applies reversible changes across privacy, performance, shell customization, and bloatware removal. It is free to use."
          />

          <QuickSummary
            items={[
              "Free — no account, no subscription, no license key",
              "Installer-like wizard with guided step-by-step flow",
              "Playbook-driven: 150+ categorized actions across 8 domains",
              "8 profiles: Gaming, Work PC, Development, Privacy, Minimal, Balanced, Laptop, Server",
              "Machine-aware hardware scanning before any changes",
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
                  "redcore OS scans your CPU, GPU, disk type (NVMe/SSD/HDD), RAM, network adapters, power source, and installed software. This determines which optimizations are safe and beneficial for your specific machine.",
              },
              {
                title: "Classify",
                description:
                  "Based on scan results, redcore identifies your machine type — laptop vs desktop, gaming vs workstation, personal vs corporate. Domain membership, MDM agents, and enterprise software are detected automatically.",
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
                  "After execution, redcore verifies that critical services are running, network connectivity is intact, and no expected functionality was disrupted. Issues are flagged for immediate rollback.",
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
            description="Every change is logged with exact registry keys, service states, and file modifications. Roll back individual actions or the entire transformation. A system restore point is created before execution begins."
          />

          <TrustBlock
            icon={<Monitor className="h-5 w-5" />}
            title="Work PC safe"
            description="The Work PC profile preserves Group Policy, MDM enrollment, VPN configurations, Windows Defender for Endpoint, domain trust relationships, Print Spooler, RDP, and SMB. Corporate machines stay compliant."
          />

          <CTAStrip
            title="Download redcore OS"
            description="Free. No account required. Scan, review, apply, rollback. Windows 10 (21H2+) and Windows 11 supported."
            primaryAction={{
              label: "Go to downloads",
              href: downloadUrl ?? "/downloads",
            }}
            secondaryAction={{
              label: "See redcore Tuning",
              href: "/redcore-tuning",
            }}
          />

          <RelatedPages
            pages={[
              {
                title: "Downloads",
                description: "Download the latest redcore OS build. Free, no account required.",
                href: "/downloads",
              },
              {
                title: "redcore Tuning",
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
                title: "Why redcore",
                description:
                  "How redcore compares to blind debloat scripts and registry hacks.",
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
