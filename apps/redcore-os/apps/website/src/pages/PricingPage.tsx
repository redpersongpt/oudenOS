import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Check, Minus, ChevronDown } from 'lucide-react'
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
/*  Pricing data                                                       */
/* ------------------------------------------------------------------ */

interface Tier {
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  features: string[]
  cta: string
  popular?: boolean
}

const tiers: Tier[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Basic assessment and a taste of what redcore-OS can do.',
    features: [
      'Basic OS health assessment',
      '3 safe transformation actions',
      'Standard machine profiles',
      '1 machine',
      'Community support',
    ],
    cta: 'Download Free',
  },
  {
    name: 'Pro',
    monthlyPrice: 9,
    annualPrice: 78,
    description:
      'Full transformation power for enthusiasts and professionals.',
    features: [
      'Full 7-category health assessment',
      '150+ transformation actions',
      'Custom + standard profiles',
      'Startup optimization',
      'Services optimization',
      'Privacy controls',
      'Advanced controls',
      'Up to 3 machines',
      'Priority email support',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 29,
    annualPrice: 250,
    description: 'Fleet management, API access, and dedicated support.',
    features: [
      'Everything in Pro',
      'Up to 10 machines',
      'Fleet management dashboard',
      'API access',
      'Custom transformation policies',
      'Dedicated support with SLA',
      'Volume licensing',
    ],
    cta: 'Contact Sales',
  },
]

/* ------------------------------------------------------------------ */
/*  Feature comparison                                                 */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
  feature: string
  free: string | boolean
  pro: string | boolean
  enterprise: string | boolean
}

