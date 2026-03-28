// ─── Hardware Analyzer ───────────────────────────────────────────────────────
// Derives structured hardware analysis from a DeviceProfile.

import type { DeviceProfile } from "@redcore/shared-schema/device";
import type {
  HardwareAnalysis,
  CpuAnalysis,
  GpuAnalysis,
  RamAnalysis,
  StorageAnalysis,
  HardwareTier,
} from "../types.js";

function classifyCpuTier(cores: number, boostMhz: number | null): HardwareTier {
  const boost = boostMhz ?? 0;
  if (cores >= 16 && boost >= 5000) return "flagship";
  if (cores >= 8 && boost >= 4500) return "high";
  if (cores >= 4 && boost >= 3500) return "mid";
  return "entry";
}

function classifyGpuTier(vramMb: number, name: string): HardwareTier {
  const vramGb = vramMb / 1024;
  const nameLower = name.toLowerCase();
  if (vramGb >= 16 || nameLower.includes("4090") || nameLower.includes("4080") || nameLower.includes("7900")) return "flagship";
  if (vramGb >= 8 || nameLower.includes("4070") || nameLower.includes("4060") || nameLower.includes("7800") || nameLower.includes("3080")) return "high";
  if (vramGb >= 4 || nameLower.includes("3060") || nameLower.includes("6600")) return "mid";
  return "entry";
}

function analyzeCpu(profile: DeviceProfile): CpuAnalysis {
  const cpu = profile.cpu;
  const notes: string[] = [];
  const tier = classifyCpuTier(cpu.physicalCores, cpu.maxBoostMhz);

  if (!cpu.smtEnabled && cpu.logicalCores < cpu.physicalCores * 2) {
    notes.push("Hyperthreading is disabled — enabling may improve multi-threaded workloads");
  }
  if (tier === "entry") {
    notes.push("Entry-tier CPU — prioritize lightweight optimizations");
  }
  if (cpu.numaNodes > 1) {
    notes.push("Multi-NUMA topology detected — NUMA-aware scheduling recommended");
  }

  const boostGhz = cpu.maxBoostMhz ? cpu.maxBoostMhz / 1000 : null;

  // Score: cores (40pts) + boost (40pts) + architecture bonus (20pts)
  const coreScore = Math.min(cpu.physicalCores / 16, 1) * 40;
  const boostScore = Math.min((cpu.maxBoostMhz ?? 3000) / 6000, 1) * 40;
  const archBonus = cpu.features.includes("avx512f") ? 20 : cpu.features.includes("avx2") ? 10 : 0;
  const score = Math.round(coreScore + boostScore + archBonus);

  return {
    brand: cpu.brand,
    cores: cpu.physicalCores,
    threads: cpu.logicalCores,
    baseClockGhz: cpu.baseClockMhz / 1000,
    boostClockGhz: boostGhz,
    tier,
    hyperthreadingEnabled: cpu.smtEnabled,
    score,
    notes,
  };
}

function analyzeGpu(profile: DeviceProfile): GpuAnalysis {
  const notes: string[] = [];
  const primaryGpu = profile.gpus[0];

  if (!primaryGpu) {
    return {
      name: "Unknown",
      vendor: "unknown",
      vramGb: 0,
      tier: "entry",
      hasDiscreteGpu: false,
      resizableBar: false,
      driverOutdated: false,
      score: 0,
      notes: ["No discrete GPU detected"],
    };
  }

  const isIntegratedOnly = profile.gpus.every((g) => g.vendor === "intel");
  const discrete = profile.gpus.find((g) => g.vendor !== "intel") ?? primaryGpu;
  const tier = classifyGpuTier(discrete.vramMb, discrete.name);

  if (!discrete.resizableBar && discrete.vendor === "nvidia") {
    notes.push("Resizable BAR disabled — enabling in BIOS may improve GPU performance");
  }
  if (isIntegratedOnly) {
    notes.push("Integrated graphics only — gaming and GPU-intensive tasks are limited");
  }
  if (discrete.pcieLanes !== null && discrete.pcieLanes < 16) {
    notes.push(`PCIe lanes restricted to x${discrete.pcieLanes} — full x16 may improve throughput`);
  }

  const vramGb = discrete.vramMb / 1024;
  // Score: VRAM (40pts) + tier (40pts) + extras (20pts)
  const vramScore = Math.min(vramGb / 24, 1) * 40;
  const tierScore = tier === "flagship" ? 40 : tier === "high" ? 30 : tier === "mid" ? 20 : 10;
  const extras = (discrete.resizableBar ? 10 : 0) + (discrete.pcieGeneration !== null && discrete.pcieGeneration >= 4 ? 10 : 0);
  const score = Math.round(vramScore + tierScore + extras);

  return {
    name: discrete.name,
    vendor: discrete.vendor,
    vramGb,
    tier,
    hasDiscreteGpu: !isIntegratedOnly,
    resizableBar: discrete.resizableBar,
    driverOutdated: false, // Would need version DB to determine — conservative
    score,
    notes,
  };
}

