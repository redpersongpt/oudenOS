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
  getActiveStrategyQuestions,
  strategyQuestions,
  type StrategyIconName,
} from "@/lib/wizard-question-model";
import { useDecisionsStore, type QuestionnaireAnswers } from "@/stores/decisions-store";
import { useWizardStore } from "@/stores/wizard-store";

const ICON_MAP: Record<StrategyIconName, LucideIcon> = {
  Shield,
  Battery,
  Cpu,
  Clock,
  HardDrive,
  Search,
  Wrench,
  Globe,
  Sparkles,
  Eye,
  Zap,
  MonitorSpeaker,
  Gamepad2,
};

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
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeColor ?? "bg-white/[0.06] text-ink-muted"}`}
              >
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
        <h2 className="text-[18px] leading-snug font-bold tracking-tight text-ink">{title}</h2>
        <p className="mt-2 max-w-[560px] text-[11px] leading-[1.65] text-ink-secondary">{desc}</p>
        {note && (
          <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-ink-muted">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="leading-relaxed">{note}</span>
          </div>
        )}
      </div>
      <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto px-6 pb-4">{children}</div>
    </div>
  );
}

export function PlaybookStrategyStep() {
  const { answers, impact, setAnswer } = useDecisionsStore();
  const { detectedProfile, playbookPreset, setPlaybookPreset, setStepReady } = useWizardStore();

  const context = useMemo(
    () => ({
      isLaptop: detectedProfile?.id === "gaming_laptop" || detectedProfile?.id === "office_laptop",
      isWorkPc: detectedProfile?.isWorkPc ?? false,
      windowsBuild: detectedProfile?.windowsBuild ?? 22631,
    }),
    [detectedProfile],
  );

  const activeQuestions = useMemo(
    () => getActiveStrategyQuestions(answers, context),
    [answers, context],
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
    for (const question of strategyQuestions) {
      if (!visibleKeys.has(question.key) && answers[question.key] !== null) {
        setAnswer(question.key, null);
      }
    }
  }, [activeQuestions, answers, setAnswer]);

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

  const Icon = ICON_MAP[current.icon];
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
              icon={Icon}
              label={current.label}
              title={current.title}
              desc={current.desc}
              note={current.note}
            >
              {current.options.map((option) => (
                <Option
                  key={`${String(current.key)}-${String(option.value)}`}
                  selected={currentAnswer === option.value}
                  onClick={() => setAnswer(current.key, option.value as QuestionnaireAnswers[keyof QuestionnaireAnswers])}
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
              <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-400">Reboot required</span>
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
