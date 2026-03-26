// ─── Download Center / App Hub ───────────────────────────────────────────────
// Curated app catalog with trusted sources, checksums, and silent install support.

import type { AppCatalogEntry } from "@redcore/shared-schema/ipc";

export const defaultCatalog: AppCatalogEntry[] = [
  // Browsers
  { id: "firefox", name: "Mozilla Firefox", category: "browsers", description: "Privacy-focused web browser", version: "131.0", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: "/S", trusted: true, iconUrl: null },
  { id: "brave", name: "Brave Browser", category: "browsers", description: "Chromium-based privacy browser", version: "1.71.0", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: "/silent /install", trusted: true, iconUrl: null },

  // Utilities
  { id: "7zip", name: "7-Zip", category: "utilities", description: "File archiver with high compression ratio", version: "24.08", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: "/S", trusted: true, iconUrl: null },
  { id: "everything", name: "Everything", category: "utilities", description: "Instant file search", version: "1.4.1.1026", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: "/S", trusted: true, iconUrl: null },

  // Monitoring
  { id: "hwinfo64", name: "HWiNFO64", category: "monitoring", description: "Hardware monitoring and diagnostics", version: "8.14", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: null, trusted: true, iconUrl: null },
  { id: "msi-afterburner", name: "MSI Afterburner", category: "monitoring", description: "GPU overclocking and monitoring", version: "4.6.5", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: null, trusted: true, iconUrl: null },

  // Gaming Tools
  { id: "nvcleaninstall", name: "NVCleanstall", category: "gaming", description: "Clean NVIDIA driver installer", version: "1.16.0", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: null, trusted: true, iconUrl: null },
  { id: "ddu", name: "Display Driver Uninstaller", category: "drivers", description: "Clean GPU driver removal tool", version: "18.0.7.8", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: null, trusted: true, iconUrl: null },

  // Benchmarking
  { id: "latencymon", name: "LatencyMon", category: "monitoring", description: "Real-time DPC/ISR latency monitor", version: "7.30", downloadUrl: "", checksum: "", checksumAlgo: "sha256", silentInstallArgs: null, trusted: true, iconUrl: null },
];

export function getCatalogByCategory(category: string): AppCatalogEntry[] {
  if (category === "all") return defaultCatalog;
  return defaultCatalog.filter((app) => app.category === category);
}

export const categories = [
  { id: "all", label: "All" },
  { id: "browsers", label: "Browsers" },
  { id: "utilities", label: "Utilities" },
  { id: "monitoring", label: "Monitoring" },
  { id: "gaming", label: "Gaming" },
  { id: "drivers", label: "Drivers" },
] as const;
