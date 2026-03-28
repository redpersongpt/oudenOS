// ─── Network Analyzer ────────────────────────────────────────────────────────
// Evaluates network adapter type, speed, RSS configuration, and quality.

import type { DeviceProfile } from "@redcore/shared-schema/device";
import type { NetworkAnalysis, ConnectionQuality } from "../types.js";

function parseSpeedMbps(speedStr: string | null): number | null {
  if (!speedStr) return null;
  const match = speedStr.match(/(\d+(?:\.\d+)?)\s*(G|M|K)?bps?/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = (match[2] ?? "M").toUpperCase();
  if (unit === "G") return value * 1000;
  if (unit === "K") return value / 1000;
  return value;
}

function rateConnection(type: "ethernet" | "wifi" | "unknown", speedMbps: number | null): ConnectionQuality {
  if (type === "ethernet") {
    if (speedMbps === null) return "good";
    if (speedMbps >= 2500) return "excellent";
    if (speedMbps >= 1000) return "excellent";
    if (speedMbps >= 100)  return "good";
    return "fair";
  }
  if (type === "wifi") {
    if (speedMbps === null) return "fair";
    if (speedMbps >= 1200) return "excellent";
    if (speedMbps >= 600)  return "good";
    if (speedMbps >= 300)  return "fair";
    return "poor";
  }
  return "unknown";
}

export function analyzeNetwork(profile: DeviceProfile): NetworkAnalysis {
  const adapters = profile.networkAdapters;
  const notes: string[] = [];

  if (!adapters.length) {
    return {
      primaryAdapterType: "unknown",
      primaryAdapterName: "Unknown",
      speedDescription: null,
      isWifi: false,
      rssQueues: null,
      connectionQuality: "unknown",
      hasMultipleAdapters: false,
      notes: ["No network adapters detected"],
    };
  }

  // Prefer Ethernet over Wi-Fi as primary
  const ethernet = adapters.find((a) => a.type === "ethernet");
  const wifi = adapters.find((a) => a.type === "wifi");
  const primary = ethernet ?? wifi ?? adapters[0];
  const primaryType = primary.type === "ethernet" ? "ethernet" : primary.type === "wifi" ? "wifi" : "unknown";
  const speedMbps = parseSpeedMbps(primary.speed);
  const connectionQuality = rateConnection(primaryType, speedMbps);

  // RSS (Receive Side Scaling) analysis
  const rssQueues = primary.rssQueues;
  if (rssQueues !== null && rssQueues < 4 && profile.cpu.physicalCores >= 4) {
    notes.push(`Network RSS at ${rssQueues} queues — increasing to 4+ may improve throughput on multi-core CPU`);
  }

  // Wi-Fi specific warnings
  if (primaryType === "wifi" && !ethernet) {
    notes.push("Wi-Fi only — Ethernet connection recommended for low-latency workloads");
  }

  // Speed quality notes
  if (primaryType === "ethernet" && speedMbps !== null && speedMbps < 1000) {
    notes.push(`100Mbps Ethernet — gigabit adapter upgrade may improve network throughput`);
  }

  return {
    primaryAdapterType: primaryType,
    primaryAdapterName: primary.name,
    speedDescription: primary.speed,
    isWifi: primaryType === "wifi",
    rssQueues,
    connectionQuality,
    hasMultipleAdapters: adapters.length > 1,
    notes,
  };
}
