import rawFallbackData from "@/lib/generated-playbook-fallback.json";
import type { ResolvedPlaybook, PlaybookResolvedAction } from "@/stores/wizard-store";

interface FallbackAction {
  id: string;
  name: string;
  description: string;
  risk: string;
  default: boolean;
  expertOnly: boolean;
  requiresReboot: boolean;
  warningMessage: string | null;
  blockedProfiles: string[];
  minWindowsBuild: number | null;
}

interface FallbackPhase {
  id: string;
  name: string;
  actions: FallbackAction[];
}

interface FallbackProfileRules {
  blockedActions: string[];
  optionalActions: string[];
}

interface FallbackData {
  playbookName: string;
  playbookVersion: string;
  phases: FallbackPhase[];
  profiles: Record<string, FallbackProfileRules>;
}

const FALLBACK_DATA = rawFallbackData as FallbackData;

function matchesBlockedPattern(pattern: string, actionId: string): boolean {
  return pattern.endsWith(".*")
    ? actionId.startsWith(pattern.slice(0, -2))
    : pattern === actionId;
}

function allowsRisk(risk: string, preset: string): boolean {
  if (preset === "conservative") {
    return risk === "safe" || risk === "low";
  }
  if (preset === "balanced") {
    return risk !== "high" && risk !== "extreme";
  }
  return true;
}

function buildActionStatus(
  action: FallbackAction,
  profile: string,
  preset: string,
  rules: FallbackProfileRules,
  windowsBuild: number,
): Pick<PlaybookResolvedAction, "status" | "blockedReason"> {
  const isBlockedByProfile =
    action.blockedProfiles.includes(profile) ||
    rules.blockedActions.some((pattern) => matchesBlockedPattern(pattern, action.id));

  if (isBlockedByProfile) {
    return {
      status: "Blocked",
      blockedReason: `Blocked for ${profile} profile`,
    };
  }

  if (action.minWindowsBuild !== null && windowsBuild < action.minWindowsBuild) {
    return {
      status: "BuildGated",
      blockedReason: `Requires Windows build ${action.minWindowsBuild} or later`,
    };
  }

  if (action.expertOnly) {
    return {
      status: "ExpertOnly",
      blockedReason: "Expert-only action",
    };
  }

  if (rules.optionalActions.includes(action.id) || action.default === false) {
    return {
      status: "Optional",
      blockedReason: null,
    };
  }

  if (!allowsRisk(action.risk, preset)) {
    return {
      status: "Optional",
      blockedReason: null,
    };
  }

  return {
    status: "Included",
    blockedReason: null,
  };
}

export function buildMockResolvedPlaybook(
  profile: string,
  preset: string,
  windowsBuild = 22631,
): ResolvedPlaybook {
  const rules = FALLBACK_DATA.profiles[profile] ?? {
    blockedActions: [],
    optionalActions: [],
  };

  const phases = FALLBACK_DATA.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    actions: phase.actions.map((action) => {
      const status = buildActionStatus(action, profile, preset, rules, windowsBuild);
      return {
        id: action.id,
        name: action.name,
        description: action.description,
        risk: action.risk,
        status: status.status,
        default: action.default,
        expertOnly: action.expertOnly,
        blockedReason: status.blockedReason,
        requiresReboot: action.requiresReboot,
        warningMessage: action.warningMessage,
      } satisfies PlaybookResolvedAction;
    }),
  }));

  const blockedReasons: ResolvedPlaybook["blockedReasons"] = [];
  let totalIncluded = 0;
  let totalBlocked = 0;
  let totalOptional = 0;
  let totalExpertOnly = 0;

  for (const phase of phases) {
    for (const action of phase.actions) {
      if (action.status === "Included") totalIncluded += 1;
      if (action.status === "Optional") totalOptional += 1;
      if (action.status === "ExpertOnly") totalExpertOnly += 1;
      if (action.status === "Blocked" || action.status === "BuildGated") {
        totalBlocked += 1;
        if (action.blockedReason) {
          blockedReasons.push({ actionId: action.id, reason: action.blockedReason });
        }
      }
    }
  }

  return {
    playbookName: FALLBACK_DATA.playbookName,
    playbookVersion: FALLBACK_DATA.playbookVersion,
    profile,
    preset,
    totalIncluded,
    totalBlocked,
    totalOptional,
    totalExpertOnly,
    phases,
    blockedReasons,
  };
}

