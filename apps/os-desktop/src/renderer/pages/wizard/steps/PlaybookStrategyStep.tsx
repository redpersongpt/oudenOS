// ─── Playbook Strategy — Sequential Question Flow ───────────────────────────
// ONE question per screen. Sequential navigation. Branching based on answers.
// Oneclick workflow mapped: power plan, defender, priority sep, timer res, search
// plus expanded redcore-native questions around WebView, networking, optional
// features, audio stack cleanup, and device-manager style risk surfaces.

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Globe, Eye, Briefcase, Gamepad2, Check,
  ChevronRight, ChevronLeft, AlertTriangle, Info, Battery,
  Cpu, Clock, Search,
} from "lucide-react";
import { useDecisionsStore } from "@/stores/decisions-store";
import { useWizardStore } from "@/stores/wizard-store";

// ─── Shared primitives ──────────────────────────────────────────────────────

function Option({ selected, onClick, title, desc, badge, badgeColor, danger }: {
  selected: boolean; onClick: () => void; title: string; desc: string;
  badge?: string; badgeColor?: string; danger?: boolean;
}) {
  return (
    <button onClick={onClick} className={`w-full flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
      selected ? (danger ? "border-red-500/30 bg-red-500/[0.05]" : "border-brand-500/30 bg-brand-500/[0.06]")
      : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.10]"
    }`}>
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
        selected ? (danger ? "bg-red-500" : "bg-brand-500") : "border border-white/[0.15]"
      }`}>
        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-semibold ${selected ? "text-ink" : "text-ink-secondary"}`}>{title}</span>
          {badge && <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeColor ?? "bg-white/[0.06] text-ink-muted"}`}>{badge}</span>}
        </div>
        <p className="mt-1 text-[11px] leading-[1.6] text-ink-tertiary">{desc}</p>
      </div>
    </button>
  );
}

function Toggle({ label, desc, checked, onChange, warning }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; warning?: string;
}) {
  return (
    <button onClick={() => onChange(!checked)} className="w-full flex items-start gap-3.5 rounded-xl border border-white/[0.04] hover:border-white/[0.08] p-4 text-left transition-all">
      <div className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-colors ${
        checked ? "bg-brand-500" : "border border-white/[0.15]"
      }`}>
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ink">{label}</span>
          {warning && <AlertTriangle className="h-3 w-3 text-amber-400" />}
        </div>
        <p className="mt-0.5 text-[10px] leading-[1.6] text-ink-tertiary">{desc}</p>
      </div>
    </button>
  );
}

