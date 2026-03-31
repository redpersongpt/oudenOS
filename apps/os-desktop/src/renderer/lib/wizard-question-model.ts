import type {
  AggressionPreset,
  EdgeBehavior,
  QuestionnaireAnswers,
  TelemetryLevel,
} from "@/stores/decisions-store";
import type {
  ActionDecisionProvenance,
  ActionDecisionSource,
  PersonalizationPreferences,
  PlaybookResolvedAction,
  QuestionnaireDecisionEffect,
  QuestionnaireDecisionSummary,
  ResolvedPlaybook,
  WizardPackageRefs,
} from "@/stores/wizard-store";

export type QuestionValue = string | boolean;

export type StrategyIconName =
  | "Shield"
  | "Battery"
  | "Cpu"
  | "Clock"
  | "HardDrive"
  | "Search"
  | "Wrench"
  | "Globe"
  | "Sparkles"
  | "Eye"
  | "Zap"
  | "MonitorSpeaker"
  | "Gamepad2";

export interface StrategyQuestionOption {
  value: QuestionValue;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
  behavior?: StrategyOptionBehavior;
}

export type StrategyRiskLevel = "safe" | "mixed" | "aggressive" | "expert";

export interface StrategyOptionBehavior {
  value: QuestionValue;
  includeActions?: string[];
  blockActions?: string[];
  blockReason?: string;
  warnings?: string[];
  requiresReboot?: boolean;
  estimatedActions?: number;
  estimatedBlocked?: number;
  estimatedPreserved?: number;
  riskLevel?: StrategyRiskLevel;
  personalization?: Partial<PersonalizationPreferences>;
  restoreDefaults?: Array<keyof PersonalizationPreferences>;
}

export interface StrategyQuestionBehaviorDefinition {
  options: StrategyOptionBehavior[];
}

export interface PlaybookImpactSummary {
  estimatedActions: number;
  estimatedBlocked: number;
  estimatedPreserved: number;
  rebootRequired: boolean;
  riskLevel: StrategyRiskLevel;
  warnings: string[];
}

export interface StrategyQuestionVisibility {
  minPreset?: AggressionPreset;
  onlyPreset?: AggressionPreset;
  minWindowsBuild?: number;
  excludeLaptop?: boolean;
  excludeWorkPc?: boolean;
}

export interface StrategyQuestionDefinition {
  key: keyof QuestionnaireAnswers;
  icon: StrategyIconName;
  label: string;
  title: string;
  desc: string;
  note?: string;
  options: StrategyQuestionOption[];
  visibility?: StrategyQuestionVisibility;
}

export interface StrategyQuestionContext {
  isLaptop: boolean;
  isWorkPc: boolean;
  windowsBuild: number;
}