function analyzeRam(profile: DeviceProfile): RamAnalysis {
  const mem = profile.memory;
  const notes: string[] = [];
  const totalGb = mem.totalMb / 1024;

  if (!mem.xmpExpoEnabled) {
    notes.push("XMP/EXPO is not enabled — RAM running at stock speed, not rated speed");
  }
  if (mem.channels < 2 && mem.dimmPopulated >= 2) {
    notes.push("Memory may not be in dual-channel — check DIMM slot placement");
  }
  if (totalGb < 8) {
    notes.push("Low memory — consider upgrading to at least 16 GB");
  } else if (totalGb < 16) {
    notes.push("16 GB is recommended for gaming and multitasking");
  }

  const isDualChannel = mem.channels >= 2;

  // Score: capacity (40pts) + speed (30pts) + dual-channel (15pts) + XMP (15pts)
  const capScore = Math.min(totalGb / 64, 1) * 40;
  const spdScore = Math.min(mem.speedMhz / 6400, 1) * 30;
  const dcScore = isDualChannel ? 15 : 0;
  const xmpScore = mem.xmpExpoEnabled ? 15 : 0;
  const score = Math.round(capScore + spdScore + dcScore + xmpScore);

  return {
    totalGb,
    speedMhz: mem.speedMhz,
    channels: mem.channels,
    type: mem.type,
    xmpEnabled: mem.xmpExpoEnabled,
    isAdequate: totalGb >= 16,
    isDualChannel,
    score,
    notes,
  };
}

function analyzeStorage(profile: DeviceProfile): StorageAnalysis {
  const notes: string[] = [];
  const systemDrive = profile.storage.find((d) => d.isSystemDrive) ?? profile.storage[0];

  if (!systemDrive) {
    return {
      systemDrive: {
        type: "unknown",
        capacityGb: 0,
        freeGb: 0,
        freePercent: 0,
        healthPercent: null,
        isLowFreeSpace: false,
        trimEnabled: false,
      },
      driveCount: 0,
      score: 0,
      notes: ["No storage drives detected"],
    };
  }

  const freePercent = systemDrive.capacityGb > 0
    ? (systemDrive.freeGb / systemDrive.capacityGb) * 100
    : 0;
  const isLowFreeSpace = freePercent < 15 || systemDrive.freeGb < 20;

  const driveType: "nvme" | "sata" | "unknown" =
    systemDrive.interface === "nvme" ? "nvme" :
    systemDrive.interface === "sata" ? "sata" :
    "unknown";

  if (driveType === "unknown") {
    notes.push("System drive is HDD — SSD upgrade will dramatically improve responsiveness");
  }
  if (isLowFreeSpace) {
    notes.push(`Low free space (${Math.round(freePercent)}%) — performance may degrade below 15%`);
  }
  if (!systemDrive.trimSupported && driveType !== "unknown") {
    notes.push("TRIM is not enabled — enable for better SSD longevity");
  }
  if (systemDrive.healthPercent !== null && systemDrive.healthPercent < 80) {
    notes.push(`Drive health at ${systemDrive.healthPercent}% — consider replacement soon`);
  }

  // Score: interface (50pts) + health (25pts) + free space (25pts)
  const ifaceScore = driveType === "nvme" ? 50 : driveType === "sata" ? 35 : 15;
  const healthScore = systemDrive.healthPercent !== null ? (systemDrive.healthPercent / 100) * 25 : 20;
  const freeScore = Math.min(freePercent / 100, 1) * 25;
  const score = Math.round(ifaceScore + healthScore + freeScore);

  return {
    systemDrive: {
      type: driveType,
      capacityGb: systemDrive.capacityGb,
      freeGb: systemDrive.freeGb,
      freePercent,
      healthPercent: systemDrive.healthPercent,
      isLowFreeSpace,
      trimEnabled: systemDrive.trimSupported,
    },
    driveCount: profile.storage.length,
    score,
    notes,
  };
}

export function analyzeHardware(profile: DeviceProfile): HardwareAnalysis {
  const cpu = analyzeCpu(profile);
  const gpu = analyzeGpu(profile);
  const ram = analyzeRam(profile);
  const storage = analyzeStorage(profile);
  const hasBattery = profile.power.source === "battery" || profile.power.batteryPercent !== null;

  const summaryNotes: string[] = [];
  if (cpu.tier === "entry" && gpu.tier === "entry") {
    summaryNotes.push("Budget system — focus on cleanup and lightweight optimizations");
  }
  if (cpu.tier === "flagship" && gpu.tier === "flagship") {
    summaryNotes.push("High-end system — aggressive performance tuning is safe");
  }

  const overallScore = Math.round((cpu.score + gpu.score + ram.score + storage.score) / 4);

  return {
    cpu,
    gpu,
    ram,
    storage,
    hasBattery,
    deviceClass: profile.deviceClass,
    overallScore,
    summaryNotes,
  };
}
