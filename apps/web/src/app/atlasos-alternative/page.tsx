import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AtlasOS Alternative — Guided Windows Optimization",
  description:
    "Looking for an AtlasOS alternative? redcore OS transforms your current Windows install without a custom ISO. Guided, machine-aware, Work-PC-safe, and fully reversible.",
  keywords: [
    "atlasos alternative",
    "atlas os alternative",
    "atlasos vs redcore",
    "windows optimization without reinstall",
    "custom windows alternative",
  ],
  alternates: {
    canonical: "https://redcoreos.net/atlasos-alternative",
  },
  openGraph: {
    title: "AtlasOS Alternative — Guided Windows Optimization | redcore",
    description:
      "redcore OS vs AtlasOS: different approaches to Windows optimization. No reinstall, machine-aware, rollback-safe.",
    url: "https://redcoreos.net/atlasos-alternative",
    type: "article",
  },
};

export default function AtlasOSAlternativePage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-4">
            Comparison
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-6 leading-tight">
            AtlasOS Alternative — Guided Windows Optimization
          </h1>

          <p className="text-ink-secondary text-base leading-relaxed mb-8">
            AtlasOS is a well-known Windows modification project. redcore OS
            is a different kind of tool that solves a similar problem through
            a fundamentally different approach. This page explains both
            honestly so you can decide which fits your situation.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            What AtlasOS does
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            AtlasOS is a custom Windows configuration applied via a playbook
            that runs on top of AME Wizard. It strips and modifies a fresh
            Windows installation to reduce latency, disable telemetry, and
            improve gaming performance. The project is open source and has a
            large community.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            AtlasOS works well for its intended audience: gamers who want
            maximum performance and are comfortable with a fresh install. It
            is a serious project maintained by knowledgeable people.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            Where the approaches differ
          </h2>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-[14px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-ink-tertiary font-medium">
                    Aspect
                  </th>
                  <th className="text-left py-3 pr-4 text-ink-tertiary font-medium">
                    AtlasOS
                  </th>
                  <th className="text-left py-3 text-ink-tertiary font-medium">
                    redcore OS
                  </th>
                </tr>
              </thead>
              <tbody className="text-ink-secondary">
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Installation
                  </td>
                  <td className="py-3 pr-4">
                    Fresh Windows install required
                  </td>
                  <td className="py-3">
                    In-place transformation, no reinstall
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Hardware awareness
                  </td>
                  <td className="py-3 pr-4">
                    Same configuration for all systems
                  </td>
                  <td className="py-3">
                    Scans hardware, adapts recommendations
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Use case profiles
                  </td>
                  <td className="py-3 pr-4">
                    Gaming-focused
                  </td>
                  <td className="py-3">
                    8 profiles (Gaming, Work PC, Dev, Privacy, etc.)
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Rollback
                  </td>
                  <td className="py-3 pr-4">
                    Reinstall Windows to revert
                  </td>
                  <td className="py-3">
                    Built-in rollback for every change
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Work PC safe
                  </td>
                  <td className="py-3 pr-4">
                    Not designed for managed environments
                  </td>
                  <td className="py-3">
                    Work PC profile preserves corporate infra
                  </td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Review before apply
                  </td>
                  <td className="py-3 pr-4">
                    Playbook runs as a batch
                  </td>
                  <td className="py-3">
                    Full plan review before any changes
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-ink-primary font-medium">
                    Cost
                  </td>
                  <td className="py-3 pr-4">Free, open source</td>
                  <td className="py-3">Free (not open source)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            When AtlasOS is the better choice
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            If you are building a dedicated gaming PC from scratch, want
            maximum community support, and prefer open source software,
            AtlasOS is a solid choice. It has years of community testing,
            active development, and a transparent modification process. If
            you are comfortable with fresh installs and want a
            gaming-focused system with community backing, Atlas serves
            that well.
          </p>

          <h2 className="text-xl font-semibold text-ink-primary mt-10 mb-4">
            When redcore is the better choice
          </h2>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            If you do not want to reinstall Windows, if you use your PC for
            work and gaming, if you need rollback capability, or if you want
            the tool to account for your specific hardware —{" "}
            <Link href="/redcore-os" className="text-accent hover:text-accent-bright transition-colors">
              redcore OS
            </Link>{" "}
            is designed for exactly that scenario. It is also the better fit
            for laptops, where power management, Wi-Fi adapter settings, and
            battery optimization matter.
          </p>
          <p className="text-ink-secondary text-[15px] leading-relaxed mb-4">
            For deeper system-level tuning beyond debloating — CPU scheduler
            optimization, timer resolution, GPU driver configuration, memory
            timing —{" "}
            <Link href="/redcore-tuning" className="text-accent hover:text-accent-bright transition-colors">
              redcore Tuning
            </Link>{" "}
            is a separate product built for hardware-aware performance
            optimization.
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