export interface WizardQuestionBundleMetadata {
  packageId: string;
  title: string;
  shortDescription: string;
  description: string;
  details: string;
  version: string;
  uniqueId: string;
  upgradableFrom: string;
  supportedBuilds: number[];
  requirements: string[];
  useKernelDriver: boolean;
  productCode: number;
  git: string;
  website: string;
  donateLink: string;
  supportsISO: boolean;
  iso: {
    disableBitLocker: boolean;
    disableHardwareRequirements: boolean;
    injectPath: string;
  };
  oobe: {
    internet: "Required" | "Request" | "Skip";
    bulletPoints: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
}

function makeBooleanQuestion(
  key: keyof QuestionnaireAnswers,
  icon: StrategyIconName,
  label: string,
  title: string,
  desc: string,
  yesTitle: string,
  yesDesc: string,
  noTitle: string,
  noDesc: string,
  config: {
    note?: string;
    visibility?: StrategyQuestionVisibility;
    yesBadge?: string;
    yesBadgeColor?: string;
    yesDanger?: boolean;
  } = {},
): StrategyQuestionDefinition {
  return {
    key,
    icon,
    label,
    title,
    desc,
    note: config.note,
    visibility: config.visibility,
    options: [
      {
        value: true,
        title: yesTitle,
        desc: yesDesc,
        badge: config.yesBadge,
        badgeColor: config.yesBadgeColor,
        danger: config.yesDanger,
      },
      { value: false, title: noTitle, desc: noDesc },
    ],
  };
}

const PRESET_ORDER: AggressionPreset[] = ["conservative", "balanced", "aggressive", "expert"];

export function isQuestionVisible(
  question: StrategyQuestionDefinition,
  answers: QuestionnaireAnswers,
  context: StrategyQuestionContext,
): boolean {
  const visibility = question.visibility;
  if (!visibility) return true;

  const preset = answers.aggressionPreset ?? "balanced";

  if (visibility.onlyPreset && preset !== visibility.onlyPreset) return false;
  if (visibility.minPreset) {
    const currentRank = PRESET_ORDER.indexOf(preset);
    const requiredRank = PRESET_ORDER.indexOf(visibility.minPreset);
    if (currentRank < requiredRank) return false;
  }
  if (visibility.minWindowsBuild && context.windowsBuild < visibility.minWindowsBuild) return false;
  if (visibility.excludeLaptop && context.isLaptop) return false;
  if (visibility.excludeWorkPc && context.isWorkPc) return false;

  return true;
}

export function getActiveStrategyQuestions(
  answers: QuestionnaireAnswers,
  context: StrategyQuestionContext,
): StrategyQuestionDefinition[] {
  return strategyQuestions.filter((question) => isQuestionVisible(question, answers, context));
}

export const wizardBundleMetadata: WizardQuestionBundleMetadata = {
  packageId: "redcore-os",
  title: "redcore OS Playbook",
  shortDescription: "Windows optimization playbook for redcore OS",
  description:
    "A review-first Windows optimization playbook that stages cleanup, privacy hardening, and performance tuning through a guided wizard.",
  details:
    "redcore OS scans the current install, resolves a profile-aware plan, and packages the same decisions for wizard and ISO flows.",
  version: "1.0",
  uniqueId: "2cb0ed8d-2d5b-4e74-9c0d-df83cc3ab4d4",
  upgradableFrom: "any",
  supportedBuilds: [19045, 22631, 26100],
  requirements: ["NoPendingUpdates", "Internet", "PluggedIn"],
  useKernelDriver: false,
  productCode: 410,
  git: "https://github.com/redpersongpt/redcore-OS",
  website: "https://redcoreos.net",
  donateLink: "https://redcoreos.net",
  supportsISO: true,
  iso: {
    disableBitLocker: true,
    disableHardwareRequirements: true,
    injectPath: "sources/$OEM$/$1/redcore/wizard",
  },
  oobe: {
    internet: "Request",
    bulletPoints: [
      {
        icon: "Rocket",
        title: "Lower Latency",
        description:
          "Stages the same timer, power, and scheduler optimizations exposed by the desktop wizard.",
      },
      {
        icon: "Privacy",
        title: "Telemetry Control",
        description:
          "Removes the worst consumer tracking defaults without pretending every enterprise feature can disappear.",
      },
      {
        icon: "Lock",
        title: "Rollback Ready",
        description:
          "Keeps rollback metadata so the plan can be audited and reversed instead of acting like a blind tweak pack.",
      },
    ],
  },
};

export const strategyQuestions: StrategyQuestionDefinition[] = [
  {
    key: "aggressionPreset",
    icon: "Shield",
    label: "Transformation Depth",
    title: "How hard should redcore OS push this machine?",
    desc: "This is the mainline preset. It decides how much of the playbook is eligible before your per-question answers start forcing things in or out.",
    note: "Conservative is for caution. Balanced is for most tuned personal machines. Aggressive and Expert expose deeper latency/security tradeoffs.",
    options: [
      {
        value: "conservative" satisfies AggressionPreset,
        title: "Conservative",
        desc: "Focus on cleanup, basic privacy reduction, and low-risk ergonomics. Leaves the deeper scheduler, power, and protocol questions out.",
        badge: "Safest",
        badgeColor: "bg-emerald-500/15 text-emerald-400",
      },
      {
        value: "balanced" satisfies AggressionPreset,
        title: "Balanced",
        desc: "The serious default. Enables meaningful performance and privacy questions without drifting into enthusiast-only territory.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "aggressive" satisfies AggressionPreset,
        title: "Aggressive",
        desc: "Unlocks deeper latency, networking, and power-management questions meant for tuned personal rigs.",
      },
      {
        value: "expert" satisfies AggressionPreset,
        title: "Expert",
        desc: "Unlocks mitigation and HVCI questions along with the highest-risk browser/network/security tradeoffs.",
        badge: "Advanced",
        badgeColor: "bg-purple-500/15 text-purple-400",
      },
    ],
  },
  makeBooleanQuestion(
    "highPerformancePlan",
    "Battery",
    "Power Plan",
    "Activate the Windows High Performance power plan?",
    "This forces Windows away from the default power-saving bias so the CPU stops dipping as aggressively between bursts.",
    "Yes — use High Performance",
    "Better responsiveness and less ramp-up delay under game and desktop load.",
    "No — keep Windows power defaults",
    "Safer for mixed-use or battery-conscious machines.",
    {
      note: "This is the most defensible baseline tweak from both enthusiast guides and real-world tuning work.",
      yesBadge: "Core",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "optimizeThreadPriority",
    "Cpu",
    "CPU Scheduler",
    "Apply foreground-biased thread priority tuning?",
    "This maps to Win32PrioritySeparation. It pushes the active foreground workload ahead of background noise.",
    "Yes — bias CPU time toward the active app",
    "Useful for games and latency-sensitive foreground work.",
    "No — keep Windows scheduler defaults",
    "Better if you prefer untouched desktop multitasking behavior.",
    {
      note: "redcore OS only asks this question at the level it can actually apply today.",
      visibility: { minPreset: "balanced" },
      yesBadge: "Scheduler",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "globalTimerResolution",
    "Clock",
    "Timer Behavior",
    "Restore global timer-resolution requests on supported Windows builds?",
    "This is the real Windows 11 timer question redcore OS can honestly apply: whether the system should honor global timer-resolution behavior again.",
    "Yes — restore global timer behavior",
    "Lets one process' timer request benefit the whole system again.",
    "No — keep modern per-process timer behavior",
    "More power-efficient and closer to stock Windows scheduling.",
    {
      note: "This is not a fake fixed 0.5 ms timer lock. It applies the real GlobalTimerResolutionRequests path in the playbook.",
      visibility: { minPreset: "balanced" },
      yesBadge: "Latency",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "disableIndexing",
    "HardDrive",
    "Search Indexing",
    "Disable Windows Search indexing?",
    "Indexing keeps background I/O and CPU pressure around so Start and Explorer search stay fast. Turning it off trades convenience for quietness.",
    "Yes — disable indexing",
    "Reduces background disk churn and CPU spikes from the indexer.",
    "No — keep indexing enabled",
    "Better if you actively use Start or file search.",
    {
      note: "This is the measurable part of the old “search removal” culture that actually exists in the playbook.",
      yesBadge: "Search",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "stripSearchWebNoise",
    "Search",
    "Search Web Noise",
    "Strip web results, search highlights, history, and the oversized taskbar search box?",
    "This cuts the Microsoft content layer around Search without pretending to fully remove SearchHost.",
    "Yes — shrink Search to a local-only utility",
    "Cleaner Start/Search surface with less suggestion spam and history noise.",
    "No — keep Windows Search extras",
    "Best if you like built-in web suggestions or richer search panels.",
    {
      note: "This is intentionally more honest than claiming complete search removal when the actual playbook applies targeted shell/search actions.",
    },
  ),
  makeBooleanQuestion(
    "keepPrinterSupport",
    "Wrench",
    "Printing",
    "Does this machine still need printer support?",
    "If yes, redcore OS will preserve the Print Spooler. If no, it will cut it.",
    "Yes — preserve printer support",
    "Keeps the Print Spooler and avoids surprise printer breakage.",
    "No — safe to disable printing services",
    "Good for stripped gaming machines with no local or network printers.",
    {
      note: "This question is preservation-driven: the answer directly decides whether the spooler disable action is blocked or applied.",
    },
  ),
  makeBooleanQuestion(
    "keepRemoteAccess",
    "Globe",
    "Remote Access",
    "Does this machine still need RDP, remote assistance, or support tools?",
    "If yes, redcore OS preserves remote-access related services. If no, it trims that attack surface.",
    "Yes — preserve remote access capability",
    "Safer for workstations, remote support, or self-hosted remote access workflows.",
    "No — disable remote access services",
    "Good for personal machines that should never accept inbound remote control.",
    {
      note: "This is the kind of preservation decision that should be explicit before apply, not discovered after something breaks.",
    },
  ),
  {
    key: "edgeBehavior",
    icon: "Globe",
    label: "Browser Surface",
    title: "How hard should Edge background behavior be suppressed?",
    desc: "This question stays on the honest side: preload, nags, and updates are separable; full browser removal is asked separately.",
    note: "Suppressing Edge is usually the sweet spot. Removing Edge is a different risk class and comes later.",
    options: [
      {
        value: "keep" satisfies EdgeBehavior,
        title: "Keep Edge unchanged",
        desc: "No preload, nag, or update suppression.",
      },
      {
        value: "suppress" satisfies EdgeBehavior,
        title: "Suppress background preload and default-browser nags",
        desc: "Cuts startup boost and self-promotion without freezing browser updates.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "suppress-and-freeze" satisfies EdgeBehavior,
        title: "Suppress Edge and also freeze auto-updates",
        desc: "Adds update suppression on top of preload/nag cleanup. Highest maintenance burden short of full removal.",
      },
    ],
  },
  makeBooleanQuestion(
    "disableCopilot",
    "Sparkles",
    "AI Surface",
    "Disable Windows Copilot?",
    "This removes the Copilot taskbar surface and its associated shell noise.",
    "Yes — remove Copilot from the shell",
    "Cleaner taskbar and less AI-first push from Windows.",
    "No — keep Copilot available",
    "Leave the Copilot surface intact.",
  ),
  makeBooleanQuestion(
    "disableRecall",
    "Eye",
    "Recall",
    "Disable Windows Recall?",
    "Recall is one of the easiest “yes” questions in the whole flow unless you explicitly want AI timeline snapshots.",
    "Yes — disable Recall",
    "Cuts screenshot-history style AI capture behavior entirely.",
    "No — keep Recall available",
    "Only sensible if you actually intend to use it.",
    {
      note: "Only shown on supported Windows builds where Recall actually exists.",
      visibility: { minWindowsBuild: 26100 },
    },
  ),
  makeBooleanQuestion(
    "disableClickToDo",
    "Eye",
    "Click To Do",
    "Disable Click to Do?",
    "This trims another Windows 11 AI shell surface that most tuned machines do not need.",
    "Yes — disable it",
    "Less shell clutter and fewer AI-driven hooks.",
    "No — keep it available",
    "Leave the new interaction surface intact.",
    {
      note: "Only shown on supported Windows builds where Click to Do is present.",
      visibility: { minWindowsBuild: 26100 },
    },
  ),
  makeBooleanQuestion(
    "disableAiApps",
    "Sparkles",
    "AI In Apps",
    "Disable AI features in Edge, Paint, and Notepad?",
    "This cuts the bundled AI surfaces in Microsoft apps rather than only the headline shell features.",
    "Yes — disable app-level AI features",
    "Removes AI extras from the apps most people never asked to become assistants.",
    "No — keep those AI features",
    "Leave the AI tooling in those apps available.",
  ),
  {
    key: "telemetryLevel",
    icon: "Shield",
    label: "Telemetry Depth",
    title: "How far should Microsoft telemetry reduction go?",
    desc: "This controls the real telemetry actions in the playbook rather than vague “privacy mode” marketing.",
    note: "Aggressive adds SIUF/feedback suppression on top of the standard telemetry, CEIP, and error-reporting cuts.",
    options: [
      {
        value: "keep" satisfies TelemetryLevel,
        title: "Keep Windows telemetry behavior",
        desc: "Do not apply telemetry-specific privacy cuts here.",
      },
      {
        value: "reduce" satisfies TelemetryLevel,
        title: "Reduce telemetry",
        desc: "Disable telemetry, CEIP, and error reporting without going all the way into the aggressive feedback cuts.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "aggressive" satisfies TelemetryLevel,
        title: "Aggressive telemetry reduction",
        desc: "Adds deeper feedback suppression for users who want Microsoft’s soft collection surfaces cut harder.",
      },
    ],
  },
  makeBooleanQuestion(
    "disableClipboardHistory",
    "Eye",
    "Clipboard History",
    "Disable clipboard history and cross-device clipboard sync?",
    "Useful if you want the clipboard to behave like a simple local buffer again.",
    "Yes — disable clipboard history/sync",
    "Cuts cloud-linked clipboard behavior and local history retention.",
    "No — keep clipboard history",
    "Leave clipboard convenience features enabled.",
  ),
  makeBooleanQuestion(
    "disableActivityFeed",
    "Eye",
    "Activity Feed",
    "Disable activity feed and cloud-content style tracking?",
    "This trims the timeline-style “what you were doing” surfaces and associated cloud content behavior.",
    "Yes — disable it",
    "Less behavior tracking and less cloud-fed content inside Windows.",
    "No — keep that behavior",
    "Leave Windows activity and cloud-content behavior intact.",
  ),
  makeBooleanQuestion(
    "disableLocation",
    "Globe",
    "Location",
    "Disable location services and Find My Device?",
    "A good privacy answer for desktops. A more situational one for laptops that actually use location-based workflows.",
    "Yes — disable location-linked features",
    "Reduces location tracking and disables Find My Device dependence.",
    "No — keep location available",
    "Better if you use maps, recovery, or location-aware apps.",
  ),
  makeBooleanQuestion(
    "disableTailoredExperiences",
    "Eye",
    "Personalization Tracking",
    "Disable tailored experiences, online tips, and app-launch tracking?",
    "This removes the “Windows learns from you” layer instead of only the obvious ad toggles.",
    "Yes — cut that personalization layer",
    "Less suggestion spam and less behavior-based tuning from Windows.",
    "No — keep it",
    "Leave Windows’ softer personalization layer intact.",
  ),
  makeBooleanQuestion(
    "disableSpeechPersonalization",
    "Sparkles",
    "Speech & Input",
    "Disable online speech and input-personalization telemetry?",
    "This cuts cloud speech/input collection behavior that most stripped systems do not need.",
    "Yes — disable it",
    "Reduces speech/input data collection and personalization layers.",
    "No — keep it",
    "Better if you rely on cloud speech features or dictation behavior.",
  ),
  makeBooleanQuestion(
    "disableSmartScreen",
    "Shield",
    "SmartScreen",
    "Disable SmartScreen reputation checks?",
    "This is a real tradeoff question. It reduces Windows friction, but it also removes one of the last browser/download guardrails people forget they were relying on.",
    "Yes — disable SmartScreen",
    "For stripped personal rigs where you intentionally manage trust yourself.",
    "No — keep SmartScreen",
    "Safer for mixed-use, browsing, and non-lab machines.",
    {
      note: "Unlike marketing privacy toggles, this one can genuinely increase risk if the machine is used casually.",
      visibility: { minPreset: "aggressive" },
      yesBadge: "Risky",
      yesBadgeColor: "bg-amber-500/15 text-amber-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableFastStartup",
    "Zap",
    "Fast Startup",
    "Disable Windows Fast Startup?",
    "Fast Startup often leaves stale driver/kernel state around. Tuned systems usually benefit from clean boots.",
    "Yes — disable Fast Startup",
    "Cleaner shutdown/boot behavior and fewer weird resume-state driver bugs.",
    "No — keep Fast Startup",
    "Faster boots, but more hybrid-shutdown baggage.",
  ),
  makeBooleanQuestion(
    "disableHibernation",
    "Zap",
    "Hibernation",
    "Disable hibernation?",
    "For most tuned desktops this is a yes. For laptops it depends on whether you actually use hibernate.",
    "Yes — disable hibernation",
    "Frees disk space and keeps boot behavior cleaner.",
    "No — keep hibernation",
    "Leave hibernate available as a power feature.",
  ),
  makeBooleanQuestion(
    "disableAudioEnhancements",
    "MonitorSpeaker",
    "Audio Enhancements",
    "Disable Windows audio enhancements?",
    "DSP and enhancement layers are often needless overhead unless you intentionally rely on them.",
    "Yes — turn enhancements off",
    "Cleaner, more predictable audio path with less vendor/DSP interference.",
    "No — keep enhancements",
    "Better if you rely on loudness EQ, virtual surround, or motherboard DSP effects.",
  ),
  makeBooleanQuestion(
    "enableAudioExclusiveMode",
    "MonitorSpeaker",
    "Exclusive Mode",
    "Enable exclusive-mode audio control?",
    "This helps users who want a cleaner low-latency audio path and are okay with apps taking exclusive control of the device.",
    "Yes — enable exclusive mode",
    "Better for low-latency or focused audio paths when the app supports it.",
    "No — keep the current shared-mode behavior",
    "Safer if you constantly juggle multiple apps using the same device.",
  ),
  makeBooleanQuestion(
    "restoreClassicContextMenu",
    "Wrench",
    "Context Menu",
    "Restore the classic full Windows 11 context menu?",
    "A pure usability question, but one with a real apply-side effect.",
    "Yes — restore the classic menu",
    "Gets rid of the compact extra-click Windows 11 context menu.",
    "No — keep the stock menu",
    "Leave the modern compact menu in place.",
  ),
  makeBooleanQuestion(
    "enableEndTask",
    "Wrench",
    "Taskbar End Task",
    "Add End Task to taskbar right-click menus?",
    "This is the exact Windows 11 usability tweak you asked for: kill hung apps straight from taskbar right-click without opening Task Manager.",
    "Yes — add End Task",
    "Cleaner emergency-kill path for frozen apps.",
    "No — keep default taskbar right-click behavior",
    "Leave the standard Windows 11 menu intact.",
    {
      note: "Only shown on Windows builds that expose the taskbar End Task toggle.",
      visibility: { minWindowsBuild: 22631 },
    },
  ),
  makeBooleanQuestion(
    "disableBackgroundApps",
    "HardDrive",
    "Background Apps",
    "Disable background app execution?",
    "This is a real resource-control question. It matters more than a lot of flashy “FPS tweaks.”",
    "Yes — stop background app execution",
    "Cuts silent background UWP/app activity.",
    "No — keep background apps allowed",
    "Better if you rely on synced app behavior or background refresh.",
  ),
  makeBooleanQuestion(
    "disableAutomaticMaintenance",
    "HardDrive",
    "Automatic Maintenance",
    "Disable Windows automatic maintenance?",
    "This trades background housekeeping for a quieter machine. Good for dedicated tuned PCs; less good for people who want Windows to self-maintain.",
    "Yes — disable it",
    "Fewer surprise background maintenance runs while idle.",
    "No — keep it",
    "Safer if you want Windows doing its normal housekeeping.",
  ),
  makeBooleanQuestion(
    "enableGameMode",
    "Gamepad2",
    "Game Mode",
    "Force Game Mode on?",
    "This is the lightweight Windows-native gaming toggle, not a magical optimization. But if you game, it still belongs in the questionnaire.",
    "Yes — enable Game Mode",
    "Lets Windows bias scheduling a bit more around games.",
    "No — keep current Game Mode behavior",
    "Leave Windows to its current default behavior.",
  ),
  makeBooleanQuestion(
    "disableTransparency",
    "Eye",
    "Transparency",
    "Disable transparency effects?",
    "Small tweak, but real. Cuts acrylic/blur visual noise and a bit of compositor overhead.",
    "Yes — disable transparency",
    "Cleaner, flatter shell with fewer translucent effects.",
    "No — keep transparency",
    "Leave the Windows visual style intact.",
  ),
  makeBooleanQuestion(
    "aggressiveBoostMode",
    "Cpu",
    "Boost Policy",
    "Use aggressive processor boost mode?",
    "This keeps the CPU pushing harder under load instead of backing off into friendlier boost policy behavior.",
    "Yes — use aggressive boost",
    "Higher performance bias and quicker sustained turbo behavior.",
    "No — keep stock boost policy",
    "Safer thermally and calmer for mixed-use machines.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "minProcessorState100",
    "Cpu",
    "Minimum CPU State",
    "Lock minimum processor state to 100%?",
    "This is the “don’t dip clocks between bursts” question. It is one of the cleaner CPU responsiveness levers in the current playbook.",
    "Yes — keep the floor at 100%",
    "Reduces clock-drop latency between bursts.",
    "No — allow Windows to downscale more freely",
    "Better for thermals and general-purpose efficiency.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableCoreParking",
    "Cpu",
    "Core Parking",
    "Disable CPU core parking?",
    "Classic enthusiast latency question. Useful on many desktop gaming systems, less sensible on weaker or office-centric machines.",
    "Yes — unpark cores",
    "Reduces wake-up latency when Windows suddenly needs more threads.",
    "No — keep core parking behavior",
    "Better for efficiency-biased or cooler-running setups.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "gamingMmcss",
    "Gamepad2",
    "MMCSS",
    "Apply the tuned MMCSS gaming profile?",
    "This hardens the scheduler profile used for Games under Windows’ multimedia scheduling system.",
    "Yes — apply the tuned gaming profile",
    "Useful for keeping game/media threads favored over background noise.",
    "No — keep MMCSS defaults",
    "Leave multimedia scheduling closer to stock.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableMemoryCompression",
    "Cpu",
    "Memory Compression",
    "Disable Windows memory compression?",
    "A sensible question on machines with enough RAM. On RAM-starved systems, the answer can be different.",
    "Yes — disable memory compression",
    "Less CPU spent compressing memory pages; best on healthy-RAM systems.",
    "No — keep memory compression",
    "Safer if you want Windows to defend capacity under pressure.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableHags",
    "Gamepad2",
    "GPU Scheduling",
    "Disable Hardware-Accelerated GPU Scheduling (HAGS)?",
    "HAGS is system-specific. The point here is not blind faith, it is making the choice explicit.",
    "Yes — disable HAGS",
    "Often chosen for steadier behavior on tuned systems.",
    "No — keep HAGS at the Windows default",
    "Leave GPU scheduling behavior untouched.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableGpuTelemetry",
    "Gamepad2",
    "GPU Telemetry",
    "Disable AMD/NVIDIA telemetry services?",
    "Cleans out the always-on driver analytics layer without pretending the GPU driver itself is the problem.",
    "Yes — disable GPU telemetry",
    "Less background service noise from vendor driver stacks.",
    "No — keep GPU telemetry services",
    "Leave vendor analytics services in place.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableGameDvr",
    "Gamepad2",
    "Game DVR",
    "Disable Game DVR recording overhead?",
    "This is still one of the most sensible gaming questions to ask because the action is real and the downside is clear.",
    "Yes — disable Game DVR",
    "Less background recording overhead and less frame-time noise.",
    "No — keep Game DVR behavior",
    "Keep built-in capture behavior intact.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableFullscreenOptimizations",
    "Gamepad2",
    "Fullscreen Optimizations",
    "Disable Windows fullscreen optimizations?",
    "Useful for users chasing predictable fullscreen behavior and lower input-path weirdness.",
    "Yes — disable them",
    "Closer to classic exclusive-fullscreen behavior in many cases.",
    "No — keep them enabled",
    "Leave the Windows fullscreen layer intact.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableDynamicTick",
    "Clock",
    "Dynamic Tick",
    "Disable dynamic tick for lower timer jitter?",
    "This is a proper enthusiast question pulled from the real playbook, not a marketing placeholder.",
    "Yes — disable dynamic tick",
    "Potentially tighter timing consistency on tuned desktops.",
    "No — keep dynamic tick",
    "Leave Windows’ idle-saving timer behavior intact.",
    {
      note: "Best reserved for aggressive or expert profiles because it is not a universal improvement on every system.",
      visibility: { minPreset: "aggressive", excludeLaptop: true },
      yesBadge: "Advanced",
      yesBadgeColor: "bg-amber-500/15 text-amber-400",
    },
  ),
  makeBooleanQuestion(
    "removeEdge",
    "Globe",
    "Edge Removal",
    "Remove the Edge browser completely?",
    "This is where the tone changes from cleanup to irreversible system surgery.",
    "Yes — remove Edge",
    "Only for people who already know exactly why they want it gone and already have another browser installed.",
    "No — keep the browser installed",
    "Stick with suppression only.",
    {
      note: "Removing Edge is not the same thing as cleaning it up. This is one of the few questions that deserves real fear.",
      visibility: { minPreset: "aggressive" },
      yesBadge: "Danger",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "preserveWebView2",
    "Globe",
    "WebView2",
    "Preserve WebView2 for app compatibility?",
    "This question exists because too many debloat tools pretend WebView2 is “just Edge” and then people wonder why app surfaces start breaking.",
    "Yes — preserve WebView2",
    "Recommended unless you know your full app stack and are intentionally stripping embedded browser runtimes.",
    "No — allow WebView2 removal",
    "Only for stripped personal systems where you explicitly accept the blast radius.",
    {
      visibility: { minPreset: "aggressive" },
      yesBadge: "Recommended",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "reduceMitigations",
    "Shield",
    "Spectre / Mitigations",
    "Reduce speculative-execution mitigations for a potential (%5-%10) performance increase?",
    "This is the exact kind of question that makes or breaks credibility: the performance folklore is real enough to ask about, but the security cost is real too. In our current playbook this maps to the SSBD-side mitigation reduction path.",
    "Yes — reduce those mitigations",
    "For dedicated personal rigs where you knowingly trade security for a possible latency/syscall win.",
    "No — keep mitigations intact",
    "Safer default, especially on anything used for browsing, work, or sensitive data.",
    {
      note: "This should be benchmark-first, not dogma-first. redcore OS asks it explicitly and only applies the real mitigation action it actually has.",
      visibility: { onlyPreset: "expert", excludeWorkPc: true },
      yesBadge: "High Risk",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableHvci",
    "Shield",
    "HVCI",
    "Disable Hypervisor-enforced Code Integrity (HVCI)?",
    "Another expert-only security/performance tradeoff. This is not a casual checkbox.",
    "Yes — disable HVCI",
    "Useful only if you understand the kernel-security tradeoff and do not rely on that baseline.",
    "No — keep HVCI enabled",
    "Safer and friendlier for security baselines or anti-cheat requirements.",
    {
      note: "Vanguard and some hardened environments may care about this. That is exactly why the question exists.",
      visibility: { onlyPreset: "expert", excludeWorkPc: true },
      yesBadge: "High Risk",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableLlmnr",
    "Globe",
    "LLMNR",
    "Disable Link-Local Multicast Name Resolution (LLMNR)?",
    "A sensible hardening/cleanup protocol question that many tuned systems can say yes to.",
    "Yes — disable LLMNR",
    "Reduces a noisy legacy name-resolution surface.",
    "No — keep LLMNR",
    "Leave local multicast name resolution behavior alone.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableIpv6",
    "Globe",
    "IPv6",
    "Disable IPv6?",
    "Classic tweak, often overused. redcore OS asks it directly instead of hiding it behind a vague “network tweak” checkbox.",
    "Yes — disable IPv6",
    "Only if you know your environment does not need it.",
    "No — keep IPv6 enabled",
    "Recommended for most normal networks unless you have a reason not to.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableTeredo",
    "Globe",
    "Teredo",
    "Disable Teredo tunneling?",
    "Useful if you want legacy Microsoft tunneling layers out of the way.",
    "Yes — disable Teredo",
    "Less tunneling cruft in the networking stack.",
    "No — keep Teredo",
    "Leave it untouched if you are not sure.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableNetbios",
    "Globe",
    "NetBIOS",
    "Disable NetBIOS over TCP/IP?",
    "A very specific question, but the kind that is actually consequential on the right systems.",
    "Yes — disable NetBIOS",
    "Good for stripped personal machines that do not rely on old SMB name resolution paths.",
    "No — keep NetBIOS",
    "Safer if you are not certain about your local-network dependencies.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableNagle",
    "Globe",
    "Nagle",
    "Disable the Nagle algorithm for lower packet coalescing latency?",
    "This is the kind of network question that sounds impressive and can absolutely be the wrong answer on the wrong setup.",
    "Yes — disable Nagle",
    "For users chasing lower send-side latency in very specific workloads.",
    "No — keep default TCP behavior",
    "Safer for general networking behavior.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableNicOffloading",
    "Globe",
    "NIC Offloading",
    "Disable NIC offloading and switch to a low-latency adapter preset?",
    "This applies the current playbook’s offloading, RSS queue, and autotuning decisions as a bundle.",
    "Yes — use the low-latency NIC preset",
    "For wired enthusiast setups where throughput tradeoffs are acceptable.",
    "No — keep default NIC offloading behavior",
    "Safer for mixed-use, higher-throughput, or Wi-Fi-heavy machines.",
    {
      visibility: { minPreset: "aggressive" },
      yesBadge: "Advanced",
      yesBadgeColor: "bg-amber-500/15 text-amber-400",
    },
  ),
  makeBooleanQuestion(
    "disableDeliveryOptimization",
    "Globe",
    "Delivery Optimization",
    "Disable Windows Delivery Optimization bandwidth sharing?",
    "A good real-world question because it affects how Windows uses your bandwidth in the background.",
    "Yes — disable it",
    "Less background peer-distribution behavior from Windows Update.",
    "No — keep it",
    "Leave Windows update-sharing behavior intact.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableUsbSelectiveSuspend",
    "Battery",
    "USB Suspend",
    "Disable USB selective suspend?",
    "Useful for users chasing fewer wake-latency issues on input devices and attached hardware.",
    "Yes — disable it",
    "Reduces Windows’ tendency to put USB devices to sleep.",
    "No — keep USB selective suspend",
    "Safer for efficiency and some mobile setups.",
    {
      visibility: { minPreset: "aggressive", excludeLaptop: true },
    },
  ),
  makeBooleanQuestion(
    "disablePcieLinkStatePm",
    "Battery",
    "PCIe Link States",
    "Disable PCIe link-state power management?",
    "Good enthusiast question. Specific, measurable, and not something average users think to ask.",
    "Yes — disable PCIe link-state PM",
    "Cuts another latency source from the power stack on desktops.",
    "No — keep PCIe power management",
    "Leave the link-state power-saving behavior intact.",
    {
      visibility: { minPreset: "aggressive", excludeLaptop: true },
    },
  ),
];

const RISK_ORDER: StrategyRiskLevel[] = ["safe", "mixed", "aggressive", "expert"];
const DEFAULT_PACKAGE_REFS: WizardPackageRefs = {
  manifestRef: "manifest.json",
  wizardMetadataRef: "wizard/wizard.json",
  resolvedPlaybookRef: "state/resolved-playbook.json",
  decisionSummaryRef: "state/decision-summary.json",
  actionProvenanceRef: "state/action-provenance.json",
  executionJournalRef: "state/execution-journal.json",
  injectionMetadataRef: "injection/staging.json",
};

function createBooleanBehavior(
  actionIds: string[],
  blockReason: string,
  config: {
    onTrue?: Omit<StrategyOptionBehavior, "value" | "includeActions">;
    onFalse?: Omit<StrategyOptionBehavior, "value" | "blockActions" | "blockReason">;
  } = {},
): StrategyQuestionBehaviorDefinition {
  return {
    options: [
      {
        value: true,
        includeActions: actionIds,
        estimatedActions: actionIds.length,
        ...config.onTrue,
      },
      {
        value: false,
        blockActions: actionIds,
        blockReason,
        estimatedBlocked: actionIds.length,
        ...config.onFalse,
      },
    ],
  };
}

function mergeRisk(current: StrategyRiskLevel, next?: StrategyRiskLevel): StrategyRiskLevel {
  if (!next) return current;
  return RISK_ORDER[Math.max(RISK_ORDER.indexOf(current), RISK_ORDER.indexOf(next))] ?? current;
}

function getPackageRefs(): WizardPackageRefs {
  return { ...DEFAULT_PACKAGE_REFS };
}

function clonePlaybook(playbook: ResolvedPlaybook): ResolvedPlaybook {
  return {
    ...playbook,
    blockedReasons: [...playbook.blockedReasons],
    actionProvenance: playbook.actionProvenance ? playbook.actionProvenance.map((entry) => ({
      ...entry,
      sourceQuestionIds: [...entry.sourceQuestionIds],
      sourceOptionValues: [...entry.sourceOptionValues],
      warnings: [...entry.warnings],
      journalRecordRefs: [...entry.journalRecordRefs],
      executionResultRef: entry.executionResultRef,
      sources: entry.sources.map((source) => ({
        ...source,
        warnings: [...source.warnings],
      })),
    })) : undefined,
    packageRefs: playbook.packageRefs ? { ...playbook.packageRefs } : null,
    phases: playbook.phases.map((phase) => ({
      ...phase,
      actions: phase.actions.map((action) => ({ ...action })),
    })),
  };
}

function findAction(playbook: ResolvedPlaybook, actionId: string): PlaybookResolvedAction | null {
  for (const phase of playbook.phases) {
    const action = phase.actions.find((entry) => entry.id === actionId);
    if (action) return action;
  }
  return null;
}

function findActionWithPhase(
  playbook: ResolvedPlaybook,
  actionId: string,
): { phaseId: string; phaseName: string; action: PlaybookResolvedAction } | null {
  for (const phase of playbook.phases) {
    const action = phase.actions.find((entry) => entry.id === actionId);
    if (action) {
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        action,
      };
    }
  }
  return null;
}

function includeAction(playbook: ResolvedPlaybook, actionId: string): void {
  const action = findAction(playbook, actionId);
  if (!action) return;
  if (action.status === "Blocked" || action.status === "BuildGated") return;
  action.status = "Included";
  action.blockedReason = null;
}

function blockAction(playbook: ResolvedPlaybook, actionId: string, reason: string): void {
  const action = findAction(playbook, actionId);
  if (!action) return;
  if (action.status === "BuildGated") return;
  action.status = "Blocked";
  action.blockedReason = reason;
}

function includeAll(playbook: ResolvedPlaybook, actionIds: string[]): void {
  for (const actionId of actionIds) includeAction(playbook, actionId);
}

function blockAll(playbook: ResolvedPlaybook, actionIds: string[], reason: string): void {
  for (const actionId of actionIds) blockAction(playbook, actionId, reason);
}

function deriveActionRiskLevel(action: PlaybookResolvedAction): StrategyRiskLevel {
  const normalizedRisk = action.risk.trim().toLowerCase();
  if (action.expertOnly || normalizedRisk.includes("expert")) return "expert";
  if (normalizedRisk.includes("high") || normalizedRisk.includes("aggressive")) return "aggressive";
  if (normalizedRisk.includes("medium") || normalizedRisk.includes("mixed")) return "mixed";
  return "safe";
}

function buildActionProvenance(
  basePlaybook: ResolvedPlaybook,
  playbook: ResolvedPlaybook,
  decisionSummary: QuestionnaireDecisionSummary,
): ActionDecisionProvenance[] {
  const refs = getPackageRefs();
  const sourceMap = new Map<string, ActionDecisionSource[]>();

  for (const effect of decisionSummary.selectedEffects) {
    const pushSource = (actionId: string, decisionEffect: "include" | "block") => {
      const source: ActionDecisionSource = {
        effect: decisionEffect,
        questionKey: effect.questionKey,
        questionLabel: effect.questionLabel,
        selectedValue: effect.selectedValue,
        selectedTitle: effect.selectedTitle,
        blockedReason: effect.blockedReason,
        warnings: [...effect.warnings],
        riskLevel: effect.riskLevel,
        requiresReboot: effect.requiresReboot,
        estimatedPreserved: effect.estimatedPreserved,
        optionSourceRef: effect.optionSourceRef ?? refs.wizardMetadataRef,
      };
      const existing = sourceMap.get(actionId) ?? [];
      existing.push(source);
      sourceMap.set(actionId, existing);
    };

    for (const actionId of effect.includedActions) {
      pushSource(actionId, "include");
    }
    for (const actionId of effect.blockedActions) {
      pushSource(actionId, "block");
    }
  }

  const provenance: ActionDecisionProvenance[] = [];

  for (const phase of playbook.phases) {
    for (const action of phase.actions) {
      const baseEntry = findActionWithPhase(basePlaybook, action.id);
      const sources = sourceMap.get(action.id) ?? [];
      const includeSources = sources.filter((source) => source.effect === "include");
      const blockSources = sources.filter((source) => source.effect === "block");
      const warnings = new Set<string>();
      let riskLevel = deriveActionRiskLevel(action);

      for (const source of sources) {
        riskLevel = mergeRisk(riskLevel, source.riskLevel);
        for (const warning of source.warnings) {
          warnings.add(warning);
        }
      }
      if (action.warningMessage) {
        warnings.add(action.warningMessage);
      }

      let reasonOrigin: ActionDecisionProvenance["reasonOrigin"] = "base-playbook";
      let inclusionReason: string | null = null;
      let blockedReason: string | null = action.blockedReason;
      let preservedReason: string | null = null;

      if (action.status === "BuildGated") {
        reasonOrigin = "build-gate";
        blockedReason = action.blockedReason ?? "Blocked by Windows build requirements.";
      } else if (blockSources.length > 0 && action.status === "Blocked") {
        reasonOrigin = "user-choice";
        const primaryBlock = blockSources[0];
        blockedReason = primaryBlock?.blockedReason ?? action.blockedReason;
        preservedReason = blockedReason;
      } else if (includeSources.length > 0 && action.status === "Included") {
        reasonOrigin = "user-choice";
        const primaryInclude = includeSources[0];
        inclusionReason = primaryInclude
          ? `Included because "${primaryInclude.selectedTitle}" was selected for ${primaryInclude.questionLabel}.`
          : "Included because of your questionnaire choices.";
      } else if (action.status === "Blocked") {
        reasonOrigin = "profile-safeguard";
        preservedReason = action.blockedReason ?? "Preserved by profile or machine safeguards.";
      } else if (action.status === "Included") {
        inclusionReason = "Included by the base playbook profile.";
      }

      provenance.push({
        actionId: action.id,
        actionName: action.name,
        phaseId: phase.id,
        phaseName: phase.name,
        description: action.description,
        defaultStatus: baseEntry?.action.status ?? action.status,
        finalStatus: action.status,
        inclusionReason,
        blockedReason,
        preservedReason,
        reasonOrigin,
        warnings: [...warnings],
        riskLevel,
        expertOnly: action.expertOnly,
        requiresReboot: action.requiresReboot || sources.some((source) => source.requiresReboot),
        offlineApplicable: wizardBundleMetadata.supportsISO && action.status !== "BuildGated",
        imageApplicable: wizardBundleMetadata.supportsISO && action.status !== "BuildGated",
        sourceQuestionIds: sources.map((source) => source.questionKey),
        sourceOptionValues: sources.map((source) => source.selectedValue),
        sources,
        packageSourceRef: "",
        journalRecordRefs: [],
        executionResultRef: null,
      });
    }
  }

  return provenance.map((entry, index) => ({
    ...entry,
    packageSourceRef: `${refs.actionProvenanceRef}#/actions/${index}`,
  }));
}

function recomputeResolvedPlaybook(
  basePlaybook: ResolvedPlaybook,
  playbook: ResolvedPlaybook,
  decisionSummary: QuestionnaireDecisionSummary,
): ResolvedPlaybook {
  let totalIncluded = 0;
  let totalBlocked = 0;
  let totalOptional = 0;
  let totalExpertOnly = 0;
  const blockedReasons: Array<{ actionId: string; reason: string }> = [];

  for (const phase of playbook.phases) {
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
    ...playbook,
    totalIncluded,
    totalBlocked,
    totalOptional,
    totalExpertOnly,
    blockedReasons,
    decisionSummary,
    actionProvenance: buildActionProvenance(basePlaybook, playbook, decisionSummary),
    packageRefs: getPackageRefs(),
  };
}

const QUESTION_BEHAVIORS: Record<keyof QuestionnaireAnswers, StrategyQuestionBehaviorDefinition> = {
  aggressionPreset: {
    options: [
      { value: "conservative", estimatedBlocked: 8, riskLevel: "safe" },
      { value: "balanced", estimatedBlocked: 3, riskLevel: "mixed" },
      { value: "aggressive", riskLevel: "aggressive" },
      { value: "expert", riskLevel: "expert" },
    ],
  },
  highPerformancePlan: createBooleanBehavior(
    ["power.high-performance-plan"],
    "You chose to keep Windows balanced power behavior.",
  ),
  aggressiveBoostMode: createBooleanBehavior(
    ["cpu.aggressive-boost-mode"],
    "You chose not to force aggressive CPU boost behavior.",
  ),
  minProcessorState100: createBooleanBehavior(
    ["cpu.min-processor-state-100"],
    "You chose not to lock minimum processor state to 100%.",
  ),
  optimizeThreadPriority: createBooleanBehavior(
    ["cpu.win32-priority-separation"],
    "You chose to keep default Windows thread scheduling behavior.",
  ),
  globalTimerResolution: createBooleanBehavior(
    ["cpu.global-timer-resolution"],
    "You chose to keep modern per-process timer behavior.",
    {
      onTrue: {
        requiresReboot: true,
      },
    },
  ),
  disableDynamicTick: createBooleanBehavior(
    ["cpu.disable-dynamic-tick"],
    "You chose to keep Windows dynamic tick enabled.",
    {
      onTrue: {
        requiresReboot: true,
      },
    },
  ),
  disableCoreParking: createBooleanBehavior(
    ["cpu.disable-core-parking"],
    "You chose to keep CPU core parking behavior.",
  ),
  gamingMmcss: createBooleanBehavior(
    ["scheduler.mmcss-gaming-profile"],
    "You chose not to harden the MMCSS gaming profile.",
  ),
  disableMemoryCompression: createBooleanBehavior(
    ["memory.disable-compression"],
    "You chose to keep Windows memory compression enabled.",
  ),
  disableHags: createBooleanBehavior(
    ["gpu.disable-hags"],
    "You chose to keep HAGS at the Windows default.",
  ),
  disableGpuTelemetry: createBooleanBehavior(
    ["gpu.disable-nvidia-telemetry", "gpu.disable-amd-telemetry"],
    "You chose to keep GPU driver telemetry services active.",
  ),
  disableGameDvr: createBooleanBehavior(
    ["perf.disable-game-dvr"],
    "You chose to keep Game DVR behavior enabled.",
  ),
  disableFullscreenOptimizations: createBooleanBehavior(
    ["perf.disable-fullscreen-optimizations"],
    "You chose to keep Windows fullscreen optimizations enabled.",
  ),
  disableIndexing: createBooleanBehavior(
    ["storage.disable-indexing"],
    "You chose to keep Windows Search indexing enabled.",
  ),
  stripSearchWebNoise: createBooleanBehavior(
    [
      "shell.disable-web-search",
      "shell.disable-search-highlights",
      "shell.disable-search-history",
      "shell.reduce-search-box",
    ],
    "You chose to keep Windows Search web features and history behavior.",
  ),
  keepPrinterSupport: {
    options: [
      {
        value: true,
        blockActions: ["services.disable-print-spooler"],
        blockReason: "You said this machine still needs printer support.",
        estimatedBlocked: 1,
        estimatedPreserved: 1,
      },
      {
        value: false,
        includeActions: ["services.disable-print-spooler"],
        estimatedActions: 1,
      },
    ],
  },
  keepRemoteAccess: {
    options: [
      {
        value: true,
        blockActions: ["services.disable-remote-services"],
        blockReason: "You said this machine still needs remote access or remote support.",
        estimatedBlocked: 1,
        estimatedPreserved: 1,
      },
      {
        value: false,
        includeActions: ["services.disable-remote-services"],
        estimatedActions: 1,
      },
    ],
  },
  edgeBehavior: {
    options: [
      {
        value: "keep",
        blockActions: [
          "appx.disable-edge-preload",
          "appx.disable-edge-default-nag",
          "appx.disable-edge-updates",
        ],
        blockReason: "You chose to keep Microsoft Edge behavior unchanged.",
        estimatedBlocked: 3,
      },
      {
        value: "suppress",
        includeActions: ["appx.disable-edge-preload", "appx.disable-edge-default-nag"],
        blockActions: ["appx.disable-edge-updates"],
        blockReason: "You chose not to freeze Edge updates.",
        estimatedActions: 2,
        estimatedBlocked: 1,
      },
      {
        value: "suppress-and-freeze",
        includeActions: [
          "appx.disable-edge-preload",
          "appx.disable-edge-default-nag",
          "appx.disable-edge-updates",
        ],
        estimatedActions: 3,
        riskLevel: "aggressive",
      },
    ],
  },
  removeEdge: createBooleanBehavior(
    ["appx.remove-edge"],
    "You chose to keep the Edge browser installed.",
    {
      onTrue: {
        requiresReboot: true,
        warnings: ["Edge removal is irreversible without a manual reinstall."],
        riskLevel: "aggressive",
      },
    },
  ),
  preserveWebView2: {
    options: [
      {
        value: true,
        blockActions: ["appx.remove-edge-webview"],
        blockReason: "You chose to preserve WebView2 for app compatibility.",
        estimatedBlocked: 1,
        estimatedPreserved: 1,
      },
      {
        value: false,
        includeActions: ["appx.remove-edge-webview"],
        estimatedActions: 1,
        warnings: ["Removing WebView2 can break Teams, installer UIs, and embedded web surfaces."],
        riskLevel: "aggressive",
      },
    ],
  },
  disableCopilot: createBooleanBehavior(
    ["shell.disable-copilot"],
    "You chose to keep Copilot available.",
  ),
  disableRecall: createBooleanBehavior(
    ["privacy.disable-recall"],
    "You chose to keep Recall available.",
  ),
  disableClickToDo: createBooleanBehavior(
    ["privacy.disable-click-to-do"],
    "You chose to keep Click to Do available.",
  ),
  disableAiApps: createBooleanBehavior(
    ["privacy.disable-edge-ai", "privacy.disable-paint-ai", "privacy.disable-notepad-ai"],
    "You chose to keep AI features in system apps.",
  ),
  telemetryLevel: {
    options: [
      {
        value: "keep",
        blockActions: [
          "privacy.disable-telemetry",
          "privacy.disable-ceip",
          "privacy.disable-error-reporting",
          "privacy.disable-siuf",
        ],
        blockReason: "You chose not to reduce Microsoft telemetry in this area.",
        estimatedBlocked: 4,
      },
      {
        value: "reduce",
        includeActions: [
          "privacy.disable-telemetry",
          "privacy.disable-ceip",
          "privacy.disable-error-reporting",
        ],
        blockActions: ["privacy.disable-siuf"],
        blockReason: "You chose the lighter telemetry reduction profile.",
        estimatedActions: 3,
        estimatedBlocked: 1,
      },
      {
        value: "aggressive",
        includeActions: [
          "privacy.disable-telemetry",
          "privacy.disable-ceip",
          "privacy.disable-error-reporting",
          "privacy.disable-siuf",
        ],
        estimatedActions: 4,
        riskLevel: "aggressive",
      },
    ],
  },
  disableClipboardHistory: createBooleanBehavior(
    ["privacy.disable-clipboard-history"],
    "You chose to keep clipboard history and sync capability.",
  ),
  disableActivityFeed: createBooleanBehavior(
    ["privacy.disable-activity-feed", "privacy.disable-cloud-content"],
    "You chose to keep activity feed or cloud content behavior.",
  ),
  disableLocation: createBooleanBehavior(
    ["privacy.disable-location", "privacy.disable-find-my-device"],
    "You chose to keep Windows location-aware features.",
  ),
  disableTailoredExperiences: createBooleanBehavior(
    [
      "privacy.disable-tailored-experiences",
      "privacy.disable-app-launch-tracking",
      "privacy.disable-online-tips",
    ],
    "You chose to keep tailored experiences and app-launch personalization.",
  ),
  disableSpeechPersonalization: createBooleanBehavior(
    [
      "privacy.disable-online-speech",
      "privacy.disable-input-personalization",
      "privacy.disable-tipc",
    ],
    "You chose to keep speech and input personalization features.",
  ),
  disableSmartScreen: createBooleanBehavior(
    ["privacy.disable-smartscreen"],
    "You chose to keep SmartScreen protection enabled.",
    {
      onTrue: {
        warnings: ["Disabling SmartScreen can remove a useful download and reputation safety check."],
        riskLevel: "aggressive",
      },
    },
  ),
  reduceMitigations: createBooleanBehavior(
    ["security.reduce-ssbd-mitigation"],
    "You chose to keep speculative execution mitigations intact.",
    {
      onTrue: {
        warnings: ["Speculation mitigation reduction trades security for latency and syscall-heavy performance."],
        requiresReboot: true,
        riskLevel: "expert",
      },
    },
  ),
  disableHvci: createBooleanBehavior(
    ["security.disable-hvci"],
    "You chose to keep Hypervisor-enforced Code Integrity enabled.",
    {
      onTrue: {
        warnings: ["Disabling HVCI can break security baselines and some anti-cheat requirements."],
        requiresReboot: true,
        riskLevel: "expert",
      },
    },
  ),
  disableLlmnr: createBooleanBehavior(
    ["network.disable-llmnr"],
    "You chose to keep LLMNR name resolution enabled.",
  ),
  disableIpv6: createBooleanBehavior(
    ["network.disable-ipv6"],
    "You chose to keep IPv6 enabled.",
    {
      onTrue: {
        warnings: ["Aggressive network tuning is hardware-sensitive. Verify games, VPNs, and voice chat after apply."],
        riskLevel: "aggressive",
      },
    },
  ),
  disableTeredo: createBooleanBehavior(
    ["network.disable-teredo"],
    "You chose to keep Teredo tunneling enabled.",
    {
      onTrue: {
        warnings: ["Aggressive network tuning is hardware-sensitive. Verify games, VPNs, and voice chat after apply."],
        riskLevel: "aggressive",
      },
    },
  ),
  disableNetbios: createBooleanBehavior(
    ["network.disable-netbios"],
    "You chose to keep NetBIOS over TCP/IP enabled.",
    {
      onTrue: {
        warnings: ["Aggressive network tuning is hardware-sensitive. Verify games, VPNs, and voice chat after apply."],
        riskLevel: "aggressive",
      },
    },
  ),
  disableNagle: createBooleanBehavior(
    ["network.disable-nagle"],
    "You chose to keep the default TCP packet coalescing behavior.",
    {
      onTrue: {
        warnings: ["Aggressive network tuning is hardware-sensitive. Verify games, VPNs, and voice chat after apply."],
        riskLevel: "aggressive",
      },
    },
  ),
  disableNicOffloading: createBooleanBehavior(
    ["network.disable-offloading", "network.rss-queues-2", "network.tcp-autotuning-normal"],
    "You chose to keep default NIC offloading and queue behavior.",
    {
      onTrue: {
        warnings: ["Aggressive network tuning is hardware-sensitive. Verify games, VPNs, and voice chat after apply."],
        riskLevel: "aggressive",
      },
    },
  ),
  disableDeliveryOptimization: createBooleanBehavior(
    ["security.disable-delivery-optimization"],
    "You chose to keep Delivery Optimization enabled.",
  ),
  disableFastStartup: createBooleanBehavior(
    ["power.disable-fast-startup"],
    "You chose to keep Fast Startup enabled.",
  ),
  disableHibernation: createBooleanBehavior(
    ["power.disable-hibernation"],
    "You chose to keep hibernation enabled.",
  ),
  disableUsbSelectiveSuspend: createBooleanBehavior(
    ["power.disable-usb-selective-suspend"],
    "You chose to keep USB selective suspend enabled.",
  ),
  disablePcieLinkStatePm: createBooleanBehavior(
    ["power.disable-pcie-link-state-pm"],
    "You chose to keep PCIe link-state power management enabled.",
  ),
  disableAudioEnhancements: createBooleanBehavior(
    ["audio.disable-enhancements"],
    "You chose to keep Windows audio enhancements enabled.",
    {
      onTrue: {
        warnings: ["Audio enhancements off can change loudness, EQ, and motherboard vendor DSP behavior."],
        riskLevel: "mixed",
      },
    },
  ),
  enableAudioExclusiveMode: createBooleanBehavior(
    ["audio.exclusive-mode"],
    "You chose not to enable exclusive-mode audio control.",
  ),
  restoreClassicContextMenu: createBooleanBehavior(
    ["shell.restore-classic-context-menu"],
    "You chose to keep the default Windows 11 compact context menu.",
  ),
  enableEndTask: createBooleanBehavior(
    ["shell.enable-end-task"],
    "You chose to keep the default taskbar right-click behavior.",
  ),
  disableBackgroundApps: createBooleanBehavior(
    ["startup.disable-background-apps"],
    "You chose to keep background app execution enabled.",
  ),
  disableAutomaticMaintenance: createBooleanBehavior(
    ["startup.disable-automatic-maintenance"],
    "You chose to keep Windows automatic maintenance enabled.",
  ),
  enableGameMode: createBooleanBehavior(
    ["startup.enable-game-mode"],
    "You chose not to force Game Mode on.",
  ),
  disableTransparency: createBooleanBehavior(
    ["perf.disable-transparency"],
    "You chose to keep Windows transparency effects enabled.",
    {
      onTrue: {
        personalization: { transparency: false },
      },
    },
  ),
};

export function getQuestionBehaviorDefinition(
  key: keyof QuestionnaireAnswers,
): StrategyQuestionBehaviorDefinition {
  return QUESTION_BEHAVIORS[key];
}

export function getSelectedQuestionBehavior(
  key: keyof QuestionnaireAnswers,
  value: QuestionValue | null,
): StrategyOptionBehavior | null {
  if (value === null) return null;
  return QUESTION_BEHAVIORS[key].options.find((option) => option.value === value) ?? null;
}

function buildSelectedDecisionEffect(
  question: StrategyQuestionDefinition,
  value: QuestionValue,
): QuestionnaireDecisionEffect | null {
  const behavior = getSelectedQuestionBehavior(question.key, value);
  const option = question.options.find((entry) => entry.value === value);

  if (!behavior || !option) return null;

  return {
    questionKey: String(question.key),
    questionLabel: question.label,
    selectedValue: value,
    selectedTitle: option.title,
    includedActions: [...(behavior.includeActions ?? [])],
    blockedActions: [...(behavior.blockActions ?? [])],
    blockedReason: behavior.blockReason ?? null,
    warnings: [...(behavior.warnings ?? [])],
    requiresReboot: behavior.requiresReboot ?? false,
    estimatedActions: behavior.estimatedActions ?? behavior.includeActions?.length ?? 0,
    estimatedBlocked: behavior.estimatedBlocked ?? behavior.blockActions?.length ?? 0,
    estimatedPreserved: behavior.estimatedPreserved ?? 0,
    riskLevel: behavior.riskLevel ?? "safe",
    optionSourceRef: `wizard/wizard.json#/desktopQuestions/${String(question.key)}/options/${String(value)}`,
  };
}

export function buildQuestionnaireDecisionSummary(
  answers: QuestionnaireAnswers,
  context?: StrategyQuestionContext,
): QuestionnaireDecisionSummary {
  const warnings = new Set<string>();
  const selectedEffects: QuestionnaireDecisionEffect[] = [];
  let estimatedActions = 0;
  let estimatedBlocked = 0;
  let estimatedPreserved = 0;
  let rebootRequired = false;
  let riskLevel: StrategyRiskLevel = "safe";

  const questions = context
    ? strategyQuestions.filter((question) => isQuestionVisible(question, answers, context))
    : strategyQuestions;

  for (const question of questions) {
    const value = answers[question.key];
    if (value === null) continue;

    const effect = buildSelectedDecisionEffect(question, value);
    if (!effect) continue;

    selectedEffects.push(effect);
    estimatedActions += effect.estimatedActions;
    estimatedBlocked += effect.estimatedBlocked;
    estimatedPreserved += effect.estimatedPreserved;
    rebootRequired ||= effect.requiresReboot;
    riskLevel = mergeRisk(riskLevel, effect.riskLevel);

    for (const warning of effect.warnings) {
      warnings.add(warning);
    }
  }

  return {
    estimatedActions,
    estimatedBlocked,
    estimatedPreserved,
    rebootRequired,
    riskLevel,
    warnings: [...warnings],
    selectedEffects,
  };
}

export function computeWizardImpact(
  answers: QuestionnaireAnswers,
  context?: StrategyQuestionContext,
): PlaybookImpactSummary {
  const summary = buildQuestionnaireDecisionSummary(answers, context);
  return {
    estimatedActions: summary.estimatedActions,
    estimatedBlocked: summary.estimatedBlocked,
    estimatedPreserved: summary.estimatedPreserved,
    rebootRequired: summary.rebootRequired,
    riskLevel: summary.riskLevel,
    warnings: summary.warnings,
  };
}

export function applyQuestionnaireOverrides(
  basePlaybook: ResolvedPlaybook,
  answers: QuestionnaireAnswers,
  context?: StrategyQuestionContext,
): ResolvedPlaybook {
  const playbook = clonePlaybook(basePlaybook);
  const summary = buildQuestionnaireDecisionSummary(answers, context);

  for (const effect of summary.selectedEffects) {
    if (effect.includedActions.length > 0) {
      includeAll(playbook, effect.includedActions);
    }
    if (effect.blockedActions.length > 0 && effect.blockedReason) {
      blockAll(playbook, effect.blockedActions, effect.blockedReason);
    }
  }

  return recomputeResolvedPlaybook(basePlaybook, playbook, summary);
}

export function resolveQuestionnairePersonalization(
  preferences: PersonalizationPreferences,
  defaults: PersonalizationPreferences,
  answers: QuestionnaireAnswers,
  context?: StrategyQuestionContext,
): PersonalizationPreferences {
  const resolved = { ...preferences };
  const questions = context
    ? strategyQuestions.filter((question) => isQuestionVisible(question, answers, context))
    : strategyQuestions;

  for (const question of questions) {
    const value = answers[question.key];
    if (value === null) continue;
    const behavior = getSelectedQuestionBehavior(question.key, value);
    if (!behavior) continue;

    if (behavior.personalization) {
      Object.assign(resolved, behavior.personalization);
    }
    if (behavior.restoreDefaults) {
      for (const key of behavior.restoreDefaults) {
        if (resolved[key] === defaults[key]) {
          resolved[key] = defaults[key];
        }
      }
    }
  }

  return resolved;
}

export function buildWizardJsonPayload() {
  const desktopQuestions = strategyQuestions.map((question) => ({
    ...question,
    options: question.options.map((option) => ({
      ...option,
      behavior: getSelectedQuestionBehavior(question.key, option.value) ?? undefined,
    })),
  }));

  const featurePages = strategyQuestions.map((question) => ({
    type: "RadioPage",
    description: question.desc,
    isRequired: true,
    defaultOption: `${String(question.key)}__${String(question.options[0]?.value ?? "default")}`,
    questionKey: question.key,
    visibility: question.visibility ?? null,
    options: question.options.map((option) => ({
      text: option.title,
      name: `${String(question.key)}__${String(option.value)}`,
      value: option.value,
      desc: option.desc,
      badge: option.badge ?? null,
      badgeColor: option.badgeColor ?? null,
      danger: option.danger ?? false,
      behavior: getSelectedQuestionBehavior(question.key, option.value) ?? null,
    })),
  }));

  return {
    ...wizardBundleMetadata,
    desktopQuestions,
    featurePages,
  };
}
