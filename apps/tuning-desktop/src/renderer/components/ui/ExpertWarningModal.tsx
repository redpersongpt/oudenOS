import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert, X } from "lucide-react";
import { useEffect, useCallback } from "react";
import { backdropFade, modalSpring } from "@redcore/design-system";
import { Button } from "./Button";

// ExpertWarningModal
// Confirmation modal for high-risk operations (registry edits, driver tweaks,
// system-level changes). Forces the user to read the consequences before acting.
//
// Usage:
//   <ExpertWarningModal
//     open={showWarning}
//     onConfirm={() => applyTweak()}
//     onCancel={() => setShowWarning(false)}
//     title="Apply Timer Resolution Tweak"
//     description="This modifies the Windows multimedia timer resolution..."
//     consequences={["Increases timer interrupt frequency", "Raises idle CPU by ~0.3%"]}
//   />

interface ExpertWarningModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Short action title, e.g. "Apply MMCSS Tweak" */
  title: string;
  /** One or two sentences explaining what will happen */
  description: string;
  /** Bullet list of side-effects / consequences. Keep to 3–5 items. */
  consequences?: string[];
  /** Override the confirm button label (default: "Apply Anyway") */
  confirmLabel?: string;
  /** If true, the confirm button is styled as an outright danger action */
  destructive?: boolean;
  /** Shows a loading spinner on the confirm button */
  confirming?: boolean;
}

export function ExpertWarningModal({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  consequences,
  confirmLabel = "Apply Anyway",
  destructive = false,
  confirming = false,
}: ExpertWarningModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onCancel();
    },
    [open, onCancel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="expert-modal-backdrop"
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            className="fixed inset-0 z-[401] flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expert-modal-title"
            aria-describedby="expert-modal-desc"
          >
            <motion.div
              key="expert-modal-panel"
              variants={modalSpring}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="
                relative w-full max-w-md overflow-hidden
                rounded-lg border border-amber-800/60
                bg-surface-raised shadow-modal
                ring-1 ring-amber-900/30
              "
            >
              {/* Amber top accent stripe */}
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
                aria-hidden="true"
              />

              {/* Close button */}
              <button
                onClick={onCancel}
                className="
                  absolute right-4 top-4 flex h-7 w-7 items-center justify-center
                  rounded-lg text-ink-tertiary transition-colors
                  hover:bg-surface-overlay hover:text-ink
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-strong
                "
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Icon + title */}
                <div className="flex items-start gap-4 pr-8">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                                bg-amber-900/40 border border-amber-800/70"
                    aria-hidden="true"
                  >
                    <TriangleAlert
                      className="h-5 w-5 text-amber-400"
                      strokeWidth={2}
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h2
                      id="expert-modal-title"
                      className="text-sm font-semibold text-ink leading-snug"
                    >
                      {title}
                    </h2>
                    <p
                      id="expert-modal-desc"
                      className="text-xs text-ink-secondary leading-relaxed"
                    >
                      {description}
                    </p>
                  </div>
                </div>

                {/* Consequences list */}
                {consequences && consequences.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-500/80">
                      Side effects
                    </p>
                    <ul className="space-y-1.5" role="list">
                      {consequences.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-ink-secondary leading-snug"
                        >
                          <span
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500/60"
                            aria-hidden="true"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Rollback note */}
                <p className="mt-4 text-[10px] text-ink-tertiary leading-relaxed">
                  A rollback snapshot will be created before applying. You can
                  restore from{" "}
                  <span className="text-ink-secondary font-medium">Rollback Center</span>{" "}
                  at any time.
                </p>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  variant={destructive ? "danger" : "warning"}
                  size="sm"
                  onClick={onConfirm}
                  loading={confirming}
                >
                  {confirmLabel}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
