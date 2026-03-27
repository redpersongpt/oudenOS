"use client";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  className?: string;
  markOnly?: boolean;
}

const SIZES: Record<LogoSize, { mark: number; height: number; gap: number; fontSize: number }> = {
  sm: { mark: 24, height: 24, gap: 8, fontSize: 14 },
  md: { mark: 28, height: 28, gap: 9, fontSize: 16 },
  lg: { mark: 36, height: 36, gap: 10, fontSize: 20 },
  xl: { mark: 48, height: 48, gap: 12, fontSize: 26 },
};

function RedcoreMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Hexagon shell */}
      <path
        d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z"
        fill="#E8254B"
        opacity="0.12"
      />
      <path
        d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z"
        stroke="#E8254B"
        strokeWidth="2"
        fill="none"
      />
      {/* Inner core circle */}
      <circle cx="32" cy="32" r="10" fill="#E8254B" />
      {/* Orbital ring */}
      <circle
        cx="32"
        cy="32"
        r="17"
        stroke="#E8254B"
        strokeWidth="2.5"
        fill="none"
        opacity="0.5"
      />
      {/* Top-right accent notch */}
      <path
        d="M44 20l4-2"
        stroke="#E8254B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function Logo({ size = "md", className = "", markOnly = false }: LogoProps) {
  const s = SIZES[size];

  if (markOnly) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <RedcoreMark size={s.mark} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap: s.gap }}>
      <RedcoreMark size={s.mark} />
      <span
        className="font-bold tracking-[-0.03em] text-ink-primary"
        style={{ fontSize: s.fontSize, lineHeight: 1 }}
      >
        red<span className="text-accent">core</span>
      </span>
    </div>
  );
}
