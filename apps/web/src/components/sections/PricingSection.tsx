"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PricingFeature {
  text: string;
  highlighted?: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const freeFeatures: PricingFeature[] = [
  { text: "Machine profiling" },
  { text: "Basic startup cleanup" },
  { text: "Core tuning modules" },
  { text: "Single rollback point" },
  { text: "Community support" },
];

const premiumFeatures: PricingFeature[] = [
  { text: "Everything in Free", highlighted: true },
  { text: "All 8 machine profiles" },
  { text: "15+ tuning modules" },
  { text: "redcore · OS full access" },
  { text: "Benchmark lab" },
  { text: "BIOS guidance" },
  { text: "Unlimited rollback history" },
  { text: "Priority support" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function BillingToggle({
  isAnnual,
  onToggle,
}: {
  isAnnual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-6" role="radiogroup" aria-label="Billing period">
      <button
        type="button"
        role="radio"
        aria-checked={!isAnnual}
        onClick={() => isAnnual && onToggle()}
        className={`text-[13px] transition-colors duration-200 cursor-pointer ${
          !isAnnual ? "text-ink-primary font-medium" : "text-ink-tertiary"
        }`}
      >
        Monthly
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={isAnnual}
        onClick={() => !isAnnual && onToggle()}
        className={`text-[13px] transition-colors duration-200 cursor-pointer ${
          isAnnual ? "text-ink-primary font-medium" : "text-ink-tertiary"
        }`}
      >
        Annual{" "}
        <span className="text-brand-500 ml-1">(save 20%)</span>
      </button>
    </div>
  );
}

function FeatureList({
  features,
  checkColor,
}: {
  features: PricingFeature[];
  checkColor: string;
}) {
  return (
    <ul className="space-y-0" role="list">
      {features.map((feature) => (
        <li key={feature.text} className="flex items-center gap-3 py-2">
          <Check
            className={`h-4 w-4 flex-shrink-0 ${checkColor}`}
            aria-hidden="true"
          />
          <span
            className={`text-[14px] ${
              feature.highlighted
                ? "text-ink-primary font-semibold"
                : "text-ink-secondary"
            }`}
          >
            {feature.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative py-16 md:py-20 lg:py-24 overflow-hidden"
      aria-labelledby="pricing-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* ─── Header ─── */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="text-center"
        >
          <motion.h2
            id="pricing-heading"
            variants={staggerChild}
            className="mt-4 text-4xl md:text-5xl font-bold text-ink-primary leading-tight"
          >
            Built for depth.
          </motion.h2>

          <motion.p
            variants={staggerChild}
            className="mt-4 text-lg text-ink-secondary"
          >
            Start free. Go premium when you need the full system.
          </motion.p>
        </motion.div>

        {/* ─── Billing Toggle ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: duration.slow,
            ease: easing.enter,
            delay: 0.3,
          }}
          className="mt-8 flex justify-center"
        >
          <BillingToggle
            isAnnual={isAnnual}
            onToggle={() => setIsAnnual((prev) => !prev)}
          />
        </motion.div>

        {/* ─── Pricing Cards ─── */}
        <motion.div
          variants={staggerContainer(0.12, 0.2)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* ─── Free Tier ─── */}
          <motion.div
            variants={staggerChild}
            className="premium-card rounded-lg p-8"
          >
            <p className="overline text-ink-tertiary">Free</p>

            <div className="mt-4">
              <span className="text-4xl font-mono font-bold text-ink-primary">
                $0
              </span>
            </div>
            <p className="text-[13px] text-ink-tertiary mt-1">forever</p>

            <div className="line-h mt-6 mb-6" aria-hidden="true" />

            <FeatureList features={freeFeatures} checkColor="text-ink-tertiary" />

            <div className="mt-8">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center h-12 px-8 text-[14px] font-medium rounded-lg text-ink-primary cursor-pointer transition-all duration-200 border border-white/[0.1] hover:border-white/[0.18] hover:bg-white/[0.03]"
              >
                Download Free
              </button>
            </div>
          </motion.div>

          {/* ─── Premium Tier ─── */}
          <motion.div
            variants={staggerChild}
            className="premium-card rounded-lg p-8 relative border-brand-500/20"
          >
            <span className="absolute top-4 right-4 bg-brand-950/60 text-brand-400 rounded-md px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider">
              Recommended
            </span>

            <p className="overline text-brand-500">Premium</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-mono font-bold text-brand-400">
                {isAnnual ? "$7.99" : "$12.99"}
              </span>
              <span className="text-lg text-ink-tertiary">/mo</span>
            </div>
            <p className="text-[13px] text-ink-tertiary mt-1">per machine</p>

            <div className="line-h-brand mt-6 mb-6" aria-hidden="true" />

            <FeatureList features={premiumFeatures} checkColor="text-brand-500" />

            <div className="mt-8">
              <button
                type="button"
                className="w-full inline-flex items-center justify-center h-12 px-8 text-[14px] font-medium rounded-lg text-white cursor-pointer transition-all duration-200 bg-brand-500 hover:bg-brand-600"
              >
                Get Premium
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
