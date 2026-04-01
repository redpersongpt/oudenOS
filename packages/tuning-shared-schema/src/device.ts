// Device Profile
// The normalized representation of a scanned machine.
// Produced by the Rust scanner, consumed by the compatibility engine and UI.

export type DeviceClass = "desktop" | "laptop" | "handheld" | "workstation" | "vm" | "unknown";
export type CpuVendor = "intel" | "amd" | "qualcomm" | "unknown";
export type GpuVendor = "nvidia" | "amd" | "intel" | "unknown";
export type StorageInterface = "nvme" | "sata" | "usb" | "unknown";
export type NicType = "ethernet" | "wifi" | "unknown";
export type PowerSource = "ac" | "battery" | "unknown";

export interface CpuInfo {
  vendor: CpuVendor;
  brand: string;
  family: number;
  model: number;
  stepping: number;
  microarchitecture: string;
  physicalCores: number;
  logicalCores: number;
  smtEnabled: boolean;
  baseClockMhz: number;
  maxBoostMhz: number | null;
  cacheL1Kb: number | null;
  cacheL2Kb: number | null;
  cacheL3Kb: number | null;
  numaNodes: number;
  features: string[]; // "avx2", "sse4.2", etc.
}

export interface GpuInfo {
  vendor: GpuVendor;
  name: string;
  driverVersion: string;
  driverDate: string;
  vramMb: number;
  resizableBar: boolean;
  currentClockMhz: number | null;
  maxClockMhz: number | null;
  tdpWatts: number | null;
  pcieLanes: number | null;
  pcieGeneration: number | null;
}

export interface MemoryInfo {
  totalMb: number;
  speedMhz: number;
  channels: number;
  dimmSlots: number;
  dimmPopulated: number;
  type: string; // "DDR4", "DDR5"
  xmpExpoEnabled: boolean;
  timings: string | null; // "16-18-18-36"
}

export interface StorageDrive {
  name: string;
  model: string;
  interface: StorageInterface;
  capacityGb: number;
  freeGb: number;
  healthPercent: number | null;
  isSystemDrive: boolean;
  trimSupported: boolean;
}

export interface MonitorInfo {
  name: string;
  resolutionWidth: number;
  resolutionHeight: number;
  refreshRateHz: number;
  vrrSupported: boolean;
  vrrType: string | null; // "G-Sync", "FreeSync", "AdaptiveSync"
  hdrSupported: boolean;
  connectionType: string; // "DisplayPort", "HDMI", "DVI"
  scalingMode: string | null;
}

export interface MotherboardInfo {
  manufacturer: string;
  product: string;
  biosVersion: string;
  biosDate: string;
  chipset: string | null;
}

export interface NetworkAdapter {
  name: string;
  type: NicType;
  speed: string | null;
  macAddress: string;
  driverVersion: string;
  rssQueues: number | null;
}

export interface AudioDevice {
  name: string;
  isDefault: boolean;
  type: "playback" | "capture";
  driver: string | null;
}

export interface PowerState {
  source: PowerSource;
  activePlan: string;
  activePlanGuid: string;
  batteryPercent: number | null;
  batteryHealthPercent: number | null;
}

export interface SecurityState {
  secureBoot: boolean;
  tpmVersion: string | null;
  bitlockerEnabled: boolean;
  vbsEnabled: boolean;
  hvciEnabled: boolean;
  memoryIntegrity: boolean;
  virtualizationEnabled: boolean;
}

export interface WindowsInfo {
  version: string; // "10" | "11"
  build: number;
  ubr: number; // update build revision
  edition: string; // "Pro", "Home", "Enterprise", "LTSC"
  displayVersion: string; // "23H2", "24H2"
  installDate: string;
  isServer: boolean;
  features: Record<string, boolean>; // "Hyper-V", "WSL", etc.
}

