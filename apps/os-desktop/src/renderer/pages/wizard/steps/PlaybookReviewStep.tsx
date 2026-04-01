
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertTriangle, Lock, ChevronDown, Shield, Cpu, Eye, Info } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { ResolvedPlaybook, PlaybookPhase } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { applyDecisionOverrides } from "@/lib/playbook-decision-overrides";
import { getActionRationale, PHASE_RATIONALE, getBlockedExplanation } from "@/lib/expert-rationale";
import { buildMockResolvedPlaybook } from "@/lib/mock-playbook";
import technicalDetails from "@/lib/generated-technical-details.json";

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

function TechnicalDetails({ actionId }: { actionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const details = techLookup[actionId];

  if (!details) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-1 inline-flex items-center gap-1 text-[9px] text-ink-muted/60 hover:text-ink-muted transition-colors"
      >
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        Technical Details
        {expanded && (
          <span className="ml-1 text-ink-muted/40">-- not available for this action</span>
        )}
      </button>
    );
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-[9px] text-ink-muted/60 hover:text-ink-muted transition-colors"
      >
        <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
        Technical Details
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
            <div className="mt-1 rounded border border-white/[0.04] bg-white/[0.02] px-3 py-2 font-mono text-[9px] leading-relaxed text-ink-muted/80 space-y-2">
              {/* Registry Changes */}
              {details.registryChanges && details.registryChanges.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold text-ink-tertiary mb-0.5">Registry</p>
                  {details.registryChanges.map((rc, i) => {
                    const fullPath = `${rc.hive}\\${rc.path}`;
                    const hasTemplate = TEMPLATE_RE.test(fullPath) || TEMPLATE_RE.test(String(rc.value));
                    return (
                      <div key={i} className="ml-2">
                        <p className="text-ink-muted/60 truncate" title={fullPath}>{fullPath}</p>
                        <p className="ml-2">
                          {rc.valueName} = {String(rc.value)}
                          {rc.valueType ? ` (${rc.valueType})` : ""}
                        </p>
                        {hasTemplate && (
                          <p className="ml-2 text-[8px] text-amber-400/50 italic">Resolved at runtime</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Service Changes */}
              {details.serviceChanges && details.serviceChanges.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold text-ink-tertiary mb-0.5">Services</p>
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
                  <p className="text-[9px] font-semibold text-ink-tertiary mb-0.5">Packages</p>
                  {details.packages.map((pkg, i) => (
                    <p key={i} className="ml-2">{pkg}</p>
                  ))}
                </div>
              )}

              {/* BCD Changes */}
              {details.bcdChanges && details.bcdChanges.length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold text-ink-tertiary mb-0.5">Boot Configuration</p>
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
                  <p className="text-[9px] font-semibold text-ink-tertiary mb-0.5">Power Settings</p>
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
                  <p className="text-[9px] font-semibold text-ink-tertiary mb-0.5">File Renames</p>
                  {details.fileRenames.map((fr, i) => (
                    <div key={i} className="ml-2">
                      <p className="truncate" title={fr.source}>{fr.source}</p>
                      <p className="ml-2 truncate" title={fr.target}>→ {fr.target}</p>
                      {fr.cpuVendor && (
                        <p className="ml-2 text-[8px] text-amber-400/50 italic">{fr.cpuVendor} only</p>
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

const riskDot: Record<string, string> = {
  safe:   "bg-green-400",
  low:    "bg-yellow-400",
  medium: "bg-amber-400",
  high:   "bg-red-400",
};

function RiskDot({ risk }: { risk?: string }) {
  if (!risk) return null;
  const color = riskDot[risk.toLowerCase()] ?? "bg-neutral-400";
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
      title={`Risk: ${risk}`}
      aria-label={`Risk level: ${risk}`}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Included:   "bg-green-500/15 text-green-400 border-green-500/20",
    Blocked:    "bg-red-500/15 text-red-400 border-red-500/20",
    Optional:   "bg-amber-500/15 text-amber-400 border-amber-500/20",
    ExpertOnly: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    BuildGated: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20",
  };
  const icons: Record<string, ReactNode> = {
    Included:   <Check className="mr-0.5 h-2.5 w-2.5" />,
    Blocked:    <X className="mr-0.5 h-2.5 w-2.5" />,
    ExpertOnly: <Lock className="mr-0.5 h-2.5 w-2.5" />,
    Optional:   <Eye className="mr-0.5 h-2.5 w-2.5" />,
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? styles.Blocked}`}>
      {icons[status]}
      {status}
    </span>
  );
}

function PhaseSection({ phase, defaultOpen, profile }: { phase: PlaybookPhase; defaultOpen: boolean; profile: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const included = phase.actions.filter(a => a.status === "Included").length;
  const blocked  = phase.actions.filter(a => a.status === "Blocked").length;
  const total    = phase.actions.length;
  const phaseNote = PHASE_RATIONALE[phase.id];

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-semibold text-ink truncate">{phase.name}</span>
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
              {included}
            </span>
            {blocked > 0 && (
              <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                {blocked} blocked
              </span>
            )}
            <span className="text-[10px] text-ink-muted">of {total}</span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              {/* Phase rationale */}
              {phaseNote && (
                <div className="px-4 py-2 bg-white/[0.01] border-b border-white/[0.03]">
                  <p className="text-[10px] leading-relaxed text-ink-tertiary">{phaseNote}</p>
                </div>
              )}
              {/* Actions */}
              <div className="divide-y divide-white/[0.03]">
                {phase.actions.map((action) => {
                  const rationale = getActionRationale(action.id, profile);
                  const blockedNote = action.status === "Blocked"
                    ? getBlockedExplanation(action.id, action.blockedReason, profile)
                    : null;

                  return (
                    <div key={action.id} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <RiskDot risk={action.risk} />
                            <p className="text-[11px] font-semibold text-ink truncate">{action.name}</p>
                            {action.requiresReboot && (
                              <span className="shrink-0 rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-400">
                                reboot
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-3 shrink-0">
                          <StatusBadge status={action.status} />
                        </div>
                      </div>
                      {rationale.why ? (
                        <p className="mt-0.5 text-[10px] leading-relaxed text-ink-tertiary">{rationale.why}</p>
                      ) : (
                        <p className="mt-0.5 text-[10px] text-ink-muted">{action.description}</p>
                      )}
                      {rationale.profileWarning && (
                        <p className="mt-0.5 text-[10px] text-amber-400/80 flex items-center gap-1">
                          <Info className="h-2.5 w-2.5 shrink-0" />
                          {rationale.profileWarning}
                        </p>
                      )}
                      {rationale.antiCheatNote && (
                        <p className="mt-0.5 text-[10px] text-amber-400/80 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                          {rationale.antiCheatNote}
                        </p>
                      )}
                      {blockedNote && (
                        <p className="mt-0.5 text-[10px] text-red-400/80 flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5 shrink-0" />
                          {blockedNote}
                        </p>
                      )}
                      <TechnicalDetails actionId={action.id} />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaybookSkeleton() {
  return (
    <div className="flex h-full flex-col px-6 py-5">
      <div className="mb-4 space-y-2">
        <div className="h-6 w-52 rounded-md bg-white/[0.04] animate-pulse" />
        <div className="h-3.5 w-80 rounded bg-white/[0.03] animate-pulse" />
      </div>
      <div className="mb-4 h-14 w-full rounded-lg bg-white/[0.03] animate-pulse" />
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="mb-1.5 h-11 rounded-lg bg-white/[0.02] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

export function PlaybookReviewStep() {
  const { detectedProfile, playbookPreset, demoMode, setResolvedPlaybook, setStepReady } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const [loading, setLoading] = useState(true);
  const [basePlaybook, setBasePlaybook] = useState<ResolvedPlaybook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const effectivePlaybook = useMemo(() => {
    if (!basePlaybook) return null;
    return applyDecisionOverrides(basePlaybook, answers, {
      isLaptop: detectedProfile?.id === "gaming_laptop" || detectedProfile?.id === "office_laptop",
      isWorkPc: detectedProfile?.isWorkPc ?? false,
      windowsBuild: detectedProfile?.windowsBuild ?? 22631,
    });
  }, [answers, basePlaybook, detectedProfile]);

  useEffect(() => {
    setStepReady("playbook-review", false);

    const load = async () => {
      const profile = detectedProfile?.id ?? "gaming_desktop";
      const windowsBuild = detectedProfile?.windowsBuild ?? 22631;
      setLoading(true);
      setLoadError(null);
      try {
        const { serviceCall } = await import("@/lib/service");
        const result = await serviceCall<ResolvedPlaybook>("playbook.resolve", {
          profile,
          preset: playbookPreset,
          windowsBuild,
        });
        if (result.ok) {
          setBasePlaybook(result.data);
        } else if (demoMode) {
          setBasePlaybook(buildMockResolvedPlaybook(profile, playbookPreset, windowsBuild));
        } else {
          setBasePlaybook(null);
          setLoadError(result.error || "Unable to resolve the real playbook.");
        }
      } catch {
        if (demoMode) {
          setBasePlaybook(buildMockResolvedPlaybook(profile, playbookPreset, windowsBuild));
        } else {
          setBasePlaybook(null);
          setLoadError("Unable to resolve the real playbook.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [demoMode, detectedProfile, playbookPreset, setStepReady]);

  useEffect(() => {
    if (effectivePlaybook) {
      setResolvedPlaybook(effectivePlaybook);
    }
    setStepReady("playbook-review", !loading && Boolean(effectivePlaybook));
  }, [effectivePlaybook, loading, setResolvedPlaybook, setStepReady]);

  if (loading) return <PlaybookSkeleton />;

  if (!effectivePlaybook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-ink-secondary">{loadError ?? "Playbook not available"}</p>
      </div>
    );
  }

  const rebootCount = effectivePlaybook.phases.reduce(
    (n, p) => n + p.actions.filter(a => a.status === "Included" && a.requiresReboot).length, 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full flex-col px-6 py-5 overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[20px] font-bold tracking-tight text-ink">
          What We'll Change
        </h1>
        <p className="mt-1 text-[12px] text-ink-secondary">
          Everything listed below will run on your{" "}
          <span className="font-medium text-ink">{detectedProfile?.label ?? "PC"}</span>
          {" "}({playbookPreset} mode). Nothing hidden.
        </p>
      </div>

      {/* Stats row — total big + breakdown inline */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mb-4 flex items-baseline gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
      >
        <span className="font-mono text-[28px] font-bold leading-none text-ink">
          {effectivePlaybook.totalIncluded + effectivePlaybook.totalBlocked + effectivePlaybook.totalOptional + effectivePlaybook.totalExpertOnly}
        </span>
        <span className="text-[13px] font-semibold text-ink">changes</span>
        <span className="ml-1 text-[11px] text-ink-tertiary">
          {effectivePlaybook.totalBlocked > 0 && `${effectivePlaybook.totalBlocked} skipped · `}
          {effectivePlaybook.totalOptional > 0 && `${effectivePlaybook.totalOptional} optional · `}
          {effectivePlaybook.totalExpertOnly > 0 && `${effectivePlaybook.totalExpertOnly} expert-only`}
        </span>
      </motion.div>

      {/* Reboot notice */}
      {rebootCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2"
        >
          <Cpu className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="text-[11px] text-amber-400">
            {rebootCount} action{rebootCount !== 1 ? "s" : ""} require a restart to take effect
          </span>
        </motion.div>
      )}

      {effectivePlaybook.decisionSummary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-ink-secondary">
              {effectivePlaybook.decisionSummary.riskLevel} mode
            </span>
            {effectivePlaybook.decisionSummary.estimatedPreserved > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
                {effectivePlaybook.decisionSummary.estimatedPreserved} kept from your answers
              </span>
            )}
            {effectivePlaybook.decisionSummary.warnings.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                {effectivePlaybook.decisionSummary.warnings.length} heads up
              </span>
            )}
          </div>

          {effectivePlaybook.decisionSummary.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {effectivePlaybook.decisionSummary.warnings.map((warning) => (
                <p key={warning} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-400/90">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{warning}</span>
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Blocked reasons (Work PC) */}
      {effectivePlaybook.blockedReasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
        >
          <p className="text-[10px] font-medium text-ink-tertiary mb-1.5">
            Skipped — not safe for your PC type
          </p>
          {effectivePlaybook.blockedReasons.slice(0, 3).map((br) => (
            <p key={br.actionId} className="text-[11px] text-ink-muted truncate">
              {br.reason}
            </p>
          ))}
          {effectivePlaybook.blockedReasons.length > 3 && (
            <p className="text-[10px] text-ink-muted mt-0.5">
              +{effectivePlaybook.blockedReasons.length - 3} more
            </p>
          )}
        </motion.div>
      )}

      {/* Phase list — staggered entrance */}
      <div className="space-y-1.5">
        {effectivePlaybook.phases.map((phase, i) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07, duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
          >
            <PhaseSection phase={phase} defaultOpen={i === 0} profile={effectivePlaybook.profile} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
