// ─── Types ───────────────────────────────────────────────────────────────────

interface QuickSummaryProps {
  items: string[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickSummary({ items }: QuickSummaryProps) {
  return (
    <aside className="px-6 py-6 lg:px-12">
      <div className="mx-auto max-w-[740px]">
        <div className="rounded-lg border border-border bg-surface px-5 py-5 sm:px-6">
          <h2 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-muted">
            What this covers
          </h2>

          <ul className="mt-3.5 space-y-2" role="list">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[0.85rem] leading-[1.6] text-ink-secondary"
              >
                <span
                  className="mt-[0.5rem] inline-block h-1 w-1 shrink-0 rounded-full bg-ink-muted"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
