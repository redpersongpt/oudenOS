import { motion } from "framer-motion";
import {
  Thermometer,
  Cpu,
  MonitorSmartphone,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PremiumGate } from "@/components/ui/PremiumGate";

type Severity = "none" | "mild" | "moderate" | "severe";

interface ThermalZone {
  component: string;
  icon: React.ElementType;
  currentTemp: number;
  idleTemp: number;
  loadTemp: number;
  maxSafe: number;
  throttleTemp: number;
  status: "cool" | "warm" | "hot" | "throttling";
}

interface BottleneckResult {
  id: string;
  component: string;
  severity: Severity;
  description: string;
  recommendation: string;
}

const thermalZones: ThermalZone[] = [
  {
    component: "CPU",
    icon: Cpu,
    currentTemp: 62,
    idleTemp: 38,
    loadTemp: 82,
    maxSafe: 100,
    throttleTemp: 95,
    status: "warm",
  },
  {
    component: "GPU",
    icon: MonitorSmartphone,
    currentTemp: 58,
    idleTemp: 34,
    loadTemp: 74,
    maxSafe: 93,
    throttleTemp: 87,
    status: "cool",
  },
];

const bottleneckResults: BottleneckResult[] = [
  {
    id: "b1",
    component: "CPU Package Power",
    severity: "mild",
    description: "CPU occasionally hits PL2 power limit during all-core workloads, reducing sustained boost clocks by ~200 MHz.",
    recommendation: "Consider improving CPU cooler or adjusting power limits in BIOS.",
  },
  {
    id: "b2",
    component: "GPU VRAM Temperature",
    severity: "none",
    description: "GDDR6X junction temperature within safe operating range under sustained load.",
    recommendation: "No action needed.",
  },
  {
    id: "b3",
    component: "VRM Thermals",
    severity: "moderate",
    description: "Motherboard VRM temperature reaches 92C under sustained all-core load, potentially causing voltage droop.",
    recommendation: "Improve case airflow near VRM heatsink area. Consider a fan directed at the VRM.",
  },
  {
    id: "b4",
    component: "NVMe SSD",
    severity: "none",
    description: "Storage controller temperature stable at 42C. No thermal throttling detected.",
    recommendation: "No action needed.",
  },
];

const severityConfig: Record<Severity, { color: string; bgColor: string; label: string }> = {
  none: { color: "text-green-600", bgColor: "bg-green-50 border-green-200", label: "No Issue" },
  mild: { color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200", label: "Mild" },
  moderate: { color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200", label: "Moderate" },
  severe: { color: "text-red-600", bgColor: "bg-red-50 border-red-200", label: "Severe" },
};

const statusColors: Record<ThermalZone["status"], string> = {
  cool: "text-green-500",
  warm: "text-amber-500",
  hot: "text-orange-500",
  throttling: "text-red-500",
};

function TempBar({ current, max, throttle }: { current: number; max: number; throttle: number }) {
  const pct = (current / max) * 100;
  const throttlePct = (throttle / max) * 100;
  const barColor =
    current >= throttle ? "bg-red-500" : current >= throttle * 0.85 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="relative mt-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div
        className="absolute top-0 h-2 w-0.5 bg-red-400"
        style={{ left: `${throttlePct}%` }}
        title={`Throttle: ${throttle}C`}
      />
      <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
        <span>0C</span>
        <span className="text-red-400">{throttle}C throttle</span>
        <span>{max}C max</span>
      </div>
    </div>
  );
}

export function ThermalBottleneckPage() {
  return (
    <PremiumGate feature="thermal_analysis">
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
                  <Thermometer className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Thermal & Bottleneck Analysis</h2>
                  <p className="text-xs text-neutral-400">
                    Real-time thermal monitoring and performance bottleneck detection
                  </p>
                </div>
              </div>
              <Button size="sm" icon={<TrendingUp className="h-3.5 w-3.5" />}>
                Run Stress Test
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Thermal Envelope Cards */}
        <motion.div variants={staggerChild} className="grid grid-cols-2 gap-4">
          {thermalZones.map((zone) => {
            const Icon = zone.icon;
            return (
              <Card key={zone.component}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100">
                        <Icon className="h-5 w-5 text-neutral-600" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900">{zone.component} Thermal</h3>
                        <p className="text-xs text-neutral-400">
                          Idle: {zone.idleTemp}C &middot; Load: {zone.loadTemp}C
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-2xl font-semibold ${statusColors[zone.status]}`}>
                        {zone.currentTemp}°
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">{zone.status}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TempBar current={zone.currentTemp} max={zone.maxSafe} throttle={zone.throttleTemp} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-neutral-50 p-2 text-center">
                      <p className="font-mono text-sm font-medium text-neutral-700">{zone.idleTemp}C</p>
                      <p className="text-[10px] text-neutral-400">Idle</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 p-2 text-center">
                      <p className="font-mono text-sm font-medium text-neutral-700">{zone.loadTemp}C</p>
                      <p className="text-[10px] text-neutral-400">Load</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 p-2 text-center">
                      <p className="font-mono text-sm font-medium text-neutral-700">{zone.throttleTemp}C</p>
                      <p className="text-[10px] text-neutral-400">Throttle</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Bottleneck Analysis */}
        <motion.div variants={staggerChild}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">Bottleneck Analysis</h2>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Component-level performance constraint detection
                  </p>
                </div>
                <Badge variant="info">Last run: 5 min ago</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bottleneckResults.map((result) => {
                  const config = severityConfig[result.severity];
                  return (
                    <div
                      key={result.id}
                      className={`rounded-lg border p-4 ${config.bgColor}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {result.severity === "none" ? (
                            <CheckCircle2 className={`h-4 w-4 ${config.color}`} />
                          ) : (
                            <AlertTriangle className={`h-4 w-4 ${config.color}`} />
                          )}
                          <p className={`text-sm font-semibold ${config.color}`}>{result.component}</p>
                        </div>
                        <Badge
                          variant={result.severity === "none" ? "info" : "default"}
                          className={result.severity !== "none" ? config.bgColor : ""}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-neutral-600">{result.description}</p>
                      {result.severity !== "none" && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500">
                          <Info className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400" />
                          <span>{result.recommendation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PremiumGate>
  );
}
