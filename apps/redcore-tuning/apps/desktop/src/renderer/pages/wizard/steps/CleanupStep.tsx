// ─── Cleanup Step ─────────────────────────────────────────────────────────────
// Windows Cleanup / Debloat — first real tuning step.
// Three curated sections: Startup, Privacy/Telemetry, System Controls.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { RiskLevel } from "@redcore/shared-schema/tuning";

// ─── Action data ──────────────────────────────────────────────────────────────

interface ActionDef {
  id: string;
  name: string;
  description: string;
  risk: RiskLevel;
  tier: "free" | "premium";
  defaultSelected: boolean;
}

const STARTUP_ACTIONS: ActionDef[] = [
  {
    id: "startup.disable-background-apps",
    name: "Disable Background App Refresh",
    description: "Stop UWP apps from running and refreshing data in the background.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "startup.disable-gamebar-presence",
    name: "Disable Game Bar Presence Writer",
    description: "Remove the Game Bar overlay process that runs on every startup.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "startup.disable-cloud-notifications",
    name: "Disable Cloud Notification Delivery",
    description: "Prevent Windows from polling cloud services for notification content.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "startup.disable-automatic-maintenance",
    name: "Disable Automatic Maintenance",
    description: "Stop Windows from running disk scans and updates during idle time.",
    risk: "low",
    tier: "free",
    defaultSelected: false,
  },
];

const PRIVACY_ACTIONS: ActionDef[] = [
  {
    id: "privacy.disable-telemetry",
    name: "Disable Windows Telemetry",
    description: "Set telemetry level to Security and disable the DiagTrack service.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-advertising-id",
    name: "Disable Advertising ID",
    description: "Prevent apps from using your advertising ID for cross-app profiling.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-clipboard-history",
    name: "Disable Clipboard History",
    description: "Stop Windows from storing copied content and syncing it to the cloud.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-activity-feed",
    name: "Disable Activity History",
    description: "Disable Windows Timeline and prevent activity upload to Microsoft.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-typing-insights",
    name: "Disable Typing Insights",
    description: "Stop collection of typing patterns and inking data sent to Microsoft.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-search-suggestions",
    name: "Disable Search Web Suggestions",
    description: "Make Windows Search local-only; stop sending keystrokes to Bing.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-error-reporting",
    name: "Disable Error Reporting",
    description: "Disable automatic crash dump uploads to Microsoft.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-ceip",
    name: "Disable CEIP",
    description: "Opt out of the Customer Experience Improvement Program.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "privacy.disable-cloud-content",
    name: "Disable Cloud Content & Spotlight",
    description: "Remove suggested apps, Windows tips, and lock-screen promotional content.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
];

const SYSTEM_ACTIONS: ActionDef[] = [
  {
    id: "system.disable-edge-startup",
    name: "Disable Edge Startup Boost",
    description: "Prevent Microsoft Edge from preloading at Windows startup.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "system.disable-edge-updates",
    name: "Disable Edge Background Updates",
    description: "Stop Edge's background updater service from running continuously.",
    risk: "low",
    tier: "free",
    defaultSelected: false,
  },
  {
    id: "system.defer-feature-updates",
    name: "Defer Feature Updates",
    description: "Delay major Windows feature updates by 365 days for stability.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "system.defer-quality-updates",
    name: "Defer Quality Updates",
    description: "Delay security and quality patches by 4 days to avoid rushed rollouts.",
    risk: "low",
    tier: "free",
    defaultSelected: false,
  },
  {
    id: "system.disable-defender-sample-submission",
    name: "Disable Defender Sample Submission",
    description: "Stop Defender from sending suspicious file samples to Microsoft cloud.",
    risk: "medium",
    tier: "premium",
    defaultSelected: false,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const riskLabel: Record<RiskLevel, string> = {
  safe: "Safe",
  low: "Low",
  medium: "Medium",
  high: "High",
  extreme: "Extreme",
};

function ActionRow({
  action,
  selected,
  onToggle,
}: {
  action: ActionDef;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
          selected
            ? "border-brand-500 bg-brand-500"
            : "border-white/20 bg-transparent"
        }`}
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected && (
          <svg viewBox="0 0 10 8" fill="none" className="h-full w-full p-[2px]">
            <path
              d="M1 4l2.5 2.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{action.name}</span>
          <Badge variant="risk" risk={action.risk}>{riskLabel[action.risk]}</Badge>
          {action.tier === "premium" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-800 bg-brand-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
              <Lock className="h-2.5 w-2.5" />
              PRO
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{action.description}</p>
      </div>
    </motion.div>
  );
}

interface SectionProps {
  title: string;
  actions: ActionDef[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  defaultOpen?: boolean;
}

function Section({ title, actions, selected, onToggle, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const activeCount = actions.filter((a) => selected.has(a.id)).length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
            {activeCount}/{actions.length} selected
          </span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown className="h-4 w-4 text-ink-tertiary" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5 px-4 pb-4"
            >
              {actions.map((action) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  selected={selected.has(action.id)}
                  onToggle={() => onToggle(action.id)}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function buildDefaultSelected(): Set<string> {
  const ids = new Set<string>();
  for (const a of [...STARTUP_ACTIONS, ...PRIVACY_ACTIONS, ...SYSTEM_ACTIONS]) {
    if (a.defaultSelected) ids.add(a.id);
  }
  return ids;
}

export function CleanupStep() {
  const [selected, setSelected] = useState<Set<string>>(buildDefaultSelected);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = selected.size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex min-h-full flex-col px-12 py-12"
    >
      <motion.div
        
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
            Windows Cleanup
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary max-w-lg">
            Remove startup clutter, disable telemetry, and reduce background noise.
            All safe actions are pre-selected.
          </p>
        </motion.div>

        {/* Sections */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
          <Section
            title="Startup & Background"
            actions={STARTUP_ACTIONS}
            selected={selected}
            onToggle={toggle}
            defaultOpen
          />
          <Section
            title="Privacy & Telemetry"
            actions={PRIVACY_ACTIONS}
            selected={selected}
            onToggle={toggle}
            defaultOpen
          />
          <Section
            title="System Controls"
            actions={SYSTEM_ACTIONS}
            selected={selected}
            onToggle={toggle}
          />
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4"
        >
          <span className="text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{total}</span>
            {" "}cleanup action{total !== 1 ? "s" : ""} selected
          </span>
          <Badge variant="success">Ready to include in plan</Badge>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
