// ─── Scheduler & MMCSS Tuning Module ─────────────────────────────────────────
// Multimedia Class Scheduler Service profile optimization and process scheduling.
// Sources: redcore MMCSS research notes, Microsoft MMCSS documentation.

import type { TuningActionDefinition } from "../types.js";

export const schedulerActions: TuningActionDefinition[] = [
  {
    id: "scheduler.mmcss-gaming-profile",
    name: "MMCSS Gaming Profile — Maximum Priority",
    category: "scheduler",
    description: "Configure the Multimedia Class Scheduler Service (MMCSS) Games task profile with maximum GPU priority (8), elevated CPU scheduling priority (6), High scheduling category, and a 1 ms clock rate. Removes the network throttle imposed on non-multimedia traffic and dedicates full MMCSS resources to the foreground application.",
    rationale: "MMCSS manages thread priorities for multimedia applications via the Games, Pro Audio, and other task profiles. Setting GPU Priority=8 gives game threads the highest GPU scheduling class recognized by WDDM. Setting Scheduling Category=High and Priority=6 places game threads above most background processes in the CPU scheduler. NetworkThrottlingIndex=0xFFFFFFFF removes Windows' 10-packets-per-interval throttle on network traffic from non-multimedia applications — a significant latency source for online games. SystemResponsiveness=0 tells MMCSS to dedicate 100% of its resource budget to the foreground application instead of the default 20% background reservation. This is the single highest-value registry bundle for consistent frame times and low-latency gameplay.",
    tier: "premium",
    risk: "low",
    compatibility: { minBuild: 7600 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "frame_time_consistency",
      directionBetter: "higher",
      estimatedDelta: "Measurable reduction in frame time variance and network latency for online games",
      confidence: "measured",
    },
    registryChanges: [
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        valueName: "GPU Priority",
        valueType: "REG_DWORD",
        newValue: 8,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        valueName: "Priority",
        valueType: "REG_DWORD",
        newValue: 6,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        valueName: "Scheduling Category",
        valueType: "REG_SZ",
        newValue: "High",
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        valueName: "Clock Rate",
        valueType: "REG_DWORD",
        newValue: 10000,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        valueName: "Affinity",
        valueType: "REG_DWORD",
        newValue: 0,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games",
        valueName: "Background Only",
        valueType: "REG_SZ",
        newValue: "False",
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        valueName: "NetworkThrottlingIndex",
        valueType: "REG_DWORD",
        newValue: 0xffffffff,
      },
      {
        hive: "HKEY_LOCAL_MACHINE",
        path: "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        valueName: "SystemResponsiveness",
        valueType: "REG_DWORD",
        newValue: 0,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Background applications receive less CPU time when a game is running",
      "Network throttling removal increases CPU interrupt rate from NIC for all applications",
    ],
    tags: ["scheduler", "mmcss", "latency", "gaming", "network"],
  },
];
