#!/usr/bin/env node
/**
 * Mock Rust service for macOS development/proof.
 * Responds to JSON-RPC over stdin/stdout with realistic simulated data.
 * Simulates an M1 MacBook Air 8GB profile classified as office_laptop.
 */

import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });

const PROFILE_ID = "mock-m1-macbook-" + Date.now().toString(36);

const DEVICE_PROFILE = {
  id: PROFILE_ID,
  deviceClass: "laptop",
  hostname: "MacBook-Air",
  cpu: {
    vendor: "Apple",
    brand: "Apple M1",
    physicalCores: 8,
    logicalCores: 8,
    smtEnabled: false,
    baseClockMhz: 3200,
    maxBoostMhz: null,
    cacheL2Kb: 4096,
    cacheL3Kb: null,
    features: [],
    numaNodes: 1,
  },
  gpus: [{
    vendor: "Apple",
    name: "Apple M1 GPU (8-core)",
    vramMb: null,
    driverVersion: "macOS",
    driverDate: null,
    resizableBar: false,
    pcieGeneration: null,
    pcieLanes: null,
    currentClockMhz: null,
    maxClockMhz: null,
    tdpWatts: null,
  }],
  memory: { totalMb: 8192, type: "LPDDR4X", speedMhz: 4266, channels: 2, dimmPopulated: 1, dimmSlots: 1, xmpExpoEnabled: false, timings: null },
  storage: [{ model: "Apple SSD AP0256Q", sizeGb: 245, freeSpaceGb: 120, type: "NVMe", interface: "PCIe", isSystemDrive: true }],
  monitors: [{ name: "Built-in Retina Display", resolutionX: 2560, resolutionY: 1600, refreshRateHz: 60, hdrCapable: false }],
  power: { source: "ac", activePlan: "Automatic", activePlanGuid: null, batteryPercent: 87, batteryHealthPercent: 91 },
  networkAdapters: [{ name: "Wi-Fi", type: "wifi", driver: "AirPort", macAddress: "AA:BB:CC:DD:EE:FF" }],
  audioDevices: [{ name: "MacBook Air Speakers" }],
  motherboard: { manufacturer: "Apple", product: "MacBookAir10,1", biosVersion: "macOS 14.5", biosDate: null, chipset: "M1" },
  thermal: { cpuTempC: 42, gpuTempC: null, cpuThrottling: false, gpuThrottling: null, fanRpm: null },
  security: { secureBoot: true, tpmVersion: null, vbsEnabled: false, hvciEnabled: false, memoryIntegrity: false, bitlockerEnabled: null, virtualizationEnabled: false },
  mitigations: { featureSettingsOverride: null, featureSettingsOverrideMask: null, mitigationStatus: "default", btiHardwarePresent: null, btiWindowsSupportEnabled: null, kvaEnabled: null, ssbdAvailable: null, ssbdEnabled: null },
  windows: { build: 0, edition: "macOS", productName: "macOS (dev mode)", fullVersion: "14.5", architecture: "arm64", displayVersion: "14.5", isServer: false, installDate: null, ubr: 0, version: "14", features: {} },
  scannedAt: new Date().toISOString(),
};

const CLASSIFICATION = {
  primary: "office_laptop",
  confidence: 0.72,
  scores: {
    gaming_desktop: 0,
    budget_desktop: 0.15,
    highend_workstation: 0.1,
    office_laptop: 1.0,
    gaming_laptop: 0.28,
    low_spec_system: 0.35,
    vm_cautious: 0,
  },
  signals: [
    { factor: "laptop_form_factor", value: "laptop", weight: 0.2, favoredArchetype: "office_laptop" },
    { factor: "integrated_gpu", value: "Apple M1 GPU (8-core)", weight: 0.15, favoredArchetype: "budget_desktop" },
    { factor: "moderate_ram", value: "8 GB", weight: 0.1, favoredArchetype: "budget_desktop" },
    { factor: "low_ram", value: "8 GB", weight: 0.2, favoredArchetype: "low_spec_system" },
    { factor: "nvme_storage", value: "NVMe SSD", weight: 0.05, favoredArchetype: "gaming_desktop" },
    { factor: "arm_processor", value: "Apple M1 (ARM64)", weight: 0.15, favoredArchetype: "office_laptop" },
  ],
  classifiedAt: new Date().toISOString(),
  deviceProfileId: PROFILE_ID,
};

