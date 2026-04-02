// Final Review Step — last check before apply

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Archive, AlertTriangle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";
import { platform } from "@/lib/platform";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

export function FinalReviewStep() {
  const { detectedProfile, resolvedPlaybook, selectedAppIds, personalization, setStepReady } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const effectivePersonalization = resolveEffectivePersonalization(detectedProfile?.id, personalization, answers);
  const [exportState, setExportState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    setStepReady("final-review", Boolean(detectedProfile && resolvedPlaybook));
  }, [detectedProfile, resolvedPlaybook, setStepReady]);

  const handleExportPackage = async () => {
    if (!detectedProfile || !resolvedPlaybook) return;
    setExportState("busy");
    setExportMessage("");
    const result = await platform().wizard.exportPackage({
      detectedProfile, playbookPreset: resolvedPlaybook.preset,
      answers, resolvedPlaybook,
      decisionSummary: resolvedPlaybook.decisionSummary ?? null,
      actionProvenance: resolvedPlaybook.actionProvenance ?? [],
      personalization: effectivePersonalization, selectedAppIds,
    });
    if (result.ok) {
      setExportState("done");
      setExportMessage(`[SAVED${typeof result.path === "string" ? `: ${result.path}` : ""}]`);
      return;
    }
    if (result.cancelled) { setExportState("idle"); return; }
    setExportState("error");
    setExportMessage(`[ERROR: ${typeof result.error === "string" ? result.error : "EXPORT FAILED"}]`);
  };

  const pb = resolvedPlaybook;

  const allRows = [
    { key: "profile", label: "MACHINE", value: `${detectedProfile?.label?.toUpperCase() ?? "UNKNOWN"} · ${detectedProfile?.machineName ?? "—"}` },
    pb ? { key: "actions", label: "ACTIONS", value: `${pb.totalIncluded} INCLUDED · ${pb.totalBlocked} BLOCKED · ${pb.phases.length} PHASES` } : null,
    pb?.decisionSummary ? { key: "risk", label: "RISK", value: pb.decisionSummary.riskLevel.toUpperCase() } : null,
    { key: "apps", label: "APPS", value: selectedAppIds.length > 0 ? `${selectedAppIds.length} SELECTED` : "NONE" },
    { key: "theme", label: "THEME", value: [
      effectivePersonalization.darkMode && "DARK",
      effectivePersonalization.brandAccent && "ACCENT",
      effectivePersonalization.taskbarCleanup && "TASKBAR",
      effectivePersonalization.explorerCleanup && "EXPLORER",
      effectivePersonalization.transparency && "TRANSPARENCY",
    ].filter(Boolean).join(" · ") || "DEFAULT" },
  ];
  const rows = allRows.filter((r): r is { key: string; label: string; value: string } => r !== null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col px-6 py-6 bg-nd-bg overflow-y-auto scrollbar-thin"
    >
      <div className="mb-6">
        <h2 className="font-display text-title text-nd-text-display">FINAL REVIEW</h2>
        <p className="mt-2 nd-label text-nd-text-secondary">SNAPSHOT CREATED BEFORE EACH CHANGE</p>
      </div>

      {/* Data rows */}
      <div className="w-full max-w-lg">
        {rows.map(({ key, label, value }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 + i * 0.04, duration: 0.2, ease: ND_EASE }}
            className="flex items-start justify-between gap-4 border-b border-nd-border-subtle px-4 py-3"
          >
            <span className="nd-label text-nd-text-disabled shrink-0 w-20">{label}</span>
            <span className="font-mono text-caption tracking-label text-nd-text-primary text-right">{value}</span>
          </motion.div>
        ))}
      </div>

      {/* Warnings */}
      {pb?.decisionSummary?.warnings && pb.decisionSummary.warnings.length > 0 && (
        <div className="mt-4 w-full max-w-lg space-y-1">
          {pb.decisionSummary.warnings.slice(0, 3).map((warning) => (
            <div key={warning} className="flex items-start gap-2 px-4 py-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning-400" />
              <span className="nd-label-sm text-warning-400 normal-case">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleExportPackage}
          disabled={!detectedProfile || !resolvedPlaybook || exportState === "busy"}
          className="flex items-center gap-2 border border-nd-border rounded-sm px-4 py-2 font-mono text-label tracking-label text-nd-text-secondary uppercase transition-colors duration-150 ease-nd hover:bg-nd-surface disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Archive className="h-3.5 w-3.5" />
          {exportState === "busy" ? "SAVING..." : "SAVE PACKAGE"}
        </button>
        {exportMessage && (
          <span className={`nd-status ${exportState === "error" ? "text-danger-400" : "text-success-400"}`}>
            {exportMessage}
          </span>
        )}
      </div>
    </motion.div>
  );
}
