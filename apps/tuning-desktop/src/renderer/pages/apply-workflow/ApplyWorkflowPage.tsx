import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ScanSearch,
  RotateCcw,
  Terminal,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ArrowRight,
  Shield,
  Info,
} from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  scaleUp,
  slideUp,
} from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useTuningStore } from "@/stores/tuning-store";
import { serviceCall } from "@/lib/api";
import type { TuningPlanAction, TuningCategory } from "@redcore/shared-schema/tuning";

// ─── Types ────────────────────────────────────────────────────────────────────

type LocalActionStatus = "pending" | "applying" | "success" | "failed" | "skipped";
type Phase = "review" | "executing" | "complete";

interface ActionState {
  planAction: TuningPlanAction;
  status: LocalActionStatus;
  error: string | null;
}

const levelColors: Record<string, string> = {
  info: "text-neutral-400",
  warn: "text-amber-400",
  success: "text-green-400",
  error: "text-red-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusIcon(status: LocalActionStatus) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "applying":
      return (
        <Loader2 className="h-4 w-4 animate-spin text-brand-500 shrink-0" />
      );
    case "failed":
      return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
    case "skipped":
      return <XCircle className="h-4 w-4 text-neutral-300 shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-neutral-300 shrink-0" />;
  }
}

function useForceRender() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}