const RECOMMENDATIONS = [
  { actionId: "privacy.disable-telemetry", actionName: "Disable Telemetry", category: "privacy", relevance: 0.9, confidence: "high", reason: "Reduces background network activity, improving battery endurance on your MacBook Air", archetypeSpecific: false, priorityOrder: 1, tier: "free", risk: "safe" },
  { actionId: "startup.disable-background-apps", actionName: "Disable Background Apps", category: "startup", relevance: 0.85, confidence: "high", reason: "With 8 GB RAM, preventing UWP background tasks frees memory for active applications", archetypeSpecific: true, priorityOrder: 2, tier: "free", risk: "safe" },
  { actionId: "privacy.disable-search-suggestions", actionName: "Disable Search Suggestions", category: "privacy", relevance: 0.82, confidence: "high", reason: "Eliminates keystroke transmission to cloud services, reducing network activity on mobile", archetypeSpecific: false, priorityOrder: 3, tier: "free", risk: "safe" },
  { actionId: "startup.disable-cloud-notifications", actionName: "Disable Cloud Notifications", category: "startup", relevance: 0.78, confidence: "high", reason: "Removes persistent cloud connection, reducing battery drain from WNS polling", archetypeSpecific: true, priorityOrder: 4, tier: "free", risk: "safe" },
  { actionId: "privacy.disable-clipboard-history", actionName: "Disable Clipboard History", category: "privacy", relevance: 0.75, confidence: "medium", reason: "Prevents clipboard cloud sync, reducing data transmission on mobile network", archetypeSpecific: false, priorityOrder: 5, tier: "free", risk: "safe" },
  { actionId: "services.disable-remote-services", actionName: "Disable Remote Services", category: "services", relevance: 0.7, confidence: "medium", reason: "Remote access is rarely needed on a mobile office device; disabling hardens the system", archetypeSpecific: false, priorityOrder: 6, tier: "free", risk: "safe" },
  { actionId: "services.disable-print-spooler", actionName: "Disable Print Spooler", category: "services", relevance: 0.65, confidence: "medium", reason: "Eliminates PrintNightmare attack surface on a system unlikely to have a local printer", archetypeSpecific: false, priorityOrder: 7, tier: "free", risk: "low" },
  { actionId: "display.disable-sticky-keys", actionName: "Disable Sticky Keys Prompt", category: "display", relevance: 0.5, confidence: "medium", reason: "Prevents accidental activation of accessibility shortcuts", archetypeSpecific: false, priorityOrder: 8, tier: "free", risk: "safe" },
];

