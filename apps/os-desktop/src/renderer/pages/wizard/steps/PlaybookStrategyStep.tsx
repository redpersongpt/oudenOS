import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle, Battery, ChevronLeft, ChevronRight, Clock, Cpu, Eye,
  Gamepad2, Globe, HardDrive, Info, MonitorSpeaker, Search, Shield,
  Sparkles, Wrench, Zap,
} from "lucide-react";
import {
  getActiveStrategyQuestions, strategyQuestions, type StrategyIconName,
} from "@/lib/wizard-question-model";
import { useDecisionsStore, type QuestionnaireAnswers } from "@/stores/decisions-store";
import { useWizardStore } from "@/stores/wizard-store";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

const ICON_MAP: Record<StrategyIconName, LucideIcon> = {
  Shield, Battery, Cpu, Clock, HardDrive, Search, Wrench, Globe,
  Sparkles, Eye, Zap, MonitorSpeaker, Gamepad2,
};

function Option({
  selected, onClick, title, desc, badge, badgeColor, danger,
}: {
  selected: boolean; onClick: () => void; title: string; desc: string;
  badge?: string; badgeColor?: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left transition-colors duration-150 ease-nd border-b border-[var(--border)] px-4 py-3 ${
        selected
          ? danger ? "bg-danger-500/[0.06]" : "bg-[var(--surface-raised)]"
          : "bg-[var(--black)] hover:bg-[var(--surface)]"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Indicator */}
        <div className="mt-1.5 shrink-0">
          {selected ? (
            <div className={`w-3 h-0.5 ${danger ? "bg-[var(--accent)]" : "bg-[var(--accent)]"}`} />
          ) : (
            <div className="w-2 h-px bg-nd-border" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-caption tracking-label ${
              selected ? "text-[var(--text-display)]" : "text-[var(--text-secondary)]"
            }`}>
              {title.toUpperCase()}
            </span>
            {badge && (
              <span className={`px-1.5 py-px font-mono text-label tracking-label rounded-sm ${
                badgeColor ?? "bg-[var(--surface)] text-[var(--text-disabled)]"
              }`}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-caption text-[var(--text-disabled)] leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function Screen({
  icon: Icon, label, title, desc, note, children,
}: {
  icon: LucideIcon; label: string; title: string; desc: string;
  note?: string; children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-5 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="nd-label text-[var(--accent)]">{label.toUpperCase()}</span>
        </div>
        <h2 className="font-display text-title text-[var(--text-display)]">{title.toUpperCase()}</h2>
        <p className="mt-2 max-w-[560px] text-body-sm text-[var(--text-secondary)]">{desc}</p>
        {note && (
          <div className="mt-3 flex items-start gap-2 nd-label-sm text-[var(--text-disabled)]">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="leading-relaxed normal-case">{note}</span>
          </div>
        )}
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto pb-4">{children}</div>
    </div>
  );
}

export function PlaybookStrategyStep() {
  const { answers, impact, setAnswer } = useDecisionsStore();
  const { detectedProfile, playbookPreset, setPlaybookPreset, setStepReady } = useWizardStore();

  const context = useMemo(() => ({
    isLaptop: detectedProfile?.id === "gaming_laptop" || detectedProfile?.id === "office_laptop",
    isWorkPc: detectedProfile?.isWorkPc ?? false,
    windowsBuild: detectedProfile?.windowsBuild ?? 22631,
  }), [detectedProfile]);

  const activeQuestions = useMemo(
    () => getActiveStrategyQuestions(answers, context),
    [answers, context],
  );

  const [index, setIndex] = useState(0);
  const clampedIndex = Math.min(index, Math.max(activeQuestions.length - 1, 0));
  const current = activeQuestions[clampedIndex];

  useEffect(() => {
    if (index > activeQuestions.length - 1) setIndex(Math.max(activeQuestions.length - 1, 0));
  }, [activeQuestions.length, index]);

  useEffect(() => {
    const visibleKeys = new Set(activeQuestions.map((q) => q.key));
    for (const q of strategyQuestions) {
      if (!visibleKeys.has(q.key) && answers[q.key] !== null) setAnswer(q.key, null);
    }
  }, [activeQuestions, answers, setAnswer]);

  useEffect(() => {
    const nextPreset =
      answers.aggressionPreset === "conservative" ? "conservative" :
      answers.aggressionPreset === "balanced" ? "balanced" :
      answers.aggressionPreset === "aggressive" || answers.aggressionPreset === "expert" ? "aggressive" : "balanced";
    if (playbookPreset !== nextPreset) setPlaybookPreset(nextPreset);
  }, [answers.aggressionPreset, playbookPreset, setPlaybookPreset]);

  const currentAnswer = current ? answers[current.key] : null;
  const currentAnswered = currentAnswer !== null;
  const allAnswered = activeQuestions.every((q) => answers[q.key] !== null);

  useEffect(() => {
    setStepReady("playbook-strategy", activeQuestions.length > 0 && allAnswered && clampedIndex >= activeQuestions.length - 1);
  }, [activeQuestions.length, allAnswered, clampedIndex, setStepReady]);

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--black)]">
        <p className="nd-label text-[var(--text-disabled)]">NO STRATEGY QUESTIONS FOR THIS MACHINE</p>
      </div>
    );
  }

  const Icon = ICON_MAP[current.icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full flex-col bg-[var(--black)]"
    >
      {/* Top bar */}
      <div className="border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="nd-label text-[var(--accent)]">STRATEGY REVIEW</p>
            <p className="mt-1 font-mono text-label tracking-label text-[var(--text-disabled)]">
              QUESTION {String(clampedIndex + 1).padStart(2, "0")} / {String(activeQuestions.length).padStart(2, "0")}
            </p>
          </div>
          {/* Segmented progress */}
          <div className="min-w-[200px] max-w-[300px] flex-1">
            <div className="flex gap-px">
              {activeQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 ${i <= clampedIndex ? "bg-[var(--accent)]" : "bg-nd-border-subtle"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${String(current.key)}-${clampedIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: ND_EASE }}
            className="h-full"
          >
            <Screen icon={Icon} label={current.label} title={current.title} desc={current.desc} note={current.note}>
              {current.options.map((option, optIdx) => (
                <motion.div
                  key={`${String(current.key)}-${String(option.value)}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: optIdx * 0.04, duration: 0.25, ease: ND_EASE }}
                >
                  <Option
                    selected={currentAnswer === option.value}
                    onClick={() => setAnswer(current.key, option.value as QuestionnaireAnswers[keyof QuestionnaireAnswers])}
                    title={option.title} desc={option.desc}
                    badge={option.badge} badgeColor={option.badgeColor} danger={option.danger}
                  />
                </motion.div>
              ))}
            </Screen>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-[var(--border)] px-5 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="nd-label text-[var(--text-secondary)]">
              <span className="font-mono text-[var(--text-display)]">{impact.estimatedActions}</span> ACTIONS
            </span>
            {impact.estimatedPreserved > 0 && (
              <span className="nd-label text-[var(--warning)]">
                <span className="font-mono">{impact.estimatedPreserved}</span> PRESERVED
              </span>
            )}
            {impact.rebootRequired && (
              <span className="nd-label-sm text-[var(--warning)]">[REBOOT REQUIRED]</span>
            )}
          </div>
          {impact.warnings.length > 0 && (
            <span className="flex items-center gap-1 nd-label-sm text-[var(--accent)]">
              <AlertTriangle className="h-2.5 w-2.5" />
              {impact.warnings.length} WARNING{impact.warnings.length > 1 ? "S" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            disabled={clampedIndex === 0}
            className={`flex items-center gap-1 nd-label ${
              clampedIndex === 0 ? "text-[var(--text-disabled)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            } transition-colors duration-150 ease-nd`}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> BACK
          </button>
          <button
            onClick={() => setIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
            disabled={clampedIndex >= activeQuestions.length - 1 || !currentAnswered}
            className={`flex items-center gap-1 nd-label ${
              clampedIndex >= activeQuestions.length - 1 || !currentAnswered
                ? "text-[var(--text-disabled)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            } transition-colors duration-150 ease-nd`}
          >
            NEXT <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
