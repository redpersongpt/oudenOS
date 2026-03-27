import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

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
    "Free Windows transformation tool with guided debloating, 8 profiles, 150+ actions, and full rollback support.",
  url: "https://redcoreos.net/redcore-os",
  downloadUrl: "https://redcoreos.net/downloads/os/redcore-os-setup.exe",
  softwareVersion: "1.0",
  featureList: [
    "Machine-aware hardware scanning",
    "8 optimization profiles",
    "150+ system actions",
    "Full rollback support",
    "Work PC preservation",
    "Privacy hardening",
  ],
};

export default function RedcoreOSPage() {
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
            Product
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            redcore OS — Free Windows Transformation Tool
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            redcore OS is a desktop application that scans your Windows
            system, builds a hardware-aware optimization plan, and applies
            reversible changes across privacy, performance, shell
            customization, and bloatware removal. It is free to use.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            How it works
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The tool follows a structured flow: assessment, profile
            selection, plan review, and execution.
          </p>
          <ol className="list-decimal pl-6 space-y-3 text-ink-secondary text-[15px] leading-relaxed mb-6">
            <li>
              <strong className="text-ink-primary">Hardware assessment.</strong>{" "}
              redcore OS scans your CPU, GPU, disk type (NVMe/SSD/HDD),
              RAM, network adapters, power source, and installed software.
              This information determines which optimizations are safe and
              beneficial for your specific machine.
            </li>
            <li>
              <strong className="text-ink-primary">Profile selection.</strong>{" "}
              You choose from eight profiles that represent different use
              cases. Each profile sets different defaults for which actions
              to apply and which to skip.
            </li>
            <li>
              <strong className="text-ink-primary">Plan review.</strong>{" "}
              Before anything is changed, you see the full list of actions
              grouped by category: privacy, performance, shell, services,
              apps, networking, security, and startup. Each action shows what
              it does, why it is recommended, and whether it is enabled or
              skipped for your profile.
            </li>
            <li>
              <strong className="text-ink-primary">Execution.</strong>{" "}
              After you approve the plan, redcore applies the changes. A
              restore point is created first. Every modification is logged
              for rollback.
            </li>
          </ol>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Eight profiles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[
              {
                name: "Gaming",
                desc: "Prioritizes latency, disables background noise, keeps game services.",
              },
              {
                name: "Work PC",
                desc: "Preserves corporate infrastructure, MDM, VPN, and enterprise services.",
              },
              {
                name: "Development",
                desc: "Keeps developer tools, WSL, Hyper-V, and debugging services intact.",
              },
              {
                name: "Privacy",
                desc: "Maximum telemetry removal, ad blocking, tracking prevention.",
              },
              {
                name: "Minimal",
                desc: "Strips everything non-essential. For users who know exactly what they need.",
              },
              {
                name: "Balanced",
                desc: "Moderate cleanup. Good starting point for most users.",
              },
              {
                name: "Laptop",
                desc: "Optimizes for battery life, Wi-Fi stability, and power management.",
              },
              {
                name: "Server",
                desc: "Disables desktop features, keeps network and remote management tools.",
              },
            ].map((profile) => (
              <div
                key={profile.name}
                className="border border-border rounded-lg p-4 bg-surface"
              >
                <p className="text-ink-primary font-semibold text-[14px] mb-1">
                  {profile.name}
                </p>
                <p className="text-ink-tertiary text-[13px] leading-relaxed">
                  {profile.desc}
                </p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            150+ categorized actions
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Actions are organized into playbook categories:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-4">
            <li>
              <strong className="text-ink-primary">Privacy</strong> —
              Telemetry, diagnostic data, advertising ID, Copilot, Recall,
              activity history, input collection.
            </li>
            <li>
              <strong className="text-ink-primary">Performance</strong> —
              CPU scheduler priority, GPU optimizations, power plan,
              visual effects, prefetch/superfetch tuning.
            </li>
            <li>
              <strong className="text-ink-primary">Shell</strong> —
              Taskbar cleanup, Explorer settings, Start menu layout,
              search configuration, ads and tips removal.
            </li>
            <li>
              <strong className="text-ink-primary">Services</strong> —
              Disable unused services, optimize startup types, remove
              consumer services on machines that do not need them.
            </li>
            <li>
              <strong className="text-ink-primary">Apps</strong> —
              Remove pre-installed bloatware, Edge forcing, third-party
              bundled apps.
            </li>
            <li>
              <strong className="text-ink-primary">Networking</strong> —
              DNS optimization, adapter tuning, latency reduction for
              gaming profiles.
            </li>
            <li>
              <strong className="text-ink-primary">Security</strong> —
              Windows Update control, firewall hardening, UAC configuration.
            </li>
            <li>
              <strong className="text-ink-primary">Startup</strong> —
              Boot optimization, startup program management, fast
              shutdown configuration.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Rollback and safety
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Every change redcore OS makes is logged with the exact registry
            keys, service states, and file modifications involved. A system
            restore point is created before execution begins. If any change
            causes an issue, you can roll back individual actions or the
            entire transformation from within the tool.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The Work PC profile is specifically designed for machines managed
            by an employer. It preserves Group Policy settings, MDM
            enrollment, VPN configurations, Windows Defender for Endpoint,
            and domain trust relationships.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            System requirements
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-ink-secondary text-[15px] leading-relaxed mb-6">
            <li>Windows 10 (21H2 or later) or Windows 11</li>
            <li>x64 architecture</li>
            <li>Administrator privileges</li>
            <li>500 MB free disk space</li>
          </ul>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              Download redcore OS
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              Free. No account required. Scan, review, apply, rollback.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Go to downloads
              </Link>
              <Link
                href="/redcore-tuning"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
              >
                See redcore Tuning
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
