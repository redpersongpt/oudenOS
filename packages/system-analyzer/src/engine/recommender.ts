// ─── Recommender ────────────────────────────────────────────────────────────
// Generates prioritized recommendations from system analysis and profile.

import type {
  SystemAnalysisResult,
  ProfileClassification,
  Recommendation,
  SystemProfile,
  OptimizationCategory,
  RiskLevel,
} from "../types.js";

type RecommendationTemplate = Omit<Recommendation, "isEnabled">;

function rec(
  id: string,
  title: string,
  description: string,
  category: OptimizationCategory,
  priority: number,
  confidence: number,
  riskLevel: RiskLevel,
  impactEstimate: number,
  profiles: SystemProfile[],
  rationale: string,
  requiresReboot: boolean,
  tags: string[]
): RecommendationTemplate {
  return { id, title, description, category, priority, confidence, riskLevel, impactEstimate, profiles, rationale, safeToApply: riskLevel === "safe" || riskLevel === "low", requiresReboot, tags };
}

export function generateRecommendations(
  analysis: SystemAnalysisResult,
  profile: ProfileClassification
): Recommendation[] {
  const templates: RecommendationTemplate[] = [];
  const p = profile.primary;
  const { hardware, software, workload, network, security } = analysis;

  // ─── CPU Optimizations ────────────────────────────────────────────────────

  if (software.coreParkingEnabled === true) {
    templates.push(rec(
      "cpu.disable-core-parking",
      "Disable CPU Core Parking",
      "Core parking puts CPU cores into deep sleep during brief idle periods, causing latency spikes when cores need to wake.",
      "cpu", 9, 0.95, "safe", 12,
      ["gaming", "highend", "work"],
      "Core parking detected as active. Gaming and real-time workloads suffer from the 1-10ms wake latency.",
      false,
      ["latency", "gaming", "cpu"]
    ));
  }

  if (software.win32PrioritySeparation === 2) {
    templates.push(rec(
      "cpu.win32-priority-separation",
      "Optimize CPU Scheduling (Win32PrioritySeparation)",
      "The registry value Win32PrioritySeparation controls CPU time quantum size and foreground boost. Value 38 gives foreground apps long quanta — optimal for gaming.",
      "scheduler", 8, 0.85, "low", 8,
      ["gaming"],
      "Current value is 2 (Windows default). Gaming systems benefit from value 38 or 26 to give the game process longer CPU time.",
      false,
      ["scheduler", "latency", "gaming"]
    ));
  }

  if (software.timerResolutionMs !== null && software.timerResolutionMs > 1) {
    templates.push(rec(
      "cpu.timer-resolution",
      "Lower System Timer Resolution",
      `Current timer is ${software.timerResolutionMs}ms. A 0.5ms timer improves scheduling granularity for audio, gaming, and real-time tasks.`,
      "scheduler", 7, 0.80, "low", 6,
      ["gaming", "work"],
      `Timer at ${software.timerResolutionMs}ms adds scheduling jitter. Lower resolution reduces DPC latency and improves frame timing.`,
      false,
      ["timer", "latency", "dpc"]
    ));
  }

  // ─── GPU Optimizations ────────────────────────────────────────────────────

  if (!hardware.gpu.resizableBar && hardware.gpu.vendor === "nvidia" && hardware.gpu.hasDiscreteGpu) {
    templates.push(rec(
      "gpu.enable-resizable-bar",
      "Enable Resizable BAR (NVIDIA)",
      "Resizable BAR allows the CPU to access the entire GPU VRAM at once instead of 256MB chunks, reducing CPU-GPU bottlenecks.",
      "gpu", 7, 0.88, "low", 9,
      ["gaming", "highend"],
      `${hardware.gpu.name} supports Resizable BAR but it is currently disabled. Enable in BIOS under 'Above 4G Decoding' + 'Resizable BAR'.`,
      true,
      ["gpu", "pcie", "nvidia", "rebar"]
    ));
  }

  if (!hardware.gpu.resizableBar && hardware.gpu.vendor === "amd" && hardware.gpu.hasDiscreteGpu) {
    templates.push(rec(
      "gpu.enable-smart-access",
      "Enable AMD Smart Access Memory",
      "SAM (Resizable BAR) allows the CPU to access all GPU VRAM simultaneously, improving GPU utilization by 5-15% in games.",
      "gpu", 7, 0.88, "low", 10,
      ["gaming", "highend"],
      `AMD SAM is disabled on ${hardware.gpu.name}. Enable via BIOS 'Above 4G Decoding' + 'Resizable BAR' for AMD Advantage.`,
      true,
      ["gpu", "amd", "sam", "rebar"]
    ));
  }

  // GPU hardware scheduling (Windows 10 2004+)
  if (software.windows.build >= 19041 && hardware.gpu.hasDiscreteGpu) {
    templates.push(rec(
      "gpu.hardware-scheduling",
      "Enable Hardware-Accelerated GPU Scheduling",
      "HAGS moves GPU scheduling work off the CPU and onto the GPU's own scheduler, reducing CPU overhead and latency.",
      "gpu", 6, 0.75, "low", 5,
      ["gaming"],
      "Supported on Windows 10 2004+ with WDDM 2.7 driver. Most modern NVIDIA/AMD drivers support this. May not benefit all games.",
      false,
      ["gpu", "hags", "latency"]
    ));
  }

  // ─── Memory Optimizations ─────────────────────────────────────────────────

  if (!hardware.ram.xmpEnabled) {
    templates.push(rec(
      "memory.enable-xmp",
      "Enable XMP/EXPO Memory Profile",
      `Your ${hardware.ram.type} RAM is rated for ${hardware.ram.speedMhz}MHz but running at stock speed. XMP enables the rated frequency.`,
      "memory", 9, 0.98, "low", 15,
      ["gaming", "highend", "work", "budget"],
      `XMP/EXPO is not enabled. RAM operating below rated speed costs 5-20% bandwidth. Enable in BIOS under 'DRAM Profile' or 'XMP'.`,
      true,
      ["memory", "xmp", "expo", "bandwidth"]
    ));
  }

  if (!hardware.ram.isDualChannel && hardware.ram.totalGb >= 16) {
    templates.push(rec(
      "memory.dual-channel",
      "Enable Dual-Channel Memory Configuration",
      "Running RAM in dual-channel mode doubles memory bandwidth. Ensure DIMMs are in correct paired slots (A2+B2 typically).",
      "memory", 8, 0.70, "safe", 20,
      ["gaming", "highend", "work"],
      "Single-channel detected despite having 16GB+ RAM. Dual-channel can improve iGPU performance 30-50% and reduce CPU bottlenecks.",
      false,
      ["memory", "dual-channel", "bandwidth"]
    ));
  }

  // Large System Cache (LSC) for workstations
  if (workload.primary === "work" || workload.primary === "development") {
    templates.push(rec(
      "memory.large-system-cache",
      "Enable Large System Cache",
      "For server/workstation workloads, enabling Large System Cache dedicates more RAM to file cache, improving throughput on database and file-heavy operations.",
      "memory", 5, 0.65, "medium", 8,
      ["work", "highend"],
      "Work/development workload detected. Large System Cache benefits sustained file I/O but may reduce responsiveness for gaming.",
      false,
      ["memory", "cache", "workstation"]
    ));
  }

  // ─── Storage Optimizations ─────────────────────────────────────────────────

  if (!hardware.storage.systemDrive.trimEnabled) {
    templates.push(rec(
      "storage.enable-trim",
      "Enable TRIM for SSD",
      "TRIM tells the SSD controller which blocks are no longer in use, maintaining long-term performance and extending drive lifespan.",
      "storage", 8, 0.99, "safe", 10,
      ["gaming", "work", "highend", "budget", "laptop"],
      "TRIM is not enabled on the system SSD. Without TRIM, write performance degrades over time as the controller fills dirty blocks.",
      false,
      ["storage", "ssd", "trim"]
    ));
  }

  if (hardware.storage.systemDrive.isLowFreeSpace) {
    templates.push(rec(
      "storage.free-space",
      "Free Up System Drive Space",
      `System drive is ${Math.round(hardware.storage.systemDrive.freePercent)}% free. Below 15%, Windows Prefetch and Superfetch degrade significantly.`,
      "storage", 9, 0.99, "safe", 15,
      ["gaming", "work", "highend", "budget", "laptop"],
      "Low free space detected. SSDs need headroom for wear leveling and temp file operations. Clean temp files and move large files.",
      false,
      ["storage", "space", "maintenance"]
    ));
  }

  // ─── Power Optimizations ─────────────────────────────────────────────────

  const powerPlanLow = software.powerPlan.toLowerCase().includes("power saver") ||
    software.powerPlan.toLowerCase().includes("balanced");

  if (powerPlanLow && (p === "gaming" || p === "highend") && !hardware.hasBattery) {
    templates.push(rec(
      "power.high-performance-plan",
      "Switch to High Performance Power Plan",
      "High Performance plan disables CPU frequency scaling, ensuring maximum clock speeds at all times. Eliminates frequency ramp-up latency.",
      "power", 9, 0.92, "safe", 10,
      ["gaming", "highend"],
      `Current plan '${software.powerPlan}' allows CPU frequency to drop. For desktop gaming, static max frequency eliminates stutters.`,
      false,
      ["power", "cpu", "gaming", "frequency"]
    ));
  }

  if (p === "laptop") {
    templates.push(rec(
      "power.laptop-balanced",
      "Use Balanced Power Plan on Battery",
      "Laptop systems benefit from Balanced plan on battery and High Performance when plugged in to maximize battery life.",
      "power", 6, 0.85, "safe", 5,
      ["laptop"],
      "Laptop detected. Dynamic power management prevents thermal throttling and extends battery life on mobile hardware.",
      false,
      ["power", "battery", "laptop"]
    ));
  }

  // ─── Network Optimizations ────────────────────────────────────────────────

  if (network.rssQueues !== null && network.rssQueues < 4 && hardware.cpu.cores >= 4) {
    templates.push(rec(
      "network.rss-queues",
      "Increase Network RSS Queue Count",
      "Receive Side Scaling distributes network processing across CPU cores. More queues = better throughput and lower latency.",
      "network", 6, 0.78, "low", 7,
      ["gaming", "work", "highend"],
      `RSS at ${network.rssQueues} queues with ${hardware.cpu.cores} CPU cores available. Increasing to 4-8 queues improves networking under load.`,
      false,
      ["network", "rss", "latency"]
    ));
  }

  if (network.isWifi && p === "gaming") {
    templates.push(rec(
      "network.wifi-gaming",
      "Switch to Ethernet for Gaming",
      "Wi-Fi introduces variable latency (jitter) that impacts online gaming. A wired Ethernet connection provides consistent 1-5ms latency.",
      "network", 7, 0.90, "safe", 20,
      ["gaming"],
      "Wi-Fi detected on gaming system. Wireless introduces 10-50ms jitter that causes inconsistent online game performance.",
      false,
      ["network", "wifi", "ethernet", "gaming"]
    ));
  }

  // ─── Security / Performance Trade-offs ────────────────────────────────────

  if (security.hvciPerformanceImpact && (p === "gaming" || p === "highend")) {
    templates.push(rec(
      "security.hvci-tradeoff",
      "Review Memory Integrity (HVCI) Setting",
      "Memory Integrity (HVCI) protects against kernel exploits but adds 5-15% CPU overhead on older CPUs. Consider your security vs. performance needs.",
      "security", 4, 0.70, "high",
      hardware.cpu.tier === "flagship" ? 5 : 12,
      ["gaming"],
      "HVCI enabled on gaming system. On older CPUs (pre-8th gen Intel / pre-Zen 2 AMD), overhead can be significant. Review if this tradeoff is acceptable.",
      true,
      ["security", "hvci", "performance", "gaming"]
    ));
  }

  // ─── Startup / Services ───────────────────────────────────────────────────

  if (software.runningServicesCount !== null && software.runningServicesCount > 200) {
    templates.push(rec(
      "services.audit",
      "Audit Background Services",
      `${software.runningServicesCount} services detected. Many third-party and OEM services run unnecessarily, consuming RAM and CPU cycles.`,
      "services", 7, 0.80, "medium", 8,
      ["budget", "gaming", "work", "laptop"],
      "High service count detected. Disabling non-essential services can recover 200-500MB RAM and reduce CPU overhead.",
      false,
      ["services", "startup", "cleanup"]
    ));
  }

  // Sort by priority descending, then by confidence descending
  const sorted = templates.sort((a, b) =>
    b.priority !== a.priority ? b.priority - a.priority : b.confidence - a.confidence
  );

  // Add isEnabled: true to all (user can toggle later)
  return sorted.map((t, i) => ({
    ...t,
    priority: Math.max(10 - i, 1), // Re-normalize to 1-10
    isEnabled: true,
  }));
}
