import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Zap,
  Shield,
  Cpu,
  BarChart3,
  RotateCcw,
  Monitor,
  ChevronRight,
  Star,
  ArrowDown,
} from "lucide-react";

// Animation helpers

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
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Features

const features = [
  {
    icon: Cpu,
    title: "CPU & Scheduler Tuning",
    description:
      "Optimize core parking, interrupt affinity, timer resolution, and HPET settings for maximum responsiveness and minimum DPC latency.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400",
  },
  {
    icon: BarChart3,
    title: "Benchmark Lab",
    description:
      "Built-in latency, frame time, and throughput benchmarks. Compare before/after with statistical rigor — not just vibes.",
    badge: "Premium",
    badgeColor: "bg-brand-500/15 text-brand-400",
  },
  {
    icon: RotateCcw,
    title: "One-Click Rollback",
    description:
      "Every change is snapshotted before application. Restore to any prior state in seconds, even after a reboot.",
    badge: "Premium",
    badgeColor: "bg-brand-500/15 text-brand-400",
  },
  {
    icon: Shield,
    title: "Privacy Hardening",
    description:
      "Disable telemetry, lock down network services, and block background data collection without breaking Windows Update.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400",
  },
  {
    icon: Monitor,
    title: "GPU & Display Tuning",
    description:
      "Lock GPU P-states, optimize display refresh scheduling, and reduce compositor overhead for gaming and pro workloads.",
    badge: "Premium",
    badgeColor: "bg-brand-500/15 text-brand-400",
  },
  {
    icon: Zap,
    title: "Startup & Service Cleanup",
    description:
      "Intelligently prune startup entries and disable background services that waste RAM and add to boot time.",
    badge: "Free",
    badgeColor: "bg-green-500/15 text-green-400",
  },
];

// Steps

const steps = [
  {
    n: "01",
    title: "Scan Your System",
    description:
      "redcore runs a deep hardware scan — CPU topology, memory config, GPU state, storage health — building an exact profile of your machine.",
  },
  {
    n: "02",
    title: "Review the Plan",
    description:
      "The AI planner generates a risk-scored tuning plan tailored to your hardware. Every recommendation shows what it changes and why.",
  },
  {
    n: "03",
    title: "Apply with Rollback",
    description:
      "Apply the full plan or individual tweaks. Every change is backed up first. Restore in one click if anything feels off.",
  },
  {
    n: "04",
    title: "Measure the Delta",
    description:
      "Run built-in benchmarks before and after. See exact latency, frame time, and responsiveness improvements.",
  },
];

// Testimonials

const testimonials = [
  {
    quote:
      "Cut my DPC latency from 2400µs to 180µs on my gaming rig. That's not a tweak — that's a new machine.",
    name: "Alexei K.",
    role: "Competitive FPS player",
    stars: 5,
  },
  {
    quote:
      "The rollback center alone is worth it. I can experiment with settings I'd never touch without a safety net.",
    name: "Mira T.",
    role: "3D artist / content creator",
    stars: 5,
  },
  {
    quote:
      "Finally a tool that actually shows you what changes and measures the impact. No snake oil.",
    name: "Björn H.",
    role: "Software engineer",
    stars: 5,
  },
];

// Page

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center justify-center px-6 pt-24 pb-16"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-500/8 blur-[120px]" />
          <div className="absolute left-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-brand-700/6 blur-[80px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-400"
          >
            <Zap className="h-3 w-3 fill-current" />
            Precision Windows Optimization
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl font-black tracking-tight md:text-7xl lg:text-8xl"
          >
            Your PC.{" "}
            <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-clip-text text-transparent">
              Unleashed.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-white/50 md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Deep-stack Windows tuning backed by measurable benchmarks.
            Registry, scheduler, GPU, CPU, privacy — fully reversible,
            zero guesswork.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/download"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/50 transition-all active:scale-[0.98]"
            >
              Download Free
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-[15px] font-semibold text-white/80 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              See Pricing
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-14 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {[
              { value: "50+", label: "Tuning actions" },
              { value: "7-day", label: "Offline grace" },
              { value: "1-click", label: "Rollback" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-white/35 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-16 flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            >
              <ArrowDown className="h-5 w-5 text-white/20" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 mb-3">
              What's inside
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Every knob that matters
            </h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto">
              From free basics to advanced premium controls — all changes
              tracked, measured, and reversible.
            </p>
          </FadeUp>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.07}>
                <div className="group relative flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-surface-800/50 p-6 hover:border-white/[0.12] hover:bg-surface-800/80 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                      <f.icon className="h-5 w-5 text-white/60" />
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${f.badgeColor}`}
                    >
                      {f.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-1.5">
                      {f.title}
                    </h3>
                    <p className="text-sm text-white/45 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <FadeUp className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 mb-3">
              How it works
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Four steps to peak performance
            </h2>
          </FadeUp>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <FadeUp key={step.n} delay={i * 0.1}>
                <div className="relative flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-surface-800/40 p-6">
                  <div className="text-4xl font-black text-white/[0.07] font-mono leading-none">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 right-0 w-6 h-px bg-white/[0.08] translate-x-full" />
                  )}
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-24 border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 mb-3">
              Trusted by enthusiasts
            </p>
            <h2 className="text-4xl font-black tracking-tight md:text-5xl">
              Real results, real users
            </h2>
          </FadeUp>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.1}>
                <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-surface-800/50 p-6 h-full">
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-brand-500 text-brand-500"
                      />
                    ))}
                  </div>
                  <p className="flex-1 text-[15px] text-white/70 leading-relaxed">
                    "{t.quote}"
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/35">{t.role}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-white/[0.04]">
        <FadeUp>
          <div className="mx-auto max-w-3xl text-center rounded-3xl border border-brand-500/20 bg-gradient-to-b from-brand-500/10 to-transparent p-12 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 h-48 w-48 rounded-full bg-brand-500/20 blur-[60px]" />
            </div>
            <Zap className="mx-auto h-10 w-10 text-brand-500 fill-brand-500 mb-5" />
            <h2 className="text-4xl font-black tracking-tight">
              Start free today
            </h2>
            <p className="mt-4 text-white/50 text-lg">
              No sign-up required. Scan your system, see what's holding you
              back, and apply your first optimizations in minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/download"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-8 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-brand-500/30 hover:bg-brand-600 transition-all"
              >
                Download Free
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-8 py-3.5 text-[15px] font-medium text-white/70 hover:text-white hover:border-white/20 transition-all"
              >
                See premium plans
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>
    </main>
  );
}
