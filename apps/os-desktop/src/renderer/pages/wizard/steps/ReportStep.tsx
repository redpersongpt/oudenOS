
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Shield, AlertTriangle, Lock, Heart, Archive, FileText } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { useLogStore } from "@/stores/log-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";
import { platform } from "@/lib/platform";

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

interface LedgerStep {
  actionId: string;
  actionName: string;
  phase: string;
  status: string;
  resultStatus: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  packageSourceRef: string | null;
  provenanceRef: string | null;
}

interface LedgerQueryResult {
  planId: string;
  status: string;
  totalActions: number;
  totalCompleted: number;
  totalFailed: number;
  totalRemaining: number;
  rebootReason: string | null;
  steps: LedgerStep[];
  ledgerEvents?: Array<{ eventType: string; actionId: string; status: string; timestamp: string }>;
}

export function ReportStep() {
  const { executionResult, resolvedPlaybook, detectedProfile, personalization, selectedAppIds, gotoDonation } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const effectivePersonalization = useMemo(
    () => resolveEffectivePersonalization(detectedProfile?.id, personalization, answers),
    [answers, detectedProfile?.id, personalization],
  );
  const [exportState, setExportState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [exportMessage, setExportMessage] = useState("");
  const [logExportState, setLogExportState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [logExportMessage, setLogExportMessage] = useState("");
  const [footerClicks, setFooterClicks] = useState(0);
  const handleFooterClick = useCallback(() => {
    const next = footerClicks + 1;
    setFooterClicks(next);
    if (next >= 5) {
      setFooterClicks(0);
      platform().shell.openExternal(RICKROLL_URL);
    }
  }, [footerClicks]);
  const exportLogAsText = useLogStore((state) => state.exportAsText);

  const [ledgerState, setLedgerState] = useState<LedgerQueryResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loadLedger = async () => {
      try {
        const { serviceCall } = await import("@/lib/service");
        const result = await serviceCall<LedgerQueryResult | null>("ledger.query", { includeLedger: true });
        if (!cancelled && result.ok && result.data) {
          setLedgerState(result.data);
        }
      } catch {
      }
    };
    loadLedger();
    return () => { cancelled = true; };
  }, []);

  const rendererResult = executionResult ?? {
    applied: 0,
    failed: 0,
    skipped: 0,
    preserved: 0,
    packageRefs: null,
    journal: [],
  };

  const appliedPlaybookActions = ledgerState
    ? ledgerState.totalCompleted
    : rendererResult.journal.filter((entry) => entry.kind === "playbook-action" && entry.status === "applied").length;

  const failedActions = ledgerState
    ? ledgerState.totalFailed
    : rendererResult.journal.filter((entry) => entry.status === "failed").length;

  const pb = resolvedPlaybook;
  const preservedActions = (pb?.actionProvenance ?? []).filter(
    (entry) => entry.finalStatus === "Blocked" || entry.finalStatus === "BuildGated",
  );
  const userChoicePreserved = preservedActions.filter((entry) => entry.reasonOrigin === "user-choice");
  const profileSafeguards = preservedActions.filter((entry) => entry.reasonOrigin === "profile-safeguard" || entry.reasonOrigin === "build-gate");
  const topWarnings = Array.from(
    new Set([
      ...(pb?.decisionSummary?.warnings ?? []),
      ...(pb?.actionProvenance ?? []).flatMap((entry) => entry.warnings),
    ]),
  ).slice(0, 2);

  const handleExportLog = async () => {
    setLogExportState("busy");
    setLogExportMessage("");
    const text = exportLogAsText();

    try {
      const result = await platform().log.saveToDesktop(text);
      if (result.ok) {
        setLogExportState("done");
        setLogExportMessage(`Log saved${result.path ? ` to ${result.path}` : ""}`);
      } else {
        setLogExportState("error");
        setLogExportMessage(result.error ?? "Failed to save log");
      }
    } catch {
      setLogExportState("error");
      setLogExportMessage("Failed to save log");
    }
  };

  const handleExportCompletedPackage = async () => {
    if (!detectedProfile || !resolvedPlaybook) return;

    setExportState("busy");
    setExportMessage("");

    const { serviceCall } = await import("@/lib/service");

    const ledgerQueryResult = await serviceCall<Record<string, unknown> | null>("ledger.query", { includeLedger: true });
    const serviceJournalResult = await serviceCall<Record<string, unknown> | null>("journal.state");

    const exportResult = await platform().wizard.exportPackage({
      detectedProfile,
      playbookPreset: resolvedPlaybook.preset,
      answers,
      resolvedPlaybook,
      decisionSummary: resolvedPlaybook.decisionSummary ?? null,
      actionProvenance: resolvedPlaybook.actionProvenance ?? [],
      executionJournal: executionResult?.journal ?? [],
      serviceJournalState: serviceJournalResult.ok ? serviceJournalResult.data : null,
      ledgerState: ledgerQueryResult.ok ? ledgerQueryResult.data : null,
      personalization: effectivePersonalization,
      selectedAppIds,
    });

    if (exportResult.ok) {
      setExportState("done");
      setExportMessage(`Completed package exported${typeof exportResult.path === "string" ? ` to ${exportResult.path}` : ""}.`);
      return;
    }

    if (exportResult.cancelled) {
      setExportState("idle");
      return;
    }

    setExportState("error");
    setExportMessage(typeof exportResult.error === "string" ? exportResult.error : "Export failed.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 }}
        className="relative flex h-14 w-14 items-center justify-center"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
          className="absolute inset-0 rounded-full bg-success-500/20"
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-success-500/30 bg-success-500/10">
          <Check className="h-7 w-7 text-success-400" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-[18px] font-bold text-ink">All Done</h2>
        <p className="mt-1 text-[11px] text-ink-secondary">
          Your {detectedProfile?.label ?? "system"} has been optimized
        </p>
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCompletedPackage}
              disabled={!detectedProfile || !resolvedPlaybook || exportState === "busy"}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[11px] font-semibold text-ink transition-all hover:border-white/[0.22] hover:bg-white/[0.09] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Archive className="h-3.5 w-3.5 shrink-0" />
              {exportState === "busy" ? "Exporting..." : exportState === "done" ? "Exported" : "Save Report"}
            </button>
            <button
              onClick={handleExportLog}
              disabled={logExportState === "busy"}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[11px] font-semibold text-ink transition-all hover:border-white/[0.22] hover:bg-white/[0.09] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {logExportState === "busy" ? "Saving..." : logExportState === "done" ? "Saved" : "Save Log"}
            </button>
          </div>
          {exportMessage && (
            <p className={`text-[11px] ${exportState === "error" ? "text-red-400" : "text-ink-secondary"}`}>
              {exportMessage}
            </p>
          )}
          {logExportMessage && (
            <p className={`text-[11px] ${logExportState === "error" ? "text-red-400" : "text-ink-secondary"}`}>
              {logExportMessage}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        {[
          { value: appliedPlaybookActions || rendererResult.applied, label: "Applied", color: "text-success-400", icon: Check },
          { value: failedActions || rendererResult.failed, label: "Failed", color: (failedActions || rendererResult.failed) > 0 ? "text-danger-400" : "text-ink-muted", icon: AlertTriangle },
          { value: preservedActions.length || rendererResult.preserved, label: "Preserved", color: "text-ink-secondary", icon: Shield },
        ].map(({ value, label, color, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3"
          >
            <Icon className={`h-3.5 w-3.5 ${color} mb-0.5`} />
            <span className={`font-mono-metric text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-[10px] text-ink-muted">{label}</span>
          </motion.div>
        ))}
      </div>

      {/* Intelligent summary */}
      {pb && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-md space-y-1.5"
        >
          {/* What was included */}
          <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-success-400" />
            <p className="text-[10px] leading-relaxed text-ink-secondary">
              <span className="font-semibold text-ink">{appliedPlaybookActions || pb.totalIncluded} actions</span> applied across {pb.phases.length} categories.
            </p>
          </div>

          {/* What was preserved */}
          {preservedActions.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{preservedActions.length} actions preserved</span>
                {userChoicePreserved.length > 0
                  ? ` — ${userChoicePreserved.length} skipped because of your answers.`
                  : detectedProfile?.isWorkPc
                  ? " — kept safe for your Work PC."
                  : " — skipped because they don't fit your setup."}
              </p>
            </div>
          )}

          {/* Expert-only actions skipped */}
          {pb.totalExpertOnly > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-purple-400" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{pb.totalExpertOnly} expert-only actions</span> skipped — pick "Expert" preset to unlock them.
              </p>
            </div>
          )}

          {profileSafeguards.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-ink-secondary" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{profileSafeguards.length} actions</span> blocked automatically — not compatible with your PC type or Windows version.
              </p>
            </div>
          )}

          {topWarnings.length > 0 && (
            <div className="space-y-1.5">
              {topWarnings.map((warning) => (
                <div key={warning} className="flex items-start gap-2 rounded-lg border border-amber-500/12 bg-amber-500/[0.06] px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                  <p className="text-[10px] leading-relaxed text-amber-100/80">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* How to undo */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
      >
        <p className="text-[11px] font-semibold text-ink mb-2">How to undo changes</p>
        <div className="space-y-1.5 text-[10px] text-ink-secondary leading-relaxed">
          <p><span className="text-ink font-medium">System Restore:</span> Windows saved a restore point before we started. Open Start → type "Create a restore point" → System Restore → pick the point from today.</p>
          <p><span className="text-ink font-medium">Registry:</span> Every registry key we changed has its old value saved. Re-run redcore OS and it will detect previous changes.</p>
          <p><span className="text-ink font-medium">Services:</span> Open <span className="font-mono text-[9px] bg-white/[0.04] px-1 rounded">services.msc</span> and set any service back to Automatic or Manual.</p>
          <p><span className="text-ink font-medium">Removed apps:</span> Open Microsoft Store and reinstall anything you want back.</p>
          <p><span className="text-ink font-medium">Full reset:</span> Settings → System → Recovery → Reset this PC keeps your files but restores all Windows defaults.</p>
        </div>
      </motion.div>

      {/* Footer (easter egg: click 5 times = rickroll) */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={handleFooterClick}
        className="text-[10px] text-ink-muted cursor-default select-none"
      >
        Snapshots saved before each action
      </motion.p>

      {/* Optional donation CTA */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        onClick={gotoDonation}
        className="flex items-center gap-1.5 rounded-lg border border-pink-500/20 bg-pink-500/[0.06] px-3.5 py-1.5 text-[10px] font-medium text-pink-400 transition-all hover:border-pink-500/35 hover:bg-pink-500/10"
      >
        <Heart className="h-3 w-3" strokeWidth={2} />
        Support the project
      </motion.button>
    </motion.div>
  );
}