function Screen({ icon: Icon, label, title, desc, note, children }: {
  icon: typeof Shield; label: string; title: string; desc: string; note?: string; children: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-brand-400" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-brand-400">{label}</span>
        </div>
        <h2 className="text-[17px] font-bold tracking-tight text-ink leading-snug">{title}</h2>
        <p className="mt-2 text-[11px] leading-[1.65] text-ink-secondary max-w-[500px]">{desc}</p>
        {note && (
          <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-ink-muted">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{note}</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-thin space-y-2">{children}</div>
    </div>
  );
}

// ─── Question screens ───────────────────────────────────────────────────────

// Q1 — Transformation depth
function Q1() {
  const { performance: p, setPerformance } = useDecisionsStore();
  return (
    <Screen icon={Shield} label="Transformation Depth" title="How aggressive should the transformation be?" desc="This determines which categories of changes are included. Conservative is always safe. Each level unlocks more powerful but riskier optimizations." note="Conservative is recommended for Work PCs. Balanced is recommended for most personal machines.">
      <Option selected={p.aggressionLevel === "safe"} onClick={() => setPerformance({ aggressionLevel: "safe" })} title="Conservative — privacy and cleanup only" desc="Removes bloatware, disables telemetry, cleans ads and suggestions. Does not touch services, CPU scheduling, or system behavior. Nothing can break." badge="Safest" badgeColor="bg-emerald-500/15 text-emerald-400" />
      <Option selected={p.aggressionLevel === "balanced"} onClick={() => setPerformance({ aggressionLevel: "balanced" })} title="Balanced — cleanup + performance tuning" desc="Everything above, plus: disables unnecessary services, tunes CPU scheduler, disables Game DVR, reduces AI features. Good for gaming PCs and personal machines." badge="Recommended" badgeColor="bg-brand-500/15 text-brand-400" />
      <Option selected={p.aggressionLevel === "aggressive"} onClick={() => setPerformance({ aggressionLevel: "aggressive" })} title="Aggressive — deep system optimization" desc="Everything above, plus: core parking disabled, timer resolution tuned, dynamic tick disabled, PCIe power management off, network latency hardened. Requires reboot." />
      <Option selected={p.aggressionLevel === "expert"} onClick={() => setPerformance({ aggressionLevel: "expert" })} title="Expert — full access including dangerous changes" desc="Everything above, plus: Edge removal options, HVCI/mitigation controls, deep service cleanup, Defender modification surfaces. Only for advanced users." badge="Advanced" badgeColor="bg-purple-500/15 text-purple-400" />
    </Screen>
  );
}

// Q2 — Power Plan (Oneclick core question)
function QPowerPlan() {
  const { performance: p, setPerformance } = useDecisionsStore();
  return (
    <Screen
      icon={Zap}
      label="Power Plan"
      title="Which power plan should be activated?"
      desc="The power plan controls CPU frequency scaling, core parking, sleep states, and USB power management. Higher performance plans keep the CPU at full speed at all times."
      note="Ultimate Performance Idle-Off disables all CPU C-states — the CPU never sleeps. Only use this if your cooling is adequate, as temperatures will be significantly higher."
    >
      <Option
        selected={p.powerPlan === "windows-balanced"}
        onClick={() => setPerformance({ powerPlan: "windows-balanced" })}
        title="Windows Balanced"
        desc="Default Windows power plan. CPU scales dynamically based on workload. Recommended for laptops and machines where power draw matters."
      />
      <Option
        selected={p.powerPlan === "ultimate"}
        onClick={() => setPerformance({ powerPlan: "ultimate" })}
        title="Ultimate Performance — Idle ON"
        desc="Maximum CPU performance. Eliminates power-saving throttling while allowing idle states between bursts. Best for most gaming desktops — fast response with manageable temperatures."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={p.powerPlan === "ultimate-idle-off"}
        onClick={() => setPerformance({ powerPlan: "ultimate-idle-off" })}
        title="Ultimate Performance — Idle OFF"
        desc="Completely disables CPU C-states (idle/sleep). The CPU runs at maximum frequency 100% of the time — zero wake-up latency, lowest possible scheduler jitter, but significantly more heat."
        badge="High heat"
        badgeColor="bg-amber-500/15 text-amber-400"
      />
      {p.powerPlan === "ultimate-idle-off" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-[11px] font-semibold text-amber-300">⚠ Thermal warning</p>
          <p className="mt-1 text-[10px] leading-[1.6] text-amber-400/70">
            With C-states disabled, your CPU will generate significantly more heat even when idle. Ensure your cooler is adequate before applying. Not recommended for laptops.
          </p>
        </div>
      )}
    </Screen>
  );
}

// Q3 — Windows Defender (Oneclick security question — aggressive/expert only)
function QDefender() {
  const { security: s, setSecurity } = useDecisionsStore();
  return (
    <Screen
      icon={Shield}
      label="Security · Defender"
      title="How should Windows Defender be handled?"
      desc="Windows Defender provides real-time malware protection. Disabling it reduces background CPU and RAM usage but removes active threat detection entirely."
      note="Keep Defender enabled on any machine used for browsing, email, or handling sensitive data. Only disable on isolated gaming rigs."
    >
      <Option
        selected={s.defenderAction === "keep"}
        onClick={() => setSecurity({ defenderAction: "keep" })}
        title="Keep Windows Defender enabled"
        desc="Full real-time protection. Defender runs background scans and blocks threats automatically. No change from Windows default."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={s.defenderAction === "suppress"}
        onClick={() => setSecurity({ defenderAction: "suppress" })}
        title="Suppress — disable real-time scanning only"
        desc="Turns off continuous file scanning and periodic background scans. Defender stays installed — you can re-enable it from Windows Security at any time."
      />
      <Option
        selected={s.defenderAction === "disable"}
        onClick={() => setSecurity({ defenderAction: "disable" })}
        title="Disable completely via Dcontrol"
        desc="Uses Dcontrol to disable Tamper Protection and fully shut down Defender. Requires manual re-enable through the same tool. No real-time, on-access, or scheduled protection."
        badge="High risk"
        badgeColor="bg-red-500/15 text-red-400"
        danger
      />
      {s.defenderAction === "disable" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[11px] font-semibold text-red-400">⚠ Security risk</p>
          <p className="mt-1 text-[10px] leading-[1.6] text-red-400/70">
            With Defender fully disabled, malware, ransomware, and keyloggers will not be detected or blocked. Only apply this on a dedicated offline gaming machine. You accept full responsibility for security after this change.
          </p>
        </div>
      )}
    </Screen>
  );
}

