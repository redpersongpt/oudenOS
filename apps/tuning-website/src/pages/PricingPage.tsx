import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Check, Zap, X } from "lucide-react";

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FREE_FEATURES = [
  "Hardware scan & health overview",
  "Basic startup cleanup",
  "Basic debloat",
  "Privacy hardening (basic)",
  "Speculative mitigation analysis",
  "Limited tuning recommendations",
  "BIOS guidance preview",
  "Basic benchmark (single-run)",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Full tuning engine (50+ actions)",
  "Benchmark Lab (compare, chart, export)",
  "One-click Rollback Center",
  "Reboot & Resume for multi-step plans",
  "Thermal & bottleneck analysis",
  "CPU core parking optimization",
  "Timer resolution & latency tuning",
  "GPU P-state lock",
  "Speculative mitigation control",
  "Storage 8.3 name optimization",
  "Fault Tolerant Heap control",
  "App Install Hub",
  "Config sync across sessions",
  "7-day offline grace period",
  "Priority support",
];

const FAQ = [
  {
    q: "Is the free tier actually useful?",
    a: "Yes. The free tier scans your hardware, shows you what's slowing you down, handles startup cleanup and basic debloat, and gives you a full BIOS optimization guide. It's a real tool, not a demo.",
  },
  {
    q: "What does '1 machine' mean?",
    a: "Premium activates on one Windows PC at a time. You can transfer your license to a new machine — there's a brief cooldown period to prevent abuse.",
  },
  {
    q: "Is this a subscription?",
    a: "Premium is billed annually. You keep access as long as you're subscribed. If you cancel, the app keeps working in free tier mode.",
  },
  {
    q: "What's the 7-day offline grace period?",
    a: "Premium license validation happens online every 24 hours. If you're offline, the app continues functioning in premium mode for up to 7 days before falling back to free tier.",
  },
  {
    q: "Is my data safe?",
    a: "All optimization runs locally on your machine. Only anonymized telemetry (opt-in) leaves your PC. No personal data, no hardware serials — just aggregate usage patterns.",
  },
];

export default function PricingPage() {
  return (
    <main className="overflow-x-hidden pt-24 pb-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <FadeUp className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 mb-3">
            Pricing
          </p>
          <h1 className="text-5xl font-black tracking-tight md:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-white/45 text-lg max-w-xl mx-auto">
            Start free. Upgrade when you need the full arsenal.
          </p>
        </FadeUp>

        {/* Plans */}
        <div className="grid gap-5 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Free */}
          <FadeUp delay={0.1}>
            <div className="flex flex-col h-full rounded-2xl border border-white/[0.07] bg-surface-800/50 p-8">
              <div className="mb-6">
                <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/50 mb-4">
                  Free forever
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black">$0</span>
                  <span className="text-white/35 pb-1.5 text-sm">/mo</span>
                </div>
                <p className="mt-2 text-sm text-white/40">
                  No credit card. No sign-up required.
                </p>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                    <span className="text-sm text-white/60">{f}</span>
                  </li>
                ))}
                {/* Show what's NOT included */}
                {["Full tuning engine", "Rollback Center", "Benchmark Lab"].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <X className="h-4 w-4 mt-0.5 shrink-0 text-white/15" />
                    <span className="text-sm text-white/25 line-through">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/download"
                className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all"
              >
                Download Free
              </Link>
            </div>
          </FadeUp>

          {/* Premium */}
          <FadeUp delay={0.15}>
            <div className="relative flex flex-col h-full rounded-2xl border border-brand-500/40 bg-gradient-to-b from-brand-500/10 via-surface-800/80 to-surface-800/50 p-8 overflow-hidden">
              {/* Glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-40 w-64 rounded-full bg-brand-500/15 blur-[50px] pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-400 mb-4">
                  <Zap className="h-3 w-3 fill-current" />
                  Most popular
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black">$9</span>
                  <span className="text-white/50 pb-1.5 text-sm">.99 /mo</span>
                </div>
                <p className="text-white/35 text-sm mt-1">Billed $99/yr — save 17%</p>
                <p className="mt-2 text-sm text-white/40">
                  1 Windows PC. Cancel anytime.
                </p>
              </div>

              <ul className="relative flex-1 space-y-3 mb-8">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-brand-400" />
                    <span className="text-sm text-white/70">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/download"
                className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/50 transition-all"
              >
                Get Premium
                <Zap className="h-3.5 w-3.5 fill-current" />
              </Link>
            </div>
          </FadeUp>
        </div>

        {/* Enterprise note */}
        <FadeUp delay={0.2} className="text-center mt-8">
          <p className="text-sm text-white/30">
            Need multi-seat licensing for a team or organization?{" "}
            <a
              href="mailto:enterprise@redcore-tuning.com"
              className="text-white/50 hover:text-white underline underline-offset-2 transition-colors"
            >
              Contact us
            </a>
          </p>
        </FadeUp>

        {/* FAQ */}
        <div className="mt-24">
          <FadeUp className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight">
              Frequently asked
            </h2>
          </FadeUp>

          <div className="max-w-2xl mx-auto space-y-4">
            {FAQ.map((item, i) => (
              <FadeUp key={item.q} delay={i * 0.06}>
                <div className="rounded-xl border border-white/[0.07] bg-surface-800/50 p-6">
                  <h3 className="font-semibold text-white mb-2">{item.q}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{item.a}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
