import type { ReactNode } from "react";

// Types

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  id?: string;
  divider?: boolean;
  narrow?: boolean;
}

// Component

export function SectionWrapper({
  children,
  className = "",
  id,
  divider = true,
  narrow = false,
}: SectionWrapperProps) {
  const maxWidth = narrow ? "max-w-5xl" : "max-w-7xl";

  return (
    <section
      id={id}
      className={[
        "relative w-full",
        "py-16 md:py-20 lg:py-24",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {divider && (
        <div className="section-divide absolute top-0 left-0 right-0" aria-hidden="true" />
      )}

      <div className={`${maxWidth} mx-auto px-6 lg:px-8`}>
        {children}
      </div>
    </section>
  );
}
