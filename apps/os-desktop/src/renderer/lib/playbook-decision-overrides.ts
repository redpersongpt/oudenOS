import type { QuestionnaireAnswers } from "@/stores/decisions-store";
import type { PlaybookResolvedAction, ResolvedPlaybook } from "@/stores/wizard-store";

type MutablePlaybook = ResolvedPlaybook;

function clonePlaybook(playbook: ResolvedPlaybook): MutablePlaybook {
  return {
    ...playbook,
    blockedReasons: [...playbook.blockedReasons],
    phases: playbook.phases.map((phase) => ({
      ...phase,
      actions: phase.actions.map((action) => ({ ...action })),
    })),
  };
}

function findAction(playbook: MutablePlaybook, actionId: string): PlaybookResolvedAction | null {
  for (const phase of playbook.phases) {
    const action = phase.actions.find((entry) => entry.id === actionId);
    if (action) return action;
  }
  return null;
}

function includeAction(playbook: MutablePlaybook, actionId: string): void {
  const action = findAction(playbook, actionId);
  if (!action) return;
  if (action.status === "Blocked" || action.status === "BuildGated") return;
  action.status = "Included";
  action.blockedReason = null;
}

function blockAction(playbook: MutablePlaybook, actionId: string, reason: string): void {
  const action = findAction(playbook, actionId);
  if (!action) return;
  if (action.status === "BuildGated") return;
  action.status = "Blocked";
  action.blockedReason = reason;
}

function includeAll(playbook: MutablePlaybook, actionIds: string[]): void {
  for (const actionId of actionIds) includeAction(playbook, actionId);
}

function blockAll(playbook: MutablePlaybook, actionIds: string[], reason: string): void {
  for (const actionId of actionIds) blockAction(playbook, actionId, reason);
}

function applyBooleanQuestion(
  playbook: MutablePlaybook,
  answer: boolean | null,
  actionIds: string[],
  reasonWhenBlocked: string,
): void {
  if (answer === true) {
    includeAll(playbook, actionIds);
  } else if (answer === false) {
    blockAll(playbook, actionIds, reasonWhenBlocked);
  }
}

function recomputeTotals(playbook: MutablePlaybook): MutablePlaybook {
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
  };
}

