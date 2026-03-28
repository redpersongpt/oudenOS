// ─── Workload Analyzer ───────────────────────────────────────────────────────
// Detects system workload profile from hardware signals + optional app list.
// Gaming indicators: GPU tier, monitor refresh rate, NVIDIA/AMD discrete GPU
// Work indicators: Windows edition (Pro/Enterprise), domain signals, Hyper-V
// Dev indicators: WSL, Hyper-V, high RAM + CPU

import type { DeviceProfile } from "@redcore/shared-schema/device";
import type { WorkloadAnalysis, WorkloadSignal, WorkloadType } from "../types.js";

interface WorkloadInput {
  profile: DeviceProfile;
  installedApps?: string[];
}

const GAMING_APP_PATTERNS = ["steam", "epic games", "battle.net", "discord", "origin", "gog", "ubisoft connect", "xbox app"];
const WORK_APP_PATTERNS = ["microsoft office", "teams", "outlook", "zoom", "slack", "onedrive", "sharepoint", "citrix"];
const DEV_APP_PATTERNS = ["visual studio code", "git", "docker", "node.js", "python", "jetbrains", "wsl", "powershell ise"];
const CONTENT_APP_PATTERNS = ["adobe", "davinci resolve", "obs studio", "blender", "premiere", "after effects", "photoshop"];

function scoreApps(apps: string[], patterns: string[]): number {
  if (!apps.length) return 0;
  const lowered = apps.map((a) => a.toLowerCase());
  let hits = 0;
  for (const pattern of patterns) {
    if (lowered.some((a) => a.includes(pattern))) hits++;
  }
  return hits / patterns.length;
}

export function analyzeWorkload({ profile, installedApps = [] }: WorkloadInput): WorkloadAnalysis {
  const signals: WorkloadSignal[] = [];
  const scores: Record<WorkloadType, number> = {
    gaming: 0,
    work: 0,
    development: 0,
    content_creation: 0,
    general: 0.2, // baseline
  };

  // ─── Hardware signals ───────────────────────────────────────────────────────

  // High-refresh monitor → gaming
  const hasHighRefreshMonitor = profile.monitors.some((m) => m.refreshRateHz >= 120);
  if (hasHighRefreshMonitor) {
    scores.gaming += 0.3;
    signals.push({ type: "gaming", indicator: `${Math.max(...profile.monitors.map(m => m.refreshRateHz))}Hz monitor detected`, strength: "strong" });
  }

  // VRR / G-Sync / FreeSync → gaming
  const hasVrr = profile.monitors.some((m) => m.vrrSupported);
  if (hasVrr) {
    scores.gaming += 0.2;
    const vrrType = profile.monitors.find((m) => m.vrrType)?.vrrType ?? "VRR";
    signals.push({ type: "gaming", indicator: `${vrrType} variable refresh rate enabled`, strength: "strong" });
  }

  // Discrete NVIDIA/AMD GPU → gaming/content
  const discreteGpu = profile.gpus.find((g) => g.vendor !== "intel");
  if (discreteGpu) {
    const vramGb = discreteGpu.vramMb / 1024;
    if (vramGb >= 8) {
      scores.gaming += 0.2;
      scores.content_creation += 0.15;
      signals.push({ type: "gaming", indicator: `${discreteGpu.name} (${vramGb}GB VRAM)`, strength: "medium" });
    }
  }

  // High RAM → workstation/dev/content
  const ramGb = profile.memory.totalMb / 1024;
  if (ramGb >= 32) {
    scores.work += 0.15;
    scores.development += 0.2;
    scores.content_creation += 0.2;
    signals.push({ type: "development", indicator: `${ramGb}GB RAM — workstation-class memory`, strength: "medium" });
  } else if (ramGb >= 64) {
    scores.work += 0.25;
    scores.development += 0.3;
    signals.push({ type: "development", indicator: `${ramGb}GB RAM — professional workstation`, strength: "strong" });
  }

  // High core count → work/content
  if (profile.cpu.physicalCores >= 12) {
    scores.work += 0.15;
    scores.content_creation += 0.2;
    signals.push({ type: "content_creation", indicator: `${profile.cpu.physicalCores}-core CPU`, strength: "medium" });
  }

  // ─── Windows edition signals ───────────────────────────────────────────────

  const edition = profile.windows.edition.toLowerCase();
  if (edition.includes("enterprise") || edition.includes("education")) {
    scores.work += 0.4;
    signals.push({ type: "work", indicator: `Windows ${profile.windows.edition} edition`, strength: "strong" });
  } else if (edition.includes("pro")) {
    scores.work += 0.1;
    scores.development += 0.1;
  }

  // Hyper-V → dev/work
  if (profile.windows.features["Hyper-V"]) {
    scores.development += 0.2;
    scores.work += 0.15;
    signals.push({ type: "development", indicator: "Hyper-V enabled", strength: "medium" });
  }

  // WSL → development
  if (profile.windows.features["WSL"]) {
    scores.development += 0.3;
    signals.push({ type: "development", indicator: "WSL (Windows Subsystem for Linux) enabled", strength: "strong" });
  }

  // ─── Installed apps signals ─────────────────────────────────────────────────

  if (installedApps.length > 0) {
    const gamingScore = scoreApps(installedApps, GAMING_APP_PATTERNS);
    const workScore = scoreApps(installedApps, WORK_APP_PATTERNS);
    const devScore = scoreApps(installedApps, DEV_APP_PATTERNS);
    const contentScore = scoreApps(installedApps, CONTENT_APP_PATTERNS);

    scores.gaming += gamingScore * 0.4;
    scores.work += workScore * 0.4;
    scores.development += devScore * 0.4;
    scores.content_creation += contentScore * 0.4;

    if (gamingScore > 0.3) signals.push({ type: "gaming", indicator: "Gaming apps detected (Steam/Epic/Discord)", strength: "strong" });
    if (workScore > 0.3) signals.push({ type: "work", indicator: "Work suite detected (Office/Teams/Outlook)", strength: "strong" });
    if (devScore > 0.3) signals.push({ type: "development", indicator: "Dev tools detected (VS Code/Git/Docker)", strength: "strong" });
    if (contentScore > 0.3) signals.push({ type: "content_creation", indicator: "Content creation apps detected (Adobe/DaVinci)", strength: "strong" });
  }

  // ─── Laptop-specific signals ────────────────────────────────────────────────
  const isLaptop = profile.deviceClass === "laptop" || profile.power.batteryPercent !== null;
  if (isLaptop) {
    scores.work += 0.1;
    if (scores.gaming > 0.3) {
      signals.push({ type: "gaming", indicator: "Gaming laptop — thermal constraints apply", strength: "weak" });
    }
  }

  // ─── Resolve primary workload ───────────────────────────────────────────────
  const sorted = (Object.entries(scores) as Array<[WorkloadType, number]>)
    .sort(([, a], [, b]) => b - a);
  const primary = sorted[0][0];
  const secondary = sorted[1][1] > 0.2 ? sorted[1][0] : null;
  const confidence = Math.min(sorted[0][1], 1);

  return {
    primary,
    secondary,
    confidence,
    signals,
    isEnterprise: edition.includes("enterprise") || edition.includes("education"),
    isGamer: scores.gaming > 0.3,
    isDeveloper: scores.development > 0.3,
    installedApps: installedApps.length > 0 ? installedApps : undefined,
  };
}
