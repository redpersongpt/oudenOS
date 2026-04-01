// Gaming Optimizations Module
// Windows Game Mode and gaming-specific OS behavior optimizations.

import type { TuningActionDefinition } from "../types.js";

export const gamingActions: TuningActionDefinition[] = [
  {
    id: "gaming.enable-game-mode",
    name: "Enable Windows Game Mode",
    category: "gaming",
    description: "Enable Windows Game Mode, which adjusts OS resource allocation to favor the active game process — reducing background task interference and improving CPU/GPU scheduling for the foreground application.",
    rationale: "Windows Game Mode activates per-session when a recognized game is in the foreground. It suppresses background Windows Update activity, reduces background application CPU allocation, and signals the GPU scheduler to prioritize the game process. On Windows 11, Game Mode also enables Auto HDR and Variable Refresh Rate negotiation. The HKCU registry key persists the user preference; Game Mode activates automatically when a game is detected.",
    tier: "free",
    risk: "safe",
    compatibility: { minBuild: 15063 },
    dependencies: [],
    conflicts: [],
    estimatedImpact: {
      metric: "background_interference",
      directionBetter: "lower",
      estimatedDelta: "Reduces background CPU contention during active game sessions",
      confidence: "estimated",
    },
    registryChanges: [
      {
        hive: "HKEY_CURRENT_USER",
        path: "Software\\Microsoft\\GameBar",
        valueName: "AutoGameModeEnabled",
        valueType: "REG_DWORD",
        newValue: 1,
      },
      {
        hive: "HKEY_CURRENT_USER",
        path: "Software\\Microsoft\\GameBar",
        valueName: "AllowAutoGameMode",
        valueType: "REG_DWORD",
        newValue: 1,
      },
    ],
    serviceChanges: [],
    powerChanges: [],
    bcdChanges: [],
    requiresReboot: false,
    sideEffects: [
      "Windows Update installations may be deferred while a game is running",
      "Background recording features may be affected when Game DVR is active",
    ],
    tags: ["gaming", "game-mode", "scheduling", "free"],
  },
];
