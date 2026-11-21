import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { DetectedProfile, HealthCheck } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useLocalizedQuestionnaire } from "@/i18n/content-overlay";
import { buildQuickSetupAnswers, optInValue, type QuickSetupAnswer } from "@/lib/quick-setup";
import { derivePlaybookPreset, type StrategyQuestionDefinition } from "@/lib/wizard-question-model";
import { resolvePlan } from "@/lib/plan-resolver";
import { useT } from "@/i18n";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// Custom profile icons — inline SVGs
function ProfileIcon({ profileId, size = 48 }: { profileId: string; size?: number }) {
  const s = size;
  const common = { width: s, height: s, viewBox: `0 0 ${s} ${s}`, fill: "none" } as const;

  if (profileId === "gaming_desktop" || profileId === "gaming_laptop") {
    // Gaming: monitor with crosshair
    return (
      <svg {...common}>
        <rect x={8} y={8} width={32} height={22} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <path d="M18 30h12M24 30v6M20 36h8" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={24} cy={19} r={5} stroke="var(--success)" strokeWidth="1.5" opacity="0.7" />
        <path d="M24 12v3M24 22v3M17 19h3M28 19h3" stroke="var(--success)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  if (profileId === "office_laptop") {
    // Laptop with battery indicator
    return (
      <svg {...common}>
        <rect x={6} y={12} width={36} height={22} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <path d="M10 34h28" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x={14} y={18} width={20} height={10} rx={1} stroke="var(--text-secondary)" strokeWidth="1" opacity="0.5" />
        <rect x={15} y={19} width={10} height={8} rx={0.5} fill="var(--success)" opacity="0.3" />
      </svg>
    );
  }

  if (profileId === "work_pc") {
    // Shield with lock
    return (
      <svg {...common}>
        <path d="M24 6l14 6v10c0 8-6 14-14 18-8-4-14-10-14-18V12l14-6z" stroke="var(--text-display)" strokeWidth="1.5" fill="none" />
        <rect x={20} y={20} width={8} height={8} rx={1.5} stroke="var(--text-secondary)" strokeWidth="1.5" />
        <path d="M22 20v-3a2 2 0 014 0v3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx={24} cy={24.5} r={1} fill="var(--text-secondary)" />
      </svg>
    );
  }

  if (profileId === "vm_cautious") {
    // VM: stacked boxes
    return (
      <svg {...common}>
        <rect x={10} y={8} width={28} height={12} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <rect x={10} y={24} width={28} height={12} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
        <circle cx={15} cy={14} r={1.5} fill="var(--success)" opacity="0.6" />
        <circle cx={15} cy={30} r={1.5} fill="var(--success)" opacity="0.6" />
        <path d="M20 14h14M20 30h14" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </svg>
    );
  }

  if (profileId === "low_spec_system" || profileId === "low_spec") {
    // Feather/lightweight
    return (
      <svg {...common}>
        <path d="M24 40V20" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M24 20c-6 0-12 4-14 12 4-2 8-3 14-3" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M24 20c6 0 12 4 14 12-4-2-8-3-14-3" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M18 28l6-8 6 8" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      </svg>
    );
  }

  // Default: generic PC
  return (
    <svg {...common}>
      <rect x={10} y={8} width={28} height={20} rx={2} stroke="var(--text-display)" strokeWidth="1.5" />
      <path d="M18 28h12M24 28v6M20 34h8" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function useCountUp(target: number, duration = 1000): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === 0) { setV(0); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setV(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

const PROFILE_OPTIONS = [
  { id: "gaming_desktop", labelKey: "profile.option.gaming_desktop.label", descKey: "profile.option.gaming_desktop.desc" },
  { id: "office_laptop", labelKey: "profile.option.office_laptop.label", descKey: "profile.option.office_laptop.desc" },
  { id: "work_pc", labelKey: "profile.option.work_pc.label", descKey: "profile.option.work_pc.desc" },
  { id: "vm_cautious", labelKey: "profile.option.vm_cautious.label", descKey: "profile.option.vm_cautious.desc" },
  { id: "low_spec_system", labelKey: "profile.option.low_spec_system.label", descKey: "profile.option.low_spec_system.desc" },
] as const;

const QUICK_SETUP_ORDER = ["recommended", "gaming"];

// Opt-ins that lower Windows' security baseline: shown separately, collapsed,
// with danger styling. Everything else in optionalQuestionKeys is an "extra".
const SECURITY_TRADEOFF_KEYS = new Set(["disableSmartScreen", "disableDefender", "disableHvci", "disableVbs"]);
const SECURITY_KEY_PATTERN = /defender|smartscreen|hvci|vbs|mitigation|blocklist|firewall|uac|tamper/i;
function isSecurityTradeoff(key: string): boolean {
  return SECURITY_TRADEOFF_KEYS.has(key) || SECURITY_KEY_PATTERN.test(key);
}

type OptInEntry = { question: StrategyQuestionDefinition; value: QuickSetupAnswer };

function OptInGroup({
  heading,
  intro,
  entries,
  optedIn,
  onToggle,
}: {
  heading: string;
  intro: string;
  entries: OptInEntry[];
  optedIn: Record<string, QuickSetupAnswer>;
  onToggle: (key: string, value: QuickSetupAnswer) => void;
}) {
  const { t } = useT();
  return (
    <div className="mt-2">
      <p className="nd-label-sm text-[var(--text-secondary)]">{heading}</p>
      <p className="mt-0.5 text-[11px] text-[var(--text-disabled)]">{intro}</p>
      <div className="mt-2 flex flex-col gap-2">
        {entries.map(({ question, value }) => {
          const on = optedIn[question.key] !== undefined;
          const option = question.options.find((o) => o.value === value);
          const danger = option?.danger === true;
          const warnings = option?.behavior?.warnings ?? [];
          return (
            <button
              key={question.key}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => onToggle(question.key, value)}
              className={`flex w-full items-start justify-between gap-3 rounded-sm border px-3 py-2 text-left ${
                danger ? "border-[#FF6B6B]/40 bg-[#FF6B6B]/[0.05]" : "border-[var(--border)]"
              }`}
            >
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-[var(--text-primary)]">{question.title}</span>
                {/* Exactly what the toggle opts into (the option flagged danger for multi-option questions). */}
                {option && (
                  <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                    {t("quickSetup.optIn", { option: option.title })}
                  </span>
                )}
                <span className="mt-0.5 block text-[10px] text-[var(--text-disabled)]">{question.desc}</span>
                {warnings.map((w) => (
                  <span key={w} className={`mt-1 block text-[10px] ${on ? "text-[#FF6B6B]" : "text-[var(--text-secondary)]"}`}>⚠ {w}</span>
                ))}
              </span>
              <span
                aria-hidden="true"
                className="relative mt-0.5 h-4 w-8 shrink-0 rounded-full"
                style={{ background: on ? (danger ? "rgba(255,107,107,0.55)" : "rgba(255,255,255,0.25)") : "rgba(255,255,255,0.08)" }}
              >
                <span
                  className="absolute top-0.5 h-3 w-3 rounded-full"
                  style={{ left: on ? "calc(100% - 14px)" : "2px", background: on ? "var(--text-display)" : "var(--text-disabled)" }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HEALTH_ORDER: Record<HealthCheck["status"], number> = { attention: 0, unknown: 1, ok: 2 };
const HEALTH_DOT: Record<HealthCheck["status"], string> = {
  attention: "bg-[var(--warning)]",
  unknown: "bg-[var(--text-disabled)]",
  ok: "bg-[var(--success)]",
};

/** assess.full healthChecks — guidance only; oudenOS changes nothing here. */
function HealthCheckList({ checks }: { checks: HealthCheck[] }) {
  const { t } = useT();
  const [open, setOpen] = useState<string | null>(null);
  if (checks.length === 0) return null;
  const sorted = [...checks].sort((a, b) => HEALTH_ORDER[a.status] - HEALTH_ORDER[b.status]);
  // Titles are translated by check id; the detail text comes from the service
  // (English, with live values) and is shown as-is.
  const titleFor = (c: HealthCheck) => {
    const key = `health.title.${c.id}`;
    const translated = t(key);
    return translated === key ? c.title : translated;
  };
  return (
    <section className="w-full max-w-lg" aria-labelledby="health-heading">
      <p id="health-heading" className="nd-label mb-1 text-[var(--text-secondary)]">{t("health.heading")}</p>
      <ul className="rounded-sm border border-[var(--border)] bg-[var(--surface)]">
        {sorted.map((c) => {
          const expanded = open === c.id;
          return (
            <li key={c.id} className="border-b border-[var(--border)] last:border-0">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : c.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${HEALTH_DOT[c.status]}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-primary)]">{titleFor(c)}</span>
                <span className="shrink-0 text-[10px] text-[var(--text-disabled)]">{t(`health.status.${c.status}`)}</span>
              </button>
              {expanded && c.detail && (
                <p className="px-3 pb-2 pl-6 text-[10px] leading-relaxed text-[var(--text-secondary)]">{c.detail}</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[10px] text-[var(--text-disabled)]">{t("health.note")}</p>
    </section>
  );
}

/** Quick setup: one card per service-provided setup + "Custom" (full questionnaire). */
function QuickSetupPanel({ profile }: { profile: DetectedProfile }) {
  const { t } = useT();
  const { goNext, demoMode, setPlaybookPreset, setResolvedPlaybook, fastTrackTo } = useWizardStore();
  const resetAnswers = useDecisionsStore((s) => s.reset);
  const applyAnswers = useDecisionsStore((s) => s.applyAnswers);
  const quickSetups = useQuestionnaireStore((s) => s.quickSetups);
  const rawSchema = useQuestionnaireStore((s) => s.schema);
  const schema = useLocalizedQuestionnaire(rawSchema);
  const [selected, setSelected] = useState<string | null>(null);
  const [optedIn, setOptedIn] = useState<Record<string, QuickSetupAnswer>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);

  const setups = useMemo(
    () =>
      quickSetups
        .filter((s) => !(profile.isWorkPc && s.id === "gaming"))
        .sort((a, b) => {
          const ia = QUICK_SETUP_ORDER.indexOf(a.id);
          const ib = QUICK_SETUP_ORDER.indexOf(b.id);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        }),
    [quickSetups, profile.isWorkPc],
  );
  const questionsByKey = useMemo(() => {
    const map = new Map<string, StrategyQuestionDefinition>();
    for (const chapter of schema?.chapters ?? []) for (const q of chapter.questions) map.set(q.key, q);
    return map;
  }, [schema]);

  if (setups.length === 0) return null; // older service without quickSetups: classic flow only

  const active = setups.find((s) => s.id === selected) ?? null;
  const optionalQuestions = (active?.optionalQuestionKeys ?? [])
    .map((key) => questionsByKey.get(key))
    .filter((q): q is StrategyQuestionDefinition => Boolean(q))
    .map((q) => ({ question: q, value: optInValue(q) }))
    .filter((entry): entry is OptInEntry => entry.value !== null);
  const securityQuestions = optionalQuestions.filter((e) => isSecurityTradeoff(e.question.key));
  const extraQuestions = optionalQuestions.filter((e) => !isSecurityTradeoff(e.question.key));
  const toggleOptIn = (key: string, value: QuickSetupAnswer) =>
    setOptedIn((prev) => {
      const next = { ...prev };
      if (next[key] !== undefined) delete next[key];
      else next[key] = value;
      return next;
    });

  const applySetup = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    const answers = buildQuickSetupAnswers(active, optedIn);
    resetAnswers();
    applyAnswers(answers);
    const preset = derivePlaybookPreset(answers);
    setPlaybookPreset(preset);
    const result = await resolvePlan({
      profile: profile.id,
      preset,
      windowsBuild: profile.windowsBuild,
      answers,
      demoMode,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? t("plan.loadError"));
      return;
    }
    setResolvedPlaybook(result.playbook);
    // Stop at Personalization rather than skipping it: a quick setup must not
    // change the wallpaper, accent or theme without the user seeing those
    // toggles. The plan itself is shown on the final review right after.
    fastTrackTo("personalization");
  };

  const cardClass = (isActive: boolean) =>
    `flex w-full flex-col items-start gap-1 rounded-sm border px-4 py-3 text-left transition-colors ${
      isActive ? "border-[var(--accent)] bg-[var(--surface-raised)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
    }`;

  return (
    <section className="w-full max-w-lg" aria-labelledby="quick-setup-heading">
      <p id="quick-setup-heading" className="nd-label mb-2 text-center text-[var(--text-secondary)]">{t("quickSetup.heading")}</p>
      <div role="radiogroup" aria-labelledby="quick-setup-heading" className="grid gap-2 sm:grid-cols-3">
        {setups.map((setup) => (
          <button
            key={setup.id}
            role="radio"
            aria-checked={selected === setup.id}
            onClick={() => { setSelected(setup.id); setOptedIn({}); setShowSecurity(false); setError(null); }}
            className={cardClass(selected === setup.id)}
          >
            <span className="font-mono text-[11px] tracking-[0.08em] text-[var(--text-display)]">{t(`quickSetup.${setup.id}.title`)}</span>
            <span className="text-[11px] leading-snug text-[var(--text-secondary)]">{t(`quickSetup.${setup.id}.desc`)}</span>
          </button>
        ))}
        <button role="radio" aria-checked={false} onClick={goNext} className={cardClass(false)}>
          <span className="font-mono text-[11px] tracking-[0.08em] text-[var(--text-display)]">{t("quickSetup.custom.title")}</span>
          <span className="text-[11px] leading-snug text-[var(--text-secondary)]">
            {t("quickSetup.custom.desc")}
          </span>
        </button>
      </div>

      {active && (
        <div className="mt-3 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          {extraQuestions.length > 0 && (
            <OptInGroup
              heading={t("quickSetup.extras.heading")}
              intro={t("quickSetup.optional.intro")}
              entries={extraQuestions}
              optedIn={optedIn}
              onToggle={toggleOptIn}
            />
          )}
          {securityQuestions.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowSecurity((v) => !v)}
                aria-expanded={showSecurity}
                className="flex w-full items-center justify-between rounded-sm border border-[#FF6B6B]/30 px-3 py-2 text-left text-[11px] text-[var(--text-primary)]"
              >
                <span>{t("quickSetup.security.toggle", { count: securityQuestions.length })}</span>
                <span aria-hidden="true">{showSecurity ? "−" : "+"}</span>
              </button>
              {showSecurity && (
                <OptInGroup
                  heading={t("quickSetup.security.heading")}
                  intro={t("quickSetup.security.intro")}
                  entries={securityQuestions}
                  optedIn={optedIn}
                  onToggle={toggleOptIn}
                />
              )}
            </div>
          )}          {error && <p role="alert" className="mt-2 text-[11px] text-[#FF6B6B]">{error}</p>}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[10px] text-[var(--text-disabled)]">{t("quickSetup.reviewHint")}</span>
            <button
              onClick={() => void applySetup()}
              disabled={busy}
              className="shrink-0 rounded-full px-5 py-1.5 font-mono text-[12px] uppercase tracking-[0.06em] disabled:opacity-40"
              style={{ background: "var(--text-display)", color: "var(--black)" }}
            >
              {busy ? t("quickSetup.building") : error ? t("common.retry") : t("quickSetup.apply")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function ProfileStep() {
  const { t } = useT();
  const { detectedProfile, setDetectedProfile, setStepReady, demoMode } = useWizardStore();
  const loadQuestionnaire = useQuestionnaireStore((s) => s.load);
  const p = detectedProfile;
  const signals = Array.isArray(p?.signals) ? p.signals : [];
  const [showOverride, setShowOverride] = useState(false);
  const [isOverridden, setIsOverridden] = useState(false);
  const realConfidence = p && !p.sample && typeof p.confidence === "number" ? p.confidence : null;
  const displayConfidence = useCountUp(realConfidence ?? 0, 1000);

  useEffect(() => {
    setStepReady("profile", Boolean(p));
  }, [p, setStepReady]);

  // Load the questionnaire early: quick setups come with it.
  useEffect(() => {
    if (p) void loadQuestionnaire(p.id, p.windowsBuild, demoMode);
  }, [p, demoMode, loadQuestionnaire]);

  if (!p) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--black)]">
        <p className="nd-label text-[var(--text-disabled)]">{t("profile.noProfile")}</p>
      </div>
    );
  }

  const profileName = t(`profileName.${p.id}`) === `profileName.${p.id}` ? p.label : t(`profileName.${p.id}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex min-h-full flex-col items-center justify-center gap-5 px-8 py-6 bg-[var(--black)]"
    >
      {/* Profile icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, duration: 0.4, type: "spring", stiffness: 200, damping: 18 }}
        className="flex items-center justify-center w-16 h-16 rounded-full border border-[var(--border)] bg-[var(--surface)]"
      >
        <ProfileIcon profileId={p.id} size={40} />
      </motion.div>

      {p.machineName && (
        <div className="nd-label-sm text-[var(--text-disabled)]">{p.machineName}</div>
      )}

      {/* Sample-data notice — preview builds only (never on Windows) */}
      {(demoMode || p.sample) && (
        <div className="flex items-start gap-3 border border-white/[0.12] bg-white/[0.04] px-4 py-3 rounded-sm max-w-sm">
          <div className="w-3 h-0.5 bg-[var(--text-display)] mt-1.5 shrink-0" />
          <div>
            <p className="nd-label text-[var(--text-display)]">{t("profile.sampleData.title")}</p>
            <p className="mt-1 text-caption text-[var(--text-secondary)]">{t("profile.sampleData.body")}</p>
          </div>
        </div>
      )}

      {/* Profile name — CSS uppercase is language-aware (lang attr), toUpperCase() is not */}
      <h2 className="font-display text-heading uppercase text-[var(--text-display)]">{profileName}</h2>

      {/* Confidence — only when the classifier actually reported one */}
      {!isOverridden && realConfidence !== null && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between mb-1">
            <span className="nd-label text-[var(--text-secondary)]">{t("profile.confidence")}</span>
            <span className="font-mono text-label tracking-label text-[var(--accent)]">{displayConfidence}%</span>
          </div>
          <div className="flex gap-0.5" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={realConfidence} aria-label={t("profile.confidence")}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 ${i < Math.round(realConfidence / 10) ? "bg-[var(--accent)]" : "bg-nd-border-subtle"}`}
              />
            ))}
          </div>
        </div>
      )}

      {isOverridden && <div className="nd-label text-[var(--accent)]">{t("profile.manualSelection")}</div>}

      {signals.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {signals.map((s) => (
            <span
              key={s}
              className="border border-[var(--border)] bg-[var(--surface)] px-3 py-1 rounded-sm font-mono text-label uppercase tracking-label text-[var(--text-secondary)]"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {p.isWorkPc && (
        <div className="flex items-start gap-3 border border-white/[0.12] bg-white/[0.04] px-4 py-3 rounded-sm max-w-sm">
          <div className="w-3 h-0.5 bg-[var(--text-display)] mt-1.5 shrink-0" />
          <div>
            <p className="nd-label text-[var(--text-display)]">{t("profile.workPc.title")}</p>
            <p className="mt-1 text-caption text-[var(--text-secondary)]">{t("profile.workPc.body")}</p>
          </div>
        </div>
      )}

      <HealthCheckList checks={p.healthChecks ?? []} />

      <QuickSetupPanel profile={p} />

      {/* Profile override */}
      <div className="w-full max-w-xs">
        <button
          onClick={() => setShowOverride(!showOverride)}
          aria-expanded={showOverride}
          className="flex items-center gap-2 mx-auto nd-label-sm text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors duration-150 ease-nd"
        >
          <span>{t("profile.switchProfile")}</span>
          <motion.svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
            animate={{ rotate: showOverride ? 180 : 0 }}
            transition={{ duration: 0.2, ease: ND_EASE }}
          >
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {showOverride && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: ND_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-col gap-px" role="radiogroup" aria-label={t("profile.switchProfile")}>
                {PROFILE_OPTIONS.map((opt) => {
                  const isActive = p.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => {
                        if (isActive) return;
                        const overridden: DetectedProfile = {
                          ...p,
                          id: opt.id,
                          label: t(opt.labelKey),
                          isWorkPc: opt.id === "work_pc",
                          confidence: null,
                          signals: p.signals,
                        };
                        setDetectedProfile(overridden);
                        setIsOverridden(true);
                        setShowOverride(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-nd border-b border-[var(--border)] ${
                        isActive ? "bg-[var(--surface-raised)]" : "bg-[var(--black)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      <div className="shrink-0 opacity-60">
                        <ProfileIcon profileId={opt.id} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-caption tracking-label ${isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
                          {t(opt.labelKey)}
                        </p>
                        <p className="nd-label-sm text-[var(--text-disabled)] mt-0.5">{t(opt.descKey)}</p>
                      </div>
                      {isActive && <div className="w-3 h-0.5 bg-[var(--accent)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
