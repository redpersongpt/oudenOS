"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Heart } from "lucide-react";
import { duration, easing } from "@/lib/motion";

const tiers = [
  { amount: "$5", label: "Supporter", desc: "Buy us a coffee" },
  { amount: "$15", label: "Backer", desc: "Keep development going" },
  { amount: "$50", label: "Sponsor", desc: "Fund a feature" },
];

export function DonateSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} id="donate" className="relative py-16 md:py-20 lg:py-24">
      <div className="section-divide" aria-hidden="true" />
      <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: duration.slow, ease: easing.enter }}
        >
          <Heart size={28} className="text-brand-500 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Support OudenOS
          </h2>
          <p className="mt-3 text-[16px] text-[var(--text-secondary)] max-w-lg mx-auto">
            OudenOS is free. Donations help us maintain the project,
            ship new features, and keep it independent.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 0.15 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {tiers.map((tier) => (
            <a
              key={tier.amount}
              href="https://github.com/sponsors/redpersongpt"
              target="_blank"
              rel="noopener noreferrer"
              className="premium-card rounded-lg p-5 text-center cursor-pointer transition-all duration-200 hover:border-brand-500/30 group"
            >
              <p className="text-2xl font-bold text-brand-500">{tier.amount}</p>
              <p className="text-[14px] font-medium text-[var(--text-primary)] mt-1">{tier.label}</p>
              <p className="text-[12px] text-[var(--text-disabled)] mt-0.5">{tier.desc}</p>
            </a>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="https://github.com/sponsors/redpersongpt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 text-[14px] font-medium rounded-lg text-white cursor-pointer bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            <Heart size={15} />
            Become a Sponsor
          </a>
          <a
            href="https://ko-fi.com/redperson"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 px-6 text-[14px] font-medium rounded-lg text-[var(--text-primary)] cursor-pointer border border-[var(--border)] hover:border-[var(--border-visible)] transition-colors"
          >
            One-time Donation
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: duration.slow, ease: easing.enter, delay: 0.4 }}
          className="mt-6 text-[12px] text-[var(--text-disabled)]"
        >
          Every contribution counts. Thank you for supporting Ouden.
        </motion.p>
      </div>
    </section>
  );
}
