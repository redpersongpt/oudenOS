// ─── Final Review Step ───────────────────────────────────────────────────────
// Last chance to review before applying. Shows: profile, playbook stats,
// selected apps, personalization choices. Apply button is the primary CTA.

import { useEffect, type ElementType, type ReactNode, type ReactElement } from "react";
import { motion } from "framer-motion";
import { Shield, Package, Palette, Download } from "lucide-react";
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

  useEffect(() => {
    setStepReady("final-review", Boolean(detectedProfile && resolvedPlaybook));
  }, [detectedProfile, resolvedPlaybook, setStepReady]);

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
          Review your transformation plan. A rollback snapshot will be created before any changes.
        </p>
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
        All changes are reversible. A snapshot is created before any modification.
      </motion.p>
    </motion.div>
  );
}
