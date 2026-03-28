// ─── OS Hardware Assessment ──────────────────────────────────────────────────
// Lightweight hardware summary focused on OS transformation planning.
// Distinct from tuning's DeviceProfile — covers classification signals,
// work PC detection, and OS health rather than deep hardware specs.

import type { WorkIndicator, PreservationFlag } from "./profiles.js";

// ─── Hardware snapshot ───────────────────────────────────────────────────────

export type OsDeviceClass = "desktop" | "laptop" | "workstation" | "handheld" | "vm" | "unknown";
export type OsCpuVendor = "intel" | "amd" | "qualcomm" | "unknown";
export type OsGpuVendor = "nvidia" | "amd" | "intel" | "unknown";
export type OsStorageType = "nvme" | "sata" | "usb" | "unknown";
export type OsPowerSource = "ac" | "battery" | "unknown";

export interface OsHardwareSnapshot {
  cpuVendor: OsCpuVendor;
  cpuBrand: string;
  physicalCores: number;
  logicalCores: number;
  totalRamMb: number;
  gpuVendors: OsGpuVendor[];
  primaryGpuBrand: string | null;
  storageType: OsStorageType;
  powerSource: OsPowerSource;
  isVm: boolean;
  deviceClass: OsDeviceClass;
  windowsBuild: number;
  windowsEdition: string;
  windowsVersion: string;       // "10" | "11"
  hostname: string;
  scannedAt: string;            // ISO 8601
}

// ─── Work indicator assessment ───────────────────────────────────────────────

export interface WorkIndicatorAssessment {
  scannedAt: string;
  indicators: WorkIndicator[];
  isWorkPc: boolean;
  preservationFlags: PreservationFlag[];
}

// ─── Full assessment result ───────────────────────────────────────────────────
// Returned by assess.full — used as input to classify.machine.

export interface HardwareAssessment {
  id: string;                        // Stable scan ID, passed to classify.machine
  hardware: OsHardwareSnapshot;
  workIndicators: WorkIndicatorAssessment;
  healthScore: number;               // 0-100 pre-transformation health estimate
  scannedAt: string;
}
