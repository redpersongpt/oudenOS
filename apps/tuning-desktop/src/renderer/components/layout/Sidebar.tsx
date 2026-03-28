import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Cpu,
  Brain,
  Activity,
  Sliders,
  Play,
  Monitor,
  FlaskConical,
  Thermometer,
  Package,
  RotateCcw,
  Settings,
  Zap,
  CreditCard,
  LogOut,
  PanelLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useLicenseStore } from "@/stores/license-store";

const navGroups = [
  {
    label: "Discover",
    items: [
      { path: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
      { path: "/hardware",     label: "Hardware",     icon: Cpu             },
      { path: "/intelligence", label: "Intelligence", icon: Brain           },
      { path: "/diagnostics",  label: "Diagnostics",  icon: Activity        },
    ],
  },
  {
    label: "Optimize",
    items: [
      { path: "/tuning", label: "Tuning Plan", icon: Sliders },
      { path: "/apply",  label: "Apply",       icon: Play    },
    ],
  },
  {
    label: "Validate",
    items: [
      { path: "/benchmark", label: "Benchmark Lab", icon: FlaskConical },
      { path: "/thermal",   label: "Thermal",       icon: Thermometer  },
      { path: "/apps",      label: "App Hub",       icon: Package      },
      { path: "/rollback",  label: "Rollback",      icon: RotateCcw    },
    ],
  },
  {
    label: "Advanced",
    items: [
      { path: "/bios", label: "BIOS Guide", icon: Monitor },
    ],
  },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isPremium = useLicenseStore((s) => s.isPremium)();

  const displayName = user?.displayName ?? user?.email ?? "Account";
  const initials = displayName.slice(0, 2).toUpperCase();

  function handleSignOut() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="flex flex-col border-r border-border bg-surface overflow-hidden shrink-0"
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4 drag-region shrink-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 shadow-brand-glow">
          <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="brand-label"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="text-base font-semibold tracking-tight text-ink no-drag whitespace-nowrap overflow-hidden"
            >
              redcore
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-hidden">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-0.5">
            {/* Group label — hidden when collapsed */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  key={`group-${group.label}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-tertiary select-none whitespace-nowrap"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            {/* When collapsed, add spacing equivalent to the hidden label */}
            {collapsed && <div className="pt-3" />}

            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-surface-overlay"
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? "text-brand-500" : "text-ink-tertiary"
                    }`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key={`label-${item.path}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.14 }}
                        className={`relative z-10 font-medium whitespace-nowrap transition-colors ${
                          isActive ? "text-ink" : "text-ink-secondary"
                        }`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border px-2 py-2 space-y-0.5 shrink-0">
        {/* Subscription link */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="subscription-link"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <NavLink
                to="/subscription"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-surface-overlay text-ink"
                      : "text-ink-secondary hover:bg-surface-overlay hover:text-ink"
                  }`
                }
              >
                <CreditCard className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                <span className="font-medium whitespace-nowrap">
                  {isPremium ? "Premium" : "Upgrade"}
                </span>
                {!isPremium && (
                  <span className="ml-auto rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
                    PRO
                  </span>
                )}
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        <NavLink
          to="/settings"
          title={collapsed ? "Settings" : undefined}
          className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
            location.pathname === "/settings"
              ? "bg-surface-overlay text-ink"
              : "text-ink-secondary hover:bg-surface-overlay hover:text-ink"
          }`}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="settings-label"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.14 }}
                className="font-medium whitespace-nowrap"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        {/* Profile / user row */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="profile-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="pt-1 mt-1 border-t border-border"
            >
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-surface-overlay text-ink"
                      : "text-ink-secondary hover:bg-surface-overlay hover:text-ink"
                  }`
                }
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/20">
                  <span className="text-[10px] font-bold text-brand-400">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-ink">{displayName}</p>
                  <p className="text-[10px] text-ink-tertiary">{isPremium ? "Premium" : "Free"}</p>
                </div>
              </NavLink>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-xs text-ink-tertiary transition-colors hover:bg-red-900/20 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">Sign out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-tertiary transition-colors hover:bg-surface-overlay hover:text-ink-secondary"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="shrink-0"
          >
            <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </motion.div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="collapse-label"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.14 }}
                className="whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