// Q4 — CPU Priority Separation (Oneclick Win32PrioritySeparation)
function QPrioritySep() {
  const { performance: p, setPerformance } = useDecisionsStore();
  return (
    <Screen
      icon={Cpu}
      label="CPU Scheduler"
      title="How should Windows prioritize CPU time?"
      desc="Win32PrioritySeparation controls how much extra CPU scheduling time the foreground process (your active game or window) receives compared to background processes."
      note="Higher foreground boost = lower input lag and tighter frame pacing, but background tasks (streaming, downloads) get less CPU time."
    >
      <Option
        selected={p.prioritySeparation === "balanced"}
        onClick={() => setPerformance({ prioritySeparation: "balanced" })}
        title="Balanced (26 decimal)"
        desc="Default Windows behavior. Equal scheduling slots for foreground and background. Best for streaming, rendering, or multitasking while gaming."
      />
      <Option
        selected={p.prioritySeparation === "latency"}
        onClick={() => setPerformance({ prioritySeparation: "latency" })}
        title="Latency mode (36 decimal)"
        desc="Increases foreground process priority. Reduces input lag and scheduler jitter by giving your active game more CPU scheduling time. Recommended for competitive gaming."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={p.prioritySeparation === "fps"}
        onClick={() => setPerformance({ prioritySeparation: "fps" })}
        title="FPS mode (42 decimal)"
        desc="Maximum foreground boost. The active process dominates CPU scheduling. Highest raw FPS ceiling — at the cost of background task performance and multitasking stability."
      />
    </Screen>
  );
}

// Q5 — Timer Resolution (Oneclick SetTimerResolution — aggressive/expert only)
function QTimerRes() {
  const { performance: p, setPerformance } = useDecisionsStore();
  return (
    <Screen
      icon={Clock}
      label="Timer Resolution"
      title="Should the system timer resolution be locked?"
      desc="Windows uses a variable timer (15.6ms default, 0.5ms when apps request it). Locking it to a fixed low value ensures consistent frame pacing and eliminates scheduler jitter between high and low load states."
      note="A startup entry (SetTimerResolution.exe) is added to maintain the locked value after reboot. This only affects scheduling precision — not CPU frequency."
    >
      <Option
        selected={p.timerResolution === "system"}
        onClick={() => setPerformance({ timerResolution: "system" })}
        title="System-managed (default)"
        desc="Windows and applications set timer resolution dynamically. Varies between 15.6ms at idle and 0.5ms when games are running. Saves power when the system is idle."
      />
      <Option
        selected={p.timerResolution === "locked-05ms"}
        onClick={() => setPerformance({ timerResolution: "locked-05ms" })}
        title="Locked at 0.5ms (5000μs)"
        desc="Forces minimum timer resolution system-wide at all times. Provides the most consistent frame pacing and lowest scheduler jitter — even in menus or between rounds. Recommended for competitive FPS."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={p.timerResolution === "locked-1ms"}
        onClick={() => setPerformance({ timerResolution: "locked-1ms" })}
        title="Locked at 1ms (10000μs)"
        desc="A middle ground between precision and power consumption. Better consistency than system-managed, less aggressive than 0.5ms. Good for mixed gaming and productivity workloads."
      />
    </Screen>
  );
}

// Q6 — Windows Search & Start Menu (Oneclick search removal)
function QSearch() {
  const { system: s, setSystem } = useDecisionsStore();
  return (
    <Screen
      icon={Search}
      label="Start Menu & Search"
      title="What should happen to Windows Search?"
      desc="Windows Search runs SearchIndexer.exe continuously to index your drive. It integrates into the Start Menu and Taskbar. Removing it eliminates constant background disk and CPU activity."
      note="If removed, the Start Menu will no longer find files or settings by typing. The Open Shell Menu replacement can be installed in the App Setup step."
    >
      <Option
        selected={s.searchAction === "keep"}
        onClick={() => setSystem({ searchAction: "keep" })}
        title="Keep Windows Search"
        desc="No modification. SearchIndexer.exe continues running. Start Menu file search, settings search, and quick launch work normally."
      />
      <Option
        selected={s.searchAction === "remove"}
        onClick={() => setSystem({ searchAction: "remove" })}
        title="Remove Windows Search"
        desc="Disables SearchIndexer.exe and SearchHost.exe. Reduces background disk and CPU activity. Requires a restart. Open Shell Menu is recommended as a Start Menu replacement."
        badge="Requires restart"
        badgeColor="bg-amber-500/15 text-amber-400"
      />
      {s.searchAction === "remove" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-[11px] font-semibold text-amber-300">What breaks</p>
          <p className="mt-1 text-[10px] leading-[1.6] text-amber-400/70">
            After removing Windows Search: Start Menu typing will not find files or apps. File Explorer search still works via the address bar. Settings and Control Panel can still be opened manually. Open Shell Menu (available in App Setup) restores a classic Start Menu experience.
          </p>
        </div>
      )}
    </Screen>
  );
}

