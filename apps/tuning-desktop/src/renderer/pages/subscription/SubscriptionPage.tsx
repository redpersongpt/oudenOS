import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Zap,
  Check,
  Lock,
  RefreshCw,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useLicenseStore } from "@/stores/license-store";
import { useAuthStore } from "@/stores/auth-store";
import { cloudApi, CloudApiRequestError } from "@/lib/cloud-api";
import type { SubscriptionDetails } from "@/lib/cloud-api";

const FREE_FEATURES = [
  "Hardware scan & health overview",
  "Basic startup cleanup",
  "Basic debloat",
  "Limited recommendations",
  "Basic benchmark",
  "BIOS guidance preview",
];

const PREMIUM_FEATURES = [
  "Full tuning engine (50+ actions)",
  "Benchmark Lab with comparisons",
  "Rollback Center (unlimited snapshots)",
  "Reboot-resume journal",
  "Thermal & bottleneck analysis",
  "App Install Hub (28 apps)",
  "CPU parking, timer & GPU optimization",
  "Expert mode & manual registry editor",
  "Config sync across devices",
];

export function SubscriptionPage() {
  const license = useLicenseStore((s) => s.license);
  const user = useAuthStore((s) => s.user);
  const isPremium = useLicenseStore((s) => s.isPremium)();

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateSuccess, setActivateSuccess] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    cloudApi.subscription
      .get()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setLoadingSubscription(false));
  }, []);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setActivateError(null);
    setActivateSuccess(false);
    setActivating(true);
    try {
      await cloudApi.subscription.activate(licenseKey.trim());
      setActivateSuccess(true);
      setLicenseKey("");
    } catch (err) {
      setActivateError(
        err instanceof CloudApiRequestError ? err.message : "Failed to activate key.",
      );
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate your license on this device?")) return;
    setDeactivating(true);
    try {
      await cloudApi.subscription.deactivate();
    } catch {
      // best-effort
    } finally {
      setDeactivating(false);
    }
  }

  const tierBadge = isPremium ? (
    <Badge variant="premium">Premium</Badge>
  ) : (
    <Badge variant="default">Free</Badge>
  );

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerChild}>
        <Card>
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
              <CreditCard className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-ink">Subscription</h2>
              <p className="text-xs text-ink-tertiary">
                Manage your plan and license activation
              </p>
            </div>
            {tierBadge}
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        {/* Current plan */}
        <motion.div variants={staggerChild}>
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-ink">Current plan</h3>
            </CardHeader>
            <CardContent>
              {loadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-ink-tertiary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`flex items-center gap-3 rounded-xl p-4 ${
                      isPremium
                        ? "border border-brand-500/20 bg-brand-500/10"
                        : "border border-white/[0.08] bg-surface-overlay"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isPremium ? "bg-brand-500/20" : "bg-white/[0.06]"
                      }`}
                    >
                      {isPremium ? (
                        <Zap className="h-5 w-5 text-brand-400" strokeWidth={2} />
                      ) : (
                        <Shield className="h-5 w-5 text-ink-tertiary" strokeWidth={1.5} />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isPremium ? "text-brand-400" : "text-ink-secondary"
                        }`}
                      >
                        {isPremium ? "Premium" : "Free"}
                      </p>
                      <p className="text-xs text-ink-tertiary">
                        {subscription
                          ? `Status: ${subscription.status}`
                          : license?.status ?? "—"}
                      </p>
                    </div>
                  </div>

                  {subscription && (
                    <div className="space-y-2.5 text-xs">
                      {subscription.currentPeriodEnd && (
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Renews</span>
                          <span className="font-mono text-ink-secondary">
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {subscription.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Card</span>
                          <span className="font-mono text-ink-secondary">
                            {subscription.paymentMethod.brand} ••••{" "}
                            {subscription.paymentMethod.last4}
                          </span>
                        </div>
                      )}
                      {user?.email && (
                        <div className="flex justify-between">
                          <span className="text-ink-tertiary">Account</span>
                          <span className="font-mono text-ink-secondary">{user.email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isPremium && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deactivating}
                      onClick={handleDeactivate}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Deactivate on this device
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* License key activation */}
        <motion.div variants={staggerChild}>
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-ink">License key</h3>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-ink-tertiary">
                Enter your license key to activate Premium on this device.
              </p>

              {activateSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2.5">
                  <Check className="h-4 w-4 shrink-0 text-green-400" />
                  <p className="text-xs text-green-400">License activated successfully!</p>
                </div>
              )}

              {activateError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-xs text-red-400">{activateError}</p>
                </div>
              )}

              <form onSubmit={handleActivate} className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary" />
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full rounded-lg border border-border bg-surface-overlay py-2.5 pl-9 pr-3 font-mono text-sm text-ink placeholder-ink-tertiary outline-none transition-colors focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={activating}
                  disabled={!licenseKey.trim()}
                  className="w-full"
                >
                  Activate
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Feature comparison */}
      <motion.div variants={staggerChild}>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-ink">Plan comparison</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Free */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
                  Free
                </p>
                <ul className="space-y-2">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-ink-secondary">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-400">
                  Premium
                </p>
                <p className="mb-3 text-sm font-bold text-brand-400">
                  $12.99 <span className="text-xs font-normal text-ink-tertiary">one-time</span>
                </p>
                <ul className="space-y-2">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-ink-secondary">
                      <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isPremium && (
                  <div className="mt-4">
                    <Button variant="primary" size="sm" className="w-full">
                      Upgrade to Premium
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
