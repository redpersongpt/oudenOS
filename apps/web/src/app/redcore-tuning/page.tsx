import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ouden.Tuning — Machine-Aware Windows Optimization",
  description:
    "Hardware-based Windows performance optimization. 15+ tuning modules, benchmark lab, BIOS guidance, timer resolution, scheduler tuning. $12.99 one-time purchase.",
  keywords: [
    "windows tuning software",
    "windows optimization tool",
    "windows performance tuning",
    "cpu scheduler optimization",
    "timer resolution tool",
    "gpu optimization windows",
    "hardware tuning",
  ],
  alternates: {
    canonical: "https://ouden.cc/redcore-tuning",
  },
  openGraph: {
    title: "Ouden.Tuning — Machine-Aware Windows Optimization",
    description:
      "15+ tuning modules, benchmark lab, BIOS guidance. $12.99 one-time. Coming soon.",
    url: "https://ouden.cc/redcore-tuning",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ouden.Tuning",
  operatingSystem: "Windows 10, Windows 11",
  applicationCategory: "UtilitiesApplication",
  offers: {
    "@type": "Offer",
    price: "12.99",
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
  },
  description:
    "Hardware-based Windows performance optimization with 15+ tuning modules, benchmark lab, and BIOS guidance.",
  url: "https://ouden.cc/redcore-tuning",
};

export default function RedcoreTuningPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-28 pb-20 px-6">
        <article className="max-w-[740px] mx-auto">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />

          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--accent)] mb-4">
            Product
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
            Ouden.Tuning — Machine-Aware Windows Optimization
          </h1>

          <p className="text-[var(--text-secondary)] text-base leading-relaxed mb-4">
            Ouden.Tuning goes beyond debloating. It is a system-level
            performance optimization tool that reads your hardware
            configuration and applies tuning changes specific to your CPU,
            GPU, memory, and disk setup.
          </p>

          <div className="border border-[var(--color-border)] rounded-lg p-4 mb-8 bg-white/5">
            <p className="text-[var(--color-ink-secondary)] text-[14px] font-medium">
              Ouden.Tuning is currently in development. The installer is
              not yet available for download. This page describes the planned
              feature set. Pricing is set at $12.99 one-time purchase.
            </p>
          </div>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-10 mb-4">
            What it does
          </h2>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-4">
            Where{" "}
            <Link href="/redcore-os" className="text-[var(--accent)] hover:text-[var(--accent)]-bright transition-colors">
              OudenOS
            </Link>{" "}
            handles the software layer — removing bloat, hardening privacy,
            cleaning the shell — Ouden.Tuning works at the hardware
            interaction layer. It optimizes how Windows communicates with
            your specific hardware.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-10 mb-4">
            Tuning modules
          </h2>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-4">
            Ouden.Tuning includes 15+ specialized modules, each targeting
            a different subsystem:
          </p>

          <div className="space-y-4 mb-6">
            {[
              {
                name: "CPU Scheduler",
                desc: "Adjusts thread scheduling priority, quantum length, and core parking based on your CPU model and core count. Different tuning for Intel vs AMD, E-core vs P-core awareness.",
              },
              {
                name: "Timer Resolution",
                desc: "Configures the system timer to the optimal resolution for your use case. Gaming profiles use higher resolution for frame pacing. Laptop profiles balance resolution against power draw.",
              },
              {
                name: "GPU Optimization",
                desc: "Vendor-specific driver tweaks for NVIDIA, AMD, and Intel GPUs. Shader cache configuration, power state management, and latency-reduction settings.",
              },
              {
                name: "Memory & Paging",
                desc: "Page file sizing based on actual RAM, working set optimization, memory priority configuration. Adjusts based on whether you have 8GB or 64GB.",
              },
              {
                name: "Disk I/O",
                desc: "Queue depth, write caching, and TRIM configuration optimized for your specific storage type. NVMe, SATA SSD, and HDD each get different settings.",
              },
              {
                name: "Network Stack",
                desc: "TCP window scaling, Nagle algorithm, adapter offloading, and DNS optimization. Gaming profiles minimize latency. Throughput profiles maximize bandwidth.",
              },
              {
                name: "Power Plan",
                desc: "Custom power plans built for your hardware. Not just High Performance — granular per-component power states that balance performance and thermals.",
              },
              {
                name: "BIOS Guidance",
                desc: "Scans current BIOS settings where readable and provides recommendations. Cannot modify BIOS directly, but guides you to settings worth changing: XMP/EXPO, Resizable BAR, virtualization, C-states.",
              },
              {
                name: "Benchmark Lab",
                desc: "Built-in micro-benchmarks that measure latency, throughput, and frame consistency before and after tuning. Quantifies the actual impact of each change on your specific system.",
              },
            ].map((module) => (
              <div
                key={module.name}
                className="border border-[var(--border)] rounded-lg p-4 bg-surface"
              >
                <p className="text-[var(--text-primary)] font-semibold text-[14px] mb-1">
                  {module.name}
                </p>
                <p className="text-[var(--text-disabled)] text-[13px] leading-relaxed">
                  {module.desc}
                </p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-10 mb-4">
            How it differs from registry tweaks
          </h2>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-4">
            Anyone can find a list of &ldquo;Windows gaming tweaks&rdquo;
            online. The problem is that most of those tweaks are either
            placebo, outdated, or only beneficial on specific hardware. A
            timer resolution change that helps on Intel 12th gen may do
            nothing on AMD Zen 4. A power plan tweak for a desktop harms
            battery life on a laptop.
          </p>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-4">
            Ouden.Tuning reads your hardware configuration and only
            applies changes that are validated for your specific setup. The
            benchmark lab measures the actual impact so you can see whether
            a change helped or made no difference.
          </p>

          <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-10 mb-4">
            Pricing
          </h2>
          <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-6">
            Ouden.Tuning will be a one-time purchase at{" "}
            <strong className="text-[var(--text-primary)]">$12.99</strong>. No
            subscription, no recurring fees, no upsells. Payment processing
            is not yet active — when the tool is ready for release, Stripe
            will be integrated for secure payments.
          </p>

          <div className="border border-[var(--border)] rounded-lg p-6 mt-10 bg-surface">
            <p className="text-[var(--text-primary)] font-semibold mb-2">
              Not available yet
            </p>
            <p className="text-[var(--text-secondary)] text-[14px] mb-4">
              Ouden.Tuning is still in development. In the meantime, you
              can use OudenOS for free to debloat and optimize your
              Windows installation at the software level.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/downloads"
                className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-[#E8E8E8]"
              >
                Download OudenOS (free)
              </Link>
              <Link
                href="/redcore-os"
                className="inline-flex items-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] hover:border-[var(--border-visible)]"
              >
                Learn about OudenOS
              </Link>
            </div>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