function QWebView() {
  const { browser: b, setBrowser } = useDecisionsStore();
  return (
    <Screen
      icon={Globe}
      label="WebView2 Runtime"
      title="Should Microsoft WebView2 be preserved?"
      desc="WebView2 is the embedded browser runtime used by Teams, Widgets, many installers, launcher UIs, and some Electron-adjacent Windows apps. Removing it cuts Microsoft web baggage, but a lot of apps quietly depend on it."
      note="This is one of the easiest ways to break modern Windows app surfaces without realizing why. Keep it unless you are building a stripped personal machine and know your app stack."
    >
      <Option
        selected={b.webviewAction === "keep"}
        onClick={() => setBrowser({ webviewAction: "keep" })}
        title="Keep WebView2"
        desc="Preserve embedded browser runtimes for Teams, Office sign-in, Widgets, launchers, and installer flows."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={b.webviewAction === "remove"}
        onClick={() => setBrowser({ webviewAction: "remove" })}
        title="Remove WebView2 where possible"
        desc="Strip Microsoft embedded browser components aggressively. Can break Teams, Widgets, Outlook sign-in panes, launchers, and setup flows that silently rely on WebView2."
        badge="High risk"
        badgeColor="bg-red-500/15 text-red-400"
        danger
      />
    </Screen>
  );
}

function QNetwork() {
  const { network: n, setNetwork } = useDecisionsStore();
  return (
    <Screen
      icon={Globe}
      label="Network Tweaks"
      title="How far should networking tweaks go?"
      desc="Oneclick exposes aggressive NIC and TCP changes. Some of them help competitive latency, but the wrong combination can hurt throughput, Wi-Fi stability, or VPN behavior."
      note="For most users, the right answer is conservative network cleanup, not extreme adapter tuning."
    >
      <Option
        selected={n.tweakLevel === "keep-default"}
        onClick={() => setNetwork({ tweakLevel: "keep-default" })}
        title="Keep network defaults"
        desc="No adapter-level tuning. Safest option for mixed Wi-Fi, Ethernet, VPN, and office use."
        badge="Safest"
        badgeColor="bg-emerald-500/15 text-emerald-400"
      />
      <Option
        selected={n.tweakLevel === "latency-safe"}
        onClick={() => setNetwork({ tweakLevel: "latency-safe" })}
        title="Latency-safe tuning"
        desc="Apply the low-risk network changes only: background noise reduction, delivery optimization reduction, and gamer-friendly defaults without hard-forcing NIC behavior."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={n.tweakLevel === "aggressive"}
        onClick={() => setNetwork({ tweakLevel: "aggressive" })}
        title="Aggressive adapter tuning"
        desc="Push deeper NIC and stack behavior for minimum latency. Best reserved for wired gaming systems where you are willing to troubleshoot adapter-specific regressions."
        badge="Advanced"
        badgeColor="bg-amber-500/15 text-amber-400"
      />
    </Screen>
  );
}

function QOptionalFeatures() {
  const { optionalFeatures: o, setOptionalFeatures } = useDecisionsStore();
  return (
    <Screen
      icon={Briefcase}
      label="Optional Features"
      title="Which Windows optional features must be preserved?"
      desc="Hyper-V, WSL, and Windows Sandbox are easy collateral damage during aggressive cleanup. If you use developer tools, Android emulators, Docker, virtual machines, or lab environments, preserve them explicitly."
      note="These answers tell redcore OS where not to be clever."
    >
      <Toggle label="Preserve Hyper-V / virtualization stack" desc="Keep virtualization support safe for Hyper-V, Docker Desktop, Android emulators, and VM workflows." checked={o.preserveVirtualization} onChange={(v) => setOptionalFeatures({ preserveVirtualization: v })} />
      <Toggle label="Preserve Windows Sandbox" desc="Keep Sandbox-related Windows features untouched for disposable lab sessions and malware-safe testing." checked={o.preserveWindowsSandbox} onChange={(v) => setOptionalFeatures({ preserveWindowsSandbox: v })} />
      <Toggle label="Preserve WSL" desc="Keep Windows Subsystem for Linux and related feature dependencies intact." checked={o.preserveWsl} onChange={(v) => setOptionalFeatures({ preserveWsl: v })} />
    </Screen>
  );
}

