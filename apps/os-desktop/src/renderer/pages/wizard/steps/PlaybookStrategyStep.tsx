// ─── Playbook Strategy — Deep Questionnaire ─────────────────────────────────
// One question per screen. Every answer maps to real playbook actions or real
// preservation blocks applied in Playbook Review / Apply.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Battery,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  Gamepad2,
  Globe,
  HardDrive,
  Info,
  MonitorSpeaker,
  Search,
  Shield,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import {
  useDecisionsStore,
  type QuestionnaireAnswers,
  type AggressionPreset,
  type EdgeBehavior,
  type TelemetryLevel,
} from "@/stores/decisions-store";
import { useWizardStore } from "@/stores/wizard-store";

type QuestionValue = string | boolean;

interface QuestionOption {
  value: QuestionValue;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
}

interface QuestionDefinition {
  key: keyof QuestionnaireAnswers;
  icon: LucideIcon;
  label: string;
  title: string;
  desc: string;
  note?: string;
  options: QuestionOption[];
  condition?: (answers: QuestionnaireAnswers, context: { isLaptop: boolean; isWorkPc: boolean }) => boolean;
}

function Option({
  selected,
  onClick,
  title,
  desc,
  badge,
  badgeColor,
  danger,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? danger
            ? "border-red-500/30 bg-red-500/[0.05]"
            : "border-brand-500/30 bg-brand-500/[0.06]"
          : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.10]"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
            selected
              ? danger
                ? "bg-red-500"
                : "bg-brand-500"
              : "border border-white/[0.15]"
          }`}
        >
          {selected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[13px] font-semibold ${selected ? "text-ink" : "text-ink-secondary"}`}>
              {title}
            </span>
            {badge && (
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeColor ?? "bg-white/[0.06] text-ink-muted"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-[1.6] text-ink-tertiary">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function Screen({
  icon: Icon,
  label,
  title,
  desc,
  note,
  children,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  desc: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-5 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-400" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">{label}</span>
        </div>
        <h2 className="text-[18px] font-bold tracking-tight text-ink leading-snug">{title}</h2>
        <p className="mt-2 max-w-[560px] text-[11px] leading-[1.65] text-ink-secondary">{desc}</p>
        {note && (
          <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-ink-muted">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="leading-relaxed">{note}</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-thin space-y-2.5">{children}</div>
    </div>
  );
}

function makeBooleanQuestion(
  key: keyof QuestionnaireAnswers,
  icon: LucideIcon,
  label: string,
  title: string,
  desc: string,
  yesTitle: string,
  yesDesc: string,
  noTitle: string,
  noDesc: string,
  note?: string,
  condition?: QuestionDefinition["condition"],
  yesBadge?: string,
  yesBadgeColor?: string,
  yesDanger?: boolean,
): QuestionDefinition {
  return {
    key,
    icon,
    label,
    title,
    desc,
    note,
    condition,
    options: [
      { value: true, title: yesTitle, desc: yesDesc, badge: yesBadge, badgeColor: yesBadgeColor, danger: yesDanger },
      { value: false, title: noTitle, desc: noDesc },
    ],
  };
}

export function PlaybookStrategyStep() {
  const { answers, impact, setAnswer } = useDecisionsStore();
  const { detectedProfile, playbookPreset, setPlaybookPreset, setStepReady } = useWizardStore();

  const context = useMemo(
    () => ({
      isLaptop: detectedProfile?.id === "gaming_laptop" || detectedProfile?.id === "office_laptop",
      isWorkPc: detectedProfile?.isWorkPc ?? false,
    }),
    [detectedProfile],
  );

  const questions = useMemo<QuestionDefinition[]>(() => [
    {
      key: "aggressionPreset",
      icon: Shield,
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
      Battery,
      "Power Plan",
      "Activate the Windows High Performance power plan?",
      "This forces Windows away from the default power-saving bias so the CPU stops dipping as aggressively between bursts.",
      "Yes — use High Performance",
      "Better responsiveness and less ramp-up delay under game and desktop load.",
      "No — keep Windows power defaults",
      "Safer for mixed-use or battery-conscious machines.",
      "This is the most defensible baseline tweak from both enthusiast guides and real-world tuning work.",
      undefined,
      "Core",
      "bg-brand-500/15 text-brand-400",
    ),
    makeBooleanQuestion(
      "optimizeThreadPriority",
      Cpu,
      "CPU Scheduler",
      "Apply foreground-biased thread priority tuning?",
      "This maps to Win32PrioritySeparation. It pushes the active foreground workload ahead of background noise.",
      "Yes — bias CPU time toward the active app",
      "Useful for games and latency-sensitive foreground work.",
      "No — keep Windows scheduler defaults",
      "Better if you prefer untouched desktop multitasking behavior.",
      "Oneclick exposes multiple values here; redcore OS only asks what it can actually apply today.",
      (state) => state.aggressionPreset !== "conservative",
      "Oneclick Core",
      "bg-brand-500/15 text-brand-400",
    ),
    makeBooleanQuestion(
      "globalTimerResolution",
      Clock,
      "Timer Behavior",
      "Restore global timer-resolution requests on supported Windows builds?",
      "This is the real Windows 11 timer question redcore OS can honestly apply: whether the system should honor global timer-resolution behavior again.",
      "Yes — restore global timer behavior",
      "Lets one process' timer request benefit the whole system again.",
      "No — keep modern per-process timer behavior",
      "More power-efficient and closer to stock Windows scheduling.",
      "This is not the fake 0.5 ms lock many tools advertise. It is the actual GlobalTimerResolutionRequests path the playbook contains.",
      (state) => state.aggressionPreset !== "conservative",
      "PC-Tuning",
      "bg-brand-500/15 text-brand-400",
    ),
    makeBooleanQuestion(
      "disableIndexing",
      HardDrive,
      "Search Indexing",
      "Disable Windows Search indexing?",
      "Indexing keeps background I/O and CPU pressure around so Start and Explorer search stay fast. Turning it off trades convenience for quietness.",
      "Yes — disable indexing",
      "Reduces background disk churn and CPU spikes from the indexer.",
      "No — keep indexing enabled",
      "Better if you actively use Start or file search.",
      "This is the measurable part of the old “search removal” culture that actually exists in the playbook.",
      undefined,
      "Search",
      "bg-brand-500/15 text-brand-400",
    ),
    makeBooleanQuestion(
      "stripSearchWebNoise",
      Search,
      "Search Web Noise",
      "Strip web results, search highlights, history, and the oversized taskbar search box?",
      "This cuts the Microsoft content layer around Search without pretending to fully remove SearchHost.",
      "Yes — shrink Search to a local-only utility",
      "Cleaner Start/Search surface with less suggestion spam and history noise.",
      "No — keep Windows Search extras",
      "Best if you like built-in web suggestions or richer search panels.",
      "This is intentionally more honest than claiming complete search removal when the actual playbook applies targeted shell/search actions.",
    ),
    makeBooleanQuestion(
      "keepPrinterSupport",
      Wrench,
      "Printing",
      "Does this machine still need printer support?",
      "If yes, redcore OS will preserve the Print Spooler. If no, it will cut it.",
      "Yes — preserve printer support",
      "Keeps the Print Spooler and avoids surprise printer breakage.",
      "No — safe to disable printing services",
      "Good for stripped gaming machines with no local or network printers.",
      "This question is preservation-driven: the answer directly decides whether the spooler disable action is blocked or applied.",
    ),
    makeBooleanQuestion(
      "keepRemoteAccess",
      Globe,
      "Remote Access",
      "Does this machine still need RDP, remote assistance, or support tools?",
      "If yes, redcore OS preserves remote-access related services. If no, it trims that attack surface.",
      "Yes — preserve remote access capability",
      "Safer for workstations, remote support, or self-hosted remote access workflows.",
      "No — disable remote access services",
      "Good for personal machines that should never accept inbound remote control.",
      "This is the same class of preservation decision Oneclick users often find out too late.",
    ),
    {
      key: "edgeBehavior",
      icon: Globe,
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
      Sparkles,
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
      Eye,
      "Recall",
      "Disable Windows Recall?",
      "Recall is one of the easiest “yes” questions in the whole flow unless you explicitly want AI timeline snapshots.",
      "Yes — disable Recall",
      "Cuts screenshot-history style AI capture behavior entirely.",
      "No — keep Recall available",
      "Only sensible if you actually intend to use it.",
    ),
    makeBooleanQuestion(
      "disableClickToDo",
      Eye,
      "Click To Do",
      "Disable Click to Do?",
      "This trims another Windows 11 AI shell surface that most tuned machines do not need.",
      "Yes — disable it",
      "Less shell clutter and fewer AI-driven hooks.",
      "No — keep it available",
      "Leave the new interaction surface intact.",
    ),
    makeBooleanQuestion(
      "disableAiApps",
      Sparkles,
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
      icon: Shield,
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
      Eye,
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
      Eye,
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
      Globe,
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
      Eye,
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
      Sparkles,
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
      Shield,
      "SmartScreen",
      "Disable SmartScreen reputation checks?",
      "This is a real tradeoff question. It reduces Windows friction, but it also removes one of the last browser/download guardrails people forget they were relying on.",
      "Yes — disable SmartScreen",
      "For stripped personal rigs where you intentionally manage trust yourself.",
      "No — keep SmartScreen",
      "Safer for mixed-use, browsing, and non-lab machines.",
      "Unlike marketing privacy toggles, this one can genuinely increase risk if the machine is used casually.",
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
      "Risky",
      "bg-amber-500/15 text-amber-400",
      true,
    ),
    makeBooleanQuestion(
      "disableFastStartup",
      Zap,
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
      Zap,
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
      MonitorSpeaker,
      "Audio Enhancements",
      "Disable Windows audio enhancements?",
      "PC-Tuning is right to call out that DSP/enhancement layers are often needless overhead unless you intentionally use them.",
      "Yes — turn enhancements off",
      "Cleaner, more predictable audio path with less vendor/DSP interference.",
      "No — keep enhancements",
      "Better if you rely on loudness EQ, virtual surround, or motherboard DSP effects.",
    ),
    makeBooleanQuestion(
      "enableAudioExclusiveMode",
      MonitorSpeaker,
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
      Wrench,
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
      Wrench,
      "Taskbar End Task",
      "Add End Task to taskbar right-click menus?",
      "This is the exact Windows 11 usability tweak you asked for: kill hung apps straight from taskbar right-click without opening Task Manager.",
      "Yes — add End Task",
      "Cleaner emergency-kill path for frozen apps.",
      "No — keep default taskbar right-click behavior",
      "Leave the standard Windows 11 menu intact.",
    ),
    makeBooleanQuestion(
      "disableBackgroundApps",
      HardDrive,
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
      HardDrive,
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
      Gamepad2,
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
      Eye,
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
      Cpu,
      "Boost Policy",
      "Use aggressive processor boost mode?",
      "This keeps the CPU pushing harder under load instead of backing off into friendlier boost policy behavior.",
      "Yes — use aggressive boost",
      "Higher performance bias and quicker sustained turbo behavior.",
      "No — keep stock boost policy",
      "Safer thermally and calmer for mixed-use machines.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "minProcessorState100",
      Cpu,
      "Minimum CPU State",
      "Lock minimum processor state to 100%?",
      "This is the “don’t dip clocks between bursts” question. It is one of the cleaner CPU responsiveness levers in the current playbook.",
      "Yes — keep the floor at 100%",
      "Reduces clock-drop latency between bursts.",
      "No — allow Windows to downscale more freely",
      "Better for thermals and general-purpose efficiency.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableCoreParking",
      Cpu,
      "Core Parking",
      "Disable CPU core parking?",
      "Classic enthusiast latency question. Useful on many desktop gaming systems, less sensible on weaker or office-centric machines.",
      "Yes — unpark cores",
      "Reduces wake-up latency when Windows suddenly needs more threads.",
      "No — keep core parking behavior",
      "Better for efficiency-biased or cooler-running setups.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "gamingMmcss",
      Gamepad2,
      "MMCSS",
      "Apply the tuned MMCSS gaming profile?",
      "This hardens the scheduler profile used for Games under Windows’ multimedia scheduling system.",
      "Yes — apply the tuned gaming profile",
      "Useful for keeping game/media threads favored over background noise.",
      "No — keep MMCSS defaults",
      "Leave multimedia scheduling closer to stock.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableMemoryCompression",
      Cpu,
      "Memory Compression",
      "Disable Windows memory compression?",
      "A sensible question on machines with enough RAM. On RAM-starved systems, the answer can be different.",
      "Yes — disable memory compression",
      "Less CPU spent compressing memory pages; best on healthy-RAM systems.",
      "No — keep memory compression",
      "Safer if you want Windows to defend capacity under pressure.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableHags",
      Gamepad2,
      "GPU Scheduling",
      "Disable Hardware-Accelerated GPU Scheduling (HAGS)?",
      "PC-Tuning is right that HAGS is system-specific. The point here is not blind faith, it’s making the choice explicit.",
      "Yes — disable HAGS",
      "Often chosen for steadier behavior on tuned systems.",
      "No — keep HAGS at the Windows default",
      "Leave GPU scheduling behavior untouched.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableGpuTelemetry",
      Gamepad2,
      "GPU Telemetry",
      "Disable AMD/NVIDIA telemetry services?",
      "Cleans out the always-on driver analytics layer without pretending the GPU driver itself is the problem.",
      "Yes — disable GPU telemetry",
      "Less background service noise from vendor driver stacks.",
      "No — keep GPU telemetry services",
      "Leave vendor analytics services in place.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableGameDvr",
      Gamepad2,
      "Game DVR",
      "Disable Game DVR recording overhead?",
      "This is still one of the most sensible gaming questions to ask because the action is real and the downside is clear.",
      "Yes — disable Game DVR",
      "Less background recording overhead and less frame-time noise.",
      "No — keep Game DVR behavior",
      "Keep built-in capture behavior intact.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableFullscreenOptimizations",
      Gamepad2,
      "Fullscreen Optimizations",
      "Disable Windows fullscreen optimizations?",
      "Useful for users chasing predictable fullscreen behavior and lower input-path weirdness.",
      "Yes — disable them",
      "Closer to classic exclusive-fullscreen behavior in many cases.",
      "No — keep them enabled",
      "Leave the Windows fullscreen layer intact.",
      undefined,
      (state) => state.aggressionPreset !== "conservative",
    ),
    makeBooleanQuestion(
      "disableDynamicTick",
      Clock,
      "Dynamic Tick",
      "Disable dynamic tick for lower timer jitter?",
      "This is a proper enthusiast question pulled from the real playbook, not a marketing placeholder.",
      "Yes — disable dynamic tick",
      "Potentially tighter timing consistency on tuned desktops.",
      "No — keep dynamic tick",
      "Leave Windows’ idle-saving timer behavior intact.",
      "Best reserved for aggressive or expert profiles because it is not a universal improvement on every system.",
      (state, ctx) => !ctx.isLaptop && (state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert"),
      "Advanced",
      "bg-amber-500/15 text-amber-400",
    ),
    makeBooleanQuestion(
      "removeEdge",
      Globe,
      "Edge Removal",
      "Remove the Edge browser completely?",
      "This is where the tone changes from cleanup to irreversible system surgery.",
      "Yes — remove Edge",
      "Only for people who already know exactly why they want it gone and already have another browser installed.",
      "No — keep the browser installed",
      "Stick with suppression only.",
      "Removing Edge is not the same thing as cleaning it up. This is one of the few questions that deserves real fear.",
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
      "Danger",
      "bg-red-500/15 text-red-400",
      true,
    ),
    makeBooleanQuestion(
      "preserveWebView2",
      Globe,
      "WebView2",
      "Preserve WebView2 for app compatibility?",
      "This question exists because too many debloat tools pretend WebView2 is “just Edge” and then people wonder why app surfaces start breaking.",
      "Yes — preserve WebView2",
      "Recommended unless you know your full app stack and are intentionally stripping embedded browser runtimes.",
      "No — allow WebView2 removal",
      "Only for stripped personal systems where you explicitly accept the blast radius.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
      "Recommended",
      "bg-brand-500/15 text-brand-400",
    ),
    makeBooleanQuestion(
      "reduceMitigations",
      Shield,
      "Spectre / Mitigations",
      "Reduce speculative-execution mitigations for a potential (%5-%10) performance increase?",
      "This is the exact kind of question that makes or breaks credibility: the performance folklore is real enough to ask about, but the security cost is real too. In our current playbook this maps to the SSBD-side mitigation reduction path.",
      "Yes — reduce those mitigations",
      "For dedicated personal rigs where you knowingly trade security for a possible latency/syscall win.",
      "No — keep mitigations intact",
      "Safer default, especially on anything used for browsing, work, or sensitive data.",
      "PC-Tuning is right to frame this as benchmark-first, not religion-first. redcore OS asks it explicitly and only applies the real mitigation action it actually has.",
      (state, ctx) => !ctx.isWorkPc && state.aggressionPreset === "expert",
      "High Risk",
      "bg-red-500/15 text-red-400",
      true,
    ),
    makeBooleanQuestion(
      "disableHvci",
      Shield,
      "HVCI",
      "Disable Hypervisor-enforced Code Integrity (HVCI)?",
      "Another expert-only security/performance tradeoff. This is not a casual checkbox.",
      "Yes — disable HVCI",
      "Useful only if you understand the kernel-security tradeoff and do not rely on that baseline.",
      "No — keep HVCI enabled",
      "Safer and friendlier for security baselines or anti-cheat requirements.",
      "Vanguard and some hardened environments may care about this. That is exactly why the question exists.",
      (state, ctx) => !ctx.isWorkPc && state.aggressionPreset === "expert",
      "High Risk",
      "bg-red-500/15 text-red-400",
      true,
    ),
    makeBooleanQuestion(
      "disableLlmnr",
      Globe,
      "LLMNR",
      "Disable Link-Local Multicast Name Resolution (LLMNR)?",
      "A sensible hardening/cleanup protocol question that many tuned systems can say yes to.",
      "Yes — disable LLMNR",
      "Reduces a noisy legacy name-resolution surface.",
      "No — keep LLMNR",
      "Leave local multicast name resolution behavior alone.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
    ),
    makeBooleanQuestion(
      "disableIpv6",
      Globe,
      "IPv6",
      "Disable IPv6?",
      "Classic tweak, often overused. redcore OS asks it directly instead of hiding it behind a vague “network tweak” checkbox.",
      "Yes — disable IPv6",
      "Only if you know your environment does not need it.",
      "No — keep IPv6 enabled",
      "Recommended for most normal networks unless you have a reason not to.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
    ),
    makeBooleanQuestion(
      "disableTeredo",
      Globe,
      "Teredo",
      "Disable Teredo tunneling?",
      "Useful if you want legacy Microsoft tunneling layers out of the way.",
      "Yes — disable Teredo",
      "Less tunneling cruft in the networking stack.",
      "No — keep Teredo",
      "Leave it untouched if you are not sure.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
    ),
    makeBooleanQuestion(
      "disableNetbios",
      Globe,
      "NetBIOS",
      "Disable NetBIOS over TCP/IP?",
      "A very PC-Tuning-style question: specific, boring, and actually consequential on the right systems.",
      "Yes — disable NetBIOS",
      "Good for stripped personal machines that do not rely on old SMB name resolution paths.",
      "No — keep NetBIOS",
      "Safer if you are not certain about your local-network dependencies.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
    ),
    makeBooleanQuestion(
      "disableNagle",
      Globe,
      "Nagle",
      "Disable the Nagle algorithm for lower packet coalescing latency?",
      "This is the kind of network question that sounds impressive and can absolutely be the wrong answer on the wrong setup.",
      "Yes — disable Nagle",
      "For users chasing lower send-side latency in very specific workloads.",
      "No — keep default TCP behavior",
      "Safer for general networking behavior.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
    ),
    makeBooleanQuestion(
      "disableNicOffloading",
      Globe,
      "NIC Offloading",
      "Disable NIC offloading and switch to a low-latency adapter preset?",
      "This applies the current playbook’s offloading, RSS queue, and autotuning decisions as a bundle.",
      "Yes — use the low-latency NIC preset",
      "For wired enthusiast setups where throughput tradeoffs are acceptable.",
      "No — keep default NIC offloading behavior",
      "Safer for mixed-use, higher-throughput, or Wi-Fi-heavy machines.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
      "Advanced",
      "bg-amber-500/15 text-amber-400",
    ),
    makeBooleanQuestion(
      "disableDeliveryOptimization",
      Globe,
      "Delivery Optimization",
      "Disable Windows Delivery Optimization bandwidth sharing?",
      "A good real-world question because it affects how Windows uses your bandwidth in the background.",
      "Yes — disable it",
      "Less background peer-distribution behavior from Windows Update.",
      "No — keep it",
      "Leave Windows update-sharing behavior intact.",
      undefined,
      (state) => state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert",
    ),
    makeBooleanQuestion(
      "disableUsbSelectiveSuspend",
      Battery,
      "USB Suspend",
      "Disable USB selective suspend?",
      "Useful for users chasing fewer wake-latency issues on input devices and attached hardware.",
      "Yes — disable it",
      "Reduces Windows’ tendency to put USB devices to sleep.",
      "No — keep USB selective suspend",
      "Safer for efficiency and some mobile setups.",
      undefined,
      (state, ctx) => !ctx.isLaptop && (state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert"),
    ),
    makeBooleanQuestion(
      "disablePcieLinkStatePm",
      Battery,
      "PCIe Link States",
      "Disable PCIe link-state power management?",
      "Good enthusiast question. Specific, measurable, and not something average users think to ask.",
      "Yes — disable PCIe link-state PM",
      "Cuts another latency source from the power stack on desktops.",
      "No — keep PCIe power management",
      "Leave the link-state power-saving behavior intact.",
      undefined,
      (state, ctx) => !ctx.isLaptop && (state.aggressionPreset === "aggressive" || state.aggressionPreset === "expert"),
    ),
  ], []);

  const activeQuestions = useMemo(
    () => questions.filter((question) => !question.condition || question.condition(answers, context)),
    [answers, context, questions],
  );

  const [index, setIndex] = useState(0);
  const clampedIndex = Math.min(index, Math.max(activeQuestions.length - 1, 0));
  const current = activeQuestions[clampedIndex];

  useEffect(() => {
    if (index > activeQuestions.length - 1) {
      setIndex(Math.max(activeQuestions.length - 1, 0));
    }
  }, [activeQuestions.length, index]);

  useEffect(() => {
    const visibleKeys = new Set(activeQuestions.map((question) => question.key));
    for (const question of questions) {
      if (!visibleKeys.has(question.key) && answers[question.key] !== null) {
        setAnswer(question.key, null);
      }
    }
  }, [activeQuestions, answers, questions, setAnswer]);

  useEffect(() => {
    const nextPreset =
      answers.aggressionPreset === "conservative"
        ? "conservative"
        : answers.aggressionPreset === "balanced"
          ? "balanced"
          : answers.aggressionPreset === "aggressive" || answers.aggressionPreset === "expert"
            ? "aggressive"
            : "balanced";

    if (playbookPreset !== nextPreset) {
      setPlaybookPreset(nextPreset);
    }
  }, [answers.aggressionPreset, playbookPreset, setPlaybookPreset]);

  const currentAnswer = current ? answers[current.key] : null;
  const currentAnswered = currentAnswer !== null;
  const allAnswered = activeQuestions.every((question) => answers[question.key] !== null);

  useEffect(() => {
    setStepReady(
      "playbook-strategy",
      activeQuestions.length > 0 && allAnswered && clampedIndex >= activeQuestions.length - 1,
    );
  }, [activeQuestions.length, allAnswered, clampedIndex, setStepReady]);

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-sm text-ink-secondary">
        No strategy questions available for this machine.
      </div>
    );
  }

  const progress = activeQuestions.length > 0 ? ((clampedIndex + 1) / activeQuestions.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col"
    >
      <div className="border-b border-white/[0.05] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">
              Deep Strategy Review
            </p>
            <p className="mt-1 text-[11px] text-ink-secondary">
              Question {clampedIndex + 1} of {activeQuestions.length}
            </p>
          </div>
          <div className="min-w-[220px] max-w-[320px] flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${String(current.key)}-${clampedIndex}`}
            initial={{ opacity: 0, x: 44 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -44 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <Screen
              icon={current.icon}
              label={current.label}
              title={current.title}
              desc={current.desc}
              note={current.note}
            >
              {current.options.map((option) => (
                <Option
                  key={`${String(current.key)}-${String(option.value)}`}
                  selected={currentAnswer === option.value}
                  onClick={() => setAnswer(current.key, option.value)}
                  title={option.title}
                  desc={option.desc}
                  badge={option.badge}
                  badgeColor={option.badgeColor}
                  danger={option.danger}
                />
              ))}
            </Screen>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-white/[0.05] bg-surface-raised/60 px-5 py-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-[10px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-ink-muted">
              <span className="font-mono font-bold text-ink">{impact.estimatedActions}</span> actions
            </span>
            {impact.estimatedPreserved > 0 && (
              <span className="text-amber-400">
                <span className="font-mono font-bold">{impact.estimatedPreserved}</span> preserved
              </span>
            )}
            {impact.rebootRequired && (
              <span className="text-amber-400 text-[9px] font-semibold uppercase tracking-wider">Reboot required</span>
            )}
          </div>
          {impact.warnings.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-red-400/80">
              <AlertTriangle className="h-2.5 w-2.5" />
              {impact.warnings.length} warning{impact.warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            disabled={clampedIndex === 0}
            className={`flex items-center gap-1 text-[11px] font-medium ${
              clampedIndex === 0 ? "text-ink-disabled" : "text-ink-tertiary hover:text-ink"
            }`}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>

          <button
            onClick={() => setIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
            disabled={clampedIndex >= activeQuestions.length - 1 || !currentAnswered}
            className={`flex items-center gap-1 text-[11px] font-medium ${
              clampedIndex >= activeQuestions.length - 1 || !currentAnswered
                ? "text-ink-disabled"
                : "text-ink-tertiary hover:text-ink"
            }`}
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
