// ─── Playbook Strategy — Sequential Question Flow ───────────────────────────
// ONE question per screen. Sequential navigation. Branching based on answers.
// The user builds the playbook by answering focused questions, one at a time.

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Globe, Eye, Briefcase, Gamepad2, Check, ChevronRight, ChevronLeft, AlertTriangle, Info, Battery } from "lucide-react";
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
  icon: typeof Shield; label: string; title: string; desc: string; note?: string; children: React.ReactNode;
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

function Q1() {
  const { performance: p, setPerformance } = useDecisionsStore();
  return (
    <Screen icon={Shield} label="Question 1" title="How aggressive should the transformation be?" desc="This determines which categories of changes are included. Conservative is always safe. Each level unlocks more powerful but riskier optimizations." note="Conservative is recommended for Work PCs. Balanced is recommended for most personal machines.">
      <Option selected={p.aggressionLevel === "safe"} onClick={() => setPerformance({ aggressionLevel: "safe" })} title="Conservative — privacy and cleanup only" desc="Removes bloatware, disables telemetry, cleans ads and suggestions. Does not touch services, CPU scheduling, or system behavior. Nothing can break." badge="Safest" badgeColor="bg-emerald-500/15 text-emerald-400" />
      <Option selected={p.aggressionLevel === "balanced"} onClick={() => setPerformance({ aggressionLevel: "balanced" })} title="Balanced — cleanup + performance tuning" desc="Everything above, plus: disables unnecessary services, tunes CPU scheduler, disables Game DVR, reduces AI features. Good for gaming PCs and personal machines." badge="Recommended" badgeColor="bg-brand-500/15 text-brand-400" />
      <Option selected={p.aggressionLevel === "aggressive"} onClick={() => setPerformance({ aggressionLevel: "aggressive" })} title="Aggressive — deep system optimization" desc="Everything above, plus: core parking disabled, timer resolution tuned, dynamic tick disabled, PCIe power management off, network latency hardened. Requires reboot." />
      <Option selected={p.aggressionLevel === "expert"} onClick={() => setPerformance({ aggressionLevel: "expert" })} title="Expert — full access including dangerous changes" desc="Everything above, plus: Edge removal options, HVCI/mitigation controls, deep service cleanup, Defender modification surfaces. Only for advanced users." badge="Advanced" badgeColor="bg-purple-500/15 text-purple-400" />
    </Screen>
  );
}

function Q2() {
  const { browser: b, setBrowser } = useDecisionsStore();
  return (
    <Screen icon={Globe} label="Question 2" title="What should happen with Microsoft Edge?" desc="Edge preloads at startup, runs background processes even when closed, and aggressively promotes itself as default browser." note="Suppression is safe and recommended. Full removal is irreversible — install an alternative browser first.">
      <Option selected={b.edgeAction === "keep"} onClick={() => setBrowser({ edgeAction: "keep" })} title="Keep Edge unchanged" desc="No modifications. Choose this if you actively use Edge as your primary browser." />
      <Option selected={b.edgeAction === "suppress"} onClick={() => setBrowser({ edgeAction: "suppress" })} title="Suppress background behavior" desc="Disable preloading, startup boost, background mode, and default browser nags. Edge still works when you open it. Reclaims 100-300 MB RAM." badge="Recommended" badgeColor="bg-brand-500/15 text-brand-400" />
      <Option selected={b.edgeAction === "disable-updates"} onClick={() => setBrowser({ edgeAction: "disable-updates" })} title="Suppress + disable auto-updates" desc="Everything above, plus prevent Edge from auto-updating or reinstalling. Edge keeps working but stays on current version." />
      <Option selected={b.edgeAction === "remove"} onClick={() => setBrowser({ edgeAction: "remove" })} title="Remove Edge completely" desc="Permanent uninstall. Cannot be undone from within Windows. Windows Help, Feedback, and some Settings pages will fail to open web links." badge="High risk" badgeColor="bg-red-500/15 text-red-400" danger />
      {b.edgeAction === "remove" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <p className="text-[11px] font-semibold text-red-400">⚠ Last warning</p>
          <p className="mt-1 text-[10px] leading-[1.6] text-red-400/70">Edge removal is irreversible. Install Brave or another browser FIRST. WebView2-dependent apps (Teams, Widgets) may also break. This will be flagged as expert-only in the playbook.</p>
        </div>
      )}
    </Screen>
  );
}

function Q3() {
  const { privacy: p, setPrivacy } = useDecisionsStore();
  return (
    <Screen icon={Eye} label="Question 3" title="Which privacy and AI features should be disabled?" desc="Windows 11 includes Recall (screen capture AI), Copilot (AI sidebar), AI features in Paint/Notepad/Edge, telemetry services, and ad tracking." note="All of these are safe to disable with no functional impact on normal Windows use.">
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

function Q4() {
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

function Q5() {
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

function Q6() {
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

interface QDef { id: string; component: () => React.JSX.Element; condition?: () => boolean; }

export function PlaybookStrategyStep() {
  const decisions = useDecisionsStore();

  const questions: QDef[] = useMemo(() => [
    { id: "q1", component: Q1 },
    { id: "q2", component: Q2 },
    { id: "q3", component: Q3 },
    { id: "q4", component: Q4, condition: () => decisions.needsWorkQuestions() },
    { id: "q5", component: Q5, condition: () => decisions.needsGamingQuestions() },
    { id: "q6", component: Q6, condition: () => decisions.needsPowerQuestions() },
  ], [decisions]);

  const active = questions.filter((q) => !q.condition || q.condition());
  const [idx, setIdx] = useState(0);
  const clamped = Math.min(idx, active.length - 1);
  const current = active[clamped];
  const Comp = current.component;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
      {/* Progress */}
      <div className="flex items-center justify-center gap-1.5 py-2.5 px-6">
        {active.map((q, i) => (
          <button key={q.id} onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === clamped ? "w-7 bg-brand-500" : i < clamped ? "w-2 bg-brand-500/40" : "w-2 bg-white/[0.08]"}`} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="h-full">
            <Comp />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 flex items-center justify-between border-t border-white/[0.05] bg-surface-card px-5 py-2.5">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={clamped === 0} className={`flex items-center gap-1 text-[11px] font-medium ${clamped === 0 ? "text-ink-disabled" : "text-ink-tertiary hover:text-ink"}`}>
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-ink-muted"><span className="font-mono font-bold text-ink">{decisions.impact.estimatedActions}</span> actions</span>
          {decisions.impact.estimatedPreserved > 0 && <span className="text-amber-400"><span className="font-mono font-bold">{decisions.impact.estimatedPreserved}</span> preserved</span>}
          {decisions.impact.rebootRequired && <span className="text-amber-400 text-[9px]">Reboot</span>}
        </div>
        <button onClick={() => setIdx((i) => Math.min(active.length - 1, i + 1))} disabled={clamped >= active.length - 1} className={`flex items-center gap-1 text-[11px] font-medium ${clamped >= active.length - 1 ? "text-ink-disabled" : "text-ink-tertiary hover:text-ink"}`}>
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