function QAudio() {
  const { audio: a, setAudio } = useDecisionsStore();
  return (
    <Screen
      icon={Cpu}
      label="Audio Stack"
      title="How should OEM audio software be handled?"
      desc="Oneclick exposes an audio bloat removal path. It can remove vendor suites like Realtek enhancements, Sonic Studio, Nahimic-style extras, and other OEM audio layers. That can reduce junk, but it can also kill audio enhancements or break sound until drivers are reinstalled."
      note="If you rely on motherboard or laptop vendor audio effects, do not go aggressive here."
    >
      <Option
        selected={a.cleanupLevel === "keep-default"}
        onClick={() => setAudio({ cleanupLevel: "keep-default" })}
        title="Keep the current audio stack"
        desc="Leave OEM audio services and enhancements alone. Safest for laptops and boards with custom codec packages."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={a.cleanupLevel === "remove-extras"}
        onClick={() => setAudio({ cleanupLevel: "remove-extras" })}
        title="Remove obvious audio extras only"
        desc="Target the obvious enhancement suites and helper apps while leaving the core audio path intact where possible."
      />
      <Option
        selected={a.cleanupLevel === "aggressive"}
        onClick={() => setAudio({ cleanupLevel: "aggressive" })}
        title="Aggressive audio cleanup"
        desc="Strip vendor audio background layers hard. Highest chance of requiring a manual driver reinstall afterward."
        badge="Risky"
        badgeColor="bg-red-500/15 text-red-400"
        danger
      />
    </Screen>
  );
}

function QDeviceManager() {
  const { deviceManager: d, setDeviceManager } = useDecisionsStore();
  return (
    <Screen
      icon={Cpu}
      label="Device Manager"
      title="Should deeper device-level tweaks be allowed?"
      desc="Oneclick-style device-manager tuning usually means disabling selected power-saving behavior on USB, network, storage, and related devices. This can reduce wake latency, but it is more hardware-sensitive than normal registry or service tweaks."
      note="Good for desktops chasing consistency. Less safe for laptops, docking setups, Bluetooth-heavy systems, and mixed-use work machines."
    >
      <Option
        selected={d.tweakLevel === "off"}
        onClick={() => setDeviceManager({ tweakLevel: "off" })}
        title="No device-manager tweaks"
        desc="Leave hardware-level device behavior alone."
        badge="Safest"
        badgeColor="bg-emerald-500/15 text-emerald-400"
      />
      <Option
        selected={d.tweakLevel === "power-saving-only"}
        onClick={() => setDeviceManager({ tweakLevel: "power-saving-only" })}
        title="Safe power-saving cleanup"
        desc="Only touch low-risk device power-saving behavior where it commonly affects responsiveness."
        badge="Recommended"
        badgeColor="bg-brand-500/15 text-brand-400"
      />
      <Option
        selected={d.tweakLevel === "aggressive"}
        onClick={() => setDeviceManager({ tweakLevel: "aggressive" })}
        title="Aggressive hardware tuning"
        desc="Allow deeper device-level changes intended for enthusiast systems. Highest risk of per-device regressions."
        badge="Advanced"
        badgeColor="bg-amber-500/15 text-amber-400"
      />
    </Screen>
  );
}

// Q7 — Edge/browser (existing, renumbered)
function QEdge() {
  const { browser: b, setBrowser } = useDecisionsStore();
  return (
    <Screen icon={Globe} label="Browser · Edge" title="What should happen with Microsoft Edge?" desc="Edge preloads at startup, runs background processes even when closed, and aggressively promotes itself as default browser." note="Suppression is safe and recommended. Full removal is irreversible — install an alternative browser first.">
      <Option selected={b.edgeAction === "keep"} onClick={() => setBrowser({ edgeAction: "keep" })} title="Keep Edge unchanged" desc="No modifications. Choose this if you actively use Edge as your primary browser." />
      <Option selected={b.edgeAction === "suppress"} onClick={() => setBrowser({ edgeAction: "suppress" })} title="Suppress background behavior" desc="Disable preloading, startup boost, background mode, and default browser nags. Edge still works when you open it. Reclaims 100–300 MB RAM." badge="Recommended" badgeColor="bg-brand-500/15 text-brand-400" />
      <Option selected={b.edgeAction === "disable-updates"} onClick={() => setBrowser({ edgeAction: "disable-updates" })} title="Suppress + disable auto-updates" desc="Everything above, plus prevent Edge from auto-updating or reinstalling. Edge keeps working but stays on current version." />
      <Option selected={b.edgeAction === "remove"} onClick={() => setBrowser({ edgeAction: "remove" })} title="Remove Edge completely" desc="Permanent uninstall. Cannot be undone from within Windows. Help, Feedback, and some Settings pages will fail to open web links." badge="High risk" badgeColor="bg-red-500/15 text-red-400" danger />
      {b.edgeAction === "remove" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[11px] font-semibold text-red-400">⚠ Last warning</p>
          <p className="mt-1 text-[10px] leading-[1.6] text-red-400/70">Edge removal is irreversible. Install Brave or another browser FIRST. WebView2-dependent apps (Teams, Widgets) may also break.</p>
        </div>
      )}
    </Screen>
  );
}

