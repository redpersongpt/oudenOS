import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Download,
  Shield,
  Zap,
  ChevronRight,
  Monitor,
  CheckCircle2,
  ExternalLink,
  Lock,
} from "lucide-react";

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

const REQUIREMENTS = [
  "Windows 10 (build 19041+) or Windows 11",
  "x64 processor (Intel or AMD)",
  "4 GB RAM minimum, 8 GB recommended",
  "100 MB free disk space",
  "Administrator account (required for system-level changes)",
  ".NET Framework not required — fully self-contained",
];

const SECURITY = [
  {
    icon: Shield,
    title: "Code-signed installer",
    detail: "Every release is signed with an EV certificate. Windows SmartScreen will show the publisher as redcore.",
  },
  {
    icon: Lock,
    title: "Privilege model",
    detail: "The privileged service runs as a separate process. The UI runs sandboxed with no system access of its own.",
  },
  {
    icon: CheckCircle2,
    title: "SHA-256 checksums",
    detail: "All downloads include a SHA-256 hash. Verify the installer against the published checksum before running.",
  },
];

const APP_VERSION = "0.1.0";
const INSTALLER_URL = "#"; // TODO: real release URL
const CHECKSUM = "sha256:placeholder-checksum-will-be-set-at-release-time";

export default function DownloadPage() {
  const handleDownload = () => {
    // TODO: track download event + trigger actual download
    window.location.href = INSTALLER_URL;
  };

  return (
    <main className="overflow-x-hidden pt-24 pb-24 px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <FadeUp className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/40 mb-6">
            <Monitor className="h-3 w-3" />
            Windows 10 / 11 only
          </div>
          <h1 className="text-5xl font-black tracking-tight md:text-6xl">
            Download redcore
          </h1>
          <p className="mt-4 text-white/45 text-lg max-w-xl mx-auto">
            Free to download, free to use. Upgrade to Premium for the full
            tuning arsenal.
          </p>
        </FadeUp>

        {/* Main download card */}
        <FadeUp delay={0.1}>
          <div className="relative rounded-3xl border border-white/[0.08] bg-surface-800/60 overflow-hidden p-8 md:p-10 mb-6">
            {/* Glow */}
            <div
              className="absolute top-0 right-0 h-64 w-64 rounded-full bg-brand-500/8 blur-[80px] pointer-events-none translate-x-1/3 -translate-y-1/4"
              aria-hidden="true"
            />

            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-xl shadow-brand-500/30">
                    <Zap className="h-6 w-6 text-white fill-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">
                      redcore-Tuning
                    </p>
                    <p className="text-sm text-white/35">v{APP_VERSION} — Free tier</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {["~28 MB", "x64", "No ads", "No bloat"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/40"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="flex-shrink-0 inline-flex items-center gap-2.5 rounded-2xl bg-brand-500 px-8 py-4 text-[15px] font-bold text-white shadow-xl shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/50 transition-all active:scale-[0.98]"
              >
                <Download className="h-5 w-5" />
                Download Free
              </button>
            </div>

            {/* Checksum */}
            <div className="relative mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-xs text-white/25 font-mono break-all">{CHECKSUM}</p>
            </div>
          </div>
        </FadeUp>

        {/* Premium upsell */}
        <FadeUp delay={0.15}>
          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/[0.07] p-6 mb-12 flex items-start gap-4">
            <Zap className="h-5 w-5 text-brand-400 fill-brand-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">
                Want the full toolkit?
              </p>
              <p className="text-sm text-white/45 mt-0.5">
                Benchmark Lab, Rollback Center, full tuning engine, and 50+
                optimizations are included with Premium.
              </p>
            </div>
            <Link
              to="/pricing"
              className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              See plans
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </FadeUp>

        {/* System requirements */}
        <div className="grid gap-8 md:grid-cols-2">
          <FadeUp delay={0.2}>
            <div>
              <h2 className="text-lg font-bold mb-4 text-white/80">
                System requirements
              </h2>
              <ul className="space-y-2.5">
                {REQUIREMENTS.map((r) => (
                  <li key={r} className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-500/70" />
                    <span className="text-sm text-white/50">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>

          <FadeUp delay={0.25}>
            <div>
              <h2 className="text-lg font-bold mb-4 text-white/80">
                Security & trust
              </h2>
              <div className="space-y-4">
                {SECURITY.map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/70">{item.title}</p>
                      <p className="text-xs text-white/35 leading-relaxed mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>

        {/* Installation notes */}
        <FadeUp delay={0.3} className="mt-12">
          <div className="rounded-2xl border border-white/[0.06] bg-surface-800/40 p-6">
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Installation notes
            </h3>
            <ol className="space-y-2 list-decimal list-inside">
              {[
                "Run the installer as Administrator",
                "Windows Defender SmartScreen may prompt — click 'More info' then 'Run anyway' (the binary is code-signed)",
                "redcore installs two components: the UI (user context) and the privileged service (SYSTEM)",
                "The service communicates with the UI over a local IPC pipe — no network traffic on your LAN",
                "To uninstall: Settings → Add or Remove Programs → redcore-Tuning",
              ].map((note, i) => (
                <li key={i} className="text-sm text-white/40 leading-relaxed">
                  {note}
                </li>
              ))}
            </ol>
          </div>
        </FadeUp>
      </div>
    </main>
  );
}
