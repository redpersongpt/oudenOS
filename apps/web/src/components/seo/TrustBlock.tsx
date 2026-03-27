import type { ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrustBlockProps {
  icon?: ReactNode;
  title: string;
  description: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TrustBlock({ icon, title, description }: TrustBlockProps) {
  return (
    <aside className="px-6 py-6 lg:px-12">
      <div className="mx-auto max-w-[740px]">
        <div className="flex gap-4 rounded-lg border border-border bg-surface px-5 py-4">
          {icon && (
            <span className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true">
              {icon}
            </span>
          )}

          <div>
            <p className="text-[0.875rem] font-semibold text-ink-primary">
              {title}
            </p>

            <p className="mt-1 text-[0.825rem] leading-[1.65] text-ink-tertiary">
              {description}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
