import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Undo2,
  Zap,
  ScanSearch,
  Laptop,
  MonitorCog,
  Gamepad2,
  Briefcase,
  HardDrive,
  Server,
  Box,
  Lock,
  ArrowRight,
  Activity,
  Layers,
  ArrowDown,
} from 'lucide-react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
} as const

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
} as const

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero background — grid + radial glow                               */
/* ------------------------------------------------------------------ */

function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Top-center brand glow */}
      <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/[0.07] blur-[120px]" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero transformation visual                                         */
/* ------------------------------------------------------------------ */

function TransformationVisual() {
  return (
    <div className="relative mx-auto mt-16 max-w-2xl lg:mt-20">
      <div className="flex items-center justify-center gap-4 sm:gap-8">
        {/* Before */}
        <motion.div
          variants={fadeUp}
          className="flex-1 rounded-xl border border-white/[0.06] bg-surface-raised p-4 sm:p-6"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-500">
            <div className="h-2 w-2 rounded-full bg-amber-500/60" />
            Before
          </div>
          <div className="space-y-2">
            {[82, 60, 45, 70, 55].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-1.5 rounded-full bg-neutral-700/60"
                  style={{ width: `${w}%` }}
                />
                <div className="h-1.5 w-3 rounded-full bg-amber-500/30" />
              </div>
            ))}
          </div>
          <div className="mt-4 text-right font-mono text-xs text-neutral-600">
            137 issues
          </div>
        </motion.div>

        {/* Arrow */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center gap-1"
        >
          <ArrowRight className="text-brand-500" size={20} />
          <span className="text-[10px] font-medium text-brand-500/60">
            transform
          </span>
        </motion.div>

        {/* After */}
        <motion.div
          variants={fadeUp}
          className="flex-1 rounded-xl border border-brand-500/10 bg-surface-raised p-4 sm:p-6"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
            After
          </div>
          <div className="space-y-2">
            {[95, 92, 88, 96, 90].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="h-1.5 rounded-full bg-emerald-500/20"
                  style={{ width: `${w}%` }}
                />
                <div className="h-1.5 w-3 rounded-full bg-emerald-500/40" />
              </div>
            ))}
          </div>
          <div className="mt-4 text-right font-mono text-xs text-emerald-500/50">
            0 issues
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Proof numbers                                                      */
/* ------------------------------------------------------------------ */

const proofStats = [
  { value: '150+', label: 'transformation actions' },
  { value: '8', label: 'machine profiles' },
  { value: '100%', label: 'reversible' },
  { value: '0', label: 'reinstalls required' },
] as const

/* ------------------------------------------------------------------ */
/*  How it works steps                                                 */
/* ------------------------------------------------------------------ */

const steps = [
  {
    number: '01',
    title: 'Assess',
    description:
      'Deep scan of your current Windows installation. CPU, RAM, storage, running services, startup apps, and more.',
    icon: ScanSearch,
  },
  {
    number: '02',
    title: 'Transform',
    description:
      'Apply profile-matched optimizations. Cleanup, debloat, tune services, optimize performance — all in one wizard.',
    icon: Zap,
  },
  {
    number: '03',
    title: 'Stay in control',
    description:
      'Every change is logged and reversible. Snapshot before, restore anytime. Your data stays untouched.',
    icon: Undo2,
  },
] as const

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: 'Deep OS Assessment',
    description:
      '7-category health check: hardware, services, startup, storage, privacy, performance, and bloat.',
    icon: Activity,
  },
  {
    title: '8 Machine Profiles',
    description:
      'Gaming Desktop, Work PC, Budget Laptop, High-end Workstation and more. Right actions for your exact machine.',
    icon: Layers,
  },
  {
    title: 'Work PC Safety',
    description:
      'Business-critical services preserved automatically. Domain, RDP, printing, VPN — none of it touched.',
    icon: Briefcase,
  },
  {
    title: 'Full Reversibility',
    description:
      'System snapshot before every transformation. One click to restore any change, any time.',
    icon: Undo2,
  },
  {
    title: '150+ Actions',
    description:
      'Cleanup, debloat, startup reduction, service tuning, privacy controls, performance optimization.',
    icon: Zap,
  },
  {
    title: 'redcore-Tuning Handoff',
    description:
      'When the wizard completes, hand off to redcore-Tuning for ongoing performance monitoring.',
    icon: ArrowRight,
  },
] as const

/* ------------------------------------------------------------------ */
/*  Machine profiles                                                   */
/* ------------------------------------------------------------------ */

interface ProfileData {
  name: string
  description: string
  icon: typeof Gamepad2
  accent: string
  badge?: string
}

