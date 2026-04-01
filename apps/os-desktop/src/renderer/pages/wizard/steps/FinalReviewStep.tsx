// ─── Final Review Step ───────────────────────────────────────────────────────
// Last chance to review before applying. Shows: profile, playbook stats,
// selected apps, personalization choices. Apply button is the primary CTA.

import { useEffect, useState, type ElementType, type ReactNode, type ReactElement } from "react";
import { motion } from "framer-motion";
import { Shield, Package, Palette, Download, AlertTriangle, Archive } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";

function ReviewSection({ icon: Icon, title, children }: {
  icon: ElementType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-400" strokeWidth={1.5} />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-secondary">{title}</span>
      </div>
      {children}
    </div>
  );
}

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

    const result = await api.wizard.exportPackage({
      detectedProfile,
      playbookPreset: resolvedPlaybook.preset,
      answers,
      resolvedPlaybook,
      decisionSummary: resolvedPlaybook.decisionSummary ?? null,
      actionProvenance: resolvedPlaybook.actionProvenance ?? [],
      personalization: effectivePersonalization,
      selectedAppIds,
    });

    if (result.ok) {
      setExportState("done");
      setExportMessage(`Package exported${typeof result.path === "string" ? ` to ${result.path}` : ""}.`);
      return;
    }

    if (result.cancelled) {
      setExportState("idle");
      return;
    }

    setExportState("error");
    setExportMessage(typeof result.error === "string" ? result.error : "Export failed.");
  };

  const sections = [
    {
      key: "profile",
      node: (
        <ReviewSection icon={Shield} title="Machine Profile">
          <p className="text-[13px] font-semibold text-ink">{detectedProfile?.label ?? "Unknown"}</p>
          <p className="text-[11px] text-ink-tertiary">{detectedProfile?.machineName ?? "—"}</p>
        </ReviewSection>
      ),
    },
    resolvedPlaybook
      ? {
          key: "playbook",
          node: (
            <ReviewSection icon={Package} title="Playbook">
              <div className="flex gap-4">
                <div>
                  <p className="text-lg font-bold font-mono text-green-400">{resolvedPlaybook.totalIncluded}</p>
                  <p className="text-[10px] text-ink-tertiary">Actions</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-red-400">{resolvedPlaybook.totalBlocked}</p>
                  <p className="text-[10px] text-ink-tertiary">Blocked</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-mono text-ink-secondary">{resolvedPlaybook.phases.length}</p>
                  <p className="text-[10px] text-ink-tertiary">Phases</p>
                </div>
              </div>
              {resolvedPlaybook.decisionSummary && (
                <div className="mt-3 space-y-2">
                  <p className="text-[11px] text-ink-secondary">
                    Decision risk: <span className="font-semibold text-ink">{resolvedPlaybook.decisionSummary.riskLevel}</span>
                    {resolvedPlaybook.decisionSummary.estimatedPreserved > 0 && (
                      <>
                        {" · "}
                        <span className="font-semibold text-ink">
                          {resolvedPlaybook.decisionSummary.estimatedPreserved} preserved
                        </span>
                      </>
                    )}
                  </p>
                  {resolvedPlaybook.decisionSummary.warnings.length > 0 && (
                    <div className="space-y-1">
                      {resolvedPlaybook.decisionSummary.warnings.slice(0, 2).map((warning) => (
                        <p key={warning} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-400">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{warning}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ReviewSection>
          ),
        }
      : null,
    {
      key: "apps",
      node: (
        <ReviewSection icon={Download} title="App Install">
          <p className="text-[13px] text-ink">
            {selectedAppIds.length > 0
              ? `${selectedAppIds.length} app${selectedAppIds.length !== 1 ? "s" : ""} will be downloaded and installed during apply`
              : "No apps selected"}
          </p>
        </ReviewSection>
      ),
    },
    {
      key: "personalization",
      node: (
        <ReviewSection icon={Palette} title="Personalization">
          <div className="flex flex-wrap gap-2">
            {effectivePersonalization.darkMode && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Dark Mode</span>}
            {effectivePersonalization.brandAccent && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Brand Accent</span>}
            {effectivePersonalization.taskbarCleanup && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Taskbar Cleanup</span>}
            {effectivePersonalization.explorerCleanup && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Explorer Cleanup</span>}
            {effectivePersonalization.transparency && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Transparency</span>}
          </div>
        </ReviewSection>
      ),
    },
  ].filter((s): s is { key: string; node: ReactElement } => s !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full flex-col px-6 py-6 overflow-y-auto"
    >
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Ready to Apply
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-secondary">
          Last check before we start. Everything here can be undone.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportPackage}
            disabled={!detectedProfile || !resolvedPlaybook || exportState === "busy"}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-ink-secondary transition-colors hover:border-white/[0.16] hover:text-ink disabled:cursor-not-allowed disabled:text-ink-disabled"
          >
            <Archive className="h-3.5 w-3.5" />
            {exportState === "busy" ? "Saving..." : "Save Package"}
          </button>
          {exportMessage && (
            <p className={`text-[11px] ${exportState === "error" ? "text-red-400" : "text-ink-secondary"}`}>
              {exportMessage}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sections.map(({ key, node }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.08, duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
          >
            {node}
          </motion.div>
        ))}
      </div>

      {/* Trust note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.38 }}
        className="mt-4 text-center text-[11px] text-ink-tertiary"
      >
        Every change can be undone. Snapshots saved before each one.
      </motion.p>
    </motion.div>
  );
}
