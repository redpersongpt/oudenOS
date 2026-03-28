// ─── SubscriptionPage ────────────────────────────────────────────────────────
// Three-tier pricing (Free / Premium / Expert) with monthly/annual toggle,
// feature comparison table, and Stripe-ready checkout flow.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Check,
  X,
  Zap,
  Crown,
  Shield,
  Minus,
  Sparkles,
  Lock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { staggerContainer, staggerChild, spring } from "@redcore/design-system";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TierBadge } from "@/components/tier/TierBadge";
import { useLicenseStore } from "@/stores/license-store";
import type { AppTier } from "@/hooks/useTier";

// ─── Pricing data ──────────────────────────────────────────────────────────

const ANNUAL_DISCOUNT = 0.20; // 20% off

interface TierConfig {
  id: AppTier;
  name: string;
  monthlyPrice: number;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  cardBorder: string;
  cardBg: string;
  accentColor: string;
  mostPopular: boolean;
  features: string[];
  machines: string;
  support: string;
  ctaLabel: string;
}

const TIERS: TierConfig[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    description: "Essential scans and safe optimizations",
    icon: <Shield className="h-5 w-5" strokeWidth={1.5} />,
    iconBg: "bg-surface-overlay border-border",
    cardBorder: "border-border",
    cardBg: "bg-surface-overlay/30",
    accentColor: "text-ink-secondary",
    mostPopular: false,
    features: [
      "Hardware scan & health overview",
      "5 safe optimizations",
      "Basic startup cleanup",
      "Basic debloat",
      "Basic benchmark",
      "Community support",
    ],
    machines: "1 machine",
    support: "Community",
    ctaLabel: "Current plan",
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 9,
    description: "Full suite for serious PC optimizers",
    icon: <Zap className="h-5 w-5" strokeWidth={2} />,
    iconBg: "bg-blue-500/10 border-blue-500/30",
    cardBorder: "border-blue-500/40",
    cardBg: "bg-blue-500/5",
    accentColor: "text-blue-400",
    mostPopular: true,
    features: [
      "Full scan & all 50+ optimizations",
      "Benchmark Lab with comparisons",
      "Rollback Center (unlimited snapshots)",
      "Reboot-resume journal",
      "Thermal & bottleneck analysis",
      "App Install Hub (28 apps)",
      "Auto-updates",
      "Config sync",
      "Priority support",
    ],
    machines: "3 machines",
    support: "Priority",
    ctaLabel: "Upgrade to Premium",
  },
  {
    id: "expert",
    name: "Expert",
    monthlyPrice: 19,
    description: "Maximum control for power users",
    icon: <Crown className="h-5 w-5" strokeWidth={2} />,
    iconBg: "bg-violet-500/10 border-violet-500/30",
    cardBorder: "border-violet-500/40",
    cardBg: "bg-violet-500/5",
    accentColor: "text-violet-400",
    mostPopular: false,
    features: [
      "Everything in Premium",
      "Expert-only system tweaks",
      "Full BIOS guidance",
      "Advanced registry controls",
      "CPU parking & GPU P-State lock",
      "Speculative mitigation control",
      "API access",
      "10 machines",
      "Priority support",
    ],
    machines: "10 machines",
    support: "Priority + API",
    ctaLabel: "Upgrade to Expert",
  },
];

// ─── Feature comparison table ──────────────────────────────────────────────

type CellValue = boolean | string;

