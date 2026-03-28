// ─── Thermal Analyzer ────────────────────────────────────────────────────────
// Evaluates CPU/GPU temperatures, throttling state, and thermal risk.

import type { DeviceProfile } from "@redcore/shared-schema/device";
import type { ThermalAnalysis, ThermalRating } from "../types.js";

const CPU_THRESHOLDS = { cool: 60, warm: 75, hot: 90 };   // °C
const GPU_THRESHOLDS = { cool: 65, warm: 80, hot: 90 };   // °C

function rateCpuTemp(tempC: number | null): ThermalRating {
  if (tempC === null) return "unknown";
  if (tempC <= CPU_THRESHOLDS.cool) return "cool";
  if (tempC <= CPU_THRESHOLDS.warm) return "warm";
  if (tempC <= CPU_THRESHOLDS.hot)  return "hot";
  return "critical";
}

function rateGpuTemp(tempC: number | null): ThermalRating {
  if (tempC === null) return "unknown";
  if (tempC <= GPU_THRESHOLDS.cool) return "cool";
  if (tempC <= GPU_THRESHOLDS.warm) return "warm";
  if (tempC <= GPU_THRESHOLDS.hot)  return "hot";
  return "critical";
}

export function analyzeThermal(profile: DeviceProfile): ThermalAnalysis {
  const thermal = profile.thermal;
  const notes: string[] = [];

  const cpuRating = rateCpuTemp(thermal.cpuTempC);
  const gpuRating = rateGpuTemp(thermal.gpuTempC);
  const isThrottling = thermal.cpuThrottling || thermal.gpuThrottling;

  // Determine overall thermal risk
  const hasCritical = cpuRating === "critical" || gpuRating === "critical";
  const hasHot = cpuRating === "hot" || gpuRating === "hot";
  const thermalRisk =
    hasCritical ? "high" :
    isThrottling ? "high" :
    hasHot ? "medium" :
    cpuRating === "warm" || gpuRating === "warm" ? "low" : "none";

  // Generate notes
  if (thermal.cpuThrottling) {
    notes.push(`CPU is thermally throttling at ${thermal.cpuTempC}°C — clean cooler or improve airflow`);
  } else if (cpuRating === "hot") {
    notes.push(`CPU temperature is high (${thermal.cpuTempC}°C) — approaching throttle threshold`);
  } else if (cpuRating === "critical") {
    notes.push(`CPU temperature critical (${thermal.cpuTempC}°C) — immediate action required`);
  }

  if (thermal.gpuThrottling) {
    notes.push(`GPU is thermally throttling at ${thermal.gpuTempC}°C — case airflow review recommended`);
  } else if (gpuRating === "hot") {
    notes.push(`GPU temperature is high (${thermal.gpuTempC}°C) — improve case ventilation`);
  }

  if (thermal.cpuTempC === null && thermal.gpuTempC === null) {
    notes.push("Temperature data unavailable — thermal monitoring sensors may not be accessible");
  }

  if (profile.deviceClass === "laptop" && thermalRisk !== "none") {
    notes.push("Laptop thermal constraints — aggressive CPU/GPU tuning may worsen throttling");
  }

  return {
    cpuTempC: thermal.cpuTempC,
    gpuTempC: thermal.gpuTempC,
    cpuRating,
    gpuRating,
    cpuThrottling: thermal.cpuThrottling,
    gpuThrottling: thermal.gpuThrottling,
    isThrottling,
    fanRpm: thermal.fanRpm,
    thermalRisk,
    notes,
  };
}
