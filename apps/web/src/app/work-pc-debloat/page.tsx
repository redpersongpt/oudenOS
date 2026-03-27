import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

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
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Work PC
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Work PC Debloat — Cleanup Without Breaking Corporate Infrastructure
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            You want to debloat your work computer — remove the telemetry,
            kill the suggestions, clean up the start menu — but you cannot
            afford to break printing, VPN, Remote Desktop, or Group Policy.
            Most debloat tools do not account for corporate dependencies.
            redcore OS does.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            The Work PC problem
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            A standard debloat script disables services indiscriminately.
            Print Spooler gets stopped — your network printer disappears.
            Remote Registry gets disabled — your IT department&apos;s
            management tools stop working. Windows Remote Management gets
            turned off — remote support breaks. SMB file sharing gets
            restricted — mapped network drives disconnect.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            These are not theoretical risks. They happen constantly when
            people run debloat scripts on work machines. The result is a
            support ticket, a reinstall, and a conversation with IT that
            nobody wants to have.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            What redcore preserves on Work PCs
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            When redcore OS detects a Work PC profile — based on domain
            membership, installed management agents, network configuration,
            and enterprise software presence — it automatically protects:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-6">
            <li><strong className="text-ink-primary">Print Spooler</strong> — network and local printing</li>
            <li><strong className="text-ink-primary">Remote Desktop (RDP)</strong> — remote access for IT support</li>
            <li><strong className="text-ink-primary">SMB/CIFS</strong> — network drive mapping and file sharing</li>
            <li><strong className="text-ink-primary">Group Policy Client</strong> — domain policy enforcement</li>
            <li><strong className="text-ink-primary">Windows Remote Management</strong> — remote administration</li>
            <li><strong className="text-ink-primary">Certificate Services</strong> — enterprise certificate chain</li>
            <li><strong className="text-ink-primary">VPN adapters and services</strong> — corporate network access</li>
            <li><strong className="text-ink-primary">WSUS/Windows Update for Business</strong> — managed update channels</li>
            <li><strong className="text-ink-primary">MDM enrollment</strong> — Intune/SCCM management</li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            What still gets cleaned up
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Preserving corporate infrastructure does not mean keeping all
            the bloat. The Work PC profile still removes or disables:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-6">
            <li>Consumer telemetry and advertising ID tracking</li>
            <li>Pre-installed consumer apps (Clipchamp, Solitaire, News)</li>
            <li>Start menu suggestions and lock screen tips</li>
            <li>Widgets panel and news feed</li>
            <li>Copilot integration (unless your org deploys it)</li>
            <li>Notification spam and feature announcements</li>
            <li>Search highlights and web results in Start</li>
            <li>Unnecessary scheduled tasks that waste CPU cycles</li>
          </ul>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The result is a faster, quieter work machine that still works
            correctly on your corporate network.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            How the detection works
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            redcore does not ask you to manually select &ldquo;Work
            PC&rdquo; from a dropdown. It detects the environment
            automatically by checking:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-6">
            <li>Active Directory domain membership</li>
            <li>Presence of MDM/SCCM/Intune agents</li>
            <li>Enterprise VPN client installation</li>
            <li>Network share mappings</li>
            <li>Group Policy registry keys</li>
            <li>Enterprise certificate stores</li>
          </ul>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            If corporate signals are detected, the Work PC profile activates
            and the transformation plan adjusts accordingly. You still see
            and approve every change before it runs.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Rollback if anything goes wrong
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Even with automatic preservation, every change creates a
            granular rollback point. If something unexpected breaks — a
            niche corporate tool that depends on an unusual Windows service
            — you undo that specific change without affecting the rest of
            the cleanup. Read more about{" "}
            <Link href="/why-redcore" className="text-accent hover:text-accent-bright transition-colors">
              how rollback works
            </Link>.
          </p>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              Clean up your work machine safely
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              redcore OS is free. Run the assessment on your work PC and
              review the plan before applying anything.
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
