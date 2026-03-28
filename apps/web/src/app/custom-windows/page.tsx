import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Custom Windows Without Reinstalling — In-Place Transformation",
  description:
    "Transform your current Windows installation without reinstalling. redcore OS applies changes in-place — no custom ISO, no fresh install, no lost programs.",
  keywords: [
    "custom windows",
    "custom windows 11",
    "custom windows iso alternative",
    "windows in-place transformation",
    "modify windows without reinstall",
  ],
  alternates: {
    canonical: "https://redcoreos.net/custom-windows",
  },
  openGraph: {
    title:
      "Custom Windows Without Reinstalling — In-Place Transformation | redcore",
    description:
      "Transform your existing Windows install. No custom ISO, no reinstall, no lost programs or settings.",
    url: "https://redcoreos.net/custom-windows",
    type: "article",
  },
};

export default function CustomWindowsPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            In-Place Transformation
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Custom Windows Without Reinstalling
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            The traditional way to get a lean Windows installation is to
            build a custom ISO, wipe your drive, and start fresh. This works,
            but it costs hours of setup time and loses every installed
            program, driver configuration, and personal setting. redcore
            takes a different approach: it transforms your current
            installation in place.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            The custom ISO approach
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Tools like NTLite, MSMG Toolkit, and various community-built
            ISO projects let you strip components from a Windows image before
            installation. You download a Windows ISO, remove unwanted
            packages, inject drivers, and burn a new image. The result is a
            clean install with less bloat from the start.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            The tradeoffs of this approach:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-4">
            <li>
              <strong className="text-ink-primary">Full reinstall required.</strong>{" "}
              You lose all installed applications, user profiles, drive
              mappings, and system configurations. Rebuilding a fully
              configured workstation can take a full day.
            </li>
            <li>
              <strong className="text-ink-primary">Update fragility.</strong>{" "}
              Stripping components from the ISO can cause Windows Update to
              fail on certain cumulative updates when it expects components
              that were removed at image level.
            </li>
            <li>
              <strong className="text-ink-primary">One-time action.</strong>{" "}
              The customization happens at install time. As Windows updates
              add new features and re-enable settings, the system drifts back
              toward stock behavior.
            </li>
            <li>
              <strong className="text-ink-primary">Technical barrier.</strong>{" "}
              Building a custom ISO requires understanding DISM, package
              names, component dependencies, and image servicing. Most users
              rely on someone else&apos;s pre-built image, which introduces
              trust and maintenance concerns.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            In-place transformation with redcore
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              redcore OS
            </Link>{" "}
            works on your existing installation. You download the tool, run
            it, and it scans your current hardware and software environment.
            Based on the scan results and your selected profile, it builds a
            plan of changes — then applies them to your running system.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            What this means in practice:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-ink-secondary text-[15px] leading-relaxed mb-4">
            <li>
              <strong className="text-ink-primary">No reinstall.</strong>{" "}
              Your programs, files, drivers, and settings stay intact. The
              transformation runs alongside your existing environment.
            </li>
            <li>
              <strong className="text-ink-primary">Machine-aware.</strong>{" "}
              Because the tool scans your actual hardware (CPU model, GPU
              vendor, disk type, network adapters, battery status), it makes
              decisions that a pre-built ISO cannot. A laptop gets different
              power and network settings than a desktop tower.
            </li>
            <li>
              <strong className="text-ink-primary">Reversible.</strong>{" "}
              Every change is logged and can be rolled back. Custom ISOs
              offer no undo — if something breaks, you reinstall again.
            </li>
            <li>
              <strong className="text-ink-primary">Repeatable.</strong>{" "}
              After a major Windows update re-enables telemetry or reinstalls
              removed apps, you can re-run the tool to bring the system back
              to your preferred state.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            When a custom ISO still makes sense
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Custom ISOs have valid use cases: deploying identical images to
            many machines in an enterprise, building a known-good baseline
            for testing, or starting completely fresh on a new build. If you
            are deploying 50 workstations, an image-based approach with MDT
            or WDS is the right tool.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            For a single machine — your personal PC, your work laptop, your
            gaming rig — an in-place transformation saves time and risk. You
            keep what works, remove what does not, and have a way back if
            anything goes wrong.
          </p>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              Transform your Windows, keep your setup
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              No ISO burning, no USB booting, no reinstalling drivers.
              Download redcore OS, run the scan, review the plan, apply.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Download redcore OS
              </Link>
              <Link
                href="/why-redcore"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
              >
                See why redcore works
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