export interface ThermalSnapshot {
  cpuTempC: number | null;
  gpuTempC: number | null;
  cpuThrottling: boolean;
  gpuThrottling: boolean;
  fanRpm: number | null;
}

export interface DeviceProfile {
  id: string;
  scannedAt: string; // ISO 8601
  deviceClass: DeviceClass;
  hostname: string;
  cpu: CpuInfo;
  gpus: GpuInfo[];
  memory: MemoryInfo;
  storage: StorageDrive[];
  monitors: MonitorInfo[];
  motherboard: MotherboardInfo;
  networkAdapters: NetworkAdapter[];
  audioDevices: AudioDevice[];
  power: PowerState;
  security: SecurityState;
  windows: WindowsInfo;
  thermal: ThermalSnapshot;
  // Extended config scans — populated by targeted scan methods, null if not yet scanned
  cpuPower: CpuPowerConfig | null;
  scheduler: SchedulerConfig | null;
  serviceStates: ServiceStateMap | null;
  filesystem: FilesystemConfig | null;
  memMgmt: MemMgmtConfig | null;
}

// Extended Config Scan Types

export interface CpuPowerConfig {
  scannedAt: string;
  minProcessorStatePercent: number;
  maxProcessorStatePercent: number;
  turboBoostEnabled: boolean;
  coreParkingEnabled: boolean;
  coreParkingMinCoresPercent: number;
  heterogeneousPolicy: string | null; // "1", "2", etc. — scheduler efficency class policy
  energyPreferencePolicy: string | null;
  perfBoostMode: string | null; // "0" = disabled, "1" = enabled, "2" = aggressive
  perfBoostPolicy: number | null; // 0-100
  rawPowerSettings: Record<string, string>; // guid → value
}

export interface SchedulerConfig {
  scannedAt: string;
  win32PrioritySeparation: number; // registry value controlling quantum & boost
  mmcssProfiles: MmcssProfile[];
  sfioEnabled: boolean | null;
  cpuPriorityClass: string | null;
  gpuSchedulingMode: string | null; // "0" = standard, "1" = hardware-accelerated
  timerResolutionMs: number | null;
  dynamicTickEnabled: boolean | null;
}

export interface MmcssProfile {
  profileName: string; // "Games", "Pro Audio", etc.
  schedulingCategory: string; // "High", "Medium", "Low"
  sfioThrottleRate: number | null;
  backgroundPriority: number | null;
  clockRate: number | null;
}

export interface ServiceStateMap {
  scannedAt: string;
  services: ServiceSnapshot[];
}

export interface ServiceSnapshot {
  name: string;
  displayName: string;
  startType: "automatic" | "automatic_delayed" | "manual" | "disabled" | "boot" | "system";
  runState: "running" | "stopped" | "paused" | "start_pending" | "stop_pending" | "unknown";
  pid: number | null;
  description: string | null;
}

export interface FilesystemConfig {
  scannedAt: string;
  prefetchEnabled: boolean;
  superfetchEnabled: boolean;
  ntfsLastAccessTimeEnabled: boolean;
  ntfs8dot3NameCreationEnabled: boolean;
  ntfsCompressionEnabled: boolean | null;
  pagingFileMode: "system_managed" | "custom" | "none";
  pagingFileSizeMb: number | null;
  storageDevicePolicies: Record<string, string>; // drive letter → policy
  tempDirPath: string;
  indexingEnabled: boolean;
}

export interface MemMgmtConfig {
  scannedAt: string;
  largePageMinimum: number | null;  // bytes
  systemPages: number | null;
  sessionPoolSize: number | null;
  sessionViewSize: number | null;
  pagePoolSize: number | null;
  nonPagedPoolSize: number | null;
  disablePagingExecutive: boolean;
  largeSystemCache: boolean | null;
  pageCombiningEnabled: boolean | null;
  kernelSevaEnabled: boolean | null; // speculative execution VA shadowing
  clearPageFileAtShutdown: boolean;
}
