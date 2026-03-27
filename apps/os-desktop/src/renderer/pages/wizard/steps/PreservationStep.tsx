// ─── Preservation Step ────────────────────────────────────────────────────────
// Work PC ONLY. Shows preserved services and blocked actions.
// Auto-advances immediately for non-work profiles.

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Shield, XCircle, Briefcase } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRESERVED_SERVICES = [
  { id: "spooler",  label: "Print Spooler",     detail: "Required for local and network printing"       },
  { id: "rdp",      label: "Remote Desktop",     detail: "RDP access for IT support and remote work"    },
  { id: "smb",      label: "SMB File Sharing",   detail: "Network file and printer sharing"              },
  { id: "domain",   label: "Domain Services",    detail: "Active Directory domain connectivity"          },
  { id: "gpo",      label: "Group Policy",       detail: "Enterprise policy enforcement"                 },
];

const BLOCKED_ACTIONS = [
  "Disable Remote Registry service",
  "Remove Windows Defender credential guard",
  "Disable SMB1 compatibility layer",
  "Strip domain trust certificates",
];

// ─── Component ───────────────────────────────────────────────────────────────

export function PreservationStep() {
  const { detectedProfile, skipStep } = useWizardStore();
  const isWorkPc = detectedProfile?.isWorkPc ?? false;

  // Non-work machines skip this step automatically
  useEffect(() => {
    if (!isWorkPc) {
      const t = setTimeout(() => skipStep("preservation"), 150);
      return () => clearTimeout(t);
    }
  }, [isWorkPc, skipStep]);

  if (!isWorkPc) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      {/* Header */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
          <Briefcase className="h-5 w-5 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-ink">
          Preserving Business-Critical Services
        </h2>
        <p className="text-xs text-ink-secondary">
          redcore-OS has identified your work environment and locked these services
        </p>
      </div>

      <div className="flex w-full max-w-xl gap-4">
        {/* Preserved */}
        <div className="flex-1 rounded-xl border border-success-500/20 bg-success-500/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-success-400">
            <Shield className="h-3 w-3" />
            Protected
          </div>
          <div className="flex flex-col gap-1.5">
            {PRESERVED_SERVICES.map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: i * 0.05 }}
                className="flex items-start gap-2.5"
              >
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-400" />
                <div>
                  <div className="text-xs font-medium text-ink">{svc.label}</div>
                  <div className="text-[10px] text-ink-tertiary">{svc.detail}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Blocked actions */}
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-ink-tertiary">
            <XCircle className="h-3 w-3" />
            Blocked Actions
          </div>
          <div className="flex flex-col gap-2">
            {BLOCKED_ACTIONS.map((action, i) => (
              <motion.div
                key={action}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: 0.1 + i * 0.05 }}
                className="flex items-start gap-2.5"
              >
                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-ink-muted" />
                <span className="text-[11px] leading-relaxed text-ink-tertiary">{action}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Assurance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="flex items-center gap-2 text-[11px] text-ink-tertiary"
      >
        <Shield className="h-3 w-3 text-success-500/60" />
        Your business workflows are fully protected throughout this transformation
      </motion.div>
    </motion.div>
  );
}
