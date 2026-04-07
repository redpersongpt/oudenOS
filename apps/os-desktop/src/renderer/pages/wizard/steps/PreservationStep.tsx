// Preservation Step

import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

const PRESERVED_SERVICES = [
  { id: "spooler", label: "Print Spooler",   detail: "Local and network printing" },
  { id: "rdp",     label: "Remote Desktop",  detail: "Remote support and remote work" },
  { id: "smb",     label: "SMB file sharing", detail: "Network files and printers" },
  { id: "domain",  label: "Domain services",  detail: "Active Directory connectivity" },
  { id: "gpo",     label: "Group Policy",     detail: "Company policy settings" },
];

const BLOCKED_ACTIONS = [
  "Disable Remote Registry",
  "Remove Defender Credential Guard",
  "Disable SMB1 compatibility",
  "Remove domain trust certificates",
];

export function PreservationStep() {
  const { detectedProfile } = useWizardStore();
  const isWorkPc = detectedProfile?.isWorkPc ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">PRESERVATION</h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">
          {isWorkPc ? "These settings stay in place for work systems." : "These items stay unchanged unless you choose otherwise."}
        </p>
      </div>

      <div className="flex w-full max-w-xl gap-4">
        {/* Protected */}
        <div className="flex-1 border border-success-400/20 bg-[var(--success)]/[0.02] p-4 rounded-sm">
          <div className="mb-3 nd-label text-[var(--success)]">Protected</div>
          <div className="flex flex-col gap-0">
            {(isWorkPc ? PRESERVED_SERVICES : PRESERVED_SERVICES.slice(0, 3)).map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: ND_EASE }}
                className="flex items-center gap-3 border-b border-[var(--border)] py-2"
              >
                <div className="w-3 h-0.5 bg-[var(--success)] shrink-0" />
                <div>
                  <p className="font-mono text-caption tracking-label text-[var(--text-primary)]">{svc.label}</p>
                  <p className="nd-label-sm text-[var(--text-disabled)]">{svc.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Blocked */}
        <div className="flex-1 border border-[var(--border)] bg-[var(--surface)] p-4 rounded-sm">
          <div className="mb-3 nd-label text-[var(--text-disabled)]">{isWorkPc ? "Held back for safety" : "Default safeguards"}</div>
          <div className="flex flex-col gap-0">
            {(isWorkPc ? BLOCKED_ACTIONS : [
              "Remote access stays available when needed",
              "High-risk security changes stay off by default",
              "Optional changes do not apply automatically",
            ]).map((action, i) => (
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
        {isWorkPc ? "Work profile safeguards are on." : "Safety safeguards stay on unless you change them."}
      </motion.div>
    </motion.div>
  );
}
