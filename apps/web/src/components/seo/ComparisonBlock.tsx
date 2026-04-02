// Types

interface ComparisonColumn {
  heading: string;
  items: string[];
}

interface ComparisonBlockProps {
  title: string;
  left: ComparisonColumn;
  right: ComparisonColumn;
}

// Component

export function ComparisonBlock({ title, left, right }: ComparisonBlockProps) {
  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-[740px]">
        <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {title}
        </h2>

        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-border sm:grid-cols-2">
          {/* Left column -- accent/red tone */}
          <div className="bg-[var(--surface)] p-6">
            <h3 className="flex items-center gap-2 text-[0.85rem] font-semibold text-[var(--accent)]">
              <span
                className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
                aria-hidden="true"
              />
              {left.heading}
            </h3>

            <ul className="mt-4 space-y-2.5" role="list">
              {left.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[0.875rem] leading-[1.6] text-[var(--text-secondary)]"
                >
                  <span
                    className="mt-[0.55rem] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]/50"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right column -- success/green tone */}
          <div className="bg-[var(--surface)] p-6">
            <h3 className="flex items-center gap-2 text-[0.85rem] font-semibold text-[var(--accent)]">
              <span
                className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
                aria-hidden="true"
              />
              {right.heading}
            </h3>

            <ul className="mt-4 space-y-2.5" role="list">
              {right.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[0.875rem] leading-[1.6] text-[var(--text-secondary)]"
                >
                  <span
                    className="mt-[0.55rem] inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]/50"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
