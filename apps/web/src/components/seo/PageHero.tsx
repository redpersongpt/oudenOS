// ─── Types ───────────────────────────────────────────────────────────────────

interface PageHeroProps {
  overline: string;
  title: string;
  description: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PageHero({ overline, title, description }: PageHeroProps) {
  return (
    <header className="px-6 pt-32 pb-16 lg:px-12 lg:pt-40 lg:pb-20">
      <div className="mx-auto max-w-[740px]">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-accent">
          {overline}
        </p>

        <h1 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.035em] text-ink-primary">
          {title}
        </h1>

        <p className="mt-6 text-[1.05rem] leading-[1.75] text-ink-secondary">
          {description}
        </p>
      </div>
    </header>
  );
}
