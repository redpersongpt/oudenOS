import Link from "next/link";
import { ArrowRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RelatedPage {
  title: string;
  description: string;
  href: string;
}

interface RelatedPagesProps {
  pages: RelatedPage[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RelatedPages({ pages }: RelatedPagesProps) {
  return (
    <nav aria-label="Related pages" className="px-6 py-16 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-[740px]">
        <h2 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-muted">
          Continue reading
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group rounded-lg border border-border bg-surface p-5 transition-colors duration-200 hover:border-border-strong"
            >
              <h3 className="text-[0.95rem] font-semibold text-ink-primary">
                {page.title}
              </h3>

              <p className="mt-2 text-[0.825rem] leading-[1.6] text-ink-tertiary">
                {page.description}
              </p>

              <span
                className="mt-4 inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-ink-muted transition-colors duration-200 group-hover:text-accent"
                aria-hidden="true"
              >
                Read more
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