interface ComparisonRow {
  label: string;
  free: CellValue;
  premium: CellValue;
  expert: CellValue;
  section?: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  // Core
  { label: "Hardware scan", free: true, premium: true, expert: true, section: "Core" },
  { label: "Safe optimizations", free: "5", premium: "50+", expert: "50+" },
  { label: "Benchmark", free: "Basic", premium: "Full Lab", expert: "Full Lab" },
  { label: "BIOS guidance", free: "Preview", premium: false, expert: "Full" },
  // Advanced
  { label: "Rollback Center", free: false, premium: true, expert: true, section: "Advanced" },
  { label: "Thermal analysis", free: false, premium: true, expert: true },
  { label: "Bottleneck analysis", free: false, premium: true, expert: true },
  { label: "App Install Hub", free: false, premium: true, expert: true },
  { label: "Config sync", free: false, premium: true, expert: true },
  // Expert-only
  { label: "Expert-only tweaks", free: false, premium: false, expert: true, section: "Expert" },
  { label: "Advanced controls", free: false, premium: false, expert: true },
  { label: "CPU parking / GPU P-State", free: false, premium: false, expert: true },
  { label: "Speculative mitigation", free: false, premium: false, expert: true },
  { label: "API access", free: false, premium: false, expert: true },
  // Limits
  { label: "Machines", free: "1", premium: "3", expert: "10", section: "Limits" },
  { label: "Auto-updates", free: false, premium: true, expert: true },
  { label: "Support", free: "Community", premium: "Priority", expert: "Priority" },
];

// ─── Checkout modal ────────────────────────────────────────────────────────

interface CheckoutState {
  targetTier: "premium" | "expert";
  billing: "monthly" | "annual";
}

// ─── Main component ────────────────────────────────────────────────────────

