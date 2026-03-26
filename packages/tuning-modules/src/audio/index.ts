// ─── Audio Tuning Module ────────────────────────────────────────────────────
// Derived from PC-Tuning audio-latency skill.

import type { TuningActionDefinition } from "../types.js";

export const audioActions: TuningActionDefinition[] = [
  {
    id: "audio.disable-enhancements",
    name: "Disable Audio Enhancements",
    category: "audio",
    description: "Disable Windows audio enhancements (spatial audio, equalizer, virtual surround, loudness equalization) to reduce audio processing overhead and DPC latency.",
    rationale: "Audio enhancements add DSP processing stages in the audio pipeline, increasing DPC latency from audio drivers (HDAudBus.sys, portcls.sys). Each enhancement adds processing time per audio buffer, which can cause system-wide DPC latency spikes visible in xperf traces. Disabling all enhancements provides the shortest audio processing path.",
    tier: "free",
    risk: "safe",
    compatibility: { minBuild: 7600 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "audio_dpc_latency",
      directionBetter: "lower",
      estimatedDelta: "Reduces audio driver DPC time by ~50-200 us per buffer",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
        valueName: "{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5",
        valueType: "REG_DWORD",
        newValue: 0,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Spatial audio (Windows Sonic, Dolby Atmos for Headphones) will be disabled",
      "Any configured equalizer or loudness normalization will stop working",
    ],
    tags: ["audio", "latency", "dpc", "gaming"],
  },
  {
    id: "audio.exclusive-mode",
    name: "Configure WASAPI Exclusive Mode Priority",
    category: "audio",
    description: "Ensure WASAPI exclusive mode is enabled for audio endpoints, allowing games and applications to bypass the Windows audio mixer for direct hardware access with lowest latency.",
    rationale: "WASAPI exclusive mode gives an application direct access to the audio hardware, bypassing the Windows Audio Session (shared mode) mixer. This eliminates the resampling and mixing stages that add latency. Most gaming headsets and DACs support exclusive mode. The audio endpoint properties must allow exclusive mode access and give exclusive mode applications priority.",
    tier: "premium",
    risk: "low",
    compatibility: { minBuild: 7600 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "audio_pipeline_latency",
      directionBetter: "lower",
      estimatedDelta: "~3-10ms reduction in end-to-end audio latency",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
        valueName: "{b3f8fa53-0004-438e-9003-51a46e139bfc},3",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render",
        valueName: "{b3f8fa53-0004-438e-9003-51a46e139bfc},4",
        valueType: "REG_DWORD",
        newValue: 1,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "When an application uses exclusive mode, all other applications lose audio output",
      "Discord, Spotify, and other audio sources will be muted while exclusive mode is active",
    ],
    tags: ["audio", "latency", "wasapi", "gaming"],
  },
];