const profiles: ProfileData[] = [
  {
    name: 'Gaming Desktop',
    description: 'Maximum FPS, minimal background noise',
    icon: Gamepad2,
    accent: 'text-brand-500',
  },
  {
    name: 'Budget Desktop',
    description: 'Stretch every resource to its limit',
    icon: HardDrive,
    accent: 'text-amber-400',
  },
  {
    name: 'High-end Workstation',
    description: 'Multi-threaded power, creative workflows',
    icon: MonitorCog,
    accent: 'text-violet-400',
  },
  {
    name: 'Office Laptop',
    description: 'Battery life, stability, and speed',
    icon: Laptop,
    accent: 'text-sky-400',
  },
  {
    name: 'Gaming Laptop',
    description: 'Performance mode with thermal awareness',
    icon: Gamepad2,
    accent: 'text-orange-400',
  },
  {
    name: 'Low-spec System',
    description: 'Strip it down to bare essentials',
    icon: Box,
    accent: 'text-emerald-400',
  },
  {
    name: 'VM / Cautious Mode',
    description: 'Safe defaults, minimal changes',
    icon: Server,
    accent: 'text-neutral-400',
  },
  {
    name: 'Work PC',
    description: 'Preserves domain, RDP, printing, VPN',
    icon: Lock,
    accent: 'text-brand-500',
    badge: 'Most protection',
  },
]

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */

const testimonials = [
  {
    quote:
      'Ran redcore-OS on 12 office machines. Every one came back faster, and our domain join, printers, and VPN were untouched. Exactly what we needed.',
    name: 'Marcus Webb',
    role: 'IT Manager, Greenfield Associates',
  },
  {
    quote:
      'I was running 90+ startup items. After the transformation I had 11. Boot time went from two minutes to under twenty seconds. No data lost.',
    name: 'Sofia Reyes',
    role: 'Freelance Game Developer',
  },
  {
    quote:
      'The reversibility sold me. Tried it on a test machine first, loved the results, then ran it on my main workstation. The snapshot feature is peace of mind.',
    name: 'Daniel Park',
    role: 'Senior Software Engineer',
  },
] as const

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40 lg:pt-48">
        <HeroBackground />
        <div className="relative mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Your Windows installation,{' '}
              <span className="text-brand-500">transformed.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg"
            >
              An in-place OS transformation that reshapes your current Windows
              into a cleaner, faster, more intentional state — without
              reinstalling.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
            >
              <Link
                to="/download"
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 active:scale-[0.97] sm:w-auto"
              >
                Download Free
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-sm font-medium text-neutral-300 transition-all hover:bg-white/[0.05] hover:border-white/[0.12] active:scale-[0.97] sm:w-auto"
              >
                See how it works
                <ArrowDown size={14} />
              </a>
            </motion.div>
          </motion.div>

          <TransformationVisual />
        </div>
      </section>

      {/* Proof numbers */}
      <Section className="border-y border-white/[0.06] bg-surface-raised/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-16 sm:py-20 lg:grid-cols-4">
          {proofStats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="text-center"
            >
              <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1.5 text-sm text-neutral-500">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section className="py-24 sm:py-32" id="how-it-works">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-neutral-400">
              Three steps. No reinstall. No data loss.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:gap-8 lg:grid-cols-3">
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                className="group relative rounded-2xl border border-white/[0.06] bg-surface-raised p-8 transition-colors hover:border-white/[0.1]"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 transition-colors group-hover:bg-brand-500/15">
                    <step.icon size={20} />
                  </div>
                  <span className="font-mono text-xs text-neutral-600">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Features grid */}
      <Section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything your Windows needs
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="group rounded-2xl border border-white/[0.06] bg-surface-raised p-7 transition-colors hover:border-white/[0.1]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-neutral-400 transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-500">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-[15px] font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Machine profiles */}
      <Section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              8 profiles, one perfect fit
            </h2>
            <p className="mt-4 text-neutral-400">
              Each profile applies a curated set of optimizations tailored to
              your machine type and workload.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profiles.map((profile) => (
              <motion.div
                key={profile.name}
                variants={fadeUp}
                className="group relative rounded-xl border border-white/[0.06] bg-surface-raised p-5 transition-colors hover:border-white/[0.1]"
              >
                {profile.badge && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-brand-500/10 border border-brand-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-brand-500">
                    {profile.badge}
                  </span>
                )}
                <div
                  className={`mb-3 ${profile.accent} transition-transform group-hover:scale-110`}
                >
                  <profile.icon size={22} />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {profile.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  {profile.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div variants={fadeUp} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Trusted by professionals
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <motion.blockquote
                key={t.name}
                variants={fadeUp}
                className="rounded-2xl border border-white/[0.06] bg-surface-raised p-7"
              >
                <p className="text-sm leading-relaxed text-neutral-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-neutral-400">
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-200">
                      {t.name}
                    </div>
                    <div className="text-xs text-neutral-500">{t.role}</div>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-surface-raised px-8 py-16 text-center sm:px-16 sm:py-24"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-500/[0.06] blur-[100px]" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to transform your Windows?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-neutral-400">
                Download for free and run your first assessment in under a
                minute.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  to="/download"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 active:scale-[0.97] sm:w-auto"
                >
                  Download Free
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-sm font-medium text-neutral-300 transition-all hover:bg-white/[0.05] sm:w-auto"
                >
                  View Pricing
                </Link>
              </div>
              <p className="mt-6 text-xs text-neutral-600">
                Windows 10 and 11 only. No reinstall. No data loss.
              </p>
            </div>
          </motion.div>
        </div>
      </Section>

      <Footer />
    </div>
  )
}
