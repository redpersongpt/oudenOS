// Infrastructure Step
// Memory / Storage / Network / Display / Audio subsystem tuning.
// Tab-based section switching with animated underline indicator.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import {
  tabUnderlineTransition,
} from "@redcore/design-system";
import { Badge } from "@/components/ui/Badge";
import type { RiskLevel } from "@redcore/shared-schema/tuning";

// Action data

interface InfraAction {
  id: string;
  name: string;
  description: string;
  risk: RiskLevel;
  tier: "free" | "premium";
  defaultSelected: boolean;
}

const MEMORY: InfraAction[] = [
  {
    id: "memory.disable-pagefile",
    name: "Disable Pagefile",
    description: "Remove the paging file on systems with 16 GB+ RAM. Eliminates pagefile I/O entirely.",
    risk: "medium",
    tier: "premium",
    defaultSelected: false,
  },
  {
    id: "memory.large-pages",
    name: "Enable Large Pages",
    description: "Allow applications to request large memory pages (2 MB vs 4 KB). Reduces TLB pressure on high-RAM systems.",
    risk: "low",
    tier: "premium",
    defaultSelected: false,
  },
  {
    id: "memory.disable-compression",
    name: "Disable Memory Compression",
    description: "Stop Windows from compressing cold memory pages. Trades RAM usage for reduced CPU overhead during memory pressure.",
    risk: "low",
    tier: "free",
    defaultSelected: false,
  },
];

const STORAGE: InfraAction[] = [
  {
    id: "storage.disable-last-access",
    name: "Disable Last Access Timestamp",
    description: "Stop NTFS from updating file last-access times on read. Reduces metadata write I/O.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "storage.enable-write-caching",
    name: "Enable Write Caching",
    description: "Allow the OS to buffer disk writes in RAM. Significant sequential write speedup.",
    risk: "low",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "storage.disable-indexing",
    name: "Disable Drive Indexing",
    description: "Turn off Windows Search content indexing at the volume level.",
    risk: "safe",
    tier: "free",
    defaultSelected: false,
  },
  {
    id: "storage.disable-8dot3-filenames",
    name: "Disable 8.3 Filenames",
    description: "Stop NTFS from generating legacy short filenames for every file created.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
];

const NETWORK: InfraAction[] = [
  {
    id: "network.rss-queues-2",
    name: "Set RSS Queues to 2",
    description: "Configure Receive Side Scaling to use 2 CPU queues. Balances network interrupt load across cores.",
    risk: "low",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "network.disable-nagle",
    name: "Disable Nagle Algorithm",
    description: "Disable TCP packet coalescing (TcpNoDelay). Reduces latency for small interactive packets.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "network.tcp-autotuning-normal",
    name: "TCP Autotuning Normal",
    description: "Set TCP receive window autotuning to Normal. Avoids aggressive scaling that can cause bufferbloat.",
    risk: "safe",
    tier: "free",
    defaultSelected: false,
  },
];

const DISPLAY: InfraAction[] = [
  {
    id: "display.disable-pointer-acceleration",
    name: "Disable Pointer Acceleration",
    description: "Remove the mouse enhance pointer precision curve for raw 1:1 input.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "display.disable-transparency",
    name: "Disable Transparency Effects",
    description: "Turn off Acrylic/Mica blur effects in the shell. Frees GPU composition overhead.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "display.disable-game-bar",
    name: "Disable Game Bar Overlay",
    description: "Disable the Xbox Game Bar overlay completely, not just its presence writer.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "display.disable-sticky-keys",
    name: "Disable Sticky Keys Shortcut",
    description: "Remove the Shift×5 accessibility shortcut that interrupts gameplay.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
];

const AUDIO: InfraAction[] = [
  {
    id: "audio.disable-enhancements",
    name: "Disable Audio Enhancements",
    description: "Turn off system-wide audio DSP processing. Reduces audio latency and CPU overhead.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "audio.exclusive-mode",
    name: "Allow Exclusive Mode",
    description: "Permit applications to take exclusive control of the audio device for direct low-latency output.",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
];

// Tab definitions

type TabId = "memory" | "storage" | "network" | "display" | "audio";

const TABS: { id: TabId; label: string; actions: InfraAction[] }[] = [
  { id: "memory",  label: "Memory",  actions: MEMORY  },
  { id: "storage", label: "Storage", actions: STORAGE  },
  { id: "network", label: "Network", actions: NETWORK  },
  { id: "display", label: "Display", actions: DISPLAY  },
  { id: "audio",   label: "Audio",   actions: AUDIO    },
];

// Risk label

const riskLabel: Record<RiskLevel, string> = {
  safe: "Safe", low: "Low", medium: "Medium", high: "High", extreme: "Extreme",
};

// Action row

function ActionRow({
  action,
  selected,
  onToggle,
}: {
  action: InfraAction;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
    >
      <button
        onClick={onToggle}
        className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
          selected ? "border-brand-500 bg-brand-500" : "border-white/20 bg-transparent"
        }`}
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected && (
          <svg viewBox="0 0 10 8" fill="none" className="h-full w-full p-[2px]">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

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

// Step

const ALL_ACTIONS = [...MEMORY, ...STORAGE, ...NETWORK, ...DISPLAY, ...AUDIO];

function buildDefault(): Set<string> {
  return new Set(ALL_ACTIONS.filter((a) => a.defaultSelected).map((a) => a.id));
}

export function InfrastructureStep() {
  const [activeTab, setActiveTab] = useState<TabId>("memory");
  const [selected, setSelected] = useState<Set<string>>(buildDefault);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const currentTab = TABS.find((t) => t.id === activeTab)!;

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
            System Infrastructure
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary max-w-lg">
            Fine-tune memory, storage, network, display, and audio subsystems for
            lower latency and reduced overhead.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
          <div className="flex gap-1 border-b border-white/[0.06]">
            {TABS.map((tab) => {
              const tabSelected = tab.actions.filter((a) => selected.has(a.id)).length;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-1.5 px-4 pb-3 pt-1 text-sm transition-colors"
                >
                  <span className={isActive ? "font-medium text-ink" : "text-ink-tertiary hover:text-ink-secondary"}>
                    {tab.label}
                  </span>
                  {tabSelected > 0 && (
                    <span className="rounded-full bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-400">
                      {tabSelected}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="infra-tab"
                      transition={tabUnderlineTransition}
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-brand-500"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <motion.div
                
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {currentTab.actions.map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    selected={selected.has(action.id)}
                    onToggle={() => toggle(action.id)}
                  />
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4"
        >
          <span className="text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{selected.size}</span>
            {" "}infrastructure action{selected.size !== 1 ? "s" : ""} selected
          </span>
          <Badge variant="success">Ready to include in plan</Badge>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
