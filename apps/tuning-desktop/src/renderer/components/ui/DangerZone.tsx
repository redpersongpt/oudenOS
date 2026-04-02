import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

// DangerZone
// Visual container for destructive or high-risk operations.
// Amber border + subtle amber fill signals "proceed with caution".
//
// Usage:
//   <DangerZone title="Reset All Tweaks">
//     <p>This will undo all applied optimizations and restore defaults.</p>
//     <Button variant="danger">Reset Everything</Button>
//   </DangerZone>

interface DangerZoneProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** "warning" = amber (default), "danger" = red (irreversible actions) */
  severity?: "warning" | "danger";
}

export function DangerZone({
  title,
  description,
  children,
  className = "",
  severity = "warning",
}: DangerZoneProps) {
  const isDanger = severity === "danger";

  return (
    <div
      className={`
        relative rounded-lg border p-5
        ${isDanger
          ? "border-brand-800 bg-brand-950/30 shadow-[inset_0_1px_0_rgba(232,69,60,0.08)]"
          : "border-amber-800/70 bg-amber-950/20 shadow-[inset_0_1px_0_rgba(245,158,11,0.08)]"
        }
        ${className}
      `}
      role="region"
      aria-label={title ? `Danger zone: ${title}` : "Danger zone"}
    >
      {/* Subtle top accent line */}
      <div
        className={`
          absolute inset-x-0 top-0 h-px rounded-t-xl
          ${isDanger ? "bg-brand-700/40" : "bg-amber-700/40"}
        `}
        aria-hidden="true"
      />

      {/* Header */}
      {(title || description) && (
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`
              mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
              ${isDanger
                ? "bg-brand-900/60 border border-brand-800"
                : "bg-amber-900/40 border border-amber-800/70"
              }
            `}
            aria-hidden="true"
          >
            <TriangleAlert
              className={`h-3.5 w-3.5 ${isDanger ? "text-brand-400" : "text-amber-400"}`}
              strokeWidth={2}
            />
          </div>

          <div className="space-y-0.5 min-w-0">
            {title && (
              <p
                className={`text-sm font-semibold ${
                  isDanger ? "text-brand-300" : "text-amber-300"
                }`}
              >
                {title}
              </p>
            )}
            {description && (
              <p className="text-xs text-ink-secondary leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Slot for action content */}
      {children && <div className="space-y-3">{children}</div>}
    </div>
  );
}

// DangerZoneDivider
// Horizontal separator inside a DangerZone with optional label.

export function DangerZoneDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-amber-800/40" />
      {label && (
        <span className="text-xs font-medium text-amber-600/80 uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="h-px flex-1 bg-amber-800/40" />
    </div>
  );
}
