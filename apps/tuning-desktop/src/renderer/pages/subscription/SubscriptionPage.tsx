import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Crown,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { staggerContainer, staggerChild, spring } from "@redcore/design-system";
import type { LicenseState } from "@redcore/shared-schema/license";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TierBadge } from "@/components/tier/TierBadge";
import { toast } from "@/components/ui/Toast";
import { useLicenseStore } from "@/stores/license-store";
import { openExternalUrl, PRIVACY_URL, TUNING_SITE_URL } from "@/lib/external-links";

const FREE_FEATURES = [
  "Hardware scan and health overview",
  "Safe optimization plans",
  "Benchmark lab",
  "Rollback center",
  "App Install Hub",
  "Machine intelligence",
];

const PREMIUM_FEATURES = [
  "Full tuning engine",
  "Reboot-resume workflow",
  "Thermal and bottleneck analysis",
  "Advanced low-level tuning controls",
  "One machine premium activation",
  "License-key based unlock",
];

function normalizeLicenseState(raw: unknown): LicenseState {
  const state = (raw ?? {}) as Partial<LicenseState>;
  return {
    tier: state.tier ?? "free",
    status: state.status ?? "expired",
    expiresAt: state.expiresAt ?? null,
    deviceBound: state.deviceBound ?? false,
    deviceId: state.deviceId ?? null,
    lastValidatedAt: state.lastValidatedAt ?? new Date().toISOString(),
    offlineGraceDays: state.offlineGraceDays ?? 0,
    offlineDaysRemaining: state.offlineDaysRemaining ?? 0,
    features: state.features ?? [],
  };
}

export function SubscriptionPage() {
  const license = useLicenseStore((s) => s.license);
  const setLicense = useLicenseStore((s) => s.setLicense);
  const currentTier = license?.tier ?? "free";
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  async function handleActivate() {
    const normalized = licenseKey.trim().toUpperCase();
    if (!normalized) {
      toast.error("License Key Required", "Enter your redcore Tuning license key first.");
      return;
    }

    setActivating(true);
    try {
      const nextState = normalizeLicenseState(await window.redcore.license.activate(normalized));
      setLicense(nextState);
      setLicenseKey("");
      toast.success("License Activated", "Premium features are now unlocked on this machine.");
    } catch (error) {
      toast.error(
        "Activation Failed",
        error instanceof Error ? error.message : "Could not activate this license key.",
      );
    } finally {
      setActivating(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const nextState = normalizeLicenseState(await window.redcore.license.refresh());
      setLicense(nextState);
      toast.success("License Refreshed", "The local license state is up to date.");
    } catch (error) {
      toast.error(
        "Refresh Failed",
        error instanceof Error ? error.message : "Could not refresh your license right now.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await window.redcore.license.deactivate();
      setLicense(normalizeLicenseState(await window.redcore.license.get()));
      toast.success("License Removed", "This machine is back on the free tier.");
    } catch (error) {
      toast.error(
        "Remove Failed",
        error instanceof Error ? error.message : "Could not remove the local license key.",
      );
    } finally {
      setDeactivating(false);
    }
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={staggerChild} className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
          <KeyRound className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-ink">License</h1>
          <p className="text-xs text-ink-tertiary">
            redcore Tuning is free by default. Premium is a $12.99 one-time license key.
          </p>
        </div>
        <TierBadge tier={currentTier} size="md" />
      </motion.div>

      <motion.div variants={staggerChild} className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-ink-tertiary" />
                <p className="text-sm font-semibold text-ink">Free</p>
              </div>
              <p className="mt-1 text-xs text-ink-tertiary">No account lock-in. Safe defaults stay available.</p>
            </div>
            <Badge variant="secondary">Included</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-bold text-ink">Free</p>
            <ul className="space-y-2">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-ink-secondary">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-tertiary" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-brand-500/30 bg-brand-500/5">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-brand-400" />
                <p className="text-sm font-semibold text-brand-300">Premium</p>
              </div>
              <p className="mt-1 text-xs text-brand-400/80">One-time purchase. Lifetime key for one machine.</p>
            </div>
            <Badge variant="premium">{currentTier === "free" ? "Paid" : "Active"}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-ink">$12.99</span>
              <span className="mb-0.5 text-xs text-ink-tertiary">one-time</span>
            </div>
            <ul className="space-y-2">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs text-ink-secondary">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => openExternalUrl(TUNING_SITE_URL)}
            >
              Buy On redcoreos.net
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={staggerChild} className="grid grid-cols-[1.3fr_1fr] gap-4">
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-ink">Activate License Key</p>
            <p className="text-xs text-ink-tertiary">
              Buy once on the website, then paste the key from your profile or purchase email.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="License key"
              placeholder="RCTN-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              hint="Keys are tied to one machine when activated."
            />
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                loading={activating}
                onClick={() => void handleActivate()}
              >
                Activate Key
                <Zap className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={refreshing}
                onClick={() => void handleRefresh()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={deactivating}
                onClick={() => void handleDeactivate()}
                disabled={!license?.deviceBound && currentTier === "free"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
            <p className="text-[11px] text-ink-tertiary">
              Purchase and privacy details live on the website. The desktop app never collects raw card data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-ink">Current Machine State</p>
            <p className="text-xs text-ink-tertiary">This reflects the locally cached license and latest validation.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-tertiary">Tier</span>
              <span className="font-medium text-ink capitalize">{license?.tier ?? "free"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-tertiary">Status</span>
              <span className="font-medium text-ink capitalize">{license?.status ?? "active"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-tertiary">Bound Device</span>
              <span className="font-medium text-ink">{license?.deviceId ?? "Not bound"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-tertiary">Offline Grace</span>
              <span className="font-medium text-ink">{license?.offlineDaysRemaining ?? 0} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-tertiary">Validated</span>
              <span className="font-medium text-ink">
                {license?.lastValidatedAt ? new Date(license.lastValidatedAt).toLocaleString() : "Never"}
              </span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] text-ink-tertiary underline decoration-dotted underline-offset-2 hover:text-ink-secondary"
              onClick={() => openExternalUrl(PRIVACY_URL)}
            >
              Privacy Policy
              <ExternalLink className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