// Category chip for review phase
function categoryChips(actions: TuningPlanAction[]) {
  const counts = new Map<TuningCategory, number>();
  for (const a of actions) {
    const cat = a.action.category;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return Array.from(counts.entries());
}

// ─── Phase: Review ────────────────────────────────────────────────────────────

interface ReviewPhaseProps {
  onBack: () => void;
  onBegin: () => void;
}

function ReviewPhase({ onBack, onBegin }: ReviewPhaseProps) {
  const plan = useTuningStore((s) => s.plan);
  if (!plan) return null;

  const totalCount = plan.actions.length;
  const rebootCount = plan.rebootsRequired;
  const risk = plan.estimatedTotalRisk;
  const chips = categoryChips(plan.actions);
  const showRiskWarning =
    risk === "medium" || risk === "high" || risk === "extreme";
  const presetLabel =
    plan.preset.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={staggerChild}>
        <Card>
          <div className="px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  Ready to Optimize
                </p>
                <h1 className="mt-1 text-xl font-bold text-neutral-900 leading-tight">
                  {presetLabel} Plan
                </h1>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100">
                <Shield
                  className="h-5 w-5 text-brand-500"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Summary row */}
            <div className="mt-4 flex items-center gap-5 border-t border-neutral-100 pt-4">
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-neutral-900">
                  {totalCount}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Actions
                </p>
              </div>
              <div className="h-8 w-px bg-neutral-150" />
              <div className="text-center">
                <p className="font-mono text-2xl font-bold text-neutral-900">
                  {rebootCount}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Reboots
                </p>
              </div>
              <div className="h-8 w-px bg-neutral-150" />
              <div className="text-center">
                <Badge variant="risk" risk={risk}>
                  {risk}
                </Badge>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Risk Level
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Category breakdown */}
      <motion.div variants={staggerChild}>
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              Categories
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {chips.map(([cat, count]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-50 border border-neutral-150 px-3 py-1.5 text-xs font-medium text-neutral-700"
                >
                  <span className="capitalize">
                    {cat.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-neutral-400">{count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Risk advisory */}
      {showRiskWarning && (
        <motion.div variants={staggerChild}>
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <AlertTriangle
              className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Risk advisory: {risk.charAt(0).toUpperCase() + risk.slice(1)}
              </p>
              <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                This plan includes changes with {risk} risk. All changes are
                backed up before applying and can be rolled back at any time.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reboot notice */}
      {rebootCount > 0 && (
        <motion.div variants={staggerChild}>
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3.5">
            <RotateCcw
              className="h-4 w-4 text-blue-500 shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                {rebootCount} reboot{rebootCount !== 1 ? "s" : ""} required
              </p>
              <p className="mt-0.5 text-xs text-blue-700 leading-relaxed">
                Some actions require a system restart to take effect. You will
                be prompted after optimization completes.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Backup notice */}
      <motion.div variants={staggerChild}>
        <div className="flex items-center gap-2.5 rounded-xl border border-neutral-150 bg-neutral-25 px-4 py-3">
          <Info className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
          <p className="text-xs text-neutral-500">
            All changes will be backed up automatically before applying.
            Roll back anytime from the Rollback Center.
          </p>
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        variants={staggerChild}
        className="flex items-center gap-3 pt-1"
      >
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Back to Plan
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onBegin}
          className="flex-1"
        >
          Begin Optimization
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Phase: Executing ─────────────────────────────────────────────────────────

interface ExecutingPhaseProps {
  actionStates: ActionState[];
  currentActionIndex: number;
  applying: boolean;
  overallPercent: number;
  completedCount: number;
  totalCount: number;
  onCancel: () => void;
  logRef: React.RefObject<HTMLDivElement>;
}

function ExecutingPhase({
  actionStates,
  currentActionIndex,
  applying,
  overallPercent,
  completedCount: _completedCount,
  totalCount,
  onCancel,
  logRef,
}: ExecutingPhaseProps) {
  const { logs } = useTuningStore();
  const plan = useTuningStore((s) => s.plan);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="space-y-4"
    >
      {/* Progress header */}
      <motion.div variants={staggerChild}>
        <Card>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  <p className="text-sm font-semibold text-neutral-900">
                    {plan?.preset
                      ? plan.preset
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                      : "Optimizing"}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">
                  Action {Math.min(currentActionIndex + 1, totalCount)} of{" "}
                  {totalCount}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-neutral-900">
                  {Math.round(overallPercent)}%
                </span>
                {applying && (
                  <Button variant="danger" size="sm" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                className="h-full rounded-full bg-brand-500"
                animate={{ width: `${overallPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {/* Step tracker */}
        <motion.div variants={staggerChild} className="col-span-1">
          <Card className="h-full">
            <CardHeader>
              <h2 className="text-sm font-semibold text-neutral-900">Steps</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {actionStates.map((state, i) => {
                  const action = state.planAction.action;
                  const isActive = applying && i === currentActionIndex;
                  return (
                    <div
                      key={action.id}
                      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                        isActive
                          ? "bg-brand-50 border border-brand-100"
                          : "border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                            state.status === "applying"
                              ? "border-brand-200 bg-brand-50"
                              : state.status === "success"
                                ? "border-green-200 bg-green-50"
                                : state.status === "failed"
                                  ? "border-red-200 bg-red-50"
                                  : "border-neutral-150 bg-neutral-50"
                          }`}
                        >
                          {statusIcon(state.status)}
                        </div>
                        {i < actionStates.length - 1 && (
                          <div
                            className={`mt-0.5 h-3 w-0.5 rounded-full ${
                              state.status === "success"
                                ? "bg-green-200"
                                : "bg-neutral-150"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p
                          className={`truncate text-xs font-medium leading-tight ${
                            isActive
                              ? "text-brand-700"
                              : state.status === "success"
                                ? "text-neutral-700"
                                : state.status === "failed"
                                  ? "text-red-600"
                                  : "text-neutral-400"
                          }`}
                        >
                          {action.name}
                        </p>
                        {state.error && (
                          <p className="mt-0.5 truncate text-[10px] text-red-500">
                            {state.error}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live log terminal */}
        <motion.div variants={staggerChild} className="col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-neutral-400" />
                <h2 className="text-sm font-semibold text-neutral-900">
                  Live Log
                </h2>
                {applying && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                    <span className="text-[10px] font-medium text-brand-600 uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div
                ref={logRef}
                className="h-[400px] overflow-y-auto rounded-lg bg-neutral-950 p-4 font-mono text-xs scroll-smooth"
              >
                <AnimatePresence initial={false}>
                  {logs.map((entry, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex gap-3 py-0.5"
                    >
                      <span className="shrink-0 text-neutral-600">
                        {entry.timestamp}
                      </span>
                      <span
                        className={`shrink-0 w-14 ${
                          levelColors[entry.level] ?? "text-neutral-500"
                        }`}
                      >
                        {entry.level.toUpperCase()}
                      </span>
                      <span className="text-neutral-300 break-all">
                        {entry.message}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {applying && (
                  <div className="mt-1 flex items-center gap-2 text-neutral-600">
                    <span className="inline-block w-2 h-4 bg-neutral-500 animate-[blink_1s_step-end_infinite]">
                      &nbsp;
                    </span>
                  </div>
                )}
                {!applying && logs.length === 0 && (
                  <span className="text-neutral-600">
                    Initialising…
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Phase: Complete ──────────────────────────────────────────────────────────

interface CompletePhaseProps {
  actionStates: ActionState[];
  rebootRequired: boolean;
  onStartOver: () => void;
}

function CompletePhase({
  actionStates,
  rebootRequired,
  onStartOver,
}: CompletePhaseProps) {
  const navigate = useNavigate();
  const { reset } = useTuningStore();
  const totalCount = actionStates.length;
  const successCount = actionStates.filter((s) => s.status === "success").length;
  const failedCount = actionStates.filter((s) => s.status === "failed").length;
  const failedActions = actionStates.filter((s) => s.status === "failed");

  const isAllSuccess = failedCount === 0;
  const isAllFailed = successCount === 0;

  const resultConfig = isAllFailed
    ? {
        icon: AlertTriangle,
        iconBg: "bg-red-50",
        iconBorder: "border-red-200",
        iconColor: "text-red-500",
        title: "Optimization Failed",
        desc: `All ${totalCount} actions failed to apply.`,
        badgeClass: "bg-red-50 text-red-700 border-red-200",
      }
    : isAllSuccess
      ? {
          icon: CheckCircle2,
          iconBg: "bg-green-50",
          iconBorder: "border-green-200",
          iconColor: "text-green-500",
          title: "Optimization Complete",
          desc: `${successCount} action${successCount !== 1 ? "s" : ""} applied successfully.`,
          badgeClass: "bg-green-50 text-green-700 border-green-200",
        }
      : {
          icon: AlertTriangle,
          iconBg: "bg-amber-50",
          iconBorder: "border-amber-200",
          iconColor: "text-amber-500",
          title: "Optimization Finished with Issues",
          desc: `${successCount} of ${totalCount} applied · ${failedCount} failed`,
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        };

  const ResultIcon = resultConfig.icon;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="space-y-4"
    >
      {/* Result card */}
      <motion.div variants={scaleUp}>
        <Card>
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20,
                delay: 0.1,
              }}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${resultConfig.iconBg} ${resultConfig.iconBorder}`}
            >
              <ResultIcon
                className={`h-7 w-7 ${resultConfig.iconColor}`}
                strokeWidth={1.5}
              />
            </motion.div>
            <h2 className="mt-4 text-lg font-bold text-neutral-900">
              {resultConfig.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">{resultConfig.desc}</p>
            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${resultConfig.badgeClass}`}
              >
                {successCount} succeeded
              </span>
              {failedCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  {failedCount} failed
                </span>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Failed actions detail */}
      {failedActions.length > 0 && (
        <motion.div variants={staggerChild} className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Failed Actions
          </p>
          {failedActions.map((state) => (
            <div
              key={state.planAction.action.id}
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertTriangle
                className="h-4 w-4 text-red-500 shrink-0 mt-0.5"
                strokeWidth={2}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-800">
                  {state.planAction.action.name}
                </p>
                {state.error && (
                  <p className="mt-0.5 text-xs text-red-600 break-words">
                    {state.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Reboot required card */}
      {rebootRequired && (
        <motion.div variants={slideUp}>
          <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white">
              <RotateCcw
                className="h-4 w-4 text-amber-600"
                strokeWidth={2}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Reboot to Activate Changes
              </p>
              <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                One or more applied actions require a system restart to take
                full effect. Save your work before restarting.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="secondary" size="sm">
                  Reboot Later
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                >
                  Restart Now
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rollback card */}
      <motion.div variants={staggerChild}>
        <div className="flex items-center gap-3 rounded-xl border border-neutral-150 bg-neutral-25 px-4 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
            <Shield
              className="h-4 w-4 text-neutral-500"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-700">
              Changes backed up automatically
            </p>
            <p className="text-[11px] text-neutral-400">
              You can roll back any applied change at any time from the Rollback Center.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              reset();
              navigate("/rollback");
            }}
          >
            View Snapshots
          </Button>
        </div>
      </motion.div>

      {/* Start over */}
      <motion.div variants={staggerChild} className="flex justify-center pt-2">
        <button
          onClick={onStartOver}
          className="text-xs font-medium text-neutral-400 hover:text-neutral-600 underline underline-offset-2 transition-colors"
        >
          Start Over
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ApplyWorkflowPage() {
  const navigate = useNavigate();
  const {
    plan,
    applying,
    currentActionIndex,
    setApplying,
    addLog,
    setCurrentActionIndex,
    reset,
  } = useTuningStore();

  const [phase, setPhase] = useState<Phase>("review");

  // Per-action status tracked in a ref to avoid re-render lag
  const actionStatesRef = useRef<ActionState[]>(
    plan?.actions.map((a) => ({ planAction: a, status: "pending", error: null })) ?? [],
  );

  const hasStarted = useRef(false);
  const forceRender = useForceRender();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  const { logs } = useTuningStore();
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // TODO: Subscribe to tuning.actionProgress when Rust event emission is wired
  // Currently not implemented — see IpcEvents in shared-schema/src/ipc.ts

  const updateActionState = (index: number, patch: Partial<ActionState>) => {
    const next = [...actionStatesRef.current];
    next[index] = { ...next[index], ...patch } as ActionState;
    actionStatesRef.current = next;
    forceRender();
  };

  const executeActions = useCallback(async () => {
    if (!plan?.actions?.length || hasStarted.current) return;
    hasStarted.current = true;

    // Reset per-action states
    actionStatesRef.current = plan.actions.map((a) => ({
      planAction: a,
      status: "pending",
      error: null,
    }));
    forceRender();

    setApplying(true);
    addLog("info", `Starting plan: ${plan.id} (${plan.preset})`);
    addLog("info", `${plan.actions.length} actions to apply`);

    for (let i = 0; i < plan.actions.length; i++) {
      const planAction = plan.actions[i]!;
      const action = planAction.action;

      setCurrentActionIndex(i);
      updateActionState(i, { status: "applying" });
      addLog("info", `Applying: ${action.name}`);

      try {
        const outcome = await serviceCall("tuning.applyAction", {
          actionId: action.id,
        });

        if (outcome.status === "failed") {
          updateActionState(i, {
            status: "failed",
            error: outcome.error ?? "Unknown failure",
          });
          addLog(
            "error",
            `Failed: ${action.name} — ${outcome.error ?? "unknown"}`,
          );
        } else {
          updateActionState(i, { status: "success" });
          addLog("success", `Applied: ${action.name}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        updateActionState(i, { status: "failed", error: msg });
        addLog("error", `Error applying ${action.name}: ${msg}`);
      }
    }

    const successCount = actionStatesRef.current.filter(
      (s) => s.status === "success",
    ).length;
    addLog(
      "success",
      `All actions complete. ${successCount}/${plan.actions.length} succeeded.`,
    );
    setApplying(false);
    setPhase("complete");
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start execution only when transitioning to the executing phase
  useEffect(() => {
    if (phase === "executing") {
      executeActions();
    }
  }, [phase, executeActions]);

  const handleCancel = () => {
    setApplying(false);
    addLog("warn", "Apply cancelled by user.");
    setPhase("complete");
  };

  const handleStartOver = () => {
    reset();
    hasStarted.current = false;
    navigate("/tuning");
  };

  const completedCount = actionStatesRef.current.filter(
    (s) => s.status === "success" || s.status === "failed",
  ).length;
  const totalCount = plan?.actions.length ?? 0;
  const overallPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const rebootRequired = plan?.actions.some((a) => a.action.requiresReboot) ?? false;

  // No plan loaded
  if (!plan) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={staggerChild}>
          <Card>
            <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50">
                <ScanSearch
                  className="h-6 w-6 text-neutral-300"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  No plan loaded
                </h2>
                <p className="mt-1 text-xs text-neutral-400">
                  Go to Tuning Plan to generate and configure a plan.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/tuning")}
              >
                Go to Tuning Plan
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-0">
      <AnimatePresence mode="wait">
        {phase === "review" && (
          <motion.div key="review">
            <ReviewPhase
              onBack={() => navigate("/tuning")}
              onBegin={() => setPhase("executing")}
            />
          </motion.div>
        )}

        {phase === "executing" && (
          <motion.div key="executing">
            <ExecutingPhase
              actionStates={actionStatesRef.current}
              currentActionIndex={currentActionIndex}
              applying={applying}
              overallPercent={overallPercent}
              completedCount={completedCount}
              totalCount={totalCount}
              onCancel={handleCancel}
              logRef={logContainerRef}
            />
          </motion.div>
        )}

        {phase === "complete" && (
          <motion.div key="complete">
            <CompletePhase
              actionStates={actionStatesRef.current}
              rebootRequired={rebootRequired}
              onStartOver={handleStartOver}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
