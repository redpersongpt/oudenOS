// ─── Reference Tables ───────────────────────────────────────────────────────
// Technical reference data sourced from valleyofdoom/PC-Tuning research.
// Used by both apps for expert tooltips and configuration guidance.

// ── Win32PrioritySeparation Valid Values ────────────────────────────────────
// The key only reads the first 6 bits. Values above 63 recycle.
// Source: valleyofdoom/PC-Tuning §5.1

export interface PrioritySeparationEntry {
  hex: string;
  decimal: number;
  interval: "Long" | "Short";
  length: "Variable" | "Fixed";
  foregroundRatio: string;
  description: string;
}

export const WIN32_PRIORITY_TABLE: PrioritySeparationEntry[] = [
  { hex: "0x14", decimal: 20, interval: "Long", length: "Variable", foregroundRatio: "1:1", description: "Long quantum, no foreground boost" },
  { hex: "0x15", decimal: 21, interval: "Long", length: "Variable", foregroundRatio: "2:1", description: "Long quantum, moderate foreground boost" },
  { hex: "0x16", decimal: 22, interval: "Long", length: "Variable", foregroundRatio: "3:1", description: "Long quantum, maximum foreground boost" },
  { hex: "0x18", decimal: 24, interval: "Long", length: "Fixed", foregroundRatio: "1:1", description: "Long fixed quantum, no foreground boost" },
  { hex: "0x1A", decimal: 26, interval: "Long", length: "Fixed", foregroundRatio: "3:1", description: "Long fixed quantum, maximum foreground boost — good for balanced workloads" },
  { hex: "0x24", decimal: 36, interval: "Short", length: "Variable", foregroundRatio: "1:1", description: "Short quantum, no foreground boost — best for latency" },
  { hex: "0x26", decimal: 38, interval: "Short", length: "Variable", foregroundRatio: "3:1", description: "Short quantum, max foreground boost — best for gaming responsiveness" },
  { hex: "0x28", decimal: 40, interval: "Short", length: "Fixed", foregroundRatio: "1:1", description: "Short fixed, no boost — FPS benchmark oriented" },
  { hex: "0x2A", decimal: 42, interval: "Short", length: "Fixed", foregroundRatio: "3:1", description: "Short fixed, max boost — FPS with foreground priority" },
];

// Windows default: 0x2 (decimal 2) = Short, Variable, 3:1 ratio
// Note: Win11 24H2 changed this table

// ── Timer Resolution Reference ─────────────────────────────────────────────
// Source: valleyofdoom/PC-Tuning §10

export interface TimerResolutionNote {
  topic: string;
  detail: string;
}

export const TIMER_RESOLUTION_NOTES: TimerResolutionNote[] = [
  { topic: "Default system clock", detail: "64Hz = 15.625ms period" },
  { topic: "Maximum resolution", detail: "2kHz = 0.500ms period" },
  { topic: "Win10 2004+ change", detail: "Resolution requests became per-process. Background processes stay at 15.625ms even if foreground requests 0.5ms." },
  { topic: "Win11 further restriction", detail: "Calling process's resolution not honored if window is minimized or occluded." },
  { topic: "GlobalTimerResolutionRequests", detail: "Win11+ / Server 2022+ only. NOT present in Win10 ntoskrnl.exe — has NO effect on Win10." },
  { topic: "Micro-adjustment finding", detail: "0.507ms often gives lower actual Sleep(1) deltas than 0.500ms. Optimal value varies per system." },
  { topic: "Recommendation", detail: "Use RTSS hybrid-wait for frame limiting. Compare against micro-adjusted global resolution for latency." },
];

// ── Windows Version GPU Compatibility ──────────────────────────────────────
// Source: valleyofdoom/PC-Tuning §2.1

export interface GpuCompatEntry {
  gpu: string;
  minWindows: string;
}

export const GPU_COMPAT_TABLE: GpuCompatEntry[] = [
  { gpu: "NVIDIA GTX 10 series and lower", minWindows: "Most Windows versions" },
  { gpu: "NVIDIA GTX 16, RTX 20 series", minWindows: "Win7, Win8, Win10 1709+" },
  { gpu: "NVIDIA RTX 30 series", minWindows: "Win7, Win10 1803+" },
  { gpu: "NVIDIA RTX 40 series", minWindows: "Win10 1803+" },
];

// ── Windows Build Feature Notes ────────────────────────────────────────────

export interface BuildFeatureNote {
  build: string;
  feature: string;
}

export const BUILD_FEATURE_NOTES: BuildFeatureNote[] = [
  { build: "Win10 1903+", feature: "Updated scheduler for multi-CCX Ryzen" },
  { build: "Win10 2004+", feature: "Timer resolution per-process (breaking change)" },
  { build: "Win10 2004+", feature: "Hardware Accelerated GPU Scheduling (HAGS) — required for DLSS Frame Gen" },
  { build: "Win11+", feature: "Updated scheduler for Intel 12th Gen+ hybrid architecture" },
  { build: "Win11+", feature: "Background process window message rate limited" },
  { build: "Win11 22H2+", feature: "GlobalTimerResolutionRequests registry key available" },
  { build: "Win11 24H2", feature: "Win32PrioritySeparation table changed" },
];

// ── MMCSS Gaming Profile Reference ─────────────────────────────────────────

export const MMCSS_GAMING_PROFILE = {
  path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
  settings: {
    "GPU Priority": { value: 8, description: "Maximum GPU scheduling priority for game processes" },
    "Priority": { value: 6, description: "Elevated CPU scheduling priority (above normal, below real-time)" },
    "Scheduling Category": { value: "High", description: "High scheduling category for foreground game threads" },
    "Clock Rate": { value: 10000, description: "1ms clock rate (10000 × 100ns intervals)" },
    "Affinity": { value: 0, description: "No CPU affinity restriction (use all cores)" },
    "Background Only": { value: "False", description: "Apply to foreground threads, not just background" },
  },
  systemProfile: {
    "NetworkThrottlingIndex": { value: 0xFFFFFFFF, description: "Disable network throttling for multimedia processes" },
    "SystemResponsiveness": { value: 0, description: "Reserve 0% CPU for background (100% available for games). Default Windows value is 20%." },
  },
};

// ── Service Dependency Warning ─────────────────────────────────────────────

export const SERVICE_SAFETY_RULES = [
  "ALWAYS run 'sc EnumDepend <service>' before disabling to check for dependent services",
  "Some services have 3-4 levels of hidden dependencies that will break silently",
  "Test each service disable individually — don't batch disable without verification",
  "Critical services that must NEVER be disabled: CoreMessagingRegistrar (boot loop), DcomLaunch (no boot), UserManager, RpcSs, RpcEptMapper",
  "WaaSMedicSvc can only be disabled via registry (sc config silently fails)",
];
