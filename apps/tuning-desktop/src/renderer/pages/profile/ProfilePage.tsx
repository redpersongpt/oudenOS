import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Calendar, Shield, LogOut, RefreshCw } from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth-store";
import { useLicenseStore } from "@/stores/license-store";
import { cloudApi } from "@/lib/cloud-api";

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isPremium = useLicenseStore((s) => s.isPremium)();
  const license = useLicenseStore((s) => s.license);

  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleRefreshProfile() {
    setRefreshing(true);
    try {
      await cloudApi.auth.me();
    } catch {
      // best-effort
    } finally {
      setRefreshing(false);
    }
  }

  function handleSignOut() {
    setSigningOut(true);
    clearAuth();
    navigate("/login", { replace: true });
  }

  const displayName = user?.displayName ?? user?.email ?? "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

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
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
                <User className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Profile</h2>
                <p className="text-xs text-neutral-400">Your account details</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />}
                onClick={handleRefreshProfile}
                loading={refreshing}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<LogOut className="h-3.5 w-3.5" />}
                onClick={handleSignOut}
                loading={signingOut}
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                Sign out
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {/* Avatar + basic info */}
        <motion.div variants={staggerChild} className="col-span-1">
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 border-2 border-brand-100">
                  <span className="text-xl font-bold text-brand-600">{initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{displayName}</p>
                  {user?.email && (
                    <p className="mt-0.5 text-xs text-neutral-400">{user.email}</p>
                  )}
                </div>
                {isPremium ? (
                  <Badge variant="premium">Premium</Badge>
                ) : (
                  <Badge variant="default">Free</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account details */}
        <motion.div variants={staggerChild} className="col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-neutral-900">Account details</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {user?.email && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 border border-neutral-150">
                      <Mail className="h-3.5 w-3.5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Email</p>
                      <p className="text-sm font-medium text-neutral-800">{user.email}</p>
                    </div>
                  </div>
                )}

                {memberSince && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 border border-neutral-150">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400">Member since</p>
                      <p className="text-sm font-medium text-neutral-800">{memberSince}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 border border-neutral-150">
                    <Shield className="h-3.5 w-3.5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400">Subscription</p>
                    <p className="text-sm font-medium text-neutral-800">
                      {isPremium ? "Premium" : "Free"}{" "}
                      {license?.status && (
                        <span className="text-xs text-neutral-400">({license.status})</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-neutral-100 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/subscription")}
                >
                  Manage subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
