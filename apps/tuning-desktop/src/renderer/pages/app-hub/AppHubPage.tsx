import { useState } from "react";
import type { ElementType } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  RefreshCw,
  ShieldCheck,
  Globe,
  Wrench,
  Activity,
  Gamepad2,
  Cpu,
  Package,
  CheckCircle2,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PremiumGate } from "@/components/ui/PremiumGate";

type AppCategory = "all" | "browsers" | "utilities" | "monitoring" | "gaming" | "drivers";

interface AppEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  category: AppCategory;
  icon: ElementType;
  trusted: boolean;
  installed: boolean;
  updateAvailable: boolean;
}

const mockApps: AppEntry[] = [
  { id: "firefox", name: "Firefox", version: "137.0", description: "Privacy-focused web browser with minimal telemetry", category: "browsers", icon: Globe, trusted: true, installed: true, updateAvailable: false },
  { id: "ungoogled", name: "Ungoogled Chromium", version: "124.0.6367", description: "Chromium without Google integration or tracking", category: "browsers", icon: Globe, trusted: true, installed: false, updateAvailable: false },
  { id: "hwinfo", name: "HWiNFO64", version: "8.20", description: "Comprehensive hardware monitoring and diagnostics", category: "monitoring", icon: Activity, trusted: true, installed: true, updateAvailable: true },
  { id: "msi-afterburner", name: "MSI Afterburner", version: "4.6.6", description: "GPU overclocking and in-game OSD monitoring", category: "monitoring", icon: Activity, trusted: true, installed: false, updateAvailable: false },
  { id: "7zip", name: "7-Zip", version: "24.09", description: "High compression ratio file archiver", category: "utilities", icon: Wrench, trusted: true, installed: true, updateAvailable: false },
  { id: "autoruns", name: "Autoruns", version: "14.11", description: "Sysinternals startup entry manager", category: "utilities", icon: Wrench, trusted: true, installed: false, updateAvailable: false },
  { id: "process-explorer", name: "Process Explorer", version: "17.06", description: "Advanced task manager by Sysinternals", category: "utilities", icon: Wrench, trusted: true, installed: false, updateAvailable: false },
  { id: "rtss", name: "RTSS", version: "7.3.6", description: "RivaTuner Statistics Server for frame limiting", category: "gaming", icon: Gamepad2, trusted: true, installed: true, updateAvailable: true },
  { id: "snappy-driver", name: "Snappy Driver Installer", version: "1.24.8", description: "Offline driver installer and updater", category: "drivers", icon: Cpu, trusted: true, installed: false, updateAvailable: false },
  { id: "nv-clean", name: "NVCleanstall", version: "1.16.0", description: "Custom NVIDIA driver installer without bloat", category: "drivers", icon: Cpu, trusted: true, installed: false, updateAvailable: false },
  { id: "latencymon", name: "LatencyMon", version: "7.40", description: "DPC latency monitoring and driver analysis", category: "monitoring", icon: Activity, trusted: true, installed: false, updateAvailable: false },
  { id: "timer-resolution", name: "TimerResolution", version: "1.6", description: "Windows timer resolution measurement tool", category: "utilities", icon: Wrench, trusted: true, installed: true, updateAvailable: false },
];

const categoryTabs: Array<{ id: AppCategory; label: string; icon: ElementType }> = [
  { id: "all", label: "All", icon: Package },
  { id: "browsers", label: "Browsers", icon: Globe },
  { id: "utilities", label: "Utilities", icon: Wrench },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "gaming", label: "Gaming", icon: Gamepad2 },
  { id: "drivers", label: "Drivers", icon: Cpu },
];

export function AppHubPage() {
  const [activeCategory, setActiveCategory] = useState<AppCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockApps.filter((app) => {
    const matchesCategory = activeCategory === "all" || app.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const installedCount = mockApps.filter((a) => a.installed).length;
  const updatesCount = mockApps.filter((a) => a.updateAvailable).length;

  return (
    <PremiumGate feature="app_install_hub">
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
                  <Package className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">App Hub</h2>
                  <p className="text-xs text-neutral-400">
                    {installedCount} installed &middot; {updatesCount} updates available &middot; {mockApps.length} total
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />}>
                Check Updates
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Search + Category Tabs */}
        <motion.div variants={staggerChild} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-colors"
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-neutral-50 p-1">
            {categoryTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === tab.id
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  <TabIcon className="h-3 w-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* App Grid */}
        <motion.div variants={staggerChild} className="grid grid-cols-2 gap-3">
          {filtered.map((app) => {
            const Icon = app.icon;
            return (
              <Card key={app.id} hoverable>
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100">
                    <Icon className="h-5 w-5 text-neutral-600" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-800">{app.name}</p>
                      {app.trusted && (
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                      )}
                      {app.updateAvailable && (
                        <Badge variant="info">Update</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400 truncate">{app.description}</p>
                    <p className="mt-0.5 text-[10px] font-mono text-neutral-300">v{app.version}</p>
                  </div>
                  <div className="shrink-0">
                    {app.installed && !app.updateAvailable ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Installed
                      </div>
                    ) : app.updateAvailable ? (
                      <Button size="sm" icon={<RefreshCw className="h-3 w-3" />}>
                        Update
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" icon={<Download className="h-3 w-3" />}>
                        Install
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </motion.div>

        {filtered.length === 0 && (
          <motion.div variants={staggerChild}>
            <Card>
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">No apps match your search</p>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PremiumGate>
  );
}
