import Link from "next/link";

// Types

interface CTAAction {
  label: string;
  href: string;
}

interface CTAStripProps {
  title: string;
  description: string;
  primaryAction: CTAAction;
  secondaryAction?: CTAAction;
}

// Component

export function CTAStrip({
  title,
  description,
  primaryAction,
  secondaryAction,
}: CTAStripProps) {
  return (
    <section className="px-6 py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-[740px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-8 sm:px-8 sm:py-10">
        <h2 className="text-[1.15rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          {title}
        </h2>

        <p className="mt-2 text-[0.875rem] leading-[1.65] text-[var(--text-secondary)]">
          {description}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={primaryAction.href}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-[0.875rem] font-semibold text-black transition-colors duration-200 hover:bg-[#E8E8E8]"
          >
            {primaryAction.label}
          </Link>

          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] px-6 text-[0.875rem] font-medium text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--border-visible)] hover:text-[var(--text-primary)]"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