export function applyDecisionOverrides(
  basePlaybook: ResolvedPlaybook,
  answers: QuestionnaireAnswers,
): ResolvedPlaybook {
  const playbook = clonePlaybook(basePlaybook);

  applyBooleanQuestion(
    playbook,
    answers.highPerformancePlan,
    ["power.high-performance-plan"],
    "You chose to keep Windows balanced power behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.aggressiveBoostMode,
    ["cpu.aggressive-boost-mode"],
    "You chose not to force aggressive CPU boost behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.minProcessorState100,
    ["cpu.min-processor-state-100"],
    "You chose not to lock minimum processor state to 100%.",
  );
  applyBooleanQuestion(
    playbook,
    answers.optimizeThreadPriority,
    ["cpu.win32-priority-separation"],
    "You chose to keep default Windows thread scheduling behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.globalTimerResolution,
    ["cpu.global-timer-resolution"],
    "You chose to keep modern per-process timer behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableDynamicTick,
    ["cpu.disable-dynamic-tick"],
    "You chose to keep Windows dynamic tick enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableCoreParking,
    ["cpu.disable-core-parking"],
    "You chose to keep CPU core parking behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.gamingMmcss,
    ["scheduler.mmcss-gaming-profile"],
    "You chose not to harden the MMCSS gaming profile.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableMemoryCompression,
    ["memory.disable-compression"],
    "You chose to keep Windows memory compression enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableHags,
    ["gpu.disable-hags"],
    "You chose to keep HAGS at the Windows default.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableGpuTelemetry,
    ["gpu.disable-nvidia-telemetry", "gpu.disable-amd-telemetry"],
    "You chose to keep GPU driver telemetry services active.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableGameDvr,
    ["perf.disable-game-dvr"],
    "You chose to keep Game DVR behavior enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableFullscreenOptimizations,
    ["perf.disable-fullscreen-optimizations"],
    "You chose to keep Windows fullscreen optimizations enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableIndexing,
    ["storage.disable-indexing"],
    "You chose to keep Windows Search indexing enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.stripSearchWebNoise,
    [
      "shell.disable-web-search",
      "shell.disable-search-highlights",
      "shell.disable-search-history",
      "shell.reduce-search-box",
    ],
    "You chose to keep Windows Search web features and history behavior.",
  );

  if (answers.keepPrinterSupport === true) {
    blockAll(playbook, ["services.disable-print-spooler"], "You said this machine still needs printer support.");
  } else if (answers.keepPrinterSupport === false) {
    includeAll(playbook, ["services.disable-print-spooler"]);
  }

  if (answers.keepRemoteAccess === true) {
    blockAll(playbook, ["services.disable-remote-services"], "You said this machine still needs remote access or remote support.");
  } else if (answers.keepRemoteAccess === false) {
    includeAll(playbook, ["services.disable-remote-services"]);
  }

  if (answers.edgeBehavior === "keep") {
    blockAll(
      playbook,
      [
        "appx.disable-edge-preload",
        "appx.disable-edge-default-nag",
        "appx.disable-edge-updates",
      ],
      "You chose to keep Microsoft Edge behavior unchanged.",
    );
  } else if (answers.edgeBehavior === "suppress") {
    includeAll(playbook, ["appx.disable-edge-preload", "appx.disable-edge-default-nag"]);
    blockAll(playbook, ["appx.disable-edge-updates"], "You chose not to freeze Edge updates.");
  } else if (answers.edgeBehavior === "suppress-and-freeze") {
    includeAll(playbook, [
      "appx.disable-edge-preload",
      "appx.disable-edge-default-nag",
      "appx.disable-edge-updates",
    ]);
  }

  applyBooleanQuestion(
    playbook,
    answers.removeEdge,
    ["appx.remove-edge"],
    "You chose to keep the Edge browser installed.",
  );

  if (answers.preserveWebView2 === true) {
    blockAll(playbook, ["appx.remove-edge-webview"], "You chose to preserve WebView2 for app compatibility.");
  } else if (answers.preserveWebView2 === false) {
    includeAll(playbook, ["appx.remove-edge-webview"]);
  }

  applyBooleanQuestion(
    playbook,
    answers.disableCopilot,
    ["shell.disable-copilot"],
    "You chose to keep Copilot available.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableRecall,
    ["privacy.disable-recall"],
    "You chose to keep Recall available.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableClickToDo,
    ["privacy.disable-click-to-do"],
    "You chose to keep Click to Do available.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableAiApps,
    ["privacy.disable-edge-ai", "privacy.disable-paint-ai", "privacy.disable-notepad-ai"],
    "You chose to keep AI features in system apps.",
  );

  if (answers.telemetryLevel === "keep") {
    blockAll(
      playbook,
      [
        "privacy.disable-telemetry",
        "privacy.disable-ceip",
        "privacy.disable-error-reporting",
        "privacy.disable-siuf",
      ],
      "You chose not to reduce Microsoft telemetry in this area.",
    );
  } else if (answers.telemetryLevel === "reduce") {
    includeAll(playbook, [
      "privacy.disable-telemetry",
      "privacy.disable-ceip",
      "privacy.disable-error-reporting",
    ]);
    blockAll(playbook, ["privacy.disable-siuf"], "You chose the lighter telemetry reduction profile.");
  } else if (answers.telemetryLevel === "aggressive") {
    includeAll(playbook, [
      "privacy.disable-telemetry",
      "privacy.disable-ceip",
      "privacy.disable-error-reporting",
      "privacy.disable-siuf",
    ]);
  }

  applyBooleanQuestion(
    playbook,
    answers.disableClipboardHistory,
    ["privacy.disable-clipboard-history"],
    "You chose to keep clipboard history and sync capability.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableActivityFeed,
    ["privacy.disable-activity-feed", "privacy.disable-cloud-content"],
    "You chose to keep activity feed or cloud content behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableLocation,
    ["privacy.disable-location", "privacy.disable-find-my-device"],
    "You chose to keep Windows location-aware features.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableTailoredExperiences,
    [
      "privacy.disable-tailored-experiences",
      "privacy.disable-app-launch-tracking",
      "privacy.disable-online-tips",
    ],
    "You chose to keep tailored experiences and app-launch personalization.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableSpeechPersonalization,
    [
      "privacy.disable-online-speech",
      "privacy.disable-input-personalization",
      "privacy.disable-tipc",
    ],
    "You chose to keep speech and input personalization features.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableSmartScreen,
    ["privacy.disable-smartscreen"],
    "You chose to keep SmartScreen protection enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.reduceMitigations,
    ["security.reduce-ssbd-mitigation"],
    "You chose to keep speculative execution mitigations intact.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableHvci,
    ["security.disable-hvci"],
    "You chose to keep Hypervisor-enforced Code Integrity enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableLlmnr,
    ["network.disable-llmnr"],
    "You chose to keep LLMNR name resolution enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableIpv6,
    ["network.disable-ipv6"],
    "You chose to keep IPv6 enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableTeredo,
    ["network.disable-teredo"],
    "You chose to keep Teredo tunneling enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableNetbios,
    ["network.disable-netbios"],
    "You chose to keep NetBIOS over TCP/IP enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableNagle,
    ["network.disable-nagle"],
    "You chose to keep the default TCP packet coalescing behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableNicOffloading,
    [
      "network.disable-offloading",
      "network.rss-queues-2",
      "network.tcp-autotuning-normal",
    ],
    "You chose to keep default NIC offloading and queue behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableDeliveryOptimization,
    ["security.disable-delivery-optimization"],
    "You chose to keep Delivery Optimization enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableFastStartup,
    ["power.disable-fast-startup"],
    "You chose to keep Fast Startup enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableHibernation,
    ["power.disable-hibernation"],
    "You chose to keep hibernation enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableUsbSelectiveSuspend,
    ["power.disable-usb-selective-suspend"],
    "You chose to keep USB selective suspend enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disablePcieLinkStatePm,
    ["power.disable-pcie-link-state-pm"],
    "You chose to keep PCIe link-state power management enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableAudioEnhancements,
    ["audio.disable-enhancements"],
    "You chose to keep Windows audio enhancements enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.enableAudioExclusiveMode,
    ["audio.exclusive-mode"],
    "You chose not to enable exclusive-mode audio control.",
  );
  applyBooleanQuestion(
    playbook,
    answers.restoreClassicContextMenu,
    ["shell.restore-classic-context-menu"],
    "You chose to keep the default Windows 11 compact context menu.",
  );
  applyBooleanQuestion(
    playbook,
    answers.enableEndTask,
    ["shell.enable-end-task"],
    "You chose to keep the default taskbar right-click behavior.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableBackgroundApps,
    ["startup.disable-background-apps"],
    "You chose to keep background app execution enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableAutomaticMaintenance,
    ["startup.disable-automatic-maintenance"],
    "You chose to keep Windows automatic maintenance enabled.",
  );
  applyBooleanQuestion(
    playbook,
    answers.enableGameMode,
    ["startup.enable-game-mode"],
    "You chose not to force Game Mode on.",
  );
  applyBooleanQuestion(
    playbook,
    answers.disableTransparency,
    ["perf.disable-transparency"],
    "You chose to keep Windows transparency effects enabled.",
  );

  return recomputeTotals(playbook);
}