const comparison: ComparisonRow[] = [
  {
    feature: 'OS health assessment',
    free: 'Basic',
    pro: 'Full (7 categories)',
    enterprise: 'Full (7 categories)',
  },
  {
    feature: 'Transformation actions',
    free: '3 safe actions',
    pro: '150+',
    enterprise: '150+',
  },
  {
    feature: 'Machine profiles',
    free: 'Standard',
    pro: 'Custom + Standard',
    enterprise: 'Custom + Standard',
  },
  {
    feature: 'Startup optimization',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    feature: 'Services optimization',
    free: false,
    pro: true,
    enterprise: true,
  },
  { feature: 'Privacy controls', free: false, pro: true, enterprise: true },
  { feature: 'Advanced controls', free: false, pro: true, enterprise: true },
  { feature: 'Machines', free: '1', pro: '3', enterprise: '10' },
  { feature: 'Fleet management', free: false, pro: false, enterprise: true },
  { feature: 'API access', free: false, pro: false, enterprise: true },
  {
    feature: 'Support',
    free: 'Community',
    pro: 'Priority email',
    enterprise: 'Dedicated + SLA',
  },
]

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-neutral-300">{value}</span>
  }
  return value ? (
    <Check size={16} className="text-emerald-400" />
  ) : (
    <Minus size={16} className="text-neutral-700" />
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const faqs = [
  {
    q: 'Is redcore-OS safe to use on my work computer?',
    a: 'Yes. The Work PC profile is designed specifically for business environments. It automatically preserves domain join, Active Directory, RDP, printing services, VPN configurations, and SMB file sharing. None of your business-critical services are touched.',
  },
  {
    q: 'Can I undo changes after applying them?',
    a: 'Absolutely. redcore-OS creates a full system snapshot before every transformation. You can restore any change individually or roll back the entire transformation with a single click.',
  },
  {
    q: 'Does this require reinstalling Windows?',
    a: 'No. redcore-OS transforms your existing Windows installation in place. There is no reinstall, no ISO creation, and no data migration. Your files, apps, and settings stay exactly where they are.',
  },
  {
    q: 'What Windows versions are supported?',
    a: 'Windows 10 version 1903 and later, and all versions of Windows 11. Both Home and Pro editions are supported.',
  },
  {
    q: 'What happens if I cancel my Pro subscription?',
    a: 'You keep all transformations that have already been applied. Your account downgrades to the Free tier, which includes basic assessment and 3 safe actions. No changes are reversed automatically.',
  },
  {
    q: 'Is my data safe during transformation?',
    a: 'Transformations only modify OS-level settings, services, startup entries, and system configurations. User files, documents, photos, and application data are never modified or deleted.',
  },
  {
    q: 'Can I use it on multiple machines?',
    a: 'Free supports 1 machine. Pro supports up to 3 machines. Enterprise supports up to 10 machines with fleet management capabilities.',
  },
  {
    q: "What's different from just running optimization scripts?",
    a: 'redcore-OS is profile-aware — it detects your hardware and workload to apply the right optimizations. Every action is reversible with snapshot support. Changes are audited and logged. And it all happens through a guided wizard, not a command line.',
  },
] as const

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-sm font-medium text-neutral-200">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-neutral-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-neutral-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function PricingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Nav />

      {/* Header */}
      <section className="pt-32 pb-4 sm:pt-40">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-neutral-400"
          >
            Start free. Upgrade when you need the full power.
          </motion.p>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-surface-raised px-1.5 py-1.5"
          >
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                !annual
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                annual
                  ? 'bg-white/[0.08] text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Annual
            </button>
            {annual && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Save up to 28%
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* Tier cards */}
      <Section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              className={`relative rounded-2xl border p-8 transition-colors ${
                tier.popular
                  ? 'border-brand-500/30 bg-surface-raised'
                  : 'border-white/[0.06] bg-surface-raised hover:border-white/[0.1]'
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              <p className="mt-1.5 text-sm text-neutral-500">
                {tier.description}
              </p>

              <div className="mt-6">
                <span className="text-4xl font-bold tracking-tight text-white">
                  $
                  {annual
                    ? tier.annualPrice === 0
                      ? '0'
                      : Math.round(tier.annualPrice / 12)
                    : tier.monthlyPrice}
                </span>
                <span className="ml-1 text-sm text-neutral-500">
                  {tier.monthlyPrice === 0 ? '' : '/mo'}
                </span>
                {annual && tier.annualPrice > 0 && (
                  <div className="mt-1 text-xs text-neutral-600">
                    ${tier.annualPrice}/year, billed annually
                  </div>
                )}
              </div>

              <Link
                to={tier.name === 'Enterprise' ? '#' : '/download'}
                className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-all active:scale-[0.97] ${
                  tier.popular
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400'
                    : 'border border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:bg-white/[0.05]'
                }`}
              >
                {tier.cta}
              </Link>

              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-neutral-400"
                  >
                    <Check
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-400"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Comparison table */}
      <Section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <motion.h2
            variants={fadeUp}
            className="mb-12 text-center text-2xl font-bold tracking-tight text-white"
          >
            Compare plans
          </motion.h2>

          <motion.div
            variants={fadeUp}
            className="overflow-x-auto rounded-2xl border border-white/[0.06]"
          >
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-surface-raised">
                  <th className="px-6 py-4 text-sm font-medium text-neutral-400">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-neutral-400">
                    Free
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-brand-500">
                    Pro
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-neutral-400">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i < comparison.length - 1
                        ? 'border-b border-white/[0.04]'
                        : ''
                    }
                  >
                    <td className="px-6 py-3.5 text-sm text-neutral-300">
                      {row.feature}
                    </td>
                    <td className="px-6 py-3.5">
                      <CellValue value={row.free} />
                    </td>
                    <td className="px-6 py-3.5">
                      <CellValue value={row.pro} />
                    </td>
                    <td className="px-6 py-3.5">
                      <CellValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            variants={fadeUp}
            className="mb-10 text-center text-2xl font-bold tracking-tight text-white"
          >
            Frequently asked questions
          </motion.h2>

          <motion.div variants={fadeUp}>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </div>
      </Section>

      <Footer />
    </div>
  )
}