// Q8 — Privacy (existing)
function QPrivacy() {
  const { privacy: p, setPrivacy } = useDecisionsStore();
  return (
    <Screen icon={Eye} label="Privacy & AI" title="Which privacy and AI features should be disabled?" desc="Windows 11 includes Recall (screen capture AI), Copilot (AI sidebar), AI features in Paint/Notepad/Edge, telemetry services, and ad tracking." note="All of these are safe to disable with no functional impact on normal Windows use.">
      <Toggle label="Disable Windows Recall" desc="Prevents continuous screen capture for AI-powered activity search. Recall stores a visual history of everything on screen." checked={p.disableRecall} onChange={(v) => setPrivacy({ disableRecall: v })} />
      <Toggle label="Disable Copilot sidebar" desc="Removes the AI assistant from the taskbar. Prevents background AI service from auto-starting." checked={p.disableCopilot} onChange={(v) => setPrivacy({ disableCopilot: v })} />
      <Toggle label="Disable AI in system apps" desc="Disables AI features in Paint (Cocreator, Image Creator), Notepad (AI rewrite), and Edge (Copilot, AI compose)." checked={p.disableAiApps} onChange={(v) => setPrivacy({ disableAiApps: v })} />
      <Toggle label="Remove Windows suggestions and ads" desc="Start menu suggestions, lock screen tips, notification spam, sync provider ads, account nags, welcome tips." checked={p.disableSuggestionsAds} onChange={(v) => setPrivacy({ disableSuggestionsAds: v })} />
      <Toggle label="Disable activity history and tracking" desc="Stops timeline, clipboard cloud sync, activity feed uploads, app launch tracking, and tailored experience data." checked={p.disableActivityHistory} onChange={(v) => setPrivacy({ disableActivityHistory: v })} />
      <div className="pt-2 border-t border-white/[0.04] mt-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted mb-2">Telemetry reduction depth</p>
        <Option selected={p.telemetryLevel === "conservative"} onClick={() => setPrivacy({ telemetryLevel: "conservative" })} title="Conservative" desc="Set diagnostic data to Required level. Disable advertising ID, CEIP, and error reporting. Basic device data still collected." />
        <div className="h-2" />
        <Option selected={p.telemetryLevel === "aggressive"} onClick={() => setPrivacy({ telemetryLevel: "aggressive" })} title="Aggressive" desc="Disable all telemetry services (DiagTrack, dmwappushservice), SIUF feedback, speech/inking data, and Edge telemetry." />
      </div>
    </Screen>
  );
}

// Q9 — Work compat (existing, conditional)
function QWork() {
  const { workCompat: w, setWorkCompat } = useDecisionsStore();
  return (
    <Screen icon={Briefcase} label="Work compatibility" title="Which business services does this machine need?" desc="Services you enable here will be preserved — they will not be disabled or removed during transformation." note="If you're unsure, keep it enabled. It's safer to preserve a dependency than to discover it's missing later.">
      <Toggle label="Printing (Print Spooler)" desc="Required for local and network printers. The Print Spooler has been targeted by security vulnerabilities but is necessary for printing." checked={w.needsPrinting} onChange={(v) => setWorkCompat({ needsPrinting: v })} />
      <Toggle label="Remote Desktop (RDP)" desc="Required for IT remote support and remote work sessions via Windows Remote Desktop Connection." checked={w.needsRdp} onChange={(v) => setWorkCompat({ needsRdp: v })} />
      <Toggle label="Network file sharing (SMB)" desc="Required for mapped network drives, shared folders, and accessing files on other PCs or NAS devices." checked={w.needsSmb} onChange={(v) => setWorkCompat({ needsSmb: v })} />
      <Toggle label="Domain / Group Policy" desc="Required for Active Directory managed environments. If your PC is joined to a company domain, keep this enabled." checked={w.needsDomainGpo} onChange={(v) => setWorkCompat({ needsDomainGpo: v })} />
      <Toggle label="Teams / Office 365 / Outlook" desc="Preserves WebView2 runtime, Edge compatibility, and Microsoft meeting/collaboration infrastructure." checked={w.needsTeamsOffice} onChange={(v) => setWorkCompat({ needsTeamsOffice: v })} />
      <Toggle label="Remote support tools" desc="TeamViewer, AnyDesk, Quick Assist — these need background services running to accept connections." checked={w.needsRemoteSupport} onChange={(v) => setWorkCompat({ needsRemoteSupport: v })} />
    </Screen>
  );
}

