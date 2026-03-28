import { useState } from "react";
import type { ElementType } from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  RotateCcw,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type CheckStatus = "checked" | "unchecked" | "warning" | "not-applicable";

interface BiosCheckItem {
  id: string;
  label: string;
  description: string;
  recommendation: string;
  status: CheckStatus;
  impact: string;
}

const mockChecklist: BiosCheckItem[] = [
  {
    id: "xmp",
    label: "XMP / EXPO Profile",
    description: "Enable memory overclocking profile to run RAM at rated speed",
    recommendation: "Enable XMP Profile 1 for 6000 MHz DDR5",
    status: "unchecked",
    impact: "~30% memory bandwidth",
  },
  {
    id: "rebar",
    label: "Resizable BAR (ReBAR)",
    description: "Allows CPU full access to GPU VRAM for improved performance",
    recommendation: "Enable in PCI subsystem settings. Requires Above 4G Decoding.",
    status: "checked",
    impact: "5-10% GPU perf",
  },
  {
    id: "csm",
    label: "CSM (Compatibility Support Module)",
    description: "Legacy BIOS compatibility layer. Should be disabled for modern installs.",
    recommendation: "Disable CSM for UEFI-native boot",
    status: "checked",
    impact: "Boot reliability",
  },
  {
    id: "cstates",
    label: "C-States",
    description: "CPU power saving idle states. May add latency in low-load scenarios.",
    recommendation: "Disable for lowest latency, or leave enabled for power savings",
    status: "warning",
    impact: "Idle latency",
  },
  {
    id: "secureboot",
    label: "Secure Boot",
    description: "Validates boot chain integrity. Required for Windows 11.",
    recommendation: "Keep enabled unless using unsigned drivers",
    status: "checked",
    impact: "Security",
  },
  {
    id: "virtualization",
    label: "Virtualization (VT-x / AMD-V)",
    description: "Hardware virtualization support. Enables VBS/HVCI which adds overhead.",
    recommendation: "Disable unless you use VMs or WSL2",
    status: "warning",
    impact: "~2-5% overhead",
  },
  {
    id: "fastboot",
    label: "Fast Boot (BIOS-level)",
    description: "Skips POST hardware checks for faster boot. Can hide issues.",
    recommendation: "Disable for full hardware initialization",
    status: "unchecked",
    impact: "Boot diagnostics",
  },
];

const statusConfig: Record<CheckStatus, { icon: ElementType; color: string; label: string }> = {
  checked: { icon: CheckCircle2, color: "text-green-500", label: "Configured" },
  unchecked: { icon: Circle, color: "text-neutral-300", label: "Action Needed" },
  warning: { icon: AlertTriangle, color: "text-amber-500", label: "Review" },
  "not-applicable": { icon: Circle, color: "text-neutral-200", label: "N/A" },
};

export function BiosGuidancePage() {
  const [checklist, setChecklist] = useState(mockChecklist);
  const [returnedFromBios, setReturnedFromBios] = useState(false);

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "checked" ? "unchecked" : "checked" }
          : item,
      ),
    );
  };

  const completedCount = checklist.filter((i) => i.status === "checked").length;
  const totalCount = checklist.length;

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
                <Monitor className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">BIOS Guidance</h2>
                <p className="text-xs text-neutral-400">
                  Machine-specific BIOS recommendations &middot; {completedCount}/{totalCount} configured
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Reboot to BIOS
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={staggerChild}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <motion.div
            className="h-full rounded-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalCount) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Checklist */}
      <motion.div variants={staggerChild}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-neutral-900">BIOS Checklist</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.map((item) => {
                const config = statusConfig[item.status];
                const StatusIcon = config.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className="flex w-full items-center gap-4 rounded-lg border border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-25"
                  >
                    <StatusIcon className={`h-5 w-5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-800">{item.label}</p>
                        {item.status === "warning" && (
                          <Badge variant="risk" risk="medium">Review</Badge>
                        )}
                        {item.status === "unchecked" && (
                          <Badge variant="risk" risk="low">Action Needed</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-400">{item.description}</p>
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-neutral-500">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-neutral-300" />
                        <span>{item.recommendation}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-neutral-400">{item.impact}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Return from BIOS verification */}
      <motion.div variants={staggerChild}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    returnedFromBios
                      ? "border-green-200 bg-green-50"
                      : "border-neutral-150 bg-neutral-50"
                  }`}
                >
                  {returnedFromBios ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <RotateCcw className="h-5 w-5 text-neutral-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {returnedFromBios
                      ? "BIOS changes verified"
                      : "Returned from BIOS?"}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {returnedFromBios
                      ? "System will re-scan hardware to confirm changes"
                      : "Click to confirm you have made BIOS changes and rebooted"}
                  </p>
                </div>
              </div>
              {!returnedFromBios ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setReturnedFromBios(true)}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  I've Returned from BIOS
                </Button>
              ) : (
                <Badge variant="info">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
