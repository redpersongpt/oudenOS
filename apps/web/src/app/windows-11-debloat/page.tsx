import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

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
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Windows 11
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Windows 11 Debloat — Remove Copilot, Recall, Telemetry
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            Windows 11 introduced a new generation of built-in features that
            many users did not ask for. From AI assistants to screenshot
            surveillance, the default installation is more opinionated than
            any previous Windows release. Here is what ships with Windows 11
            that you might want to remove, and how redcore handles each one.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Copilot and AI features
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Microsoft embedded Copilot directly into the taskbar and shell
            starting with Windows 11 23H2. It runs a background process,
            maintains a persistent icon, and integrates into right-click
            context menus. For users who do not use it, this is wasted memory
            and visual clutter. redcore&apos;s privacy playbook disables Copilot
            at the policy level, removes the taskbar icon, and prevents the
            background process from launching at startup.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Recall and activity history
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Recall is Microsoft&apos;s feature that takes periodic screenshots
            of your desktop to build a searchable timeline of your activity.
            Even with on-device processing, many users consider this a
            significant privacy concern. redcore disables Recall through
            group policy, prevents the related services from running, and
            removes the UI entry points. Activity history and timeline
            features are also disabled for users who select privacy-focused
            profiles.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Telemetry and diagnostic data
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Windows 11 sends diagnostic data, usage statistics, typing
            patterns, inking data, and app usage telemetry to Microsoft
            servers. The &ldquo;Required&rdquo; telemetry level still
            transmits a substantial amount of data. redcore sets telemetry to
            the minimum level allowed by your Windows edition, disables the
            Connected User Experiences and Telemetry service
            (DiagTrack), blocks known telemetry endpoints through host file
            entries, and disables the Diagnostics Hub data collection.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Widgets, suggestions, and notifications
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The Widgets panel shows news, weather, stocks, and advertising
            content, consuming memory and network bandwidth for a feature
            many users never open. Lock screen suggestions, Start menu
            recommendations, and notification &ldquo;tips&rdquo; are all
            advertising mechanisms built into the shell. redcore removes
            the Widgets taskbar entry, disables suggestion notifications,
            cleans up Start menu layout, and stops the background feed
            processes.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Edge browser forcing and default app hijacking
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Windows 11 aggressively promotes Edge through search results,
            protocol handling, and periodic default browser resets. Clicking
            links in Widgets, Start menu search, or Outlook opens Edge
            regardless of your default browser setting. redcore addresses
            this by modifying the relevant protocol handlers so your chosen
            default browser is respected, and disabling the nag prompts that
            appear when you try to change defaults.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Pre-installed apps
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            A fresh Windows 11 install comes with Clipchamp, Microsoft News,
            Solitaire Collection, Xbox Game Bar (if you do not game),
            Microsoft Teams personal, and various other appx packages. These
            consume disk space, appear in the Start menu, and some run
            background tasks. redcore presents the full list grouped by
            category and lets you choose which to remove. The Gaming profile
            keeps Xbox Game Bar. The Work PC profile keeps Teams. Every
            other profile removes apps based on relevance.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            What redcore preserves
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Debloating Windows 11 is not about removing everything. redcore
            preserves Windows Update functionality, Windows Defender (unless
            you have a third-party AV), Store access (configurable),
            hardware drivers, and any component tied to system stability. The{" "}
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              profile system
            </Link>{" "}
            ensures that removals match your actual use case rather than
            applying a universal checklist.
          </p>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              Clean up your Windows 11 installation
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              redcore OS scans your system, identifies what to remove, and
              lets you review everything before applying. Free to use, fully
              reversible.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Download redcore OS
              </Link>
              <Link
                href="/windows-debloat"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
              >
                General debloat guide
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
