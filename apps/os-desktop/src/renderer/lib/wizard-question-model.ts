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
    "This stops Windows from slowing down your CPU to save power. Your PC will respond faster.",
    "Yes — use High Performance",
    "Your PC will feel snappier. CPU won't throttle down between tasks.",
    "No — keep Windows power defaults",
    "Keeps the default power saving behavior. Better for laptops on battery.",
    {
      note: "This is the single most impactful change for desktop performance.",
      yesBadge: "Core",
      yesBadgeColor: "bg-brand-500/15 text-brand-400",
    },
  ),
  makeBooleanQuestion(
    "optimizeThreadPriority",
    "Cpu",
    "CPU Priority",
    "Give more CPU power to the app you're using?",
    "Makes the app in the foreground (your game, your editor) get priority over background tasks.",
    "Yes — prioritize the active app",
    "Games and active apps get more CPU time. Smoother experience.",
    "No — keep default sharing",
    "Keeps the default equal sharing between apps.",
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
    "Timer Fix",
    "Fix the Windows timer for better game performance?",
    "Windows 11 changed how apps share timing. This restores the old behavior that works better for games.",
    "Yes — restore global timer behavior",
    "Better timing accuracy for games and real-time apps.",
    "No — keep modern per-app timer",
    "Keeps the modern per-app timer. Slightly better battery life.",
    {
      note: "This is a real fix, not a placebo. Only applies on supported Windows versions.",
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
    "Windows constantly scans your files in the background to make search faster. Turning this off reduces CPU and disk usage.",
    "Yes — disable indexing",
    "Less background activity. Your PC runs quieter.",
    "No — keep indexing enabled",
    "Keeps fast file search in Start menu and Explorer.",
    {
      note: "This is the measurable part of the old 'search removal' culture that actually exists in the playbook.",
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
    desc: "Edge runs in the background even when you're not using it. We can stop that.",
    note: "Most people should pick 'Suppress'. Full removal is a separate, riskier choice.",
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
    "Copilot is Microsoft's AI assistant built into the taskbar. It uses RAM even when you don't use it.",
    "Yes — remove Copilot",
    "Removes the Copilot button and frees up memory.",
    "No — keep Copilot available",
    "Keeps Copilot available on the taskbar.",
  ),
  makeBooleanQuestion(
    "disableRecall",
    "Eye",
    "Recall",
    "Disable Windows Recall?",
    "Recall takes screenshots of everything you do so AI can search your history. Most people don't want this.",
    "Yes — disable Recall",
    "Stops the screenshot-based activity tracking completely.",
    "No — keep Recall available",
    "Keeps Recall active if you actually want AI to index your screen.",
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
    desc: "Windows sends usage data to Microsoft. We can reduce or aggressively minimize this.",
    note: "Even 'Reduce' makes a big difference. 'Aggressive' goes further by blocking feedback popups too.",
    options: [
      {
        value: "keep" satisfies TelemetryLevel,
        title: "Keep Windows defaults",
        desc: "Leave data collection at Windows defaults.",
      },
      {
        value: "reduce" satisfies TelemetryLevel,
        title: "Reduce data collection",
        desc: "Disables telemetry, error reporting, and customer improvement programs.",
        badge: "Recommended",
        badgeColor: "bg-brand-500/15 text-brand-400",
      },
      {
        value: "aggressive" satisfies TelemetryLevel,
        title: "Maximum privacy",
        desc: "Everything above, plus blocks feedback requests and deeper tracking.",
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
    "Windows uses your activity to show you targeted tips, app suggestions, and ads throughout the system.",
    "Yes — stop personalized suggestions",
    "No more targeted suggestions and app recommendations.",
    "No — keep it",
    "Keeps personalized suggestions in Windows.",
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
    "Fast Startup doesn't fully shut down your PC — it saves a snapshot instead. This can cause driver issues and stale system state.",
    "Yes — disable Fast Startup",
    "Your PC fully shuts down and starts fresh every time.",
    "No — keep Fast Startup",
    "Keeps faster boot times but with potential quirks.",
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
    "Windows puts unused CPU cores to sleep. Waking them takes 1-5 milliseconds, which can cause micro-stutters in games.",
    "Yes — keep all cores active",
    "All cores stay ready. Better for gaming responsiveness.",
    "No — allow core sleeping",
    "Cores sleep when idle. Better for power and temperature.",
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
    "Disables memory compression, fixes a known memory leak, and reduces background disk activity. Best on PCs with 16GB+ RAM and SSD.",
    "Yes — optimize memory",
    "Less CPU overhead and fixes the NDU memory leak bug.",
    "No — keep defaults",
    "Keeps Windows default memory handling.",
    {
      visibility: { minPreset: "balanced" },
    },
  ),
  makeBooleanQuestion(
    "disableHags",
    "Gamepad2",
    "GPU Scheduling",
    "Disable Hardware GPU Scheduling?",
    "HAGS lets the GPU manage its own memory. It works great on some systems but causes issues on others.",
    "Yes — disable HAGS",
    "More predictable GPU behavior. Often preferred for competitive gaming.",
    "No — keep HAGS enabled",
    "Keeps the Windows default GPU scheduling.",
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
    "Game DVR silently records your gameplay in the background. This uses GPU resources and can cause frame drops.",
    "Yes — disable Game DVR",
    "No background recording. Better frame times.",
    "No — keep Game DVR",
    "Keeps the built-in game recording feature.",
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
    "Packet Delay",
    "Disable network packet buffering?",
    "Windows normally groups small network packets together before sending. Disabling this sends each packet immediately, reducing delay in online games.",
    "Yes — send packets immediately",
    "Lower online game latency. Best for competitive gaming.",
    "No — keep packet buffering",
    "Safer for general internet use and downloads.",
    {
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
