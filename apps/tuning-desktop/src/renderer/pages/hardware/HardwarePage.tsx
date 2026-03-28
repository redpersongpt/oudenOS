import type { ElementType } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  MonitorSmartphone,
  MemoryStick,
  HardDrive,
  Wifi,
  Shield,
  ScanSearch,
  Loader2,
  Zap,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDeviceStore } from "@/stores/device-store";
import { serviceCall } from "@/lib/api";

interface HardwareCardProps {
  icon: ElementType;
  title: string;
  subtitle: string;
  details: Array<{ label: string; value: string }>;
  status?: string;
}

function HardwareCard({
  icon: Icon,
  title,
  subtitle,
  details,
  status,
}: HardwareCardProps) {
  return (
    <Card hoverable>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-overlay border border-border">
              <Icon className="h-5 w-5 text-ink-secondary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="text-xs text-ink-tertiary">{subtitle}</p>
            </div>
          </div>
          {status && <Badge variant="info">{status}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {details.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <span className="text-xs text-ink-tertiary">{d.label}</span>
              <span className="text-xs font-medium text-ink-secondary font-mono">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HardwarePage() {
  const { profile, scanning, setProfile, setScanning } =
    useDeviceStore();

  // TODO: Subscribe to scan.progress when Rust event emission is wired

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await serviceCall("scan.hardware", {});
      setProfile(result);
    } catch (error) {
      console.error("[Hardware] Scan failed:", error);
      setScanning(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Summary banner */}
      <motion.div variants={staggerChild}>
        <Card>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
              <MonitorSmartphone
                className="h-5 w-5 text-brand-500"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {profile?.hostname ?? "Your Machine"}
              </h2>
              <p className="text-xs text-ink-tertiary">
                {profile?.deviceClass ?? "—"} &middot; Windows{" "}
                {profile?.windows.version ?? "—"}{" "}
                {profile?.windows.displayVersion ?? ""} &middot; Build{" "}
                {profile?.windows.build ?? "—"}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {profile ? (
                <>
                  <Badge>{profile.windows.edition}</Badge>
                  <Badge variant="info">
                    {profile.security.secureBoot ? "Secure Boot" : "No Secure Boot"}
                  </Badge>
                </>
              ) : (
                <Button
                  onClick={handleScan}
                  disabled={scanning}
                  icon={
                    scanning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {scanning ? "Scanning…" : "Scan Hardware"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* No profile empty state */}
      {!profile && !scanning && (
        <motion.div variants={staggerChild}>
          <Card>
            <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-overlay border border-border">
                <ScanSearch
                  className="h-6 w-6 text-ink-tertiary"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Hardware not detected
                </h2>
                <p className="mt-1 text-xs text-ink-tertiary">
                  Click "Scan Hardware" above to detect your system components.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Scanning skeleton */}
      {scanning && (
        <motion.div variants={staggerChild}>
          <Card>
            <div className="flex flex-col items-center gap-4 px-5 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm font-medium text-ink-secondary">
                Scanning hardware…
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Hardware grid — only rendered when profile is available */}
      {profile && (
        <motion.div variants={staggerChild} className="grid grid-cols-2 gap-4">
          <HardwareCard
            icon={Cpu}
            title={profile.cpu.brand}
            subtitle={`${profile.cpu.physicalCores}C / ${profile.cpu.logicalCores}T`}
            details={[
              {
                label: "Architecture",
                value: profile.cpu.microarchitecture || "—",
              },
              {
                label: "Base Clock",
                value: `${profile.cpu.baseClockMhz} MHz`,
              },
              {
                label: "Max Boost",
                value:
                  profile.cpu.maxBoostMhz != null
                    ? `${profile.cpu.maxBoostMhz} MHz`
                    : "—",
              },
              {
                label: "L3 Cache",
                value:
                  profile.cpu.cacheL3Kb != null
                    ? `${Math.round(profile.cpu.cacheL3Kb / 1024)} MB`
                    : "—",
              },
              {
                label: "SMT",
                value: profile.cpu.smtEnabled ? "Enabled" : "Disabled",
              },
            ]}
            status="Detected"
          />

          {profile.gpus[0] ? (
            <HardwareCard
              icon={MonitorSmartphone}
              title={profile.gpus[0].name}
              subtitle={`${profile.gpus[0].vramMb} MB VRAM`}
              details={[
                { label: "Driver", value: profile.gpus[0].driverVersion },
                {
                  label: "ReBAR",
                  value: profile.gpus[0].resizableBar ? "Enabled" : "Disabled",
                },
                {
                  label: "PCIe",
                  value:
                    profile.gpus[0].pcieGeneration != null &&
                    profile.gpus[0].pcieLanes != null
                      ? `Gen ${profile.gpus[0].pcieGeneration} x${profile.gpus[0].pcieLanes}`
                      : "—",
                },
                {
                  label: "Max Clock",
                  value:
                    profile.gpus[0].maxClockMhz != null
                      ? `${profile.gpus[0].maxClockMhz} MHz`
                      : "—",
                },
              ]}
              status="Detected"
            />
          ) : (
            <HardwareCard
              icon={MonitorSmartphone}
              title="GPU"
              subtitle="Not detected"
              details={[]}
            />
          )}

          <HardwareCard
            icon={MemoryStick}
            title={`${Math.round(profile.memory.totalMb / 1024)} GB ${profile.memory.type}`}
            subtitle={`${profile.memory.channels} Channel · ${profile.memory.dimmPopulated}/${profile.memory.dimmSlots} slots`}
            details={[
              { label: "Speed", value: `${profile.memory.speedMhz} MHz` },
              {
                label: "XMP/EXPO",
                value: profile.memory.xmpExpoEnabled
                  ? "Enabled"
                  : "Not enabled",
              },
              {
                label: "Timings",
                value: profile.memory.timings ?? "—",
              },
            ]}
            status={profile.memory.xmpExpoEnabled ? "XMP Active" : "XMP Off"}
          />

          {profile.storage[0] ? (
            <HardwareCard
              icon={HardDrive}
              title={profile.storage[0].model}
              subtitle={profile.storage[0].interface}
              details={[
                {
                  label: "Capacity",
                  value: `${profile.storage[0].capacityGb} GB`,
                },
                { label: "Free", value: `${profile.storage[0].freeGb} GB` },
                {
                  label: "Health",
                  value:
                    profile.storage[0].healthPercent != null
                      ? `${profile.storage[0].healthPercent}%`
                      : "—",
                },
                {
                  label: "TRIM",
                  value: profile.storage[0].trimSupported
                    ? "Supported"
                    : "N/A",
                },
              ]}
              status="Healthy"
            />
          ) : (
            <HardwareCard
              icon={HardDrive}
              title="Storage"
              subtitle="Not detected"
              details={[]}
            />
          )}

          {profile.networkAdapters[0] ? (
            <HardwareCard
              icon={Wifi}
              title={profile.networkAdapters[0].name}
              subtitle={profile.networkAdapters[0].type}
              details={[
                {
                  label: "Speed",
                  value: profile.networkAdapters[0].speed ?? "—",
                },
                {
                  label: "RSS Queues",
                  value:
                    profile.networkAdapters[0].rssQueues != null
                      ? `${profile.networkAdapters[0].rssQueues}`
                      : "—",
                },
                {
                  label: "Driver",
                  value: profile.networkAdapters[0].driverVersion,
                },
              ]}
            />
          ) : (
            <HardwareCard
              icon={Wifi}
              title="Network"
              subtitle="Not detected"
              details={[]}
            />
          )}

          <HardwareCard
            icon={Shield}
            title="Security State"
            subtitle="System integrity features"
            details={[
              {
                label: "Secure Boot",
                value: profile.security.secureBoot ? "Enabled" : "Disabled",
              },
              {
                label: "TPM",
                value: profile.security.tpmVersion ?? "—",
              },
              {
                label: "BitLocker",
                value: profile.security.bitlockerEnabled ? "Active" : "Inactive",
              },
              {
                label: "VBS/HVCI",
                value: profile.security.vbsEnabled ? "Enabled" : "Disabled",
              },
              {
                label: "Virtualization",
                value: profile.security.virtualizationEnabled
                  ? "Enabled"
                  : "Disabled",
              },
            ]}
          />
        </motion.div>
      )}
    </motion.div>
  );
}
