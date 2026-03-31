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
// Download links point to /downloads which handles release truth via getRedcoreOsDownloadState().
import { Shield, RotateCcw } from "lucide-react";

export const metadata: Metadata = {
  title: "Windows 11 Debloat — Remove Copilot, Recall, Telemetry",
  description:
    "Remove Copilot, Recall, telemetry, widgets, and Edge nags from Windows 11. redcore OS handles Windows 11 specific bloat with guided, reversible removal.",
  keywords: [
    "windows 11 debloat",
    "debloat windows 11",
    "remove copilot windows 11",
    "remove recall windows 11",
    "windows 11 telemetry",
    "disable windows 11 bloatware",
  ],
  alternates: {
    canonical: "https://redcoreos.net/windows-11-debloat",
  },
  openGraph: {
    title:
      "Windows 11 Debloat — Remove Copilot, Recall, Telemetry | redcore",
    description:
      "Guided removal of Windows 11 specific bloat including Copilot, Recall, telemetry, and Edge browser forcing.",
    url: "https://redcoreos.net/windows-11-debloat",
    type: "article",
  },
};

export default function Windows11DebloatPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <article>
          <PageHero
            overline="Windows 11"
            title="Windows 11 Debloat — Remove Copilot, Recall, Telemetry"
            description="Windows 11 introduced a new generation of built-in features that many users did not ask for. From AI assistants to screenshot surveillance, the default installation is more opinionated than any previous Windows release. Here is what ships with Windows 11 that you might want to remove, and how redcore handles each one."
          />

          <QuickSummary
            items={[
              "Copilot and AI assistant removal",
              "Recall and activity history disabling",
              "Telemetry and diagnostic data blocking",
              "Widgets, suggestions, and notification cleanup",
              "Edge browser forcing and default app hijacking",
              "Pre-installed consumer app removal",
            ]}
          />

          <ComparisonBlock
            title="What gets removed vs what stays"
            left={{
              heading: "Removed or disabled",
              items: [
                "Copilot taskbar icon and background process",
                "Recall screenshot surveillance",
                "DiagTrack telemetry service",
                "Advertising ID and activity history",
                "Widgets panel and news feed",
                "Start menu suggestions and lock screen tips",
                "Edge browser nags and protocol hijacking",
                "Pre-installed apps (Clipchamp, Solitaire, News)",
                "Notification spam and feature announcements",
              ],
            }}
            right={{
              heading: "Preserved",
              items: [
                "Windows Update functionality",
                "Windows Defender (unless third-party AV present)",
                "Microsoft Store access (configurable)",
                "Hardware drivers and system stability components",
                "Xbox Game Bar (Gaming profile)",
                "Microsoft Teams (Work PC profile)",
                "Profile-matched app decisions",
              ],
            }}
          />

          <TrustBlock
            icon={<Shield className="h-5 w-5" />}
            title="Profile-aware removal"
            description="redcore does not apply a universal checklist. The profile system ensures that removals match your actual use case. Gaming keeps game services. Work PC keeps corporate tools. Privacy maximizes telemetry removal. Every action is reviewable before execution."
          />

          <TrustBlock
            icon={<RotateCcw className="h-5 w-5" />}
            title="Fully reversible"
            description="Every change is logged with exact registry keys, service states, and file modifications. A system restore point is created before execution. Roll back individual actions or the entire batch from within the tool."
          />

          <CTAStrip
            title="Clean up your Windows 11 installation"
            description="redcore OS scans your system, identifies what to remove, and lets you review everything before applying. Free to use, fully reversible."
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
                title: "Windows Debloat",
                description:
                  "General guide to debloating Windows 10 and 11 — what to remove, what to keep, and how redcore handles it.",
                href: "/windows-debloat",
              },
              {
                title: "redcore OS",
                description:
                  "Free Windows transformation tool. 8 profiles, 150+ actions, full rollback support.",
                href: "/redcore-os",
              },
              {
                title: "Downloads",
                description: "Download the latest redcore OS build. Free, no account required.",
                href: "/downloads",
              },
              {
                title: "Work PC Debloat",
                description:
                  "Safe debloating for corporate machines. Preserves Print, RDP, VPN, Group Policy, and MDM.",
                href: "/work-pc-debloat",
              },
            ]}
          />
        </article>
      </main>
      <FooterSection />
    </>
  );
}
