// ─── Report Step ──────────────────────────────────────────────────────────────
// Transformation complete. Shows expert-grade summary of what changed and why.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Shield, AlertTriangle, Lock, Heart, Archive } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";

export function ReportStep() {
  const { executionResult, resolvedPlaybook, detectedProfile, personalization, selectedAppIds, gotoDonation } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const effectivePersonalization = useMemo(
    () => resolveEffectivePersonalization(detectedProfile?.id, personalization, answers),
    [answers, detectedProfile?.id, personalization],
  );
  const [exportState, setExportState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [exportMessage, setExportMessage] = useState("");
  const result = executionResult ?? {
    applied: 0,
    failed: 0,
    skipped: 0,
    preserved: 0,
    packageRefs: null,
    journal: [],
  };
  const pb = resolvedPlaybook;
  const appliedPlaybookActions = result.journal.filter((entry) => entry.kind === "playbook-action" && entry.status === "applied").length;
  const failedActions = result.journal.filter((entry) => entry.status === "failed").length;
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

  const handleExportCompletedPackage = async () => {
    if (!detectedProfile || !resolvedPlaybook) return;

    setExportState("busy");
    setExportMessage("");

    const api = (window as unknown as {
      redcore?: {
        wizard?: {
          exportPackage?: (state: Record<string, unknown>) => Promise<Record<string, unknown>>;
        };
      };
    }).redcore;

    if (!api?.wizard?.exportPackage) {
      setExportState("error");
      setExportMessage("Export API is not available in this environment.");
      return;
    }

    const { serviceCall } = await import("@/lib/service");
    const serviceJournalResult = await serviceCall<Record<string, unknown> | null>("journal.state");
    const exportResult = await api.wizard.exportPackage({
      detectedProfile,
      playbookPreset: resolvedPlaybook.preset,
      answers,
      resolvedPlaybook,
      decisionSummary: resolvedPlaybook.decisionSummary ?? null,
      actionProvenance: resolvedPlaybook.actionProvenance ?? [],
      executionJournal: executionResult?.journal ?? [],
      serviceJournalState: serviceJournalResult.ok ? serviceJournalResult.data : null,
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
        <h2 className="text-[18px] font-bold text-ink">Transformation Complete</h2>
        <p className="mt-1 text-[11px] text-ink-secondary">
          Your {detectedProfile?.label ?? "system"} has been optimized
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={handleExportCompletedPackage}
            disabled={!detectedProfile || !resolvedPlaybook || exportState === "busy"}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-ink-secondary transition-colors hover:border-white/[0.16] hover:text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
          >
            <Archive className="h-3.5 w-3.5" />
            {exportState === "busy" ? "Exporting completed APBX..." : "Export Completed APBX"}
          </button>
          {exportMessage && (
            <p className={`text-[11px] ${exportState === "error" ? "text-red-400" : "text-ink-secondary"}`}>
              {exportMessage}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        {[
          { value: appliedPlaybookActions || result.applied, label: "Applied", color: "text-success-400", icon: Check },
          { value: failedActions || result.failed, label: "Failed", color: (failedActions || result.failed) > 0 ? "text-danger-400" : "text-ink-muted", icon: AlertTriangle },
          { value: preservedActions.length || result.preserved, label: "Preserved", color: "text-ink-secondary", icon: Shield },
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
              <span className="font-semibold text-ink">{appliedPlaybookActions || pb.totalIncluded} actions</span> applied across {pb.phases.length} categories, with each action tied back to the APBX package provenance chain.
            </p>
          </div>

          {/* What was preserved */}
          {preservedActions.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{preservedActions.length} actions preserved</span>
                {userChoicePreserved.length > 0
                  ? ` — ${userChoicePreserved.length} came directly from your questionnaire preserve choices.`
                  : detectedProfile?.isWorkPc
                  ? " — business-critical services were protected for your Work PC."
                  : " — machine/profile safeguards prevented incompatible changes."}
              </p>
            </div>
          )}

          {/* Expert-only actions skipped */}
          {pb.totalExpertOnly > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-purple-400" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{pb.totalExpertOnly} expert-only actions</span> were available but not included by default — these require manual opt-in for advanced users.
              </p>
            </div>
          )}

          {profileSafeguards.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
              <Lock className="mt-0.5 h-3 w-3 shrink-0 text-ink-secondary" />
              <p className="text-[10px] leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{profileSafeguards.length} safeguards</span> were enforced by build/profile rules, not by separate report logic.
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

      {/* Trust footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-[10px] text-ink-muted"
      >
        A rollback snapshot was created before every change · Journal and report entries point back to the same APBX package truth
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