export function SubscriptionPage() {
  const license = useLicenseStore((s) => s.license);
  const currentTier = (license?.tier ?? "free") as AppTier;

  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  function annualPrice(monthly: number) {
    return (monthly * (1 - ANNUAL_DISCOUNT)).toFixed(2);
  }

  function yearlyTotal(monthly: number) {
    return (monthly * 12 * (1 - ANNUAL_DISCOUNT)).toFixed(2);
  }

  function handleUpgrade(tier: "premium" | "expert") {
    setCheckout({ targetTier: tier, billing });
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Page header ── */}
      <motion.div variants={staggerChild}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
            <CreditCard className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-ink">Subscription</h1>
            <p className="text-xs text-ink-tertiary">Choose the plan that fits your needs</p>
          </div>
          <TierBadge tier={currentTier} size="md" />
        </div>
      </motion.div>

      {/* ── Billing toggle ── */}
      <motion.div variants={staggerChild} className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`text-sm font-medium transition-colors ${
            billing === "monthly" ? "text-ink" : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          Monthly
        </button>

        <button
          onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
          className={`relative h-6 w-11 rounded-full border transition-colors ${
            billing === "annual"
              ? "border-blue-500/40 bg-blue-500/20"
              : "border-border bg-surface-overlay"
          }`}
        >
          <motion.div
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
            animate={{ left: billing === "annual" ? "calc(100% - 22px)" : "2px" }}
            transition={spring.snappy}
          />
        </button>

        <button
          onClick={() => setBilling("annual")}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            billing === "annual" ? "text-ink" : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          Annual
          <AnimatePresence>
            {billing === "annual" && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={spring.snappy}
                className="rounded-full border border-green-500/30 bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400"
              >
                Save 20%
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>

      {/* ── Tier cards ── */}
      <motion.div variants={staggerChild}>
        <div className="grid grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier;
            const isDowngrade =
              (currentTier === "expert" && tier.id === "premium") ||
              (currentTier !== "free" && tier.id === "free");
            const price =
              tier.monthlyPrice === 0
                ? null
                : billing === "annual"
                ? annualPrice(tier.monthlyPrice)
                : String(tier.monthlyPrice);

            return (
              <motion.div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-colors ${tier.cardBorder} ${tier.cardBg}`}
                whileHover={!isCurrent ? { y: -2, transition: spring.gentle } : undefined}
              >
                {/* Most Popular badge */}
                {tier.mostPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-[#0D0D10] px-3 py-0.5 text-[11px] font-semibold text-blue-400">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current plan indicator */}
                {isCurrent && (
                  <div className="absolute right-3 top-3">
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                      Your Plan
                    </span>
                  </div>
                )}

                {/* Icon + name */}
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tier.iconBg}`}
                  >
                    <span className={tier.accentColor}>{tier.icon}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${tier.accentColor}`}>{tier.name}</p>
                    <p className="text-xs text-ink-tertiary">{tier.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {price === null ? (
                    <p className="text-2xl font-bold text-ink">
                      Free
                    </p>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold text-ink">${price}</span>
                      <span className="mb-0.5 text-xs text-ink-tertiary">/mo</span>
                    </div>
                  )}
                  {billing === "annual" && tier.monthlyPrice > 0 && (
                    <p className="mt-0.5 text-[11px] text-ink-tertiary">
                      ${yearlyTotal(tier.monthlyPrice)} billed annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-5 flex-1 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-ink-secondary">
                      <Check
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tier.accentColor}`}
                        strokeWidth={2.5}
                      />
                      {f}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-xs text-ink-tertiary">
                    <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    {tier.machines}
                  </li>
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <Button variant="secondary" size="sm" disabled className="w-full">
                    <Check className="h-3.5 w-3.5" />
                    Current Plan
                  </Button>
                ) : isDowngrade ? (
                  <button
                    className="w-full text-center text-xs text-ink-tertiary underline decoration-dotted underline-offset-2 hover:text-ink-secondary"
                    onClick={() => window.open("https://redcore-tuning.com/billing", "_blank")}
                  >
                    Downgrade via billing portal
                  </button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className={`w-full ${
                      tier.id === "expert"
                        ? "!bg-violet-600 hover:!bg-violet-700"
                        : ""
                    }`}
                    onClick={() => handleUpgrade(tier.id as "premium" | "expert")}
                  >
                    {tier.ctaLabel}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Feature comparison table ── */}
      <motion.div variants={staggerChild}>
        <Card>
          <button
            className="flex w-full items-center justify-between px-5 py-4"
            onClick={() => setShowComparison((v) => !v)}
          >
            <span className="text-sm font-semibold text-ink">Full feature comparison</span>
            {showComparison ? (
              <ChevronUp className="h-4 w-4 text-ink-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-ink-tertiary" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {showComparison && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-3 text-left font-medium text-ink-tertiary">Feature</th>
                          <th className="pb-3 text-center font-medium text-ink-tertiary">Free</th>
                          <th className="pb-3 text-center font-medium text-blue-400">Premium</th>
                          <th className="pb-3 text-center font-medium text-violet-400">Expert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARISON_ROWS.map((row, i) => (
                          <>
                            {row.section && i > 0 && (
                              <tr key={`sep-${row.section}`}>
                                <td colSpan={4} className="py-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
                                  {row.section}
                                </td>
                              </tr>
                            )}
                            <tr
                              key={row.label}
                              className="border-b border-border/40 last:border-0 hover:bg-surface-overlay/30"
                            >
                              <td className="py-2.5 text-ink-secondary">{row.label}</td>
                              <td className="py-2.5 text-center">
                                <CellDisplay value={row.free} />
                              </td>
                              <td className="py-2.5 text-center">
                                <CellDisplay value={row.premium} tier="premium" />
                              </td>
                              <td className="py-2.5 text-center">
                                <CellDisplay value={row.expert} tier="expert" />
                              </td>
                            </tr>
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* ── Checkout modal ── */}
      <AnimatePresence>
        {checkout && (
          <CheckoutModal
            checkout={checkout}
            onClose={() => setCheckout(null)}
            currentTier={currentTier}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── CellDisplay helper ────────────────────────────────────────────────────

function CellDisplay({
  value,
  tier,
}: {
  value: CellValue;
  tier?: "premium" | "expert";
}) {
  if (value === true) {
    const color =
      tier === "premium" ? "text-blue-400" : tier === "expert" ? "text-violet-400" : "text-green-400";
    return <Check className={`mx-auto h-4 w-4 ${color}`} strokeWidth={2.5} />;
  }
  if (value === false) {
    return <X className="mx-auto h-3.5 w-3.5 text-ink-tertiary/40" strokeWidth={1.5} />;
  }
  const color =
    tier === "premium"
      ? "text-blue-400"
      : tier === "expert"
      ? "text-violet-400"
      : "text-ink-secondary";
  return <span className={`font-medium ${color}`}>{value}</span>;
}

// ─── Checkout modal ────────────────────────────────────────────────────────

function CheckoutModal({
  checkout,
  onClose,
  currentTier,
}: {
  checkout: CheckoutState;
  onClose: () => void;
  currentTier: AppTier;
}) {
  const tierConfig = TIERS.find((t) => t.id === checkout.targetTier)!;
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUpgrade = currentTier === "premium" && checkout.targetTier === "expert";
  const price =
    checkout.billing === "annual"
      ? Number(((tierConfig.monthlyPrice * (1 - ANNUAL_DISCOUNT)) * 12).toFixed(2))
      : tierConfig.monthlyPrice;

  function formatCard(v: string) {
    return v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProcessing(true);
    // Stripe integration point — replace with real Stripe.js confirmPayment
    try {
      await new Promise((r) => setTimeout(r, 1500));
      // TODO: call cloudApi.subscription.upgrade(checkout.targetTier, paymentMethodId)
      onClose();
    } catch {
      setError("Payment failed. Please check your card details and try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-[#0D0D10] shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={spring.gentle}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tierConfig.iconBg}`}>
              <span className={tierConfig.accentColor}>{tierConfig.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                Upgrade to {tierConfig.name}
              </p>
              <p className="text-xs text-ink-tertiary">{tierConfig.description}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Proration notice (upgrade mid-cycle) */}
          {isUpgrade && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-xs font-medium text-amber-400">Proration applied</p>
                <p className="mt-0.5 text-xs text-amber-400/80">
                  You'll be charged only for the remaining days in your current billing period.
                  Your new plan starts immediately.
                </p>
              </div>
            </div>
          )}

          {/* Price summary */}
          <div className="rounded-xl border border-border bg-surface-overlay/40 p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-ink-tertiary">{tierConfig.name} plan</span>
              <span className="text-ink-secondary">
                {checkout.billing === "annual"
                  ? `$${((tierConfig.monthlyPrice * (1 - ANNUAL_DISCOUNT))).toFixed(2)}/mo`
                  : `$${tierConfig.monthlyPrice}/mo`}
              </span>
            </div>
            {checkout.billing === "annual" && (
              <div className="flex justify-between text-xs">
                <span className="text-ink-tertiary">Billed annually</span>
                <span className="text-green-400 font-medium">
                  ${price}/yr — save ${(tierConfig.monthlyPrice * 12 * ANNUAL_DISCOUNT).toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-sm font-semibold text-ink">
                Due today
              </span>
              <span className="text-sm font-bold text-ink">
                ${checkout.billing === "annual" ? price : tierConfig.monthlyPrice}
              </span>
            </div>
          </div>

          {/* Stripe card fields */}
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">
                Cardholder name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="cc-name"
                required
                className="w-full rounded-lg border border-border bg-surface-overlay px-3 py-2.5 text-sm text-ink placeholder-ink-tertiary outline-none transition-colors focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-secondary">
                Card number
              </span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-tertiary" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  autoComplete="cc-number"
                  required
                  className="w-full rounded-lg border border-border bg-surface-overlay py-2.5 pl-9 pr-3 font-mono text-sm text-ink placeholder-ink-tertiary outline-none transition-colors focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  Expiry
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM / YY"
                  autoComplete="cc-exp"
                  required
                  className="w-full rounded-lg border border-border bg-surface-overlay px-3 py-2.5 font-mono text-sm text-ink placeholder-ink-tertiary outline-none transition-colors focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink-secondary">
                  CVC
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••"
                  autoComplete="cc-csc"
                  required
                  className="w-full rounded-lg border border-border bg-surface-overlay px-3 py-2.5 font-mono text-sm text-ink placeholder-ink-tertiary outline-none transition-colors focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              loading={processing}
              className={`flex-1 ${
                checkout.targetTier === "expert" ? "!bg-violet-600 hover:!bg-violet-700" : ""
              }`}
            >
              {processing ? "Processing…" : `Pay $${checkout.billing === "annual" ? price : tierConfig.monthlyPrice}`}
            </Button>
          </div>

          <p className="text-center text-[10px] text-ink-tertiary">
            Secured by Stripe · Cancel anytime ·{" "}
            <button
              type="button"
              className="inline-flex items-center gap-0.5 underline decoration-dotted hover:text-ink-secondary"
              onClick={() => window.open("https://redcore-tuning.com/privacy", "_blank")}
            >
              Privacy Policy <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