// Q10 — Gaming (existing, conditional)
function QGaming() {
  const { gaming: g, setGaming } = useDecisionsStore();
  return (
    <Screen icon={Gamepad2} label="Gaming & anti-cheat" title="Configure gaming-specific optimizations." desc="These settings affect overlays, anti-cheat compatibility, background recording, and fullscreen behavior." note="Anti-cheat games (Valorant, FACEIT, THE FINALS) require specific Windows features. Disabling them may cause bans.">
      <Toggle label="Anti-cheat safe mode" desc="Only apply changes verified safe with Vanguard, FACEIT, and EAC. Keeps TPM, Secure Boot, and Memory Integrity requirements met." checked={g.antiCheatSafe} onChange={(v) => setGaming({ antiCheatSafe: v })} warning={!g.antiCheatSafe ? "Game bans possible" : undefined} />
      <Toggle label="Competitive latency priority" desc="Enables scheduler, timer, and service changes optimized for lowest possible input latency." checked={g.competitiveGaming} onChange={(v) => setGaming({ competitiveGaming: v })} />
      <Toggle label="Keep GPU vendor overlays" desc="Preserve ShadowPlay (Nvidia) and Adrenalin overlay (AMD) features. Disabling reduces GPU driver overhead." checked={g.preserveOverlays} onChange={(v) => setGaming({ preserveOverlays: v })} />
      <Toggle label="Disable Game DVR" desc="Stops Windows from silently recording gameplay. Frees GPU resources and reduces frame time variance." checked={g.disableGameDvr} onChange={(v) => setGaming({ disableGameDvr: v })} />
      <Toggle label="Disable fullscreen optimizations" desc="Forces true exclusive fullscreen instead of borderless windowed. Reduces input lag but may affect Alt+Tab." checked={g.disableFullscreenOpt} onChange={(v) => setGaming({ disableFullscreenOpt: v })} />
    </Screen>
  );
}

// Q11 — Power/battery (existing, conditional)
function QPower() {
  const { power: p, setPower } = useDecisionsStore();
  return (
    <Screen icon={Battery} label="Power & battery" title="How should this laptop handle power?" desc="Aggressive performance tuning increases power consumption and heat. These settings protect battery life and sleep behavior." note="If battery life matters, keep these enabled. Performance tweaks that increase power draw will be blocked.">
      <Toggle label="Battery life is a priority" desc="Blocks aggressive CPU, GPU, and PCIe power changes that increase power consumption. Keeps core parking, ASPM, and USB selective suspend." checked={p.batteryImportant} onChange={(v) => setPower({ batteryImportant: v })} />
      <Toggle label="Preserve Modern Standby" desc="Keeps instant wake and background sync during sleep. Disabling forces legacy S3 sleep — no background activity, but slower wake." checked={p.preserveModernStandby} onChange={(v) => setPower({ preserveModernStandby: v })} />
      <Toggle label="Preserve Fast Startup" desc="Keeps hybrid shutdown for faster boot. Disabling ensures every boot is a clean kernel initialization — more reliable but slower." checked={p.preserveFastWake} onChange={(v) => setPower({ preserveFastWake: v })} />
    </Screen>
  );
}

// ─── Sequencer ──────────────────────────────────────────────────────────────

interface QDef {
  id: string;
  component: () => JSX.Element;
  condition?: () => boolean;
  isAnswered?: () => boolean;
}

