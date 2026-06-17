// Playbook Review Step
// Optimization manifest review. Shows the resolved playbook plan grouped by
// phase with action statuses. Premium installer-grade density.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { ResolvedPlaybook, PlaybookPhase, PlaybookResolvedAction } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { buildMockResolvedPlaybook } from "@/lib/mock-playbook";
import technicalDetails from "@/lib/generated-technical-details.json";
import { serviceCall } from "@/lib/service";
import { getActionRationale, PHASE_RATIONALE } from "@/lib/expert-rationale";
import { useActionLocalizer } from "@/i18n/content-overlay";
import { useT } from "@/i18n";

// ---------------------------------------------------------------------------
// Technical details types & helpers
// ---------------------------------------------------------------------------

interface RegistryChange {
  hive: string;
  path: string;
  valueName: string;
  value: string | number;
  valueType?: string;
}

interface ServiceChange {
  name: string;
  startupType: string;
}

interface FileRename {
  source: string;
  target: string;
  requiresTrustedInstaller?: boolean;
  cpuVendor?: string;
}

interface BcdChange {
  element: string;
  newValue: string;
}

interface PowerChange {
  settingPath: string;
  newValue?: string;
  value?: string;
  scope?: string;
}

interface ActionTechnicalDetails {
  registryChanges?: RegistryChange[];
  serviceChanges?: ServiceChange[];
  packages?: string[];
  fileRenames?: FileRename[];
  bcdChanges?: BcdChange[];
  powerChanges?: PowerChange[];
}

const techLookup = technicalDetails as Record<string, ActionTechnicalDetails>;

const TEMPLATE_RE = /<[^>]+>/;

// ---------------------------------------------------------------------------
// TechnicalDetails — expandable per-action panel
// ---------------------------------------------------------------------------

