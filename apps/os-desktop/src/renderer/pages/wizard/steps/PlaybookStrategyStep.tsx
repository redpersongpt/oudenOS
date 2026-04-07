import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  TriangleAlert,
  Volume2,
  Wrench,
  Zap,
} from "lucide-react";
import { useDecisionsStore, type QuestionAnswer } from "@/stores/decisions-store";
import { useWizardStore } from "@/stores/wizard-store";
import { serviceCall } from "@/lib/service";
import questionnaireFallback from "@/lib/questionnaire-fallback.json";
import {
  computeQuestionnaireImpact,
  derivePlaybookPreset,
  getVisibleChapters,
  isQuestionSatisfied,
  type QuestionnaireSchema,
  type StrategyIconName,
} from "@/lib/wizard-question-model";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

const ICON_MAP: Record<string, LucideIcon> = {
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
  Volume2,
};

function iconFor(name: StrategyIconName): LucideIcon {
  return ICON_MAP[name] ?? Shield;
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
  badge?: string | null;
  badgeColor?: string | null;
  danger?: boolean | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full w-full appearance-none overflow-hidden rounded-2xl border px-4 py-4 text-left outline-none ring-0 shadow-none transition-colors focus:border-[var(--border)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 ${
        selected
          ? danger
            ? "border-white/[0.16] bg-white/[0.04]"
            : "border-[var(--accent)] bg-[var(--surface-raised)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
      }`}
      style={{
        WebkitTapHighlightColor: "transparent",
        boxShadow: "none",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1.5 shrink-0">
          {selected ? (
            <div className={`h-0.5 w-3 ${danger ? "bg-[var(--text-display)]" : "bg-[var(--accent)]"}`} />
          ) : (
            <div className="h-px w-2 bg-[var(--border-visible)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-[2.25rem] flex-wrap items-start gap-2 overflow-hidden">
            <span
              className={`block max-w-full font-mono text-[11px] tracking-[0.08em] ${
              selected ? "text-[var(--text-display)]" : "text-[var(--text-secondary)]"
            }`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </span>
            {badge ? (
              <span className={`rounded-sm px-1.5 py-px font-mono text-label tracking-label ${
                badgeColor ?? "bg-[var(--black)] text-[var(--text-disabled)]"
              }`}>
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[12px] leading-[1.45] text-[var(--text-secondary)]">
            {desc}
          </p>
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
  centeredOptions = false,
  children,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  desc: string;
  note?: string | null;
  centeredOptions?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-6 pb-2 pt-4 min-h-[8.8rem]">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="nd-label text-[var(--accent)]">{label}</span>
        </div>
        <h2
          className="max-w-[720px] min-h-[3.2rem] text-[24px] font-semibold leading-tight text-[var(--text-display)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {title}
        </h2>
        <p
          className="mt-1.5 max-w-[720px] min-h-[3rem] text-[12px] text-[var(--text-secondary)]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {desc}
        </p>
        {note ? (
          <div className="mt-1.5 flex max-w-[720px] min-h-[1.8rem] items-start gap-2 text-[11px] text-[var(--text-secondary)]">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)]" />
            <span
              className="leading-relaxed"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {note}
            </span>
          </div>
        ) : (
          <div className="mt-1.5 min-h-[1.8rem]" />
        )}
      </div>
      <div className={`min-h-0 flex-1 px-6 pb-5 ${centeredOptions ? "overflow-hidden" : "overflow-y-auto scrollbar-thin"}`}>
        {children}
      </div>
    </div>
  );
}

export function PlaybookStrategyStep() {
  const { answers, setAnswer, applyAnswers } = useDecisionsStore();
  const { detectedProfile, playbookPreset, setPlaybookPreset, setStepReady, goBack, goNext, demoMode } = useWizardStore();
  const [schema, setSchema] = useState<QuestionnaireSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [pendingAdvanceKey, setPendingAdvanceKey] = useState<string | null>(null);
  const [flashStatus, setFlashStatus] = useState<"saved" | null>(null);

  const context = useMemo(
    () => ({
      isLaptop: detectedProfile?.id === "gaming_laptop" || detectedProfile?.id === "office_laptop",
      isWorkPc: detectedProfile?.isWorkPc ?? false,
      windowsBuild: detectedProfile?.windowsBuild ?? 22631,
    }),
    [detectedProfile],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const result = await serviceCall<QuestionnaireSchema>("questionnaire.resolve", {
        profile: detectedProfile?.id ?? "gaming_desktop",
        windowsBuild: context.windowsBuild,
      });
      if (cancelled) return;
      if (result.ok) {
        setSchema(result.data);
        if (Object.keys(answers).length === 0) {
          applyAnswers({
            aggressionPreset: context.isWorkPc ? "balanced" : "aggressive",
          });
        }
      } else if (demoMode) {
        setSchema(questionnaireFallback as unknown as QuestionnaireSchema);
        if (Object.keys(answers).length === 0) {
          applyAnswers({
            aggressionPreset: context.isWorkPc ? "balanced" : "aggressive",
          });
        }
      } else {
        setSchema(null);
        setLoadError(result.error || "Could not load setup questions.");
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [applyAnswers, context.isWorkPc, context.windowsBuild, demoMode, detectedProfile?.id]);

  const activeQuestions = useMemo(
    () => getVisibleChapters(schema, answers, context).flatMap((chapter) => chapter.questions),
    [answers, context, schema],
  );

  const allQuestions = useMemo(
    () => schema?.chapters.flatMap((chapter) => chapter.questions) ?? [],
    [schema],
  );

  useEffect(() => {
    if (index > activeQuestions.length - 1) {
      setIndex(Math.max(activeQuestions.length - 1, 0));
    }
  }, [activeQuestions.length, index]);

  useEffect(() => {
    const visibleKeys = new Set(activeQuestions.map((question) => question.key));
    for (const question of allQuestions) {
      if (!visibleKeys.has(question.key) && answers[question.key] != null) {
        setAnswer(question.key, null);
      }
    }
  }, [activeQuestions, allQuestions, answers, setAnswer]);

  useEffect(() => {
    const nextPreset = derivePlaybookPreset(answers);
    if (playbookPreset !== nextPreset) setPlaybookPreset(nextPreset);
  }, [answers, playbookPreset, setPlaybookPreset]);

  const clampedIndex = Math.min(index, Math.max(activeQuestions.length - 1, 0));
  const current = activeQuestions[clampedIndex];
  const currentAnswer = current ? answers[current.key] : null;
  const currentAnswered = current ? isQuestionSatisfied(current, answers) : false;
  const allAnswered = activeQuestions.every((question) => isQuestionSatisfied(question, answers));
  const impact = useMemo(
    () => computeQuestionnaireImpact(schema, answers, context),
    [answers, context, schema],
  );

  useEffect(() => {
    setStepReady("playbook-strategy", activeQuestions.length > 0 && allAnswered);
  }, [activeQuestions.length, allAnswered, setStepReady]);

  const selectAnswer = (questionKey: string, value: QuestionAnswer) => {
    if (pendingAdvanceKey === questionKey) return;
    const isLastQuestion = clampedIndex >= activeQuestions.length - 1;
    setPendingAdvanceKey(questionKey);
    setFlashStatus("saved");
    setAnswer(questionKey, value);
    if (isLastQuestion) {
      window.setTimeout(() => {
        setPendingAdvanceKey(null);
        setFlashStatus(null);
        goNext();
      }, 120);
      return;
    }
    window.setTimeout(() => {
      setPendingAdvanceKey(null);
      setFlashStatus(null);
      setIndex((prev) => Math.min(prev + 1, Math.max(activeQuestions.length - 1, 0)));
    }, 120);
  };

  const handleBack = () => {
    if (clampedIndex === 0) {
      goBack();
      return;
    }
    setIndex((prev) => Math.max(0, prev - 1));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center px-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          Loading setup questions...
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <TriangleAlert className="h-8 w-8 text-[var(--text-display)]" />
        <p className="text-sm text-[var(--text-secondary)]">{loadError ?? "No strategy questions available."}</p>
      </div>
    );
  }

  const Icon = iconFor(current.icon);
  const centeredOptions = current.options.length <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: ND_EASE }}
      className="flex h-full min-h-0 flex-col bg-[var(--black)]"
    >
      <div className="shrink-0 border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="nd-label text-[var(--accent)]">STRATEGY</p>
            <p className="mt-1 font-mono text-label tracking-label text-[var(--text-disabled)]">
              QUESTION {String(clampedIndex + 1).padStart(2, "0")} / {String(activeQuestions.length).padStart(2, "0")}
            </p>
          </div>
          <div className="min-w-[220px] max-w-[320px] flex-1">
            <div className="flex gap-px">
              {activeQuestions.map((question, questionIndex) => (
                <div
                  key={question.key}
                  className={`h-1 flex-1 ${
                    questionIndex <= clampedIndex
                      ? "bg-[var(--accent)]"
                      : isQuestionSatisfied(question, answers)
                        ? "bg-emerald-400"
                        : "bg-[var(--border)]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.key}-${clampedIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: ND_EASE }}
            className="h-full"
          >
            <Screen
              icon={Icon}
              label={current.label}
              title={current.title}
              desc={current.desc}
              note={current.note}
              centeredOptions={centeredOptions}
            >
              <div
                className={`mx-auto flex w-full max-w-[920px] flex-col gap-3 ${
                  centeredOptions ? "pt-1" : ""
                }`}
              >
                {current.options.map((option, optionIndex) => (
                  <motion.div
                    key={`${current.key}-${String(option.value)}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: optionIndex * 0.04, duration: 0.25, ease: ND_EASE }}
                    className={centeredOptions ? "min-h-[5.75rem] h-auto" : "min-h-[6.25rem] h-auto"}
                  >
                    <Option
                      selected={currentAnswer === option.value}
                      onClick={() => selectAnswer(current.key, option.value as QuestionAnswer)}
                      title={option.title}
                      desc={option.desc}
                      badge={option.badge}
                      badgeColor={option.badgeColor}
                      danger={option.danger}
                    />
                  </motion.div>
                ))}
              </div>
            </Screen>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-[var(--border)] px-5 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="nd-label text-[var(--text-secondary)]">
              <span className="font-mono text-[var(--text-display)]">{impact.estimatedActions}</span> changes
            </span>
            {impact.estimatedPreserved > 0 ? (
              <span className="nd-label text-[var(--text-display)]">
                <span className="font-mono">{impact.estimatedPreserved}</span> left unchanged
              </span>
            ) : null}
            {impact.rebootRequired ? (
              <span className="nd-label-sm text-[var(--text-display)]">Restart likely</span>
            ) : null}
          </div>
          {impact.warnings.length > 0 ? (
            <span className="flex items-center gap-1 nd-label-sm text-[var(--accent)]">
              <AlertTriangle className="h-2.5 w-2.5" />
              {impact.warnings.length} item{impact.warnings.length > 1 ? "s" : ""} to review
            </span>
          ) : (
            <span className="nd-label-sm text-[var(--text-disabled)]">{flashStatus === "saved" ? "Saved" : ""}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 nd-label text-[var(--text-secondary)] transition-colors duration-150 ease-nd hover:text-[var(--text-primary)]"
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
