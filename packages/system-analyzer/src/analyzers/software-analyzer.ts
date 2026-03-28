// ─── Software Analyzer ───────────────────────────────────────────────────────
// Analyzes Windows version, services, startup items, and config state.

import type { DeviceProfile } from "@redcore/shared-schema/device";
import type { SoftwareAnalysis, WindowsAnalysis } from "../types.js";

const SUPPORTED_WIN11_BUILDS = 22000; // 22H2 baseline
const SUPPORTED_WIN10_BUILDS = 19045; // 22H2

function analyzeWindows(profile: DeviceProfile): WindowsAnalysis {
  const win = profile.windows;
  const isWindows11 = win.version === "11" || win.build >= 22000;
  const minBuild = isWindows11 ? SUPPORTED_WIN11_BUILDS : SUPPORTED_WIN10_BUILDS;

  return {
    version: win.version,
    build: win.build,
    edition: win.edition,
    displayVersion: win.displayVersion,
    isWindows11,
    isSupportedBuild: win.build >= minBuild,
    isLTSC: win.edition.toLowerCase().includes("ltsc"),
    hyperVEnabled: win.features["Hyper-V"] ?? false,
    wslEnabled: win.features["WSL"] ?? false,
  };
}

export function analyzeSoftware(profile: DeviceProfile): SoftwareAnalysis {
  const windows = analyzeWindows(profile);
  const notes: string[] = [];

  // Service count from serviceStates map
  const serviceCount = profile.serviceStates
    ? Object.keys(profile.serviceStates).length
    : null;

  if (serviceCount !== null && serviceCount > 200) {
    notes.push(`High service count (${serviceCount}) — service audit may free resources`);
  }

  // Core parking from cpuPower scan
  const coreParkingEnabled = profile.cpuPower?.coreParkingEnabled ?? null;
  if (coreParkingEnabled === true) {
    notes.push("CPU core parking is enabled — may cause latency spikes under load");
  }

  // Timer resolution
  const timerResMs = profile.scheduler?.timerResolutionMs ?? null;
  if (timerResMs !== null && timerResMs > 1) {
    notes.push(`System timer at ${timerResMs}ms — lower resolution reduces scheduling precision`);
  }

  // Win32PrioritySeparation
  const w32Priority = profile.scheduler?.win32PrioritySeparation ?? null;
  if (w32Priority !== null && w32Priority === 2) {
    notes.push("Win32PrioritySeparation=2 (default) — gaming systems benefit from value 38 or 26");
  }

  // Power plan
  const powerPlan = profile.power.activePlan;
  if (powerPlan.toLowerCase().includes("power saver")) {
    notes.push("Power Saver plan detected — switch to High Performance or Balanced for better performance");
  }

  if (!windows.isSupportedBuild) {
    notes.push(`Windows build ${windows.build} is below current supported baseline — update recommended`);
  }

  if (windows.hyperVEnabled) {
    notes.push("Hyper-V is enabled — this adds CPU overhead and may affect real-time workloads");
  }

  return {
    windows,
    runningServicesCount: serviceCount,
    startupItemsCount: null, // Requires separate scan not in DeviceProfile
    hasHyperV: windows.hyperVEnabled,
    hasDomainJoin: false, // Would need separate AD query
    powerPlan,
    coreParkingEnabled,
    timerResolutionMs: timerResMs,
    win32PrioritySeparation: w32Priority,
    notes,
  };
}
