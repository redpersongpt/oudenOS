import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Key,
  Settings2,
  Wrench,
  Info,
  Shield,
  Monitor,
  RefreshCw,
  FileText,
  ExternalLink,
  Check,
} from "lucide-react";
import { staggerContainer, staggerChild, slideUp } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SettingsSection = "account" | "license" | "preferences" | "expert" | "about";

const sections: Array<{ id: SettingsSection; label: string; icon: React.ElementType; description: string }> = [
  { id: "account",     label: "Account",     icon: User,     description: "Profile & device"       },
  { id: "license",     label: "License",     icon: Key,      description: "Plan & activation"      },
  { id: "preferences", label: "Preferences", icon: Settings2,description: "Behaviour & updates"    },
  { id: "expert",      label: "Expert Mode", icon: Wrench,   description: "Advanced controls"      },
  { id: "about",       label: "About",       icon: Info,     description: "Version & links"        },
];

const mockLicense = {
  tier:          "Pro"                  as const,
  status:        "Active"               as const,
  expiresAt:     "2027-03-23",
  deviceId:      "DESKTOP-A1B2C3D",
  deviceBound:   true,
  email:         "user@example.com",
};

type LogLevel = "Error" | "Warn" | "Info" | "Debug";

// ─── Toggle switch ─────────────────────────────────────────────────────────
function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
        enabled ? "bg-brand-500" : "bg-white/[0.10]"
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <motion.span
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
        animate={{ x: enabled ? 22 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// ─── Settings row ──────────────────────────────────────────────────────────
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-tertiary leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Info row ──────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 first:pt-0">
      <span className="text-xs font-medium text-ink-tertiary">{label}</span>
      <span className="text-xs text-ink-secondary font-mono">{value}</span>
    </div>
  );
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [logLevel, setLogLevel]           = useState<LogLevel>("Info");
  const [toggles, setToggles]             = useState<Record<string, boolean>>({
    telemetry:        false,
    autoUpdate:       true,
    notifications:    true,
    verboseLogging:   false,
    expertMode:       false,
    dryRunDefault:    true,
    showRiskWarnings: true,
    autoBackup:       true,
  });

  const toggle = (id: string) =>
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Section content ───────────────────────────────────────────────────────
  const renderSection = (): React.ReactNode => {
    switch (activeSection) {

      // ── Account ─────────────────────────────────────────────────────────
      case "account":
        return (
          <div className="space-y-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 rounded-xl bg-surface-overlay border border-border p-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm">
                <span className="text-lg font-bold text-white">
                  {mockLicense.email[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{mockLicense.email}</p>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  Member since March 2026 &middot;{" "}
                  <span className="text-brand-400 font-medium">{mockLicense.tier}</span> tier
                </p>
              </div>
              <Badge variant="premium" className="ml-auto">{mockLicense.tier}</Badge>
            </div>

            <div className="divide-y divide-border">
              <InfoRow label="Email"  value={mockLicense.email} />
              <InfoRow label="Device" value={mockLicense.deviceId} />
              <InfoRow label="OS"     value="Windows 11 Pro 24H2 (Build 26100)" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm">Edit Profile</Button>
              <Button variant="ghost"     size="sm">Sign Out</Button>
            </div>
          </div>
        );

      // ── License ──────────────────────────────────────────────────────────
      case "license":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-brand-500/10 border border-brand-500/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20">
                  <Shield className="h-5 w-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-300">{mockLicense.tier} License</p>
                  <p className="text-xs text-brand-400/70">All premium features unlocked</p>
                </div>
              </div>
              <Badge variant="premium">{mockLicense.status}</Badge>
            </div>

            <div className="divide-y divide-border">
              <InfoRow label="Tier"           value={mockLicense.tier}                                          />
              <InfoRow label="Status"         value={mockLicense.status}                                        />
              <InfoRow label="Expires"        value={mockLicense.expiresAt}                                     />
              <InfoRow label="Device Binding" value={mockLicense.deviceBound ? "Bound" : "Unbound"}             />
              <InfoRow label="Bound Device"   value={mockLicense.deviceId}                                      />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" icon={<Key className="h-3.5 w-3.5" />}>
                Enter License Key
              </Button>
              <Button variant="ghost" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />}>
                Transfer Device
              </Button>
            </div>
          </div>
        );

      // ── Preferences ──────────────────────────────────────────────────────
      case "preferences":
        return (
          <div className="space-y-5">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
                Privacy & Updates
              </p>
              <div className="divide-y divide-border">
                <SettingRow
                  label="Telemetry Opt-in"
                  description="Send anonymous usage data to help improve redcore-Tuning"
                >
                  <ToggleSwitch enabled={toggles.telemetry!} onToggle={() => toggle("telemetry")} />
                </SettingRow>
                <SettingRow
                  label="Auto-update"
                  description="Automatically download and install updates when available"
                >
                  <ToggleSwitch enabled={toggles.autoUpdate!} onToggle={() => toggle("autoUpdate")} />
                </SettingRow>
                <SettingRow
                  label="Desktop Notifications"
                  description="Show system notifications for completed actions and alerts"
                >
                  <ToggleSwitch enabled={toggles.notifications!} onToggle={() => toggle("notifications")} />
                </SettingRow>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
                Tuning Behaviour
              </p>
              <div className="divide-y divide-border">
                <SettingRow
                  label="Auto Backup Before Apply"
                  description="Always create a restore point before applying any changes"
                >
                  <ToggleSwitch enabled={toggles.autoBackup!} onToggle={() => toggle("autoBackup")} />
                </SettingRow>
                <SettingRow
                  label="Show Risk Warnings"
                  description="Display confirmation dialogs for medium and high risk actions"
                >
                  <ToggleSwitch enabled={toggles.showRiskWarnings!} onToggle={() => toggle("showRiskWarnings")} />
                </SettingRow>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-ink-tertiary">
                Logging
              </p>
              <SettingRow
                label="Logging Level"
                description="Set verbosity of application logs"
              >
                <div className="flex gap-1 rounded-lg bg-surface-overlay border border-border p-1">
                  {(["Error", "Warn", "Info", "Debug"] as LogLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setLogLevel(level)}
                      className={`relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        logLevel === level ? "text-ink" : "text-ink-tertiary hover:text-ink-secondary"
                      }`}
                    >
                      {logLevel === level && (
                        <motion.div
                          layoutId="log-level-tab"
                          className="absolute inset-0 rounded-md bg-surface-raised shadow-sm"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{level}</span>
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>
          </div>
        );

      // ── Expert ───────────────────────────────────────────────────────────
      case "expert":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="risk" risk="medium">Advanced</Badge>
              <p className="text-xs text-ink-tertiary">These settings affect low-level system behaviour.</p>
            </div>

            <div className="divide-y divide-border">
              <SettingRow
                label="Enable Expert Mode"
                description="Unlock advanced options and manual registry editing capabilities"
              >
                <ToggleSwitch enabled={toggles.expertMode!} onToggle={() => toggle("expertMode")} />
              </SettingRow>
              <SettingRow
                label="Verbose Logging"
                description="Log detailed registry read/write operations for debugging"
              >
                <ToggleSwitch enabled={toggles.verboseLogging!} onToggle={() => toggle("verboseLogging")} />
              </SettingRow>
              <SettingRow
                label="Default to Dry Run"
                description="Always preview changes before applying (recommended)"
              >
                <ToggleSwitch enabled={toggles.dryRunDefault!} onToggle={() => toggle("dryRunDefault")} />
              </SettingRow>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                  <Wrench className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-300">Expert Mode Warning</p>
                  <p className="mt-1 text-xs text-amber-400/80 leading-relaxed">
                    Expert mode exposes low-level system controls. Incorrect modifications to registry
                    values or system services can cause instability or boot failures. Always create a
                    backup before making manual changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      // ── About ────────────────────────────────────────────────────────────
      case "about":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <Monitor className="h-7 w-7 text-brand-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">redcore-Tuning</p>
                <p className="text-xs text-ink-tertiary">Windows performance optimization toolkit</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-overlay divide-y divide-border px-3">
              {[
                { label: "Version",    value: "1.0.0-beta.3"         },
                { label: "Electron",   value: "33.2.0"               },
                { label: "Node.js",    value: "20.18.1"              },
                { label: "Chromium",   value: "130.0.6723.152"       },
                { label: "Build Date", value: "2026-03-23"           },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-ink-tertiary">{item.label}</span>
                  <span className="text-xs text-ink-secondary font-mono">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="ghost"     size="sm" icon={<ExternalLink className="h-3 w-3" />}>GitHub</Button>
              <Button variant="ghost"     size="sm" icon={<FileText className="h-3 w-3"    />}>Changelog</Button>
              <Button variant="ghost"     size="sm" icon={<FileText className="h-3 w-3"    />}>Licenses</Button>
              <Button variant="secondary" size="sm" icon={<RefreshCw  className="h-3.5 w-3.5" />}>Check for Updates</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Header ── */}
      <motion.div variants={staggerChild}>
        <Card>
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
              <Settings2 className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Settings</h2>
              <p className="text-xs text-ink-tertiary">
                Manage your account, license, and application preferences
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
        {/* ── Section nav ── */}
        <motion.div variants={staggerChild} className="col-span-1">
          <Card>
            <CardContent>
              <nav className="space-y-0.5 py-1">
                {sections.map((section) => {
                  const Icon     = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isActive ? "text-ink" : "text-ink-secondary hover:bg-surface-overlay hover:text-ink"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="settings-active-bg"
                          className="absolute inset-0 rounded-lg bg-brand-500/10 border border-brand-500/20"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <Icon
                        className={`relative z-10 h-4 w-4 shrink-0 ${isActive ? "text-brand-500" : "text-ink-tertiary"}`}
                        strokeWidth={1.5}
                      />
                      <div className="relative z-10 flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{section.label}</p>
                        <p className="mt-0.5 text-[10px] text-ink-tertiary leading-none">{section.description}</p>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="settings-active-check"
                          className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/20 shrink-0"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        >
                          <Check className="h-2.5 w-2.5 text-brand-400" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Section content with AnimatePresence ── */}
        <motion.div variants={staggerChild} className="col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-ink">
                    {sections.find((s) => s.id === activeSection)?.label}
                  </h2>
                </CardHeader>
                <CardContent>
                  {renderSection()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
