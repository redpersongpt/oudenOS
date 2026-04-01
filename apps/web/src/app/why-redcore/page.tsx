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
import { Cpu, RotateCcw, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Why redcore — Guided Optimization vs Blind Debloat Scripts",
  description:
    "Why redcore is different from debloat scripts and registry hacks. Scans your hardware, changes based on your PC type, Work-PC-safe, full rollback, validation before execution.",
  keywords: [
    "guided windows optimization",
    "rollback safe optimizer",
    "safe windows debloat",
    "windows optimizer vs scripts",
    "windows debloat tool",
  ],
  alternates: {
    canonical: "https://redcoreos.net/why-redcore",
  },
  openGraph: {
    title:
      "Why redcore — Guided Optimization vs Blind Debloat Scripts",
    description:
      "Scans your PC first, adapts to what it finds, safe for work PCs, and every change is reversible.",
    url: "https://redcoreos.net/why-redcore",
    type: "article",
  },
};

export default async function WhyRedcorePage() {
  const os = await getRedcoreOsDownloadState();

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <article>
          <PageHero
            overline="Why redcore"
            title="Guided Optimization vs Blind Debloat Scripts"
            description="There are many ways to optimize a Windows installation. Most of them involve copying a script from the internet and running it with administrator privileges. redcore takes a different approach — one built around understanding your machine before changing it."
          />

          <QuickSummary
            items={[
              "Scans your hardware before any changes",
              "8 profiles for different use cases (Gaming, Work PC, Dev, Privacy...)",
              "Full plan review before execution — nothing runs without approval",
              "Structured rollback for individual actions or full batch",
              "Work PC safe — corporate infrastructure preserved automatically",
              "Validation pass after execution to catch issues immediately",
            ]}
          />

          <ComparisonBlock
            title="Blind scripts vs redcore"
            left={{
              heading: "Typical debloat scripts",
              items: [
                "No hardware awareness — same changes for laptop and desktop",
                "No use case awareness — breaks Teams on work PCs, Docker for devs",
                "No structured rollback — guess which of 200 registry changes broke Wi-Fi",
                "No review step — runs immediately with admin privileges",
                "No validation — you discover problems days later",
                "Author wrote it for their system, not yours",
              ],
            }}
            right={{
              heading: "redcore OS",
              items: [
                "Scans CPU, GPU, disk, RAM, network, power source first",
                "8 profiles with per-action granularity",
                "Every change logged with exact parameters for rollback",
                "Full plan review with enable/skip toggles per action",
                "Post-execution validation of services and connectivity",
                "150+ actions categorized across 8 domains",
              ],
            }}
          />

          <TrustBlock
            icon={<Cpu className="h-5 w-5" />}
            title="Hardware-based decisions"
            description="A laptop with an Intel CPU and integrated graphics gets different recommendations than a desktop with an AMD CPU and discrete NVIDIA GPU. Power throttling, timer resolution, service priorities — all adapt to your actual hardware."
          />

          <TrustBlock
            icon={<RotateCcw className="h-5 w-5" />}
            title="Granular rollback"
            description="Every applied change is logged with the exact registry key path, previous value, new value, service name, and previous startup type. Roll back one action or the entire batch. No guessing which line in a 500-line script caused the problem."
          />

          <TrustBlock
            icon={<Shield className="h-5 w-5" />}
            title="Work PC safe by default"
            description="redcore detects domain membership, MDM enrollment, enterprise VPN clients, and Group Policy keys. The Work PC profile activates automatically and excludes actions that would interfere with managed infrastructure."
          />

          <CTAStrip
            title="See the difference yourself"
            description="Download redcore OS, run the assessment, and look at the plan it builds for your specific machine. You do not have to apply anything to see how it works. Free, no account required."
            primaryAction={{
              label: "Download redcore OS",
              href: os.available && os.url ? os.url : "/downloads",
            }}
            secondaryAction={{
              label: "Learn about redcore OS",
              href: "/redcore-os",
            }}
          />

          <RelatedPages
            pages={[
              {
                title: "redcore OS",
                description:
                  "Free Windows optimization tool. 8 profiles, 150+ actions, full rollback.",
                href: "/redcore-os",
              },
              {
                title: "redcore Tuning",
                description:
                  "Hardware-level optimization for CPU, GPU, memory, and disk. $12.99 one-time.",
                href: "/redcore-tuning",
              },
              {
                title: "Windows Debloat",
                description:
                  "General guide to debloating Windows 10 and 11.",
                href: "/windows-debloat",
              },
              {
                title: "Downloads",
                description: "Download the latest redcore OS build. Free, no account required.",
                href: "/downloads",
              },
            ]}
          />
        </article>
      </main>
      <FooterSection />
    </>
  );
}