export function PlaybookStrategyStep() {
  const decisions = useDecisionsStore();
  const { detectedProfile, setStepReady } = useWizardStore();
  const isWorkPc = detectedProfile?.isWorkPc ?? false;

  const questions: QDef[] = useMemo(() => [
    // ── Core: always shown ────────────────────────────────────────────────
    { id: "q-aggression",    component: Q1, isAnswered: () => decisions.performance.aggressionLevel !== null },
    { id: "q-power-plan",    component: QPowerPlan, isAnswered: () => decisions.performance.powerPlan !== null },

    // ── Oneclick security — aggressive/expert only ────────────────────────
    {
      id: "q-defender",
      component: QDefender,
      isAnswered: () => decisions.security.defenderAction !== null,
      condition: () =>
        decisions.performance.aggressionLevel === "aggressive" ||
        decisions.performance.aggressionLevel === "expert",
    },

    // ── Oneclick CPU scheduler — balanced and above ───────────────────────
    {
      id: "q-priority-sep",
      component: QPrioritySep,
      isAnswered: () => decisions.performance.prioritySeparation !== null,
      condition: () =>
        decisions.performance.aggressionLevel === "balanced" ||
        decisions.performance.aggressionLevel === "aggressive" ||
        decisions.performance.aggressionLevel === "expert",
    },

    // ── Oneclick timer resolution — aggressive/expert only ────────────────
    {
      id: "q-timer-res",
      component: QTimerRes,
      isAnswered: () => decisions.performance.timerResolution !== null,
      condition: () =>
        decisions.performance.aggressionLevel === "aggressive" ||
        decisions.performance.aggressionLevel === "expert",
    },

    // ── Oneclick search — balanced and above ─────────────────────────────
    {
      id: "q-search",
      component: QSearch,
      isAnswered: () => decisions.system.searchAction !== null,
      condition: () =>
        decisions.performance.aggressionLevel === "balanced" ||
        decisions.performance.aggressionLevel === "aggressive" ||
        decisions.performance.aggressionLevel === "expert",
    },

    // ── Expanded Oneclick-style surfaces ────────────────────────────────
    {
      id: "q-network",
      component: QNetwork,
      isAnswered: () => decisions.network.tweakLevel !== null,
      condition: () =>
        decisions.performance.aggressionLevel === "balanced" ||
        decisions.performance.aggressionLevel === "aggressive" ||
        decisions.performance.aggressionLevel === "expert",
    },
    { id: "q-optional-features", component: QOptionalFeatures, isAnswered: () => true },
    { id: "q-audio", component: QAudio, isAnswered: () => decisions.audio.cleanupLevel !== null },
    {
      id: "q-device-manager",
      component: QDeviceManager,
      isAnswered: () => decisions.deviceManager.tweakLevel !== null,
      condition: () =>
        decisions.performance.aggressionLevel === "aggressive" ||
        decisions.performance.aggressionLevel === "expert",
    },

    // ── Browser & privacy — always shown ─────────────────────────────────
    { id: "q-edge",    component: QEdge, isAnswered: () => decisions.browser.edgeAction !== null },
    { id: "q-webview", component: QWebView, isAnswered: () => decisions.browser.webviewAction !== null },
    { id: "q-privacy", component: QPrivacy, isAnswered: () => decisions.privacy.telemetryLevel !== null },

    // ── Conditional: work, gaming, power ─────────────────────────────────
    { id: "q-work",   component: QWork, isAnswered: () => true, condition: () => decisions.needsWorkQuestions() || isWorkPc },
    { id: "q-gaming", component: QGaming, isAnswered: () => true, condition: () => decisions.needsGamingQuestions() },
    { id: "q-power",  component: QPower, isAnswered: () => true, condition: () => decisions.needsPowerQuestions() },
  ], [decisions, isWorkPc]);

  const active = questions.filter((q) => !q.condition || q.condition());
  const [idx, setIdx] = useState(0);
  const clamped = Math.min(idx, active.length - 1);
  const current = active[clamped];
  const Comp = current.component;
  const currentAnswered = current.isAnswered ? current.isAnswered() : true;
  const allAnswered = active.every((q) => (q.isAnswered ? q.isAnswered() : true));

  useEffect(() => {
    setStepReady("playbook-strategy", active.length > 0 && allAnswered && clamped >= active.length - 1);
  }, [active.length, allAnswered, clamped, setStepReady]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-2.5 px-6">
        {active.map((q, i) => (
          <button
            key={q.id}
            onClick={() => i < clamped && setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === clamped
                ? "w-7 bg-brand-500"
                : i < clamped
                ? "w-2 bg-brand-500/40 cursor-pointer hover:bg-brand-500/60"
                : "w-2 bg-white/[0.08] cursor-default"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <Comp />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 flex items-center justify-between border-t border-white/[0.05] bg-surface-raised/60 px-5 py-2.5">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={clamped === 0}
          className={`flex items-center gap-1 text-[11px] font-medium ${clamped === 0 ? "text-ink-disabled" : "text-ink-tertiary hover:text-ink"}`}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-ink-muted">
            <span className="font-mono font-bold text-ink">{decisions.impact.estimatedActions}</span> actions
          </span>
          {decisions.impact.estimatedPreserved > 0 && (
            <span className="text-amber-400">
              <span className="font-mono font-bold">{decisions.impact.estimatedPreserved}</span> preserved
            </span>
          )}
          {decisions.impact.rebootRequired && (
            <span className="text-amber-400 text-[9px] font-semibold uppercase tracking-wider">Reboot req.</span>
          )}
          {decisions.impact.warnings.length > 0 && (
            <span className="text-red-400/80 text-[9px] flex items-center gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              {decisions.impact.warnings.length} warning{decisions.impact.warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <button
          onClick={() => setIdx((i) => Math.min(active.length - 1, i + 1))}
          disabled={clamped >= active.length - 1 || !currentAnswered}
          className={`flex items-center gap-1 text-[11px] font-medium ${clamped >= active.length - 1 || !currentAnswered ? "text-ink-disabled" : "text-ink-tertiary hover:text-ink"}`}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
