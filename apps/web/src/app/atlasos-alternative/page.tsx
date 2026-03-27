import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Custom Windows Optimization Without Reinstalling",
  description:
    "redcore OS transforms your current Windows install in place. No custom ISO, no fresh install required. Guided, machine-aware, fully reversible.",
  keywords: [
    "windows optimization",
    "custom windows without reinstall",
    "in-place windows transformation",
    "guided windows optimization",
    "windows debloat tool",
  ],
  alternates: {
    canonical: "https://redcoreos.net/atlasos-alternative",
  },
  openGraph: {
    title: "Custom Windows Optimization Without Reinstalling | redcore",
    description:
      "Transform your current Windows installation without reinstalling. Machine-aware, guided, reversible.",
    url: "https://redcoreos.net/atlasos-alternative",
    type: "article",
  },
};

export default function AlternativePage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Windows Optimization
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            Optimize Windows Without Starting Over
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            Most Windows optimization tools require you to start from a fresh
            install or run a set of scripts that apply the same changes to
            every machine. redcore takes a different approach — it works on
            your current installation, reads your hardware, and adapts.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            No reinstall required
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Custom Windows projects typically require downloading an ISO or
            running a tool on a fresh installation. That means backing up your
            data, wiping the drive, reinstalling, and setting everything up
            again. For many users — especially those with configured work
            environments, development setups, or carefully maintained systems
            — this is not practical.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              redcore OS
            </Link>{" "}
            runs directly on your current Windows 10 or 11 installation. It
            scans what you have, identifies what can be improved, and presents
            a plan. You review the plan, then apply it. Your files, your
            apps, your accounts — all stay exactly where they are.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Machine-aware, not one-size-fits-all
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Generic optimization tools apply the same registry tweaks and
            service changes regardless of whether you are running a gaming
            desktop, a work laptop, or a low-spec machine. redcore detects
            your hardware — CPU, GPU, RAM, storage type, network adapters,
            power source — and classifies your system into one of eight
            profiles. Each profile generates a different set of
            recommendations.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            A gaming desktop gets latency optimization and GPU scheduling
            changes. A work laptop keeps battery management, VPN support, and
            corporate infrastructure intact. A development workstation
            preserves Hyper-V, WSL, and Docker networking.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Every change is reversible
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Before any modification, redcore creates a granular snapshot.
            Not a system restore point — individual snapshots per action.
            If disabling a service breaks something, you undo that specific
            change without affecting anything else. This is fundamentally
            different from running a batch script where the only recovery is
            reinstalling Windows.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Work PC safe
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            Many optimization tools disable services that corporate
            environments depend on — print spooler, SMB file sharing, Remote
            Desktop, Group Policy processing, certificate services. redcore
            detects these dependencies and preserves them automatically when
            the Work PC profile is active. You do not have to manually check
            what is safe to remove.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Beyond debloating
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            If you want deeper optimization beyond cleanup — CPU scheduler
            tuning, timer resolution, GPU driver configuration, memory
            timing, benchmark validation —{" "}
            <Link href="/redcore-tuning" className="text-accent hover:text-accent-bright transition-colors">
              redcore Tuning
            </Link>{" "}
            is a separate product built for hardware-aware performance work.
            It picks up where OS leaves off.
          </p>

          <div className="border border-border rounded-lg p-6 mt-10 bg-surface">
            <p className="text-ink-primary font-semibold mb-2">
              Try the in-place approach
            </p>
            <p className="text-ink-secondary text-[14px] mb-4">
              Download redcore OS, run it on your current Windows install,
              and see what it recommends. You do not have to apply anything
              until you have reviewed the full plan.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Download redcore OS
              </Link>
              <Link
                href="/custom-windows"
                className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
              >
                Custom Windows without reinstalling
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
