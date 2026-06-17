// Preservation Step

import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import { useT } from "@/i18n";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// Service ids only — user-facing label/detail come from i18n keys
// "preservation.service.<id>.label" / ".detail".
const PRESERVED_SERVICE_IDS = ["spooler", "rdp", "smb", "domain", "gpo"] as const;

// Work-PC blocked actions, by stable index → "preservation.blocked.<i>".
const BLOCKED_ACTION_COUNT = 4;

// Consumer safeguard lines, by stable index → "preservation.safeguard.<i>".
const SAFEGUARD_COUNT = 3;

export function PreservationStep() {
  const { detectedProfile } = useWizardStore();
  const { t } = useT();
  const isWorkPc = detectedProfile?.isWorkPc ?? false;

  const services = isWorkPc ? PRESERVED_SERVICE_IDS : PRESERVED_SERVICE_IDS.slice(0, 3);
  const rightItems = isWorkPc
    ? Array.from({ length: BLOCKED_ACTION_COUNT }, (_, i) => t(`preservation.blocked.${i}`))
    : Array.from({ length: SAFEGUARD_COUNT }, (_, i) => t(`preservation.safeguard.${i}`));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex min-h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">{t("preservation.title")}</h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">
          {isWorkPc ? t("preservation.subtitle.work") : t("preservation.subtitle.home")}
        </p>
      </div>

      <div className="flex w-full max-w-xl gap-4">
        {/* Protected */}
        <div className="flex-1 border border-success-400/20 bg-[var(--success)]/[0.02] p-4 rounded-sm">
          <div className="mb-3 nd-label text-[var(--success)]">{t("preservation.protected")}</div>
          <div className="flex flex-col gap-0">
            {services.map((id, i) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: ND_EASE }}
                className="flex items-center gap-3 border-b border-[var(--border)] py-2"
              >
                <div className="w-3 h-0.5 bg-[var(--success)] shrink-0" />
                <div>
                  <p className="font-mono text-caption tracking-label text-[var(--text-primary)]">{t(`preservation.service.${id}.label`)}</p>
                  <p className="nd-label-sm text-[var(--text-disabled)]">{t(`preservation.service.${id}.detail`)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Blocked */}
        <div className="flex-1 border border-[var(--border)] bg-[var(--surface)] p-4 rounded-sm">
          <div className="mb-3 nd-label text-[var(--text-disabled)]">{isWorkPc ? t("preservation.blocked.heading") : t("preservation.safeguard.heading")}</div>
          <div className="flex flex-col gap-0">
            {rightItems.map((action, i) => (
              <motion.div
                key={action}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.25, ease: ND_EASE }}
                className="flex items-center gap-3 border-b border-[var(--border)] py-2"
              >
                <div className="w-3 h-px bg-nd-text-disabled shrink-0" />
                <span className="font-mono text-caption tracking-label text-[var(--text-disabled)]">{action}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Assurance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3, ease: ND_EASE }}
        className="nd-label-sm text-[var(--text-disabled)]"
      >
        {isWorkPc ? t("preservation.assurance.work") : t("preservation.assurance.home")}
      </motion.div>
    </motion.div>
  );
}
