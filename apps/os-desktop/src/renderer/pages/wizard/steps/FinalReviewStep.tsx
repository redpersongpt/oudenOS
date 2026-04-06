// Final Review Step — last check before apply

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Archive, AlertTriangle, CheckCircle2, RotateCcw, Shield, WandSparkles } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";
import { platform } from "@/lib/platform";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

export function FinalReviewStep() {
  const { detectedProfile, resolvedPlaybook, personalization, setStepReady } = useWizardStore();
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
      personalization: effectivePersonalization,
    });
    if (result.ok) {
      setExportState("done");
      setExportMessage("Plan saved.");
      return;
    }
    if (result.cancelled) { setExportState("idle"); return; }
    setExportState("error");
    setExportMessage(typeof result.error === "string" ? result.error : "Could not save the plan.");
  };

  const pb = resolvedPlaybook;

  const personalizationList = [
    effectivePersonalization.darkMode && "Dark look",
    effectivePersonalization.brandAccent && "Accent color",
    effectivePersonalization.taskbarCleanup && "Taskbar cleanup",
    effectivePersonalization.explorerCleanup && "Explorer cleanup",
    effectivePersonalization.transparency && "Transparency kept",
    effectivePersonalization.wallpaper && "Wallpaper pack",
  ].filter(Boolean) as string[];
  const planHighlights = pb?.decisionSummary?.selectedEffects.slice(0, 3) ?? [];
  const rebootCount = pb?.phases.reduce(
    (count, phase) => count + phase.actions.filter((action) => action.status === "Included" && action.requiresReboot).length,
    0,
  ) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full min-h-0 flex-col px-6 py-6 bg-[var(--black)] overflow-hidden"
    >
      <div className="mb-4 shrink-0">
        <p className="text-[11px] font-medium text-[var(--accent)]">Ready to apply</p>
        <h2 className="mt-2 font-display text-title text-[var(--text-display)]">Final check</h2>
        <p className="mt-2 max-w-[780px] text-sm text-[var(--text-secondary)]">Review the changes before you apply them.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                key: "machine",
                label: "Target machine",
                value: detectedProfile?.label ?? "Unknown",
                meta: detectedProfile?.machineName ?? "—",
              },
              {
                key: "mode",
                label: "Plan mode",
                value: pb?.preset ?? "—",
                meta: pb?.decisionSummary?.riskLevel ? `${pb.decisionSummary.riskLevel} tradeoff` : "No tradeoff summary",
              },
              {
                key: "changes",
                label: "Changes now",
                value: pb ? `${pb.totalIncluded}` : "—",
                meta: pb ? `${pb.totalBlocked} held back · ${pb.phases.length} sections` : "No plan loaded",
              },
              {
                key: "restart",
                label: "Restart impact",
                value: rebootCount > 0 ? `${rebootCount}` : "0",
                meta: rebootCount > 0 ? "some changes need a restart" : "no restart required",
              },
            ].map(({ key, label, value, meta }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04, duration: 0.25, ease: ND_EASE }}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">{meta}</p>
                  </div>
                  <p className="text-right font-mono text-[20px] leading-none text-[var(--text-primary)]">{String(value)}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">What happens next</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
                <p>{pb?.totalIncluded ?? 0} changes will be applied in order.</p>
                <p>A rollback record is created before any changes are made.</p>
                <p>{pb?.totalBlocked ?? 0} changes will stay unchanged.</p>
              </div>
              {planHighlights.length > 0 && (
                <div className="mt-4 space-y-2">
                  {planHighlights.map((effect) => (
                    <div key={effect.questionKey} className="rounded-xl bg-[var(--black)] px-3 py-3">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{effect.questionLabel}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{effect.selectedTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center gap-2">
                  <WandSparkles className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">Look and feel</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(personalizationList.length > 0 ? personalizationList : ["Default settings"]).map((item) => (
                    <span key={item} className="rounded-full border border-[var(--border)] bg-[var(--black)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-[var(--accent)]" />
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">Safety</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                  <p>A rollback record is saved with the activity log.</p>
                  <p>You can save a copy of this plan before you apply it.</p>
                </div>
              </div>

              {pb?.decisionSummary?.warnings && pb.decisionSummary.warnings.length > 0 && (
                <div className="rounded-xl border border-white/[0.12] bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[var(--text-display)]" />
                    <p className="text-[11px] font-medium text-[var(--text-display)]">Warnings</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pb.decisionSummary.warnings.slice(0, 4).map((warning) => (
                      <div key={warning} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-display)]" />
                        <span className="nd-label-sm text-[var(--text-display)] normal-case">{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 shrink-0 flex flex-wrap items-center gap-3">
        <button
          onClick={handleExportPackage}
          disabled={!detectedProfile || !resolvedPlaybook || exportState === "busy"}
          className="flex items-center gap-2 border border-[var(--border)] rounded-sm px-4 py-2 font-mono text-label tracking-label text-[var(--text-secondary)] uppercase transition-colors duration-150 ease-nd hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Archive className="h-3.5 w-3.5" />
          {exportState === "busy" ? "Saving..." : "Save plan"}
        </button>
        <span className="text-xs text-[var(--text-secondary)]">Optional. Saves a copy of the plan before changes are applied.</span>
        {exportMessage && (
          <span className={`nd-status ${exportState === "error" ? "text-[#FF6B6B]" : "text-[var(--success)]"}`}>
            {exportMessage}
          </span>
        )}
      </div>
    </motion.div>
  );
}
