// Preservation Step — Work PC only. Auto-skips for non-work profiles.

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

const PRESERVED_SERVICES = [
  { id: "spooler", label: "PRINT SPOOLER",   detail: "LOCAL AND NETWORK PRINTING" },
  { id: "rdp",     label: "REMOTE DESKTOP",  detail: "IT SUPPORT AND REMOTE WORK" },
  { id: "smb",     label: "SMB FILE SHARING", detail: "NETWORK FILES AND PRINTERS" },
  { id: "domain",  label: "DOMAIN SERVICES",  detail: "ACTIVE DIRECTORY CONNECTIVITY" },
  { id: "gpo",     label: "GROUP POLICY",     detail: "ENTERPRISE POLICY ENFORCEMENT" },
];

const BLOCKED_ACTIONS = [
  "DISABLE REMOTE REGISTRY SERVICE",
  "REMOVE DEFENDER CREDENTIAL GUARD",
  "DISABLE SMB1 COMPATIBILITY LAYER",
  "STRIP DOMAIN TRUST CERTIFICATES",
];

export function PreservationStep() {
  const { detectedProfile, skipStep } = useWizardStore();
  const isWorkPc = detectedProfile?.isWorkPc ?? false;

  useEffect(() => {
    if (!isWorkPc) {
      const t = setTimeout(() => skipStep("preservation"), 150);
      return () => clearTimeout(t);
    }
  }, [isWorkPc, skipStep]);

  if (!isWorkPc) {
    return (
      <div className="flex h-full items-center justify-center bg-nd-bg">
        <div className="w-2 h-2 bg-brand-500 nd-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-nd-bg"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-title text-nd-text-display">PRESERVATION</h2>
        <p className="mt-2 nd-label text-nd-text-secondary">
          BUSINESS-CRITICAL SERVICES LOCKED FOR WORK PC
        </p>
      </div>

      <div className="flex w-full max-w-xl gap-4">
        {/* Protected */}
        <div className="flex-1 border border-success-400/20 bg-success-400/[0.02] p-4 rounded-sm">
          <div className="mb-3 nd-label text-success-400">PROTECTED</div>
          <div className="flex flex-col gap-0">
            {PRESERVED_SERVICES.map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05, duration: 0.2, ease: ND_EASE }}
                className="flex items-center gap-3 border-b border-nd-border-subtle py-2"
              >
                <div className="w-3 h-0.5 bg-success-400 shrink-0" />
                <div>
                  <p className="font-mono text-caption tracking-label text-nd-text-primary">{svc.label}</p>
                  <p className="nd-label-sm text-nd-text-disabled">{svc.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Blocked */}
        <div className="flex-1 border border-nd-border bg-nd-surface p-4 rounded-sm">
          <div className="mb-3 nd-label text-nd-text-disabled">BLOCKED ACTIONS</div>
          <div className="flex flex-col gap-0">
            {BLOCKED_ACTIONS.map((action, i) => (
              <motion.div
                key={action}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.2, ease: ND_EASE }}
                className="flex items-center gap-3 border-b border-nd-border-subtle py-2"
              >
                <div className="w-3 h-px bg-nd-text-disabled shrink-0" />
                <span className="font-mono text-caption tracking-label text-nd-text-disabled">{action}</span>
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
        className="nd-label-sm text-nd-text-disabled"
      >
        [ENTERPRISE WORKFLOWS FULLY PROTECTED]
      </motion.div>
    </motion.div>
  );
}
