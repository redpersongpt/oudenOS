import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why redcore — Guided Optimization vs Blind Debloat Scripts",
  description:
    "Why redcore is different from debloat scripts and registry hacks. Machine-aware scanning, profile-driven changes, Work-PC-safe, full rollback, validation before execution.",
  keywords: [
    "guided windows optimization",
    "rollback safe optimizer",
    "safe windows debloat",
    "windows optimizer vs scripts",
    "machine-aware windows tool",
  ],
  alternates: {
    canonical: "https://redcoreos.net/why-redcore",
  },
  openGraph: {
    title:
      "Why redcore — Guided Optimization vs Blind Debloat Scripts",
    description:
      "Machine-aware, profile-driven, Work-PC-safe, rollback-capable. Why redcore is different.",
    url: "https://redcoreos.net/why-redcore",
    type: "article",
  },
};

export default function WhyRedcorePage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Why redcore
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Guided Optimization vs Blind Debloat Scripts
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            There are many ways to optimize a Windows installation. Most of
            them involve copying a script from the internet and running it
            with administrator privileges. redcore takes a different
            approach — one built around understanding your machine before
            changing it.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            The problem with scripts and registry hacks
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            A typical debloat workflow looks like this: find a
            recommended PowerShell script on Reddit or GitHub, read through
            the comments to check if anyone reported problems, run it, and
            hope for the best. If something breaks, you search for which
            specific line caused it and try to reverse the change manually.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            This approach has three fundamental issues:
          </p>
          <ul className="list-disc pl-6 space-y-3 text-ink-secondary text-[15px] leading-relaxed mb-4">
            <li>
              <strong className="text-ink-primary">
                Scripts do not know your hardware.
              </strong>{" "}
              A script that disables power throttling helps a desktop but
              drains battery on a laptop. A script that sets aggressive
              timer resolution is useful for a gaming desktop but wastes
              power on a workstation. The script author wrote it for their
              system. Your system is different.
            </li>
            <li>
              <strong className="text-ink-primary">
                Scripts do not know your use case.
              </strong>{" "}
              Disabling Windows Defender makes sense if you run a
              third-party antivirus. It is dangerous if you do not.
              Removing Microsoft Teams breaks your employer&apos;s
              communication tools. Disabling Hyper-V kills Docker and WSL2
              for developers. A one-size script cannot account for who you
              are.
            </li>
            <li>
              <strong className="text-ink-primary">
                Scripts offer no structured rollback.
              </strong>{" "}
              When a change causes a problem — Wi-Fi stops working, a VPN
              client breaks, an app will not launch — you have to figure
              out which of the 200 registry changes in the script caused
              it. There is no undo button. The best case is a system restore
              point you hopefully created before running the script.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            How redcore solves each problem
          </h2>

          <h3 className="text-lg font-semibold text-ink-primary mt-8 mb-3">
            Machine-aware scanning
          </h3>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Before recommending any changes,{" "}
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              redcore OS
            </Link>{" "}
            scans your CPU, GPU, disk type, network adapters, power source,
            installed software, and Windows edition. A laptop with an Intel
            CPU and integrated graphics gets different recommendations than
            a desktop with an AMD CPU and discrete NVIDIA GPU. This is not
            a cosmetic feature — it changes which actions are enabled,
            skipped, or flagged for review.
          </p>

          <h3 className="text-lg font-semibold text-ink-primary mt-8 mb-3">
            Profile-driven changes
          </h3>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Eight profiles determine the default set of actions. A Gaming
            profile disables background services that compete for CPU time.
            A Work PC profile preserves every enterprise component — Group
            Policy, MDM, VPN, domain trust, Defender for Endpoint. A
            Privacy profile maximizes telemetry removal. A Development
            profile keeps WSL, Hyper-V, debugging tools, and developer
            mode intact.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            You can override any individual action after profile selection.
            The profiles are starting points, not locked configurations.
          </p>

          <h3 className="text-lg font-semibold text-ink-primary mt-8 mb-3">
            Full review before execution
          </h3>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Nothing is applied without your approval. After scanning and
            profile selection, redcore presents every planned action
            grouped by category. Each action shows what it changes, why it
            is recommended for your profile, and whether it is marked as
            safe, moderate, or aggressive. You review the full plan, toggle
            individual actions, and only then approve execution.
          </p>

          <h3 className="text-lg font-semibold text-ink-primary mt-8 mb-3">
            Structured rollback
          </h3>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Every applied change is logged with its exact parameters — the
            registry key path, the previous value, the new value, the
            service name and its previous startup type. A system restore
            point is created before execution. You can roll back individual
            actions or the entire batch from within the tool. No guessing
            which line in a 500-line script caused the problem.
          </p>

          <h3 className="text-lg font-semibold text-ink-primary mt-8 mb-3">
            Work PC safety
          </h3>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Running a debloat script on a company laptop is a common way to
            break VPN, lose access to internal resources, or trigger an MDM
            compliance alert. redcore&apos;s Work PC profile was built
            specifically for this scenario. It detects domain membership,
            MDM enrollment, and enterprise security software, then excludes
            actions that would interfere with managed infrastructure.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Beyond debloating
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-6">
            redcore OS handles the software layer: removing bloat,
            hardening privacy, cleaning the shell. For users who want
            hardware-level tuning — CPU scheduler optimization, timer
            resolution, GPU driver configuration, memory and disk tuning —{" "}
            <Link href="/redcore-tuning" className="text-accent hover:text-accent-bright transition-colors">
              redcore Tuning
            </Link>{" "}
            is a separate product designed for that depth of optimization.
          </p>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              See the difference yourself
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              Download redcore OS, run the assessment, and look at the plan
              it builds for your specific machine. You do not have to apply
              anything to see how it works.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Download redcore OS
              </Link>
              <Link
                href="/atlasos-alternative"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
              >
                Compare with AtlasOS
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
