"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Briefcase,
  Monitor,
  Laptop,
  Lock,
  Zap,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  duration,
  easing,
} from "@/lib/motion";

// Types

interface PathItem {
  label: string;
}

interface PathCard {
  icon: LucideIcon;
  itemIcon: LucideIcon;
  title: string;
  accent: string;
  borderClass: string;
  description: string;
  items: PathItem[];
}

// Data

const pathCards: PathCard[] = [
  {
    icon: Briefcase,
    itemIcon: Lock,
    title: "Work PC",
    accent: "#818CF8",
    borderClass: "border-l-indigo-500",
    description: "Conservative. Safe. Enterprise-aware.",
    items: [
      { label: "Print Spooler" },
      { label: "RDP" },
      { label: "SMB Shares" },
      { label: "Group Policy" },
      { label: "VPN" },
      { label: "DNS Client" },
    ],
  },
  {
    icon: Monitor,
    itemIcon: Zap,
    title: "Gaming Desktop",
    accent: "#E8453C",
    borderClass: "border-l-brand-500",
    description: "Aggressive. Latency-focused. Maximum performance.",
    items: [
      { label: "Service reduction" },
      { label: "Scheduler tuning" },
      { label: "Power optimization" },
      { label: "Startup cleanup" },
      { label: "Network latency" },
    ],
  },
  {
    icon: Laptop,
    itemIcon: Check,
    title: "Everyday System",
    accent: "#38BDF8",
    borderClass: "border-l-sky-400",
    description: "Balanced. Battery-aware. Thermal-conscious.",
    items: [
      { label: "Battery optimization" },
      { label: "Thermal limits" },
      { label: "Bloatware removal" },
      { label: "Privacy cleanup" },
    ],
  },
];

// Stagger variant for cards

const cardStagger = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: easing.enter,
      delay: 0.3 + i * 0.12,
    },
  }),
};

// Sub-component

function PathCardComponent({ card, index }: { card: PathCard; index: number }) {
  const Icon = card.icon;
  const ItemIcon = card.itemIcon;

  return (
    <motion.article
      custom={index}
      variants={cardStagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      className={`premium-card rounded-lg border-l-2 ${card.borderClass} p-8`}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: `${card.accent}12` }}
        >
          <Icon size={20} strokeWidth={1.75} style={{ color: card.accent }} />
        </div>
        <h3 className="text-xl font-bold" style={{ color: card.accent }}>
          {card.title}
        </h3>
      </div>

      {/* Description */}
      <p className="mt-4 text-[15px] text-ink-secondary leading-relaxed">
        {card.description}
      </p>

      {/* Items */}
      <ul className="mt-6 space-y-2.5" aria-label={`${card.title} details`}>
        {card.items.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded"
              style={{ backgroundColor: `${card.accent}12` }}
              aria-hidden="true"
            >
              <ItemIcon size={12} strokeWidth={2} style={{ color: card.accent }} />
            </span>
            <span className="text-[14px] text-ink-primary font-medium">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

// Main Component

export function PathsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      id="paths"
      className="relative py-16 md:py-20 lg:py-24"
      aria-labelledby="paths-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="paths-heading"
            variants={staggerChild}
            className="mt-4 text-4xl md:text-5xl font-bold text-ink-primary leading-tight"
          >
            Your workflow shapes
            <br className="hidden sm:block" />
            the strategy.
          </motion.h2>
        </motion.div>

        {/* Path Cards */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pathCards.map((card, i) => (
            <PathCardComponent key={card.title} card={card} index={i} />
          ))}
        </div>

        {/* Trust Line */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 0.9 }}
          className="mt-12 text-[15px] text-ink-tertiary text-center max-w-2xl mx-auto leading-relaxed"
        >
          Every action is gated by machine confidence, profile context, and rollback readiness.
        </motion.p>
      </div>
    </section>
  );
}