function TechnicalDetails({ actionId }: { actionId: string }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const details = techLookup[actionId];

  if (!details) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {t("plan.details")}
        {expanded && (
          <span className="ml-1 text-[var(--text-disabled)]">{t("plan.detailsUnavailable")}</span>
        )}
      </button>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-[10px] text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {t("plan.details")}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[10px] leading-relaxed text-[var(--text-disabled)] space-y-2">
              {/* Registry Changes */}
              {details.registryChanges && details.registryChanges.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5">{t("plan.registry")}</p>
                  {details.registryChanges.map((rc, i) => {
                    const fullPath = `${rc.hive}\\${rc.path}`;
                    const hasTemplate = TEMPLATE_RE.test(fullPath) || TEMPLATE_RE.test(String(rc.value));
                    return (
                      <div key={i} className="ml-2">
                        <p className="text-[var(--text-disabled)] truncate" title={fullPath}>{fullPath}</p>
                        <p className="ml-2 text-[var(--text-primary)]">
                          {rc.valueName} = {String(rc.value)}
                          {rc.valueType ? ` (${rc.valueType})` : ""}
                        </p>
                        {hasTemplate && (
                          <p className="ml-2 text-[9px] text-[var(--text-disabled)] italic">{t("plan.setDuringApply")}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Service Changes */}
              {details.serviceChanges && details.serviceChanges.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5">{t("plan.services")}</p>
                  {details.serviceChanges.map((sc, i) => (
                    <p key={i} className="ml-2">
                      {sc.name} → {sc.startupType}
                    </p>
                  ))}
                </div>
              )}

              {/* Packages */}
              {details.packages && details.packages.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5">{t("plan.packages")}</p>
                  {details.packages.map((pkg, i) => (
                    <p key={i} className="ml-2">{pkg}</p>
                  ))}
                </div>
              )}

              {/* BCD Changes */}
              {details.bcdChanges && details.bcdChanges.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5">{t("plan.bootConfig")}</p>
                  {details.bcdChanges.map((bc, i) => (
                    <p key={i} className="ml-2">
                      {bc.element} = {bc.newValue}
                    </p>
                  ))}
                </div>
              )}

              {/* Power Changes */}
              {details.powerChanges && details.powerChanges.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5">{t("plan.powerSettings")}</p>
                  {details.powerChanges.map((pc, i) => (
                    <p key={i} className="ml-2 truncate" title={pc.settingPath}>
                      {pc.settingPath} = {pc.newValue ?? pc.value ?? ""}
                      {pc.scope ? ` (${pc.scope})` : ""}
                    </p>
                  ))}
                </div>
              )}

              {/* File Renames */}
              {details.fileRenames && details.fileRenames.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--text-secondary)] mb-0.5">{t("plan.fileRenames")}</p>
                  {details.fileRenames.map((fr, i) => (
                    <div key={i} className="ml-2">
                      <p className="truncate" title={fr.source}>{fr.source}</p>
                      <p className="ml-2 truncate" title={fr.target}>→ {fr.target}</p>
                      {fr.cpuVendor && (
                        <p className="ml-2 text-[9px] text-[var(--text-disabled)] italic">{t("plan.vendorOnly", { vendor: fr.cpuVendor })}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionRow
// ---------------------------------------------------------------------------

const statusDot: Record<string, string> = {
  Included:   "bg-[var(--success)]",
  Blocked:    "bg-[#FF6B6B]",
  Optional:   "bg-[var(--text-secondary)]",
  ExpertOnly: "bg-purple-400",
  BuildGated: "bg-neutral-400",
};

const statusBadge: Record<string, string> = {
  Included:   "border-[var(--success)]/20 text-[var(--success)] bg-[var(--success)]/5",
  Blocked:    "border-[#FF6B6B]/20 text-[#FF6B6B] bg-[#FF6B6B]/5",
  Optional:   "border-[var(--border)] text-[var(--text-secondary)]",
  ExpertOnly: "border-purple-400/20 text-purple-400 bg-purple-400/5",
  BuildGated: "border-neutral-400/20 text-neutral-400 bg-neutral-400/5",
};

function ActionRow({ action }: { action: PlaybookResolvedAction }) {
  const { t } = useT();
  const profile = useWizardStore((s) => s.detectedProfile?.id);
  const localize = useActionLocalizer();
  const a = localize(action);
  const rationale = getActionRationale(action.id, profile);
  const statusLabel: Record<string, string> = {
    Included:   t("plan.statusIncluded"),
    Blocked:    t("plan.statusBlocked"),
    Optional:   t("plan.statusOptional"),
    ExpertOnly: t("plan.statusExpert"),
    BuildGated: t("plan.statusBuildGated"),
  };
  return (
    <div className="flex items-start gap-3 px-4 py-2 border-b border-[var(--border)] last:border-0">
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[action.status] ?? "bg-neutral-400"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[var(--text-primary)] flex-1 min-w-0 truncate">{a.name}</span>
          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-sm border ${statusBadge[action.status] ?? statusBadge.Blocked}`}>
            {statusLabel[action.status] ?? action.status}
          </span>
        </div>
        {/* Plain-language "why this is recommended" — visible product intelligence. */}
        {rationale.why && (
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-secondary)]">{rationale.why}</p>
        )}
        {rationale.profileWarning && (
          <p className="mt-0.5 text-[10px] leading-snug text-[#E6A23C]">⚠ {rationale.profileWarning}</p>
        )}
        {rationale.antiCheatNote && (
          <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-disabled)]">{rationale.antiCheatNote}</p>
        )}
        <TechnicalDetails actionId={action.id} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhaseSection (collapsible)
// ---------------------------------------------------------------------------

function PhaseSection({ phase, defaultOpen }: { phase: PlaybookPhase; defaultOpen: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(defaultOpen);
  const includedCount = phase.actions.filter(a => a.status === "Included").length;

  return (
    <div className="border border-[var(--border)] rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-raised)] transition-colors"
      >
        <div className="flex flex-col items-start gap-0.5 min-w-0 text-left">
          <div className="flex items-center gap-3">
            <span className="font-data text-[13px] text-[var(--text-display)]">{phase.name}</span>
            <span className="text-[10px] text-[var(--text-disabled)]">{t("plan.changesCount", { count: includedCount })}</span>
          </div>
          {PHASE_RATIONALE[phase.id] && (
            <span className="text-[10px] font-normal leading-snug text-[var(--text-secondary)]">
              {PHASE_RATIONALE[phase.id]}
            </span>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)]">
              {phase.actions.map((action) => (
                <ActionRow key={action.id} action={action} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function PlaybookSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-black px-6 py-5 overflow-hidden">
      <div className="shrink-0 space-y-2 mb-4">
        <div className="h-4 w-16 rounded-sm bg-[var(--surface)] animate-pulse" />
        <div className="h-6 w-40 rounded-sm bg-[var(--surface)] animate-pulse" />
        <div className="h-3 w-72 rounded-sm bg-[var(--surface)] animate-pulse" />
      </div>
      <div className="h-12 rounded-sm bg-[var(--surface)] border border-[var(--border)] animate-pulse mb-4" />
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-[var(--surface)] rounded-sm border border-[var(--border)]" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaybookReviewStep() {
  const { t } = useT();
  const { detectedProfile, playbookPreset, demoMode, setResolvedPlaybook, setStepReady } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const [loading, setLoading] = useState(true);
  const [effectivePlaybook, setEffectivePlaybook] = useState<ResolvedPlaybook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setStepReady("playbook-review", false);

    const load = async () => {
      const profile = detectedProfile?.id ?? "gaming_desktop";
      const windowsBuild = detectedProfile?.windowsBuild ?? 22631;
      setLoading(true);
      setLoadError(null);
      try {
        const result = await serviceCall<ResolvedPlaybook>("playbook.resolve", {
          profile,
          preset: playbookPreset,
          windowsBuild,
          answers,
        });
        if (result.ok) {
          setEffectivePlaybook(result.data);
        } else if (demoMode) {
          setEffectivePlaybook(buildMockResolvedPlaybook(profile, playbookPreset, windowsBuild));
        } else {
          setEffectivePlaybook(null);
          setLoadError(result.error || "Could not build the plan.");
        }
      } catch {
        if (demoMode) {
          setEffectivePlaybook(buildMockResolvedPlaybook(profile, playbookPreset, windowsBuild));
        } else {
          setEffectivePlaybook(null);
          setLoadError("Could not build the plan.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [answers, demoMode, detectedProfile, playbookPreset, setStepReady]);

  useEffect(() => {
    if (effectivePlaybook) {
      setResolvedPlaybook(effectivePlaybook);
    }
    setStepReady("playbook-review", !loading && Boolean(effectivePlaybook));
  }, [effectivePlaybook, loading, setResolvedPlaybook, setStepReady]);

  if (loading) return <PlaybookSkeleton />;

  if (!effectivePlaybook) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-8">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--text-display)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-[var(--text-secondary)]">{loadError ?? t("plan.unavailable")}</p>
      </div>
    );
  }

  const totalIncluded = effectivePlaybook.totalIncluded;
  const totalBlocked = effectivePlaybook.totalBlocked;
  const rebootRequired = effectivePlaybook.phases.some(
    p => p.actions.some(a => a.status === "Included" && a.requiresReboot)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full min-h-0 flex-col bg-black px-6 py-5 overflow-hidden"
    >
      {/* Header */}
      <div className="shrink-0">
        <p className="nd-label-sm text-[var(--text-secondary)]">{t("plan.eyebrow")}</p>
        <h2 className="mt-1 font-display text-[22px] text-[var(--text-display)]">{t("plan.title")}</h2>
        <p className="mt-1 text-[12px] text-[var(--text-secondary)] max-w-[600px]">
          {t("plan.subtitle")}
        </p>
      </div>

      {/* Summary bar */}
      <div className="mt-4 shrink-0 flex items-center gap-4 border border-[var(--border)] bg-[var(--surface)] rounded-sm px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-data text-[16px] text-[var(--text-display)]">{totalIncluded}</span>
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">{t("plan.changes")}</span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <span className="font-data text-[16px] text-[var(--text-display)]">{totalBlocked}</span>
          <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest">{t("plan.blocked")}</span>
        </div>
        {rebootRequired && (
          <>
            <div className="w-px h-4 bg-[var(--border)]" />
            <span className="text-[10px] text-[#FFBD2E] uppercase tracking-widest">{t("plan.restartRequired")}</span>
          </>
        )}
      </div>

      {/* Scrollable phases list */}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1">
        <div className="space-y-2">
          {effectivePlaybook.phases.map((phase, i) => (
            <PhaseSection key={phase.id} phase={phase} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
