// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  title: string;
  description: string;
}

interface ProcessStepsProps {
  steps: Step[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessSteps({ steps }: ProcessStepsProps) {
  return (
    <section className="px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-[740px]">
        <ol className="relative space-y-10 pl-10" role="list">
          {/* Connecting line */}
          <span
            className="absolute left-[0.875rem] top-1 bottom-1 w-px bg-border"
            aria-hidden="true"
          />

          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              {/* Step number */}
              <span
                className="absolute -left-10 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-raised font-mono text-[0.7rem] font-medium text-ink-muted"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="text-[0.95rem] font-semibold text-ink-primary">
                {step.title}
              </h3>

              <p className="mt-1.5 text-[0.85rem] leading-[1.65] text-ink-secondary">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
