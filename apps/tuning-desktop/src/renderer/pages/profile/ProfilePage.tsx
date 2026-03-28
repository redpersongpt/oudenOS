import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
  RefreshCw,
  Pencil,
  Check,
  X,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth-store";
import { useLicenseStore } from "@/stores/license-store";
import { cloudApi } from "@/lib/cloud-api";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "account", label: "Account" },
  { id: "danger", label: "Danger Zone" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ─── Inline edit field ────────────────────────────────────────────────────────

function InlineEditName({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  function commit() {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) {
      onSave(draft.trim());
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className="rounded bg-white/[0.06] border border-brand-500/40 px-2 py-0.5 text-sm font-semibold text-ink outline-none focus:border-brand-500/70 focus:ring-1 focus:ring-brand-500/20"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="text-green-400 hover:text-green-300 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="text-ink-tertiary hover:text-ink-secondary transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-1.5 text-left"
    >
      <p className="text-sm font-semibold text-ink group-hover:text-ink/80 transition-colors">
        {value}
      </p>
      <Pencil className="h-3 w-3 text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === "DELETE";

  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-400">Delete account</p>
            <p className="text-xs text-ink-tertiary">Permanently remove your account and all data</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 550, damping: 32 }}
        >
          <ChevronDown className="h-4 w-4 text-ink-tertiary" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 border-t border-red-900/30 pt-4">
              <p className="text-xs text-ink-secondary">
                This action is{" "}
                <span className="font-semibold text-red-400">permanent</span> and cannot be
                undone. All your data, licenses, and settings will be deleted.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-tertiary">
                  Type <span className="font-mono font-semibold text-red-400">DELETE</span> to confirm
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 font-mono text-sm text-ink placeholder-ink-tertiary/50 outline-none transition-all focus:border-red-600/50 focus:ring-1 focus:ring-red-500/20"
                />
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={!canDelete}
                className="w-full"
                onClick={() => {
                  // TODO: implement account deletion
                }}
              >
                Permanently Delete Account
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isPremium = useLicenseStore((s) => {
    const l = s.license;
    return (l?.tier === "premium" || l?.tier === "expert") && l?.status === "active";
  });
  const license = useLicenseStore((s) => s.license);

  const [activeTab, setActiveTab] = useState<TabId>("account");
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

  function handleSaveName(_next: string) {
    // TODO: call update profile API
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
                <User className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Profile</h2>
                <p className="text-xs text-ink-tertiary">Your account details</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                }
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
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
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
                {/* Avatar */}
                <motion.div
                  className="group relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-500/30 bg-brand-500/10"
                  whileHover={{ scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 550, damping: 32 }}
                >
                  <span className="text-xl font-bold text-brand-400">{initials}</span>
                  {/* Upload affordance on hover */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <User className="h-5 w-5 text-white/70" />
                  </div>
                </motion.div>

                <div>
                  <InlineEditName value={displayName} onSave={handleSaveName} />
                  {user?.email && (
                    <p className="mt-0.5 text-xs text-ink-tertiary">{user.email}</p>
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

        {/* Tabbed details */}
        <motion.div variants={staggerChild} className="col-span-2">
          <Card>
            {/* Tab bar */}
            <div className="flex border-b border-border px-5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3 pr-5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-ink"
                      : "text-ink-tertiary hover:text-ink-secondary"
                  }`}
                >
                  {tab.id === "danger" && (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="profile-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"
                      transition={{ type: "spring", stiffness: 550, damping: 32 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] }}
                >
                  <CardContent>
                    <div className="space-y-3">
                      {user?.email && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-overlay">
                            <Mail className="h-3.5 w-3.5 text-ink-tertiary" />
                          </div>
                          <div>
                            <p className="text-xs text-ink-tertiary">Email</p>
                            <p className="text-sm font-medium text-ink">{user.email}</p>
                          </div>
                        </div>
                      )}

                      {memberSince && (
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-overlay">
                            <Calendar className="h-3.5 w-3.5 text-ink-tertiary" />
                          </div>
                          <div>
                            <p className="text-xs text-ink-tertiary">Member since</p>
                            <p className="text-sm font-medium text-ink">{memberSince}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-overlay">
                          <Shield className="h-3.5 w-3.5 text-ink-tertiary" />
                        </div>
                        <div>
                          <p className="text-xs text-ink-tertiary">Subscription</p>
                          <p className="text-sm font-medium text-ink">
                            {isPremium ? "Premium" : "Free"}{" "}
                            {license?.status && (
                              <span className="text-xs text-ink-tertiary">
                                ({license.status})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-border pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate("/subscription")}
                      >
                        Manage subscription
                      </Button>
                    </div>
                  </CardContent>
                </motion.div>
              )}

              {activeTab === "danger" && (
                <motion.div
                  key="danger"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] }}
                >
                  <CardContent>
                    <p className="mb-4 text-xs text-ink-tertiary">
                      Irreversible actions. Proceed with caution.
                    </p>
                    <DangerZone />
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
