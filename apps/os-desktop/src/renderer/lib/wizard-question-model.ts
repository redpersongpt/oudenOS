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
  git: "https://github.com/redpersongpt/redcoreOS",
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
    label: "Optimization Level",
    title: "How much should we optimize?",
    desc: "This decides how many changes we make. Start safe, or go deeper if you know what you're doing.",
    note: "If unsure, pick Balanced. You can always revisit.",
    options: [
      {
        value: "conservative" satisfies AggressionPreset,
        title: "Conservative",
        desc: "Light cleanup and privacy fixes only. Nothing risky. Best if you're not sure.",
        badge: "Safest",
        badgeColor: "bg-emerald-500/15 text-emerald-400",
      },
      {
        value: "balanced" satisfies AggressionPreset,
        title: "Balanced",
        desc: "Good mix of performance and privacy improvements. Works well for most PCs.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "aggressive" satisfies AggressionPreset,
        title: "Aggressive",
        desc: "Deeper tweaks for gaming PCs and power users. May change how some features work.",
      },
      {
        value: "expert" satisfies AggressionPreset,
        title: "Expert",
        desc: "Unlocks all options including security tradeoffs. Only for users who know exactly what they want.",
        badge: "Advanced",
        badgeColor: "bg-purple-500/15 text-purple-400",
      },
    ],
  },
  makeBooleanQuestion(
    "highPerformancePlan",
    "Battery",
    "Power Plan",
    "Use the High Performance power plan?",
    "This stops Windows from slowing down your CPU to save power. Your PC will respond faster. Sets powercfg to High Performance scheme and adjusts processor idle states.",
    "Yes — use High Performance",
    "CPU stays at higher frequencies. Eliminates 1-5ms wake latency from C-states. Measurable in frame time graphs.",
    "No — keep Windows power defaults",
    "Keeps Balanced plan with CPU frequency scaling. Better for laptops on battery.",
    {
      note: "Sets GUID 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c. This is the single most impactful change for desktop performance.",
      yesBadge: "Core",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "optimizeThreadPriority",
    "Cpu",
    "CPU Priority",
    "Give more CPU power to the app you're using?",
    "Adjusts Win32PrioritySeparation to favor foreground processes. Makes the scheduler give your active app (game, editor) more quantum time than background services.",
    "Yes — prioritize the active app",
    "Sets Win32PrioritySeparation=0x26 (short, variable, foreground boost). Measurable improvement in input-to-frame latency.",
    "No — keep default sharing",
    "Keeps default Win32PrioritySeparation. Background tasks get equal scheduling.",
    {
      note: "Registry: HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl. Research-backed by valleyofdoom/PC-Tuning.",
      visibility: { minPreset: "balanced" },
      yesBadge: "Scheduler",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "globalTimerResolution",
    "Clock",
    "Timer Fix",
    "Fix the Windows timer for better game performance?",
    "Windows 11 changed timer resolution to per-process (24H2+). This sets GlobalTimerResolutionRequests=1 to restore the global 0.5ms timer that games rely on for consistent frame pacing.",
    "Yes — restore global timer behavior",
    "Sets kernel GlobalTimerResolutionRequests=1. Reduces timer jitter from ~15.6ms to ~0.5ms. Directly improves frame pacing.",
    "No — keep modern per-app timer",
    "Keeps per-process timer. Some games may have inconsistent frame times.",
    {
      note: "Registry: HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel. Only effective on Win11 22H2+ / Server 2022+.",
      visibility: { minPreset: "balanced" },
      yesBadge: "Latency",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "disableIndexing",
    "HardDrive",
    "Search Indexing",
    "Turn off Windows Search indexing?",
    "WSearch service constantly scans files in the background. Disabling it stops the indexer, reduces disk I/O, and frees ~100-200MB RAM.",
    "Yes — disable indexing",
    "Stops WSearch service (Start=4). Saves CPU, disk I/O, and RAM. Search still works, just slower.",
    "No — keep indexing enabled",
    "Keeps fast file search in Start menu and Explorer. Uses background CPU/disk.",
    {
      note: "Service: WSearch. Also disables SearchIndexer.exe. You can still search — just without instant results.",
      yesBadge: "Search",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "stripSearchWebNoise",
    "Search",
    "Search Cleanup",
    "Clean up the Start menu search?",
    "Removes web results, search highlights, and the oversized search bar from the taskbar.",
    "Yes — local search only",
    "Search only shows your local files and apps. No web clutter.",
    "No — keep full search",
    "Keeps web suggestions and the full search experience.",
    {
      note: "This is intentionally more honest than claiming complete search removal when the actual playbook applies targeted shell/search actions.",
    },
  ),
  makeBooleanQuestion(
    "keepPrinterSupport",
    "Wrench",
    "Printing",
    "Do you use a printer?",
    "If you don't print, we can safely disable the print service. This also removes a known security vulnerability.",
    "Yes — I use a printer",
    "Printer support stays enabled.",
    "No — I don't print",
    "Disables the print service. Frees resources and improves security.",
    {
      note: "This question is preservation-driven: the answer directly decides whether the spooler disable action is blocked or applied.",
    },
  ),
  makeBooleanQuestion(
    "keepRemoteAccess",
    "Globe",
    "Remote Access",
    "Do you need remote desktop access?",
    "Remote Desktop lets others control your PC over the network. If nobody needs to access this PC remotely, we can disable it for better security.",
    "Yes — I need remote access",
    "Keeps remote desktop and assistance tools working.",
    "No — nobody accesses this PC remotely",
    "Disables remote access. Reduces your attack surface.",
    {
      note: "This is the kind of preservation decision that should be explicit before apply, not discovered after something breaks.",
    },
  ),
  {
    key: "edgeBehavior",
    icon: "Globe",
    label: "Edge Browser",
    title: "What should we do with Microsoft Edge's background activity?",
    desc: "Edge runs 3-5 background processes even when closed, pre-loads at boot, and nags you to switch from your preferred browser. It's like that friend who won't leave your party.",
    note: "Disables msedge startup boost, browser replacement prompts, and update tasks. Most people should pick 'Suppress'.",
    options: [
      {
        value: "keep" satisfies EdgeBehavior,
        title: "Keep Edge unchanged",
        desc: "Leave Edge completely untouched.",
      },
      {
        value: "suppress" satisfies EdgeBehavior,
        title: "Suppress background preload and default-browser nags",
        desc: "Stop Edge from loading at startup and showing 'switch to Edge' popups.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "suppress-and-freeze" satisfies EdgeBehavior,
        title: "Suppress Edge and also freeze auto-updates",
        desc: "Also prevents Edge from updating itself. You'd need to update it manually.",
      },
    ],
  },
  makeBooleanQuestion(
    "disableCopilot",
    "Sparkles",
    "Copilot",
    "Remove Windows Copilot?",
    "Copilot is Microsoft's AI assistant wedged into the taskbar. Uses 150-300MB RAM sitting idle and phones home to Bing. Nobody asked for this.",
    "Yes — remove Copilot",
    "Disables Copilot via TurnOffWindowsCopilot policy. Frees ~200MB RAM. Your taskbar can finally breathe.",
    "No — keep Copilot available",
    "Keeps Copilot available on the taskbar. It's actually useful sometimes... apparently.",
  ),
  makeBooleanQuestion(
    "disableRecall",
    "Eye",
    "Recall",
    "Disable Windows Recall?",
    "Recall takes screenshots of your screen every few seconds so AI can search your history. Yes, really. It stores everything locally but the concept is... concerning.",
    "Yes — disable Recall",
    "Stops the screenshot-based activity tracking completely. Your screen is yours again.",
    "No — keep Recall available",
    "Keeps Recall active. Microsoft pinky-promises the data stays local.",
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
    "Click to Do is a Windows 11 AI feature that analyzes what's on your screen and suggests actions.",
    "Yes — disable it",
    "Removes this AI overlay. Less clutter.",
    "No — keep it available",
    "Keeps Click to Do available.",
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
    "Microsoft added AI to several built-in apps. These send your data to the cloud for processing.",
    "Yes — disable app AI features",
    "Turns off AI features in these apps. Your data stays local.",
    "No — keep AI features",
    "Keeps AI features available in built-in apps.",
  ),
  {
    key: "telemetryLevel",
    icon: "Shield",
    label: "Data Collection",
    title: "How much should we reduce Microsoft's data collection?",
    desc: "Windows sends usage data, app crash reports, typing/inking data, and browsing patterns to Microsoft via DiagTrack service and scheduled tasks.",
    note: "Disables DiagTrack service, CEIP, ErrorReporting, PushNotifications, and cloud content. AllowTelemetry=0 only fully works on Enterprise/EDU editions.",
    options: [
      {
        value: "keep" satisfies TelemetryLevel,
        title: "Keep Windows defaults",
        desc: "Leave all data collection at Windows defaults. DiagTrack stays running.",
      },
      {
        value: "reduce" satisfies TelemetryLevel,
        title: "Reduce data collection",
        desc: "Disables DiagTrack, CEIP, ErrorReporting, ProgramDataUpdater, and Consolidator tasks. Sets AllowTelemetry=0.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "aggressive" satisfies TelemetryLevel,
        title: "Maximum privacy",
        desc: "Everything above + blocks feedback requests, advertising ID, activity feed, inking data, and cloud content suggestions.",
      },
    ],
  },
  makeBooleanQuestion(
    "disableClipboardHistory",
    "Eye",
    "Clipboard",
    "Disable clipboard history and cloud sync?",
    "Windows can save everything you copy and sync it across devices. If you don't use this, it's just extra tracking.",
    "Yes — disable clipboard history/sync",
    "Clipboard works normally but doesn't save history or sync.",
    "No — keep clipboard history",
    "Keeps clipboard history and cross-device sync.",
  ),
  makeBooleanQuestion(
    "disableActivityFeed",
    "Eye",
    "Activity Tracking",
    "Disable activity tracking?",
    "Windows tracks what files you open and apps you use, then shows this in a 'timeline'. This data is also sent to the cloud.",
    "Yes — disable it",
    "Stops Windows from tracking and uploading your activity.",
    "No — keep it",
    "Keeps the activity timeline and cloud sync.",
  ),
  makeBooleanQuestion(
    "disableLocation",
    "Globe",
    "Location",
    "Disable location tracking?",
    "Windows tracks your location for maps, weather, and Find My Device. On a desktop, this is usually unnecessary.",
    "Yes — disable location",
    "Turns off location services and Find My Device.",
    "No — keep location available",
    "Keeps location for maps, weather, and device recovery.",
  ),
  makeBooleanQuestion(
    "disableTailoredExperiences",
    "Eye",
    "Ads & Suggestions",
    "Stop Windows from personalizing ads and suggestions?",
    "Windows uses your activity to show targeted tips, app suggestions, and literal ads in the Start menu. Your OS is an ad platform. Let that sink in.",
    "Yes — stop personalized suggestions",
    "Disables CloudContent, SoftLanding, and tailored experiences policies. No more surprise Candy Crush installs.",
    "No — keep it",
    "Keeps personalized suggestions. Enjoy your Spotify ad in the Start menu.",
  ),
  makeBooleanQuestion(
    "disableSpeechPersonalization",
    "Sparkles",
    "Voice & Typing",
    "Disable voice and typing data collection?",
    "Windows can send your voice and typing patterns to Microsoft to improve their AI. If you don't use dictation, there's no reason for this.",
    "Yes — disable it",
    "Stops sending voice and typing data to Microsoft.",
    "No — keep it",
    "Keeps cloud speech recognition and input learning.",
  ),
  makeBooleanQuestion(
    "disableSmartScreen",
    "Shield",
    "SmartScreen",
    "Disable SmartScreen download protection?",
    "SmartScreen checks files you download against Microsoft's database. It protects you, but also sends data about everything you download.",
    "Yes — disable SmartScreen",
    "No more download scanning. You manage trust yourself.",
    "No — keep SmartScreen",
    "Keeps download protection active. Recommended for most users.",
    {
      note: "This is a real security tradeoff. Only disable if you're careful about what you download.",
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
    "Disable Fast Startup?",
    "Fast Startup (HiberbootEnabled) hibernates the kernel instead of doing a full shutdown. This means drivers and services don't reinitialize, causing stale state bugs and dual-boot filesystem issues.",
    "Yes — disable Fast Startup",
    "Sets HiberbootEnabled=0. Full shutdown/restart cycle. Drivers reinitialize properly. Fixes dual-boot NTFS corruption.",
    "No — keep Fast Startup",
    "Keeps ~3-5 second faster boots at the cost of potential driver/filesystem quirks.",
  ),
  makeBooleanQuestion(
    "disableHibernation",
    "Zap",
    "Hibernation",
    "Disable hibernation?",
    "Hibernation saves your session to disk when sleeping. It uses disk space equal to your RAM (8-64GB).",
    "Yes — disable hibernation",
    "Frees disk space and ensures clean shutdowns.",
    "No — keep hibernation",
    "Keeps hibernate as a sleep option.",
  ),
  makeBooleanQuestion(
    "disableAudioEnhancements",
    "MonitorSpeaker",
    "Audio Effects",
    "Turn off audio enhancements?",
    "Windows applies sound effects (bass boost, loudness equalization) that can distort audio. Turning them off gives you cleaner sound.",
    "Yes — turn enhancements off",
    "Cleaner, more natural audio without processing effects.",
    "No — keep enhancements",
    "Keeps audio effects like bass boost and virtual surround.",
  ),
  makeBooleanQuestion(
    "enableAudioExclusiveMode",
    "MonitorSpeaker",
    "Exclusive Audio",
    "Let apps take exclusive control of audio?",
    "This gives one app at a time direct access to your speakers for lower latency. Other apps won't make sound while it's active.",
    "Yes — enable exclusive mode",
    "Better for music production and competitive gaming.",
    "No — keep shared audio",
    "All apps share audio normally. Safer for everyday use.",
  ),
  makeBooleanQuestion(
    "restoreClassicContextMenu",
    "Wrench",
    "Right-Click Menu",
    "Restore the full right-click menu?",
    "Windows 11 hides most options behind 'Show more options'. This brings back the classic full menu and removes clutter entries.",
    "Yes — restore full menu",
    "Full right-click menu with all options visible instantly.",
    "No — keep compact menu",
    "Keeps the compact Windows 11 right-click menu.",
  ),
  makeBooleanQuestion(
    "enableEndTask",
    "Wrench",
    "End Task",
    "Add 'End Task' to taskbar right-click?",
    "When an app freezes, you can kill it directly from the taskbar instead of opening Task Manager.",
    "Yes — add End Task",
    "Quick way to force-close frozen apps.",
    "No — keep default taskbar menu",
    "Use Task Manager to close frozen apps as usual.",
    {
      note: "Only shown on Windows builds that expose the taskbar End Task toggle.",
      visibility: { minWindowsBuild: 22631 },
    },
  ),
  makeBooleanQuestion(
    "disableBackgroundApps",
    "HardDrive",
    "Background Apps",
    "Stop apps from running in the background?",
    "Many apps keep running silently even when you're not using them, eating CPU and memory.",
    "Yes — stop background apps",
    "Apps only run when you actually open them.",
    "No — keep background apps",
    "Keeps background app activity for live tiles, sync, and notifications.",
  ),
  makeBooleanQuestion(
    "disableAutomaticMaintenance",
    "HardDrive",
    "Auto Maintenance",
    "Disable automatic maintenance?",
    "Windows runs cleanup and optimization tasks when your PC is idle. This can cause unexpected activity and wake-ups.",
    "Yes — disable it",
    "No surprise background maintenance. Your PC stays quiet when idle.",
    "No — keep it",
    "Keeps automatic housekeeping. Good if you want Windows to self-maintain.",
  ),
  makeBooleanQuestion(
    "enableGameMode",
    "Gamepad2",
    "Game Mode",
    "Enable Game Mode?",
    "Game Mode tells Windows to prioritize games over background tasks. A small but real improvement.",
    "Yes — enable Game Mode",
    "Windows gives games more resources when they're running.",
    "No — keep default",
    "Keeps the current default behavior.",
  ),
  makeBooleanQuestion(
    "disableTransparency",
    "Eye",
    "Transparency",
    "Disable transparency effects?",
    "The see-through blur effects on windows and taskbar use GPU resources. Turning them off makes the desktop feel snappier.",
    "Yes — disable transparency",
    "Flat, clean look with better performance.",
    "No — keep transparency",
    "Keeps the visual effects.",
  ),
  makeBooleanQuestion(
    "aggressiveBoostMode",
    "Cpu",
    "CPU Boost",
    "Use aggressive CPU boost?",
    "Keeps your CPU running at higher speeds under load instead of backing off to save power.",
    "Yes — use aggressive boost",
    "More performance, but more heat and power consumption.",
    "No — keep default boost",
    "Safer for thermals. Better for quiet operation.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "minProcessorState100",
    "Cpu",
    "CPU Speed",
    "Keep CPU speed at maximum?",
    "Prevents your CPU from slowing down between tasks. Reduces the tiny delays when the CPU needs to speed up again.",
    "Yes — keep at full speed",
    "Fastest response times. CPU stays at full speed.",
    "No — allow speed scaling",
    "CPU slows down when not busy. Better for efficiency and heat.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableCoreParking",
    "Cpu",
    "Core Parking",
    "Keep all CPU cores active?",
    "Windows parks idle CPU cores (C6 state). Unparking takes 1-5ms which causes micro-stutters in games. Sets MinProcessorState to 100% and disables core parking via powercfg.",
    "Yes — keep all cores active",
    "Sets processor idle disable, MinProcessorState=100%. All cores stay in C0. Eliminates core-unpark latency spikes.",
    "No — allow core sleeping",
    "Cores enter C6 sleep when idle. Saves 5-15W power but adds wake latency.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "gamingMmcss",
    "Gamepad2",
    "Game Scheduling",
    "Optimize multimedia scheduling for games?",
    "Adjusts how Windows schedules game and media threads to give them higher priority.",
    "Yes — optimize for games",
    "Games and media get priority over background tasks.",
    "No — keep defaults",
    "Keeps the default scheduling behavior.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableMemoryCompression",
    "Cpu",
    "Memory",
    "Optimize memory management?",
    "Disables memory compression (Disable-MMAgent -MemoryCompression), fixes the known NDU driver memory leak (ndu.sys Start=4), and disables SysMain/Superfetch service.",
    "Yes — optimize memory",
    "Runs Disable-MMAgent, sets NDU Start=4, disables SysMain. Saves CPU overhead on 16GB+ systems. Fixes the ndu.sys leak that causes RAM usage to climb over uptime.",
    "No — keep defaults",
    "Keeps Windows default memory handling. Memory compression and SysMain stay active.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableHags",
    "Gamepad2",
    "GPU Scheduling",
    "Disable Hardware Accelerated GPU Scheduling (HAGS)?",
    "HAGS (HwSchMode) offloads GPU memory scheduling to the GPU firmware. It reduces CPU overhead but can increase frame time variance and cause micro-stutters on some hardware.",
    "Yes — disable HAGS",
    "Sets HwSchMode=1 in registry. More predictable frame times. Preferred for competitive/esports titles.",
    "No — keep HAGS enabled",
    "Keeps HwSchMode=2. Can reduce CPU overhead but may cause inconsistent frame pacing.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableGpuTelemetry",
    "Gamepad2",
    "GPU Telemetry",
    "Disable GPU driver telemetry?",
    "NVIDIA and AMD drivers run background services that collect usage data. Disabling them doesn't affect your graphics.",
    "Yes — disable GPU telemetry",
    "Stops GPU driver analytics. Manual updates still work.",
    "No — keep GPU telemetry",
    "Keeps GPU vendor telemetry running.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableGameDvr",
    "Gamepad2",
    "Game DVR",
    "Disable Game DVR background recording?",
    "Game DVR (GameBarPresenceWriter + AppCaptureEnabled) silently records gameplay. It hooks into the GPU pipeline and causes measurable frame time spikes, especially on mid-range GPUs.",
    "Yes — disable Game DVR",
    "Disables AppCaptureEnabled, GameDVR_Enabled, and GameBarPresenceWriter. Removes GPU pipeline hook. Measurable FPS improvement.",
    "No — keep Game DVR",
    "Keeps built-in game recording. Alt+G to save last 30 seconds still works.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableFullscreenOptimizations",
    "Gamepad2",
    "Fullscreen",
    "Disable fullscreen optimizations?",
    "Windows adds a compatibility layer to fullscreen apps. Disabling it gives you true fullscreen with lower input lag.",
    "Yes — disable them",
    "True fullscreen mode. Lower input delay.",
    "No — keep them enabled",
    "Keeps the Windows compatibility layer.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableDynamicTick",
    "Clock",
    "Dynamic Tick",
    "Disable dynamic tick for lower latency?",
    "Windows adjusts its internal timer dynamically. Fixing it gives more consistent timing, but uses slightly more power.",
    "Yes — disable dynamic tick",
    "More consistent timing. Good for competitive gaming.",
    "No — keep dynamic tick",
    "Keeps the power-saving timer behavior.",
    {
      note: "Advanced tweak. Best for dedicated gaming desktops only.",
      visibility: { minPreset: "aggressive", excludeLaptop: true },
      yesBadge: "Advanced",
      yesBadgeColor: "bg-amber-500/15 text-amber-400",
    },
  ),
  makeBooleanQuestion(
    "removeEdge",
    "Globe",
    "Edge Removal",
    "Completely remove Microsoft Edge?",
    "This permanently deletes Edge from your system. This cannot be undone from within Windows.",
    "Yes — remove Edge",
    "Only for users who are 100% sure they don't need Edge.",
    "No — keep Edge installed",
    "Keep Edge installed. The suppression options above are enough.",
    {
      note: "Make sure you have another browser installed first. Some Windows features may break.",
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
    "Keep WebView2 for app compatibility?",
    "WebView2 is a hidden component that many apps (Teams, Widgets, Electron apps) need to work. Removing it WILL break these apps.",
    "Yes — keep WebView2",
    "Keep it. Most PCs need this for apps to work properly.",
    "No — remove WebView2",
    "Remove it. Only for stripped systems where you accept things may break.",
    {
      visibility: { minPreset: "aggressive" },
      yesBadge: "Recommended",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "reduceMitigations",
    "Shield",
    "CPU Security",
    "Reduce CPU security protections for more speed?",
    "Disabling Spectre mitigations can give 5-10% more performance, but removes important security protections.",
    "Yes — reduce protections",
    "More performance, less security. For dedicated gaming rigs only.",
    "No — keep protections",
    "Keep security protections. Recommended for most systems.",
    {
      note: "Only consider this on isolated gaming PCs that don't browse the web or handle sensitive data.",
      visibility: { onlyPreset: "expert", excludeWorkPc: true },
      yesBadge: "High Risk",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableHvci",
    "Shield",
    "Kernel Protection",
    "Disable kernel code integrity protection?",
    "HVCI is a security feature that verifies code running in the Windows kernel. Disabling it may improve performance but weakens security.",
    "Yes — disable HVCI",
    "For users who understand the kernel security tradeoff.",
    "No — keep HVCI enabled",
    "Keep the protection. Recommended.",
    {
      note: "Some anti-cheat systems (like Vanguard) may be affected.",
      visibility: { onlyPreset: "expert", excludeWorkPc: true },
      yesBadge: "High Risk",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableDefender",
    "Shield",
    "Windows Defender",
    "Completely disable Windows Defender?",
    "This removes ALL antivirus protection. Your PC will have zero malware scanning. This is the most aggressive option in the entire wizard.",
    "Yes — disable Defender entirely",
    "No antivirus at all. Maximum performance, zero protection.",
    "No — keep Defender active",
    "Keep Defender active. Strongly recommended.",
    {
      note: "Cannot be easily re-enabled. Only for isolated gaming PCs that never browse or run unknown software.",
      visibility: { onlyPreset: "expert", excludeWorkPc: true },
      yesBadge: "Extreme Risk",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableWindowsUpdate",
    "Shield",
    "Windows Update",
    "Stop all Windows updates?",
    "Disables Windows Update completely. You will NOT receive security patches, bug fixes, or driver updates unless you manually re-enable it.",
    "Yes — stop all updates",
    "Full control. No surprise downloads or reboots.",
    "No — keep updates",
    "Keep updates. Security patches are important.",
    {
      note: "This disables 5 services. It's the honest version of what many debloat tools do silently.",
      visibility: { minPreset: "aggressive", excludeWorkPc: true },
      yesBadge: "High Risk",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableLlmnr",
    "Globe",
    "Legacy Protocols",
    "Disable insecure network protocols?",
    "Removes old, vulnerable network protocols (LLMNR, SMBv1, WPAD) that are commonly exploited in attacks.",
    "Yes — disable legacy protocols",
    "Better security. Removes protocols used in real-world hacks.",
    "No — keep legacy protocols",
    "Keep for compatibility with very old network devices.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableIpv6",
    "Globe",
    "IPv6",
    "Disable IPv6?",
    "Most home networks don't use IPv6 yet. Disabling it simplifies your network stack, but some ISPs require it.",
    "Yes — disable IPv6",
    "Simpler network stack. Only if your network doesn't need it.",
    "No — keep IPv6",
    "Recommended unless you're sure your ISP and apps don't need it.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableTeredo",
    "Globe",
    "Teredo",
    "Disable Teredo tunneling?",
    "Teredo is an old workaround for IPv6 compatibility. Almost nothing uses it anymore.",
    "Yes — disable Teredo",
    "Removes an outdated network layer. Safe for almost everyone.",
    "No — keep Teredo",
    "Leave it if you're not sure.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableNetbios",
    "Globe",
    "NetBIOS",
    "Disable NetBIOS?",
    "NetBIOS is an old way for computers to find each other on a network. Modern networks don't need it, but very old printers or NAS devices might.",
    "Yes — disable NetBIOS",
    "Removes an old protocol. Safe unless you have very old network devices.",
    "No — keep NetBIOS",
    "Safer if you have old network equipment.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableNagle",
    "Globe",
    "Network Latency",
    "Disable Nagle's algorithm for lower network latency?",
    "Nagle's algorithm batches small TCP packets to reduce overhead, but adds 40-200ms delay per send. Disabling it (TcpAckFrequency=1, TCPNoDelay=1) sends each packet immediately. Important for competitive gaming and VoIP.",
    "Yes — disable packet batching",
    "Sets TcpAckFrequency=1 and TCPNoDelay=1 on all interfaces. Each packet fires immediately. Measurable ping reduction in online games.",
    "No — keep packet buffering",
    "Keeps Nagle's algorithm. Better throughput for bulk transfers and downloads.",
    {
      note: "Registry: HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\{adapter}. Applied per-adapter.",
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableNicOffloading",
    "Globe",
    "Network Adapter",
    "Switch to low-latency network settings?",
    "Lets your CPU handle network processing directly instead of your network card. Faster for gaming, but uses slightly more CPU.",
    "Yes — low-latency mode",
    "Lower network delay. Best for wired gaming setups.",
    "No — keep default settings",
    "Safer for Wi-Fi, downloads, and general use.",
    {
      visibility: { minPreset: "aggressive" },
      yesBadge: "Advanced",
      yesBadgeColor: "bg-amber-500/15 text-amber-400",
    },
  ),
  makeBooleanQuestion(
    "disableDeliveryOptimization",
    "Globe",
    "Update Sharing",
    "Stop Windows from sharing updates with other PCs?",
    "Windows uploads parts of updates to other computers, using your internet bandwidth in the background.",
    "Yes — disable it",
    "Your bandwidth stays yours. No background uploading.",
    "No — keep it",
    "Lets Windows share updates to help other PCs download faster.",
    {
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableUsbSelectiveSuspend",
    "Battery",
    "USB Power",
    "Stop Windows from putting USB devices to sleep?",
    "Windows puts USB devices to sleep to save power. This can cause your mouse, keyboard, or headset to briefly disconnect.",
    "Yes — keep USB devices awake",
    "No more USB disconnects or wake-up delays.",
    "No — keep USB power saving",
    "Saves a bit of power. Better for laptops.",
    {
      visibility: { minPreset: "aggressive", excludeLaptop: true },
    },
  ),
  makeBooleanQuestion(
    "disablePcieLinkStatePm",
    "Battery",
    "PCIe Power",
    "Disable PCIe power saving?",
    "Your GPU and SSD connect through PCIe. Power saving mode adds tiny delays when they wake up from idle. On desktops, disabling this is safe.",
    "Yes — disable PCIe power saving",
    "Faster response from GPU and SSD. No wake-up delays.",
    "No — keep PCIe power saving",
    "Saves a small amount of power. Better for laptops.",
    {
      visibility: { minPreset: "aggressive", excludeLaptop: true },
    },
  ),
  makeBooleanQuestion(
    "disableMouseAcceleration",
    "Gamepad2",
    "Mouse Precision",
    "Disable mouse acceleration for raw input?",
    "Windows applies pointer acceleration (EnhancedPointerPrecision) that scales mouse movement non-linearly. Competitive gamers need 1:1 input where physical distance = cursor distance, regardless of speed.",
    "Yes — disable acceleration",
    "Sets MouseSpeed=0, MouseThreshold1=0, MouseThreshold2=0 in HKCU\\Control Panel\\Mouse. Pure 1:1 mouse input. Your aim is finally yours.",
    "No — keep acceleration",
    "Keeps Windows pointer acceleration. Fine for general desktop use.",
    {
      note: "EnhancedPointerPrecision applies a non-linear curve that makes muscle memory inconsistent. Every competitive FPS player disables this.",
      visibility: { minPreset: "balanced" },
      yesBadge: "Gaming",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "disableStickyKeys",
    "Wrench",
    "Sticky Keys",
    "Disable Sticky Keys and related shortcuts?",
    "Pressing Shift 5 times triggers a Sticky Keys popup. Filter Keys and Toggle Keys have similar shortcuts. Every gamer has been interrupted by this at least once during the worst possible moment.",
    "Yes — disable accessibility shortcuts",
    "Disables Sticky Keys (Flags=506), Filter Keys, and Toggle Keys activation shortcuts. No more surprise popups mid-game.",
    "No — keep accessibility shortcuts",
    "Keeps Shift-5x, right Shift hold, and Num Lock shortcuts active.",
    {
      note: "Registry: HKCU\\Control Panel\\Accessibility\\StickyKeys (Flags=\"506\"). This only disables the keyboard shortcuts, not the features themselves if enabled through Settings.",
    },
  ),
  makeBooleanQuestion(
    "disableFaultTolerantHeap",
    "Cpu",
    "FTH",
    "Disable Fault Tolerant Heap?",
    "FTH monitors crashing apps and silently applies heap mitigations (extra padding, delayed frees) to \"fix\" them. This adds memory overhead and hides real bugs instead of fixing them. Gamers don't need Windows babysitting their heap.",
    "Yes — disable FTH",
    "Sets HKLM\\SOFTWARE\\Microsoft\\FTH → Enabled=0. Removes hidden heap overhead. Apps crash honestly instead of running slowly.",
    "No — keep FTH enabled",
    "Keeps Windows auto-fixing unstable apps with heap padding.",
    {
      note: "FTH was designed for enterprises running legacy apps. On a gaming PC, the overhead is pure waste.",
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableMPOs",
    "Gamepad2",
    "Multi-Plane Overlays",
    "Disable Multi-Plane Overlays (MPOs)?",
    "MPOs (iFlip) let the GPU compositor use hardware overlay planes for rendering. On some GPU/monitor combos, this causes frame pacing issues, black screen flickers, and inconsistent frame times. Disabling forces classic single-plane composition.",
    "Yes — disable MPOs",
    "Sets OverlayTestMode=5 in HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm. Forces classic composition. Fixes frame pacing on affected hardware.",
    "No — keep MPOs enabled",
    "Keeps hardware overlay planes. Works fine on most hardware.",
    {
      note: "Known to cause issues with mixed refresh rate multi-monitor setups and certain NVIDIA/AMD driver versions. Disabling is a common fix for stuttering.",
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableLastAccessTime",
    "HardDrive",
    "File Timestamps",
    "Disable NTFS last access timestamps?",
    "NTFS updates the last access time on every file read. That's a write operation for every read — an absurd default. Disabling it reduces disk writes noticeably on HDDs and marginally on SSDs.",
    "Yes — disable last access timestamps",
    "Runs fsutil behavior set disablelastaccess 1. Fewer disk writes on every file open. Windows Server has this disabled by default — desktop Windows just forgot.",
    "No — keep timestamps",
    "Keeps NTFS last access time updates. Needed for some backup and audit tools.",
    {
      note: "Windows Server disables this by default. The fact that desktop Windows doesn't tells you everything about Microsoft's priorities.",
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableDevicePowerSaving",
    "Battery",
    "Device Power Saving",
    "Disable power saving on USB, NIC, and PCI devices?",
    "Windows puts USB controllers, network adapters, and PCI devices into low-power states when idle. This adds wake latency (1-10ms) that causes input lag, network hiccups, and audio dropouts on desktops.",
    "Yes — keep all devices fully powered",
    "Disables MSPower_DeviceEnable power management on USB, NIC, and PCI devices. Eliminates device wake latency. Your peripherals never sleep.",
    "No — keep device power saving",
    "Lets Windows put idle devices to sleep. Saves a few watts on desktops.",
    {
      note: "Uses WMI MSPower_DeviceEnable to disable power management per-device. Only makes sense on desktops — laptops need this for battery life.",
      visibility: { minPreset: "balanced", excludeLaptop: true },
    },
  ),
  makeBooleanQuestion(
    "legacyFlipPresentation",
    "Gamepad2",
    "Flip Mode",
    "Force Legacy Flip (true exclusive fullscreen)?",
    "Modern Windows uses composed flip (DWM adds a frame of latency). Legacy Flip bypasses DWM entirely for the lowest possible input-to-display latency. This is what competitive gamers use.",
    "Yes — force Legacy Flip",
    "Sets GameDVR_DXGIHonorFSEWindowsCompatible=1 and GameDVR_FSEBehavior=2. Bypasses DWM composition. Lowest possible display latency.",
    "No — keep composed flip",
    "Keeps modern Windows flip model. More compatible with overlays and alt-tab.",
    {
      note: "Registry: HKCU\\System\\GameConfigStore. Legacy Flip breaks some overlay software (Discord, Steam). Test per-game.",
      visibility: { minPreset: "aggressive" },
    },
  ),
  makeBooleanQuestion(
    "disableStoreAutoUpdates",
    "HardDrive",
    "Store Updates",
    "Disable automatic Microsoft Store app updates?",
    "Microsoft Store downloads and installs app updates in the background without asking. This consumes bandwidth, CPU, and can happen during gaming sessions.",
    "Yes — disable auto-updates",
    "Sets AutoDownload=2 policy. Store apps won't update automatically. You can still update manually from the Store.",
    "No — keep auto-updates",
    "Keeps automatic Store app updates. Apps stay current without manual intervention.",
    {
      note: "Registry: HKLM\\SOFTWARE\\Policies\\Microsoft\\WindowsStore. Manual updates still work — you just choose when.",
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableAutoMaintenance",
    "HardDrive",
    "Auto Maintenance",
    "Disable Windows automatic maintenance?",
    "Windows runs defrag, security scans, and cleanup tasks on a schedule. These tasks can cause sudden CPU/disk spikes during gaming or work, and wake your PC from sleep.",
    "Yes — disable auto maintenance",
    "Sets MaintenanceDisabled=1. No more surprise defrag, security scans, or cleanup during sessions. You run maintenance when YOU choose.",
    "No — keep auto maintenance",
    "Keeps the automatic housekeeping schedule. Good if you want Windows to self-maintain.",
    {
      note: "Registry: HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Schedule\\Maintenance. Run 'cleanmgr' manually when needed.",
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "fullDefenderDisable",
    "Shield",
    "Full Defender Kill",
    "Completely disable Windows Defender at the service level?",
    "The nuclear option. Disables WinDefend, WdFilter, WdBoot, WdNisSvc, SecurityHealthService, wscsvc, Sense, MsSecCore — all 9 Defender services plus SmartScreen, WTDS, and cloud protection. Zero antivirus. Zero overhead. You must disable Tamper Protection in Windows Security settings first.",
    "Yes — kill Defender completely",
    "Disables 9 services, 12+ registry keys. MsMpEng.exe gone forever. ~500MB RAM freed, measurable FPS improvement. Zero protection.",
    "No — keep Defender running",
    "Keeps Defender real-time protection. Recommended for any internet-connected PC.",
    {
      note: "Requires Tamper Protection to be manually disabled first (Settings → Windows Security → Virus & Threat Protection → Manage Settings). Without this, service changes will be reverted on reboot.",
      visibility: { minPreset: "expert" },
      yesBadge: "EXTREME",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableVulnerableDriverBlocklist",
    "Shield",
    "Driver Blocklist",
    "Disable the Vulnerable Driver Blocklist?",
    "Microsoft blocks drivers with known vulnerabilities from loading. Disabling this allows kernel tools like RW-Everything (used for XHCI IMOD tuning) and older hardware drivers that Microsoft has blacklisted.",
    "Yes — allow all drivers",
    "Sets VulnerableDriverBlocklistEnable=0. Required for RW-Everything, MSI Utility, and some legacy hardware. You're responsible for driver safety.",
    "No — keep the blocklist",
    "Keeps Microsoft's driver blocklist active. Safer but blocks some performance tuning tools.",
    {
      note: "Registry: HKLM\\SYSTEM\\CurrentControlSet\\Control\\CI\\Config. Only disable if you specifically need a blocked tool like RW-Everything.",
      visibility: { minPreset: "expert" },
      yesBadge: "Risky",
      yesBadgeColor: "bg-amber-500/15 text-amber-400",
      yesDanger: true,
    },
  ),
  makeBooleanQuestion(
    "disableCpuMitigations",
    "Cpu",
    "CPU Mitigations",
    "Disable Spectre/Meltdown CPU security mitigations?",
    "Modern CPUs have hardware mitigations for Spectre V1/V2/V4, Meltdown, MDS, and L1TF. These add 2-15% performance overhead on syscall-heavy workloads. Disabling them renames the microcode update DLL (requires TrustedInstaller) and sets FeatureSettingsOverride=3.",
    "Yes — disable CPU mitigations",
    "Renames mcupdate_GenuineIntel.dll / mcupdate_AuthenticAMD.dll and sets FeatureSettings to disable all mitigations. 2-15% perf gain on CPU-bound workloads.",
    "No — keep mitigations active",
    "Keeps all CPU security mitigations. Recommended for any system handling sensitive data.",
    {
      note: "Requires TrustedInstaller elevation. Exposes system to Spectre, Meltdown, MDS, L1TF. Only for air-gapped dedicated gaming PCs. The DLL rename is reversed by renaming back.",
      visibility: { minPreset: "expert" },
      yesBadge: "EXTREME",
      yesBadgeColor: "bg-red-500/15 text-red-400",
      yesDanger: true,
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
    [
      "memory.disable-compression",
      "perf.disable-ndu",
      "perf.disable-prefetch",
      "perf.svchost-split-threshold",
      "perf.disable-page-combining",
    ],
    "You chose to keep Windows memory compression and related memory subsystem defaults.",
    {
      onTrue: {
        requiresReboot: true,
      },
    },
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
          "services.disable-diagtrack",
          "services.disable-dmwappushservice",
          "services.disable-wer-service",
          "tasks.disable-telemetry-tasks",
          "tasks.disable-feedback-tasks",
          "tasks.disable-device-census",
        ],
        blockActions: ["privacy.disable-siuf"],
        blockReason: "You chose the lighter telemetry reduction profile.",
        estimatedActions: 10,
        estimatedBlocked: 1,
      },
      {
        value: "aggressive",
        includeActions: [
          "privacy.disable-telemetry",
          "privacy.disable-ceip",
          "privacy.disable-error-reporting",
          "privacy.disable-siuf",
          "services.disable-diagtrack",
          "services.disable-dmwappushservice",
          "services.disable-diagnostic-services",
          "services.disable-pca-service",
          "services.disable-wer-service",
          "tasks.disable-telemetry-tasks",
          "tasks.disable-diagnostic-tasks",
          "tasks.disable-feedback-tasks",
          "tasks.disable-cloud-content-tasks",
          "tasks.disable-flighting-tasks",
          "tasks.disable-speech-tasks",
          "tasks.disable-maps-tasks",
          "tasks.disable-device-census",
        ],
        estimatedActions: 18,
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
    [
      "network.disable-llmnr",
      "network.disable-smbv1",
      "network.disable-wpad",
    ],
    "You chose to keep LLMNR, SMBv1, and WPAD legacy protocols enabled.",
    {
      onTrue: {
        warnings: ["Disabling legacy protocols may affect old NAS devices or file-sharing setups."],
        requiresReboot: true,
      },
    },
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
    ["security.disable-delivery-optimization", "services.disable-delivery-optimization"],
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
    [
      "shell.restore-classic-context-menu",
      "shell.remove-share-context",
      "shell.remove-give-access-to",
      "shell.remove-cast-to-device",
      "shell.remove-include-in-library",
      "shell.remove-troubleshoot-compatibility",
      "shell.remove-edit-with-paint3d",
    ],
    "You chose to keep the default Windows 11 compact context menu and shell clutter.",
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
  disableDefender: createBooleanBehavior(
    [
      "security.disable-defender-realtime",
      "security.disable-defender-cloud",
      "security.disable-vbs",
    ],
    "You chose to keep Windows Defender and VBS active.",
    {
      onTrue: {
        warnings: [
          "Disabling Defender removes all real-time malware protection.",
          "Disabling VBS may break anti-cheat systems like Vanguard.",
        ],
        requiresReboot: true,
        riskLevel: "expert",
      },
    },
  ),
  disableWindowsUpdate: createBooleanBehavior(
    [
      "services.disable-wuauserv",
      "services.disable-update-orchestrator-svc",
      "services.disable-waasmedic",
      "services.disable-bits",
      "services.disable-delivery-optimization",
      "tasks.disable-update-tasks",
    ],
    "You chose to keep Windows Update services running.",
    {
      onTrue: {
        warnings: [
          "Stopping Windows Update means no security patches will be installed automatically.",
          "You must manually re-enable these services to receive updates.",
        ],
        riskLevel: "aggressive",
      },
    },
  ),
  disableMouseAcceleration: createBooleanBehavior(
    ["perf.disable-pointer-acceleration"],
    "You chose to keep Windows mouse acceleration enabled.",
  ),
  disableStickyKeys: createBooleanBehavior(
    ["perf.disable-sticky-keys"],
    "You chose to keep accessibility keyboard shortcuts active.",
  ),
  disableFaultTolerantHeap: createBooleanBehavior(
    ["perf.disable-fault-tolerant-heap"],
    "You chose to keep Fault Tolerant Heap enabled.",
  ),
  disableMPOs: createBooleanBehavior(
    ["perf.disable-mpos"],
    "You chose to keep Multi-Plane Overlays enabled.",
  ),
  disableLastAccessTime: createBooleanBehavior(
    ["storage.disable-last-access"],
    "You chose to keep NTFS last access timestamps enabled.",
  ),
  disableDevicePowerSaving: createBooleanBehavior(
    ["power.disable-device-power-saving"],
    "You chose to keep device power management enabled.",
  ),
  legacyFlipPresentation: createBooleanBehavior(
    ["perf.legacy-flip-presentation"],
    "You chose to keep modern composed flip. Compatible with overlays.",
  ),
  disableStoreAutoUpdates: createBooleanBehavior(
    ["perf.disable-store-auto-updates"],
    "You chose to keep Store auto-updates enabled.",
  ),
  disableAutoMaintenance: createBooleanBehavior(
    ["perf.disable-auto-maintenance"],
    "You chose to keep automatic maintenance. Windows will self-maintain.",
  ),
  fullDefenderDisable: createBooleanBehavior(
    ["security.full-defender-disable"],
    "You chose to keep Windows Defender active. Smart choice for internet-connected PCs.",
  ),
  disableVulnerableDriverBlocklist: createBooleanBehavior(
    ["security.disable-vulnerable-driver-blocklist"],
    "You chose to keep the driver blocklist. Blocked drivers stay blocked.",
  ),
  disableCpuMitigations: createBooleanBehavior(
    ["security.disable-cpu-mitigations"],
    "You chose to keep CPU security mitigations active. Safer, with minor performance cost.",
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

