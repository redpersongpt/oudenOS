"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ease = [0.16, 1, 0.3, 1] as const;

const pages = [
  {
    title: "Windows Debloat Guide",
    description: "Why blind scripts are risky and how step-by-step debloating works.",
    href: "/windows-debloat",
  },
  {
    title: "Windows 11 Debloat",
    description: "Remove Copilot, Recall, telemetry, widgets, and Edge nags.",
    href: "/windows-11-debloat",
  },
  {
    title: "Work PC Safe Debloat",
    description: "Clean up your work machine without breaking corporate infrastructure.",
    href: "/work-pc-debloat",
  },
  {
    title: "Custom Windows Without Reinstalling",
    description: "Transform your current install — no ISO, no fresh setup.",
    href: "/custom-windows",
  },
  {
    title: "Why redcore",
    description: "Scans your PC first, adapts to your setup, and every change is reversible.",
    href: "/why-redcore",
  },
  {
    title: "Downloads",
    description: "Get redcore OS for free. Windows 10 & 11, x64.",
    href: "/downloads",
  },
];

export function LearnMoreSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, ease }}
          className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-ink-muted mb-10"
        >
          Learn more
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
          {pages.map((page, i) => (
            <motion.div
              key={page.href}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.04 * i, duration: 0.5, ease }}
            >
              <Link
                href={page.href}
                className="group block bg-surface p-7 h-full transition-colors hover:bg-surface-raised"
              >
                <h3 className="text-[0.88rem] font-semibold text-ink-primary group-hover:text-white transition-colors flex items-center gap-2">
                  {page.title}
                  <ArrowRight className="h-3.5 w-3.5 text-ink-muted group-hover:text-accent transition-colors" />
                </h3>
                <p className="mt-2 text-[0.78rem] leading-[1.65] text-ink-tertiary">
                  {page.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
