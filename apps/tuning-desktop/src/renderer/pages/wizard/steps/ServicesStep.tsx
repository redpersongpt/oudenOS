// ─── Services Step ─────────────────────────────────────────────────────────────
// Background Service Reduction — disable unnecessary Windows services.

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Server } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { RiskLevel } from "@redcore/shared-schema/tuning";

// ─── Service definitions ──────────────────────────────────────────────────────

type Impact = "low" | "medium";

interface ServiceDef {
  id: string;
  name: string;
  serviceName: string;
  description: string;
  why: string;
  impact: Impact;
  risk: RiskLevel;
  tier: "free" | "premium";
  defaultSelected: boolean;
}

const SERVICES: ServiceDef[] = [
  {
    id: "services.disable-xbox-services",
    name: "Xbox Background Services",
    serviceName: "XblAuthManager, XblGameSave, XboxNetApiSvc, XboxGipSvc",
    description: "Disable Xbox Live authentication, game save sync, and networking services.",
    why: "Four persistent background services with network connections. Zero benefit unless you use Xbox Game Pass or Xbox Live.",
    impact: "medium",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "services.disable-print-spooler",
    name: "Print Spooler",
    serviceName: "Spooler",
    description: "Disable the print queue manager service.",
    why: "Loads multiple DLLs and runs background threads with no printer attached. Also the vector for PrintNightmare vulnerabilities.",
    impact: "low",
    risk: "low",
    tier: "free",
    defaultSelected: false,
  },
  {
    id: "services.disable-remote-services",
    name: "Remote Access Services",
    serviceName: "RemoteRegistry, TermService, SessionEnv",
    description: "Disable Remote Desktop, Remote Registry, and Remote Assistance.",
    why: "Listen for incoming connections on a dedicated gaming PC with no remote management need. Pure attack surface reduction.",
    impact: "low",
    risk: "safe",
    tier: "free",
    defaultSelected: true,
  },
  {
    id: "services.disable-indexing-service",
    name: "Windows Search Indexing",
    serviceName: "WSearch",
    description: "Stop the background file indexing service from continuously scanning the drive.",
    why: "Generates background disk I/O that competes with game asset streaming. If you don't use Windows Search often, this is a clean win.",
    impact: "medium",
    risk: "low",
    tier: "free",
    defaultSelected: false,
  },
  {
    id: "services.disable-sysmain",
    name: "SysMain (Superfetch)",
    serviceName: "SysMain",
    description: "Disable the memory preloading service formerly known as Superfetch.",
    why: "On an SSD, SSD read latency is ~0.1ms — preloading offers no real benefit. The background I/O creates disk contention and frame time spikes.",
    impact: "medium",
    risk: "low",
    tier: "premium",
    defaultSelected: false,
  },
];

// ─── Impact badge ─────────────────────────────────────────────────────────────

const impactStyles: Record<Impact, string> = {
  low: "bg-blue-900/20 text-blue-400 border-blue-800/50",
  medium: "bg-violet-900/20 text-violet-400 border-violet-800/50",
};

const riskLabel: Record<RiskLevel, string> = {
  safe: "Safe",
  low: "Low",
  medium: "Medium",
  high: "High",
  extreme: "Extreme",
};

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  selected,
  onToggle,
}: {
  service: ServiceDef;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? "border-white/[0.1] bg-white/[0.05]"
          : "border-white/[0.06] bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
          <Server className="h-4 w-4 text-ink-secondary" strokeWidth={1.5} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{service.name}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${impactStyles[service.impact]}`}>
              {service.impact === "medium" ? "Medium Impact" : "Low Impact"}
            </span>
            <Badge variant="risk" risk={service.risk}>{riskLabel[service.risk]}</Badge>
            {service.tier === "premium" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-800 bg-brand-950/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                <Lock className="h-2.5 w-2.5" />
                PRO
              </span>
            )}
          </div>

          <p className="text-xs leading-relaxed text-ink-secondary">{service.description}</p>

          {/* Why */}
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
            <p className="text-[11px] leading-relaxed text-ink-tertiary">
              <span className="font-medium text-ink-secondary">Why: </span>
              {service.why}
            </p>
          </div>

          <p className="text-[11px] font-mono text-ink-tertiary">{service.serviceName}</p>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`mt-1 h-5 w-5 shrink-0 rounded border transition-colors ${
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
      </div>
    </motion.div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function buildDefault(): Set<string> {
  return new Set(SERVICES.filter((s) => s.defaultSelected).map((s) => s.id));
}

export function ServicesStep() {
  const [selected, setSelected] = useState<Set<string>>(buildDefault);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const count = selected.size;

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
            Background Services
          </h1>
          <p className="text-[14px] leading-relaxed text-ink-secondary max-w-lg">
            Reduce system overhead by disabling unnecessary services. Each service
            has been reviewed for safety and real-world impact.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {SERVICES.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              selected={selected.has(service.id)}
              onToggle={() => toggle(service.id)}
            />
          ))}
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4"
        >
          <span className="text-sm text-ink-secondary">
            Total services to disable:{" "}
            <span className="font-semibold text-ink">{count}</span>
          </span>
          {count > 0 ? (
            <Badge variant="success">Ready to include in plan</Badge>
          ) : (
            <Badge variant="default">No services selected</Badge>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
