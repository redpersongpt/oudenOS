// ─── Final Review Step ───────────────────────────────────────────────────────
// Last chance to review before applying. Shows: profile, playbook stats,
// selected apps, personalization choices. Apply button is the primary CTA.

import { motion } from "framer-motion";
import { Shield, Package, Palette, Download } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

function ReviewSection({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
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
  const { detectedProfile, resolvedPlaybook, selectedAppIds, personalization } = useWizardStore();

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
        {/* Profile */}
        <ReviewSection icon={Shield} title="Machine Profile">
          <p className="text-[13px] font-semibold text-ink">{detectedProfile?.label ?? "Unknown"}</p>
          <p className="text-[11px] text-ink-tertiary">{detectedProfile?.machineName ?? "—"}</p>
        </ReviewSection>

        {/* Playbook */}
        {resolvedPlaybook && (
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
        )}

        {/* Apps */}
        <ReviewSection icon={Download} title="App Install">
          <p className="text-[13px] text-ink">
            {selectedAppIds.length > 0
              ? `${selectedAppIds.length} app${selectedAppIds.length !== 1 ? "s" : ""} will be installed after transformation`
              : "No apps selected"}
          </p>
        </ReviewSection>

        {/* Personalization */}
        <ReviewSection icon={Palette} title="Personalization">
          <div className="flex flex-wrap gap-2">
            {personalization.darkMode && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Dark Mode</span>}
            {personalization.brandAccent && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Brand Accent</span>}
            {personalization.taskbarCleanup && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Taskbar Cleanup</span>}
            {personalization.explorerCleanup && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Explorer Cleanup</span>}
            {personalization.transparency && <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11px] text-ink-secondary">Transparency</span>}
          </div>
        </ReviewSection>
      </div>

      {/* Trust note */}
      <p className="mt-4 text-center text-[11px] text-ink-tertiary">
        All changes are reversible. A snapshot is created before any modification.
      </p>
    </motion.div>
  );
}
