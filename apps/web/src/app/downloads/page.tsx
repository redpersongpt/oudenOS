import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import { REDCORE_OS_DOWNLOAD, getLatestRedcoreOsDownloadManifest } from "@/lib/downloads";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Download redcore OS for free. Windows 10/11 x64. In-place system transformation with guided debloating and full rollback support.",
  alternates: {
    canonical: "https://redcoreos.net/downloads",
  },
  openGraph: {
    title: "Downloads | redcore",
    description: REDCORE_OS_DOWNLOAD.executableSummary,
    url: "https://redcoreos.net/downloads",
    type: "website",
  },
};

function formatSize(sizeBytes: number | undefined): string | null {
  if (!sizeBytes || sizeBytes <= 0) return null;
  const sizeMb = sizeBytes / (1024 * 1024);
  return `${sizeMb.toFixed(1)} MB`;
}

export default async function DownloadsPage() {
  const liveManifest = await getLatestRedcoreOsDownloadManifest();
  const currentChecksum = liveManifest?.sha256 ?? REDCORE_OS_DOWNLOAD.checksum;
  const currentRelease = liveManifest?.versionTag ?? liveManifest?.version ?? null;
  const currentSize = formatSize(liveManifest?.sizeBytes);

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Downloads
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Downloads
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-10">
            Download redcore tools for your Windows system. All downloads
            are standard Windows installers — no command line required.
          </p>

          {/* redcore OS */}
          <div className="border border-border rounded-lg p-6 bg-surface mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-ink-primary mb-1">
                  redcore OS
                </h2>
                <p className="text-ink-tertiary text-[13px]">
                  Free Windows transformation tool
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-[12px] font-medium text-accent">
                Available
              </span>
            </div>

            <p className="text-ink-secondary text-[14px] leading-relaxed mb-4">
              Scans your hardware, builds a machine-aware optimization plan,
              and applies reversible changes. Handles debloating, privacy
              hardening, shell cleanup, service optimization, and more.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <a
                href={REDCORE_OS_DOWNLOAD.path}
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Download redcore OS
              </a>
              <Link
                href="/redcore-os"
                className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors"
              >
                Learn more
              </Link>
            </div>

            {(currentRelease || currentSize) && (
              <p className="mb-4 text-[12px] text-ink-tertiary">
                {currentRelease ? `Current release ${currentRelease}` : "Current release available"}
                {currentSize ? ` · ${currentSize}` : ""}
              </p>
            )}

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-ink-tertiary text-[12px] font-mono mb-2">
                System requirements
              </p>
              <ul className="text-ink-tertiary text-[13px] space-y-1">
                <li>Windows 10 (21H2+) or Windows 11</li>
                <li>x64 architecture</li>
                <li>Administrator privileges</li>
                <li>500 MB free disk space</li>
              </ul>
            </div>
          </div>

          {/* redcore Tuning */}
          <div className="border border-border rounded-lg p-6 bg-surface opacity-75">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-ink-primary mb-1">
                  redcore Tuning
                </h2>
                <p className="text-ink-tertiary text-[13px]">
                  Machine-aware performance optimization — $12.99 one-time
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-ink-muted/20 px-3 py-1 text-[12px] font-medium text-ink-tertiary">
                Coming soon
              </span>
            </div>

            <p className="text-ink-secondary text-[14px] leading-relaxed mb-4">
              Deep system tuning: CPU scheduler, timer resolution, GPU
              optimization, memory configuration, power plans, and built-in
              benchmark lab. Goes beyond debloating into hardware-level
              optimization.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-tertiary cursor-not-allowed">
                Not yet available
              </span>
              <Link
                href="/redcore-tuning"
                className="text-[13px] text-ink-tertiary hover:text-ink-secondary transition-colors"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* Browser warning */}
          <div className="mt-8 rounded-lg border border-border bg-surface-raised p-5">
            <p className="text-[0.82rem] font-semibold text-ink-primary mb-2">
              Browser warning when downloading?
            </p>
            <p className="text-ink-secondary text-[13px] leading-relaxed mb-3">
              Chrome, Edge, and Windows SmartScreen may show a warning because
              the installer is not yet code-signed with an EV certificate.
              This is normal for new independent software. To proceed:
            </p>
            <ul className="text-ink-secondary text-[13px] leading-relaxed space-y-1 mb-3 pl-4">
              <li>Chrome: click &ldquo;Keep&rdquo; or &ldquo;Keep anyway&rdquo;</li>
              <li>Edge: click &ldquo;...&rdquo; → &ldquo;Keep&rdquo;</li>
              <li>SmartScreen: click &ldquo;More info&rdquo; → &ldquo;Run anyway&rdquo;</li>
            </ul>
            <p className="text-ink-tertiary text-[12px]">
              You can verify the file integrity with the SHA-256 checksum below.
            </p>
          </div>

          {/* Integrity */}
          <div className="mt-8 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-ink-primary mb-3">
              Verify your download
            </h2>
            <p className="text-ink-secondary text-[14px] leading-relaxed mb-4">
              The tool requires administrator privileges because it modifies
              system settings, services, and registry keys. A restore point
              is created before any changes. You can review the{" "}
              <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
                full description of what redcore OS does
              </Link>{" "}
              before running it.
            </p>
            <div className="rounded-lg bg-surface border border-border p-4">
              <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-ink-muted mb-2">
                SHA-256 Checksum — redcore-os-setup.exe
              </p>
              {currentChecksum ? (
                <code className="font-mono text-[0.72rem] text-ink-tertiary break-all select-all">
                  {currentChecksum}
                </code>
              ) : (
                <p className="text-[13px] text-ink-tertiary">
                  Live checksum is temporarily unavailable. Use <code className="font-mono text-[11px]">latest.json</code> or verify after download with PowerShell.
                </p>
              )}
            </div>
            <p className="mt-3 text-ink-muted text-[12px]">
              Verify in PowerShell: <code className="font-mono text-[11px]">Get-FileHash redcore-os-setup.exe</code>
            </p>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
