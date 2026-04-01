import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Download,
  Shield,
  HardDrive,
  Cpu,
  MemoryStick,
  MonitorCheck,
} from 'lucide-react'
import { Nav } from '../components/Nav'
import { Footer } from '../components/Footer'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
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
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.section
      ref={ref}
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
/*  Windows logo (simple SVG)                                          */
/* ------------------------------------------------------------------ */

function WindowsLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3 5.548l7.195-0.984v6.947H3V5.548zm0 12.904l7.195 0.984v-6.903H3v5.919zm8.01 1.095L21 21v-7.467H11.01v6.014zm0-14.094v7.058H21V3L11.01 5.453z"
        fill="currentColor"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const requirements = [
  {
    icon: MonitorCheck,
    label: 'Operating System',
    value: 'Windows 10 (1903+) or Windows 11',
  },
  {
    icon: MemoryStick,
    label: 'Memory',
    value: '4 GB RAM minimum',
  },
  {
    icon: HardDrive,
    label: 'Disk Space',
    value: '500 MB free space',
  },
  {
    icon: Cpu,
    label: 'Processor',
    value: '64-bit processor, 1 GHz or faster',
  },
  {
    icon: Shield,
    label: 'Permissions',
    value: 'Administrator privileges required',
  },
] as const

const installSteps = [
  {
    step: 1,
    title: 'Download the installer',
    description:
      'Click the download button above to get the latest redcore-OS installer for Windows.',
  },
  {
    step: 2,
    title: 'Run as Administrator',
    description:
      'Right-click the downloaded file and select "Run as administrator". This is required for OS-level access.',
  },
  {
    step: 3,
    title: 'Follow the setup wizard',
    description:
      'The installer will guide you through component selection and installation directory.',
  },
  {
    step: 4,
    title: 'Launch and create your account',
    description:
      'Open redcore-OS, create your account or sign in, and begin your first assessment.',
  },
] as const

const transparencyItems = [
  'Installs to your chosen directory (default: Program Files)',
  'Registers a Windows service for transformation execution',
  'Creates a system restore point before any changes',
  'Adds an uninstaller entry to Windows Settings',
  'Does NOT modify your files, browser, or personal data during installation',
  'Does NOT install browser extensions or toolbars',
  'Does NOT collect data until you explicitly run an assessment',
] as const

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function DownloadPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Nav />

      {/* Hero */}
      <section className="pt-32 pb-8 sm:pt-40">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Download redcore-OS
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-neutral-400"
          >
            Transform your Windows installation in minutes.
          </motion.p>
        </div>
      </section>

      {/* Download card */}
      <Section className="py-12">
        <div className="mx-auto max-w-2xl px-6">
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-raised p-8 text-center sm:p-12"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -top-20 left-1/2 h-[300px] w-[400px] -translate-x-1/2 rounded-full bg-brand-500/[0.05] blur-[80px]" />
            </div>
            <div className="relative">
              <div className="mb-4 inline-flex rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1 text-xs font-medium text-brand-500">
                v0.1.0 — Early Access
              </div>

              <a
                href="https://redcoreos.net/downloads/os/redcore-os-setup.exe"
                className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-3 rounded-xl bg-brand-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 active:scale-[0.97]"
              >
                <WindowsLogo className="h-5 w-5" />
                Download for Windows (.exe)
              </a>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <Download size={12} />
                  ~45 MB
                </span>
                <span>Windows 10 / 11</span>
                <span>64-bit</span>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* System requirements */}
      <Section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-center text-2xl font-bold tracking-tight text-white"
          >
            System requirements
          </motion.h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {requirements.map((req) => (
              <motion.div
                key={req.label}
                variants={fadeUp}
                className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-surface-raised p-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-neutral-400">
                  <req.icon size={18} />
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-200">
                    {req.label}
                  </div>
                  <div className="mt-0.5 text-sm text-neutral-500">
                    {req.value}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Installation steps */}
      <Section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-center text-2xl font-bold tracking-tight text-white"
          >
            Installation
          </motion.h2>

          <div className="space-y-4">
            {installSteps.map((item) => (
              <motion.div
                key={item.step}
                variants={fadeUp}
                className="flex gap-5 rounded-xl border border-white/[0.06] bg-surface-raised p-5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 font-mono text-sm font-semibold text-brand-500">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Transparency */}
      <Section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-center text-2xl font-bold tracking-tight text-white"
          >
            What happens during installation
          </motion.h2>

          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-white/[0.06] bg-surface-raised p-8"
          >
            <ul className="space-y-3">
              {transparencyItems.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-neutral-400"
                >
                  <span
                    className={`mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full ${
                      item.startsWith('Does NOT')
                        ? 'bg-emerald-500/50'
                        : 'bg-neutral-600'
                    }`}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to="https://github.com/redpersongpt/redcoreOS/releases"
              className="text-sm text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-300"
            >
              View changelog
            </Link>
            <span className="hidden text-neutral-700 sm:block">/</span>
            <Link
              to="https://github.com/redpersongpt/redcoreOS/issues"
              className="text-sm text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-300"
            >
              Report an issue
            </Link>
          </motion.div>
        </div>
      </Section>

      <Footer />
    </div>
  )
}
