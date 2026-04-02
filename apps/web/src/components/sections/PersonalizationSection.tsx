"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Palette, Paintbrush, LayoutGrid, FolderOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { staggerContainer, staggerChild } from "@/lib/motion";

// Types

interface PersonalizationFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

// Data

const features: PersonalizationFeature[] = [
  {
    title: "Dark Mode System",
    description: "Consistent dark theme across shell and applications.",
    icon: Palette,
  },
  {
    title: "Brand Accents",
    description: "Subtle redcore accent integration.",
    icon: Paintbrush,
  },
  {
    title: "Taskbar Cleanup",
    description: "Clean taskbar, no clutter",
    icon: LayoutGrid,
  },
  {
    title: "Explorer Refinement",
    description: "Clean file explorer with optimized navigation.",
    icon: FolderOpen,
  },
];

// Sub-component

function FeatureItem({ feature }: { feature: PersonalizationFeature }) {
  const Icon = feature.icon;

  return (
    <motion.div variants={staggerChild} className="flex gap-4">
      <span
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-surface"
        aria-hidden="true"
      >
        <Icon className="w-[18px] h-[18px] text-ink-tertiary" />
      </span>
      <div>
        <h3 className="text-[15px] font-medium text-ink-primary">
          {feature.title}
        </h3>
        <p className="text-[13px] text-ink-secondary mt-0.5">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

// Main Component

export function PersonalizationSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      id="personalization"
      className="relative py-16 md:py-20 lg:py-24 overflow-hidden"
      aria-labelledby="personalization-heading"
    >
      <div className="section-divide" aria-hidden="true" />

      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.1, 0)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.h2
            id="personalization-heading"
            variants={staggerChild}
            className="mt-4 text-3xl md:text-4xl font-bold text-ink-primary leading-tight"
          >
            The final layer.
          </motion.h2>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={staggerContainer(0.08, 0.15)}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8"
          role="list"
          aria-label="Personalization features"
        >
          {features.map((feature) => (
            <div key={feature.title} role="listitem">
              <FeatureItem feature={feature} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
