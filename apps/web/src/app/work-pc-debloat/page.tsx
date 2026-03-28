import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import {
  PageHero,
  QuickSummary,
  ComparisonBlock,
  TrustBlock,
  ProcessSteps,
  CTAStrip,
  RelatedPages,
} from "@/components/seo";
import { REDCORE_OS_DOWNLOAD } from "@/lib/downloads";
import { Eye, RotateCcw } from "lucide-react";

export const metadata: Metadata = {
  title: "Work PC Debloat — Safe Windows Cleanup for Corporate Machines",
  description:
    "Debloat your work PC without breaking printing, VPN, RDP, Group Policy, or domain services. redcore OS detects corporate dependencies and preserves them automatically.",
  keywords: [
    "work pc debloat",
    "work pc safe debloat",
    "corporate windows cleanup",
    "debloat windows work computer",
    "safe windows optimization work",
    "office pc debloat",
  ],
  alternates: {
    canonical: "https://redcoreos.net/work-pc-debloat",
  },
  openGraph: {
    title: "Work PC Debloat — Safe Windows Cleanup for Corporate Machines | redcore",
    description:
      "Debloat your work PC without breaking corporate infrastructure. Print, RDP, VPN, Group Policy — all preserved.",
    url: "https://redcoreos.net/work-pc-debloat",
    type: "article",
  },
};

export default function WorkPCDebloatPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <article>
          <PageHero
            overline="Work PC"
            title="Work PC Debloat — Cleanup Without Breaking Corporate Infrastructure"
            description="You want to debloat your work computer — remove the telemetry, kill the suggestions, clean up the start menu — but you cannot afford to break printing, VPN, Remote Desktop, or Group Policy. Most debloat tools do not account for corporate dependencies. redcore OS does."
          />

          <QuickSummary
            items={[
              "Print Spooler, RDP, SMB, Group Policy — all preserved",
              "VPN adapters, MDM enrollment, certificate services — untouched",
              "Consumer telemetry, bloatware, suggestions — removed",
              "Automatic corporate environment detection",
              "Full rollback for every individual change",
              "Free to use, no account required",
            ]}
          />

          <ComparisonBlock
            title="What gets preserved vs what gets removed"
            left={{
              heading: "Preserved on Work PCs",
              items: [
                "Print Spooler — network and local printing",
                "Remote Desktop (RDP) — IT support access",
                "SMB/CIFS — network drive mapping and file sharing",
                "Group Policy Client — domain policy enforcement",
                "Windows Remote Management — remote administration",
                "Certificate Services — enterprise certificate chain",
                "VPN adapters and services — corporate network access",
                "WSUS/Windows Update for Business — managed updates",
                "MDM enrollment — Intune/SCCM management",
              ],
            }}
            right={{
              heading: "Removed or disabled",
              items: [
                "Consumer telemetry and advertising ID tracking",
                "Pre-installed apps (Clipchamp, Solitaire, News)",
                "Start menu suggestions and lock screen tips",
                "Widgets panel and news feed",
                "Copilot integration (unless org-deployed)",
                "Notification spam and feature announcements",
                "Search highlights and web results in Start",
                "Unnecessary scheduled tasks",
              ],
            }}
          />

          <ProcessSteps
            steps={[
              {
                title: "Environment detection",
                description:
                  "redcore checks Active Directory domain membership, MDM/SCCM/Intune agents, enterprise VPN clients, network share mappings, Group Policy registry keys, and enterprise certificate stores.",
              },
              {
                title: "Work PC profile activation",
                description:
                  "If corporate signals are detected, the Work PC profile activates automatically. Every action that could interfere with managed infrastructure is excluded from the plan.",
              },
              {
                title: "Plan review",
                description:
                  "You see the full list of actions with clear labels showing what is preserved and why. Override any individual action if needed. Nothing runs without your approval.",
              },
              {
                title: "Safe execution with rollback",
                description:
                  "A restore point is created first. Every change is logged with exact parameters. If a niche corporate tool breaks, undo that specific change without affecting the rest of the cleanup.",
              },
            ]}
          />

          <TrustBlock
            icon={<Eye className="h-5 w-5" />}
            title="Automatic detection, not a dropdown"
            description="redcore does not ask you to manually select Work PC from a list. It detects domain membership, management agents, VPN clients, network shares, and enterprise certificates automatically. The plan adjusts before you ever see it."
          />

          <TrustBlock
            icon={<RotateCcw className="h-5 w-5" />}
            title="Granular rollback for corporate environments"
            description="Even with automatic preservation, every change creates a granular rollback point. If something unexpected breaks — a niche corporate tool that depends on an unusual Windows service — undo that specific change without affecting the rest."
          />

          <CTAStrip
            title="Clean up your work machine safely"
            description="redcore OS is free. Run the assessment on your work PC and review the plan before applying anything. Corporate infrastructure stays intact."
            primaryAction={{
              label: "Download redcore OS",
              href: "/downloads",
            }}
            secondaryAction={{
              label: "General debloat guide",
              href: "/windows-debloat",
            }}
          />

          <RelatedPages
            pages={[
              {
                title: "Downloads",
                description: REDCORE_OS_DOWNLOAD.marketingSummary,
                href: "/downloads",
              },
              {
                title: "redcore OS",
                description:
                  "Free Windows transformation tool. 8 profiles, 150+ actions, full rollback.",
                href: "/redcore-os",
              },
              {
                title: "Windows Debloat",
                description:
                  "General guide to debloating Windows 10 and 11.",
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
