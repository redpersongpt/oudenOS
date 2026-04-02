import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import {
  getRedcoreOsDownloadState,
  formatDownloadSize,
} from "@/lib/downloads";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Download OudenOS for free. Windows 10/11 x64. In-place system optimization with step-by-step debloating and full rollback support.",
  alternates: {
    canonical: "https://ouden.cc/downloads",
  },
  openGraph: {
    title: "Downloads | Ouden",
    description: "Download OudenOS for free. Windows 10/11 x64 installer.",
    url: "https://ouden.cc/downloads",
    type: "website",
  },
};

export default async function DownloadsPage() {
  const os = await getRedcoreOsDownloadState();

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-ink-secondary)] mb-4">
            Downloads
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
            Downloads
          </h1>

          <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-10">
            Download Ouden tools for your Windows system. All downloads
            are standard Windows installers — no command line required.
          </p>

          {/* OudenOS */}
          <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--surface)] mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                  OudenOS
                </h2>
                <p className="text-[var(--text-disabled)] text-[13px]">
                  Free Windows optimization tool
                </p>
              </div>
              {os.available ? (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white">
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-[12px] font-medium text-amber-500">
                  Temporarily unavailable
                </span>
              )}
            </div>

            <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed mb-4">
              Scans your hardware, builds a plan based on your actual hardware,
              and applies reversible changes. Handles debloating, privacy
              hardening, shell cleanup, service optimization, and more.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              {os.available && os.url ? (
                <a
                  href={os.url}
                  className="inline-flex items-center rounded-full bg-white px-8 py-3 text-[14px] font-bold text-black transition-all hover:bg-[#E8E8E8]"
                >
                  Download OudenOS{os.version ? ` ${os.version}` : ""}
                </a>
              ) : (
                <span className="inline-flex items-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-[13px] font-medium text-[var(--text-disabled)] cursor-not-allowed">
                  Download currently unavailable
                </span>
              )}
              <Link
                href="/redcore-os"
                className="text-[13px] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Learn more
              </Link>
            </div>

            {os.available && (os.versionTag || os.sizeBytes) && (
              <p className="mb-4 text-[12px] text-[var(--text-disabled)]">
                {os.versionTag ? `Release ${os.versionTag}` : ""}
                {os.sizeBytes ? ` · ${formatDownloadSize(os.sizeBytes)}` : ""}
                {os.commit ? ` · ${os.commit}` : ""}
              </p>
            )}

            {!os.available && os.unavailableReason && (
              <p className="mb-4 text-[12px] text-amber-500/80">
                {os.unavailableReason}. Check back shortly or visit the{" "}
                <a
                  href="https://github.com/redpersongpt/redcoreECO/releases"
                  className="underline hover:text-amber-400"
                >
                  GitHub releases
                </a>{" "}
                page.
              </p>
            )}

            <div className="border-t border-[var(--border)] pt-4 mt-4">
              <p className="text-[var(--text-disabled)] text-[12px] font-mono mb-2">
                System requirements
              </p>
              <ul className="text-[var(--text-disabled)] text-[13px] space-y-1">
                <li>Windows 10 (21H2+) or Windows 11</li>
                <li>x64 architecture</li>
                <li>Administrator privileges</li>
                <li>500 MB free disk space</li>
              </ul>
            </div>
          </div>

          {/* Ouden.Tuning */}
          <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--surface)] opacity-75">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                  Ouden.Tuning
                </h2>
                <p className="text-[var(--text-disabled)] text-[13px]">
                  Hardware-based performance optimization — $12.99 one-time
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-ink-muted/20 px-3 py-1 text-[12px] font-medium text-[var(--text-disabled)]">
                Coming soon
              </span>
            </div>

            <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed mb-4">
              Deep system tuning: CPU scheduler, timer resolution, GPU
              optimization, memory configuration, power plans, and built-in
              benchmark lab. Goes beyond debloating into hardware-level
              optimization.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-[13px] font-medium text-[var(--text-disabled)] cursor-not-allowed">
                Not yet available
              </span>
              <Link
                href="/redcore-tuning"
                className="text-[13px] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* Browser warning */}
          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-5">
            <p className="text-[0.82rem] font-semibold text-[var(--text-primary)] mb-2">
              Browser warning when downloading?
            </p>
            <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed mb-3">
              Chrome, Edge, and Windows SmartScreen may show a warning because
              the installer is not yet code-signed with an EV certificate.
              This is normal for new independent software. To proceed:
            </p>
            <ul className="text-[var(--text-secondary)] text-[13px] leading-relaxed space-y-1 mb-3 pl-4">
              <li>Chrome: click &ldquo;Keep&rdquo; or &ldquo;Keep anyway&rdquo;</li>
              <li>Edge: click &ldquo;...&rdquo; → &ldquo;Keep&rdquo;</li>
              <li>SmartScreen: click &ldquo;More info&rdquo; → &ldquo;Run anyway&rdquo;</li>
            </ul>
            <p className="text-[var(--text-disabled)] text-[12px]">
              You can verify the file integrity with the SHA-256 checksum below.
            </p>
          </div>

          {/* Integrity */}
          <div className="mt-8 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Verify your download
            </h2>
            <p className="text-[var(--text-secondary)] text-[14px] leading-relaxed mb-4">
              The tool requires administrator privileges because it modifies
              system settings, services, and registry keys. A restore point
              is created before any changes. You can review the{" "}
              <Link href="/redcore-os" className="text-[var(--color-ink-secondary)] hover:text-white transition-colors">
                full description of what OudenOS does
              </Link>{" "}
              before running it.
            </p>
            <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-4">
              <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[var(--text-disabled)] mb-2">
                SHA-256 Checksum — {os.manifest?.filename ?? "ouden-os-setup.exe"}
              </p>
              {os.sha256 ? (
                <code className="font-mono text-[0.72rem] text-[var(--text-disabled)] break-all select-all">
                  {os.sha256}
                </code>
              ) : (
                <p className="text-[13px] text-[var(--text-disabled)]">
                  Checksum unavailable. Verify after download with PowerShell.
                </p>
              )}
            </div>
            <p className="mt-3 text-[var(--text-disabled)] text-[12px]">
              Verify in PowerShell: <code className="font-mono text-[11px]">Get-FileHash ouden-os-setup.exe</code>
            </p>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