const handlers = {
  "system.getServiceStatus": () => ({ version: "0.1.0-mock", uptime: 0, dbPath: "/dev/null", logLevel: "info", licenseTier: "free" }),
  "license.getState": () => ({ tier: "premium", status: "active", device_bound: true, device_id: "proof-device", expires_at: "2027-03-25T00:00:00Z", last_validated_at: new Date().toISOString(), offline_days_remaining: 30, offline_grace_days: 30 }),
  "scan.hardware": () => DEVICE_PROFILE,
  "scan.quick": () => DEVICE_PROFILE,
  "tuning.generatePlan": () => ({
    id: "mock-plan-" + Date.now().toString(36),
    preset: "conservative",
    estimatedRisk: "safe",
    actions: RECOMMENDATIONS.filter(r => r.risk === "safe").map(r => ({
      actionId: r.actionId, action: { id: r.actionId, name: r.actionName, category: r.category, tier: r.tier, risk: r.risk },
      status: "pending", appliedAt: null, outcome: null, validatedAt: null, userOverride: null,
    })),
    rebootsRequired: 0,
    phases: [{ id: "phase-1", name: "Registry & Services", actionIds: RECOMMENDATIONS.map(r => r.actionId) }],
  }),
  "tuning.getActions": (params) => {
    const cat = params?.category;
    return RECOMMENDATIONS.map(r => ({ id: r.actionId, name: r.actionName, category: r.category, tier: r.tier, risk: r.risk, description: r.reason, registryChanges: [], serviceChanges: [], powerChanges: [], bcdChanges: [], requiresReboot: false, sideEffects: [], tags: [r.category] }))
      .filter(a => !cat || a.category === cat);
  },
  "intelligence.classify": () => CLASSIFICATION,
  "intelligence.getProfile": () => ({
    classification: CLASSIFICATION,
    recommendations: RECOMMENDATIONS,
    suggestedPreset: "conservative",
    warningNotes: [
      "This is a macOS device running in development mode",
      "Battery-unfriendly changes are excluded from recommendations",
      "With 8 GB RAM, focus is on background cleanup and resource conservation",
    ],
    quickWins: RECOMMENDATIONS.slice(0, 5),
    archetypeMeta: { label: "Office Laptop", tagline: "Mobile system optimized for reliability, battery life, and quiet operation", icon: "briefcase", accentColor: "sky", suggestedPreset: "conservative" },
    totalActions: RECOMMENDATIONS.length,
    actionableCount: RECOMMENDATIONS.filter(r => r.confidence === "high").length,
  }),
  "intelligence.getRecommendations": () => RECOMMENDATIONS,
  "rollback.listSnapshots": () => [],
  "rollback.getAuditLog": () => [],
  "journal.getState": () => null,
  "benchmark.run": () => ({
    id: "bench-" + Date.now().toString(36),
    deviceProfileId: PROFILE_ID,
    type: "system_latency",
    status: "completed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    metrics: [
      { name: "sleep1_median_us", value: 1520, unit: "us", betterDirection: "lower" },
      { name: "sleep1_p99_us", value: 1890, unit: "us", betterDirection: "lower" },
      { name: "thread_spawn_median_us", value: 145, unit: "us", betterDirection: "lower" },
      { name: "clock_read_median_ns", value: 42, unit: "ns", betterDirection: "lower" },
      { name: "seq_write_mbps", value: 2850.5, unit: "MB/s", betterDirection: "higher" },
      { name: "seq_read_mbps", value: 5120.3, unit: "MB/s", betterDirection: "higher" },
      { name: "random_4k_write_iops", value: 48200, unit: "IOPS", betterDirection: "higher" },
    ],
    tags: ["baseline", "wizard"],
    error: null,
  }),
  "benchmark.list": () => [],
  "tuning.applyAction": (params) => ({
    actionId: params?.actionId ?? "unknown",
    status: "success",
    appliedAt: new Date().toISOString(),
    changesApplied: [{ type: "simulated", path: "mock", valueName: "mock", previousValue: null, newValue: 1, verified: true }],
    snapshotId: "snap-" + Date.now().toString(36),
    validationPassed: true,
    rebootRequired: false,
    journalEntryId: null,
    error: null,
  }),
  "tuning.previewAction": (params) => {
    const id = params?.actionId;
    const rec = RECOMMENDATIONS.find(r => r.actionId === id);
    return rec ? { id, name: rec.actionName, category: rec.category, tier: rec.tier, risk: rec.risk, description: rec.reason } : { id, name: id, category: "unknown" };
  },
  "system.requestReboot": () => ({ scheduled: true, delaySeconds: 5, simulated: true }),
  "apphub.getCatalog": () => [
    // Gaming
    { id: "steam", name: "Steam", category: "gaming", description: "PC gaming platform and store", version: "latest", downloadUrl: "https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://store.steampowered.com/favicon.ico" },
    { id: "discord", name: "Discord", category: "gaming", description: "Voice, video, and text communication", version: "latest", downloadUrl: "https://discord.com/api/downloads/distributions/app/installers/latest?channel=stable&platform=win&arch=x64", checksum: "", checksumAlgo: "none", silentInstallArgs: "--silent", trusted: true, iconUrl: "https://discord.com/assets/favicon.ico" },
    { id: "epic-games", name: "Epic Games Launcher", category: "gaming", description: "Game store and launcher", version: "latest", downloadUrl: "https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncherInstaller.msi", checksum: "", checksumAlgo: "none", silentInstallArgs: "/quiet", trusted: true, iconUrl: "https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico" },
    { id: "battle-net", name: "Battle.net", category: "gaming", description: "Blizzard game launcher", version: "latest", downloadUrl: "https://www.battle.net/download/getInstallerForGame?os=win&gameProgram=BNET_APP", checksum: "", checksumAlgo: "none", silentInstallArgs: null, trusted: true, iconUrl: "https://blznav.akamaized.net/img/favicon.ico" },
    { id: "riot-client", name: "Riot Client", category: "gaming", description: "Valorant, League of Legends launcher", version: "latest", downloadUrl: "https://valorant.secure.dyn.riotcdn.net/channels/public/x/installer/current/live.live.eu.exe", checksum: "", checksumAlgo: "none", silentInstallArgs: null, trusted: true, iconUrl: "https://www.riotgames.com/darkroom/original/6e2a032b-2539-4a6f-b38e-e204df0d9b07.ico" },
    { id: "ea-app", name: "EA App", category: "gaming", description: "Electronic Arts game launcher", version: "latest", downloadUrl: "https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer/EAappInstaller.exe", checksum: "", checksumAlgo: "none", silentInstallArgs: null, trusted: true, iconUrl: "https://www.ea.com/favicon.ico" },
    // Browsers
    { id: "brave", name: "Brave", category: "browsers", description: "Privacy-focused Chromium browser with ad blocking", version: "latest", downloadUrl: "https://laptop-updates.brave.com/latest/winx64", checksum: "", checksumAlgo: "none", silentInstallArgs: "--silent --system-level", trusted: true, iconUrl: "https://brave.com/static-assets/images/brave-favicon.png" },
    { id: "firefox", name: "Firefox", category: "browsers", description: "Open-source web browser by Mozilla", version: "latest", downloadUrl: "https://download.mozilla.org/?product=firefox-latest&os=win64&lang=en-US", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://www.mozilla.org/media/img/favicons/firefox/browser/favicon-196x196.59e3822720be.png" },
    { id: "chrome", name: "Google Chrome", category: "browsers", description: "Google web browser", version: "latest", downloadUrl: "https://dl.google.com/chrome/install/latest/chrome_installer.exe", checksum: "", checksumAlgo: "none", silentInstallArgs: "/silent /install", trusted: true, iconUrl: "https://www.google.com/chrome/static/images/favicons/favicon-32x32.png" },
    // Streaming
    { id: "obs-studio", name: "OBS Studio", category: "streaming_media", description: "Open-source streaming and recording", version: "latest", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://obsproject.com/favicon-32x32.png" },
    { id: "spotify", name: "Spotify", category: "streaming_media", description: "Music streaming", version: "latest", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/silent", trusted: true, iconUrl: "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png" },
    // Utilities
    { id: "7zip", name: "7-Zip", category: "utilities", description: "Open-source file archiver", version: "24.08", downloadUrl: "https://www.7-zip.org/a/7z2408-x64.exe", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://www.7-zip.org/7ziplogo.png" },
    { id: "notepadpp", name: "Notepad++", category: "utilities", description: "Free source code editor", version: "8.7.6", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://notepad-plus-plus.org/images/logo.svg" },
    { id: "everything", name: "Everything", category: "utilities", description: "Instant file search", version: "1.4", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://www.voidtools.com/favicon.ico" },
    { id: "vlc", name: "VLC", category: "streaming_media", description: "Free multimedia player", version: "3.0.21", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S /L=1033", trusted: true, iconUrl: "https://www.videolan.org/images/vlc/vlc-icon.svg" },
    // Monitoring
    { id: "hwinfo64", name: "HWiNFO64", category: "system_monitoring", description: "Hardware information and monitoring", version: "latest", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/VERYSILENT", trusted: true, iconUrl: "https://www.hwinfo.com/favicon.ico" },
    { id: "msi-afterburner", name: "MSI Afterburner", category: "system_monitoring", description: "GPU overclocking and monitoring", version: "latest", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/S", trusted: true, iconUrl: "https://www.msi.com/favicon.ico" },
    // Development
    { id: "vscode", name: "VS Code", category: "development", description: "Code editor by Microsoft", version: "latest", downloadUrl: "", checksum: "", checksumAlgo: "none", silentInstallArgs: "/VERYSILENT /NORESTART", trusted: true, iconUrl: "https://code.visualstudio.com/favicon.ico" },
  ],
};

rl.on("line", (line) => {
  try {
    const req = JSON.parse(line);
    const handler = handlers[req.method];
    if (handler) {
      const result = handler(req.params);
      process.stdout.write(JSON.stringify({ id: req.id, result }) + "\n");
    } else {
      process.stdout.write(JSON.stringify({ id: req.id, error: { code: -1, message: `Mock: unknown method ${req.method}` } }) + "\n");
    }
  } catch {
    // ignore non-JSON
  }
});

process.stderr.write("[Mock Service] Ready (M1 MacBook Air simulation)\n");
