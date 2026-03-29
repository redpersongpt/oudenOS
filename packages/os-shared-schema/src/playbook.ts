// ─── Playbook Resolution Types ───────────────────────────────────────────────
// The playbook-native transformation flow: resolve a profile + preset into
// a structured plan with phases and per-action metadata.

import type { MachineProfile } from "./profiles.js";

export type TransformPreset = "conservative" | "balanced" | "aggressive" | "custom";

// ─── Resolved playbook ───────────────────────────────────────────────────────

export interface ResolvedPlaybook {
  playbookName: string;
  playbookVersion: string;
  profile: MachineProfile;
  preset: TransformPreset;
  totalIncluded: number;
  totalBlocked: number;
  totalOptional: number;
  totalExpertOnly: number;
  phases: PlaybookPhase[];
  blockedReasons: PlaybookBlockReason[];
  rebootRequired: boolean;
  estimatedMinutes: number;
}

export interface PlaybookBlockReason {
  actionId: string;
  reason: string;
}

export interface PlaybookPhase {
  id: string;
  name: string;
  order: number;
  actions: PlaybookResolvedAction[];
}

export type PlaybookActionStatus = "Included" | "Optional" | "ExpertOnly" | "Blocked" | "BuildGated";

export interface PlaybookResolvedAction {
  id: string;
  name: string;
  description: string;
  risk: string;                     // TransformRisk as string for simplicity over IPC
  status: PlaybookActionStatus;
  default: boolean;
  expertOnly: boolean;
  blockedReason: string | null;
  requiresReboot: boolean;
  warningMessage: string | null;
  estimatedSeconds: number;
  tags: string[];
}

// ─── App bundle ──────────────────────────────────────────────────────────────

export interface RecommendedApp {
  id: string;
  name: string;
  category: string;
  description: string;
  recommended: boolean;
  selected: boolean;
  workSafe: boolean;
  url?: string;
  silentArgs?: string | null;
}

export interface RecommendedAppsResult {
  profile: string;
  bundle: {
    label: string;
    description: string;
  } | null;
  apps: RecommendedApp[];
  availableProfiles: string[];
}

export interface AppBundleResolveResult {
  profile: string;
  installQueue: RecommendedApp[];
  skipped: string[];
  totalQueued: number;
}
