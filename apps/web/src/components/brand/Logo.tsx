"use client";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  className?: string;
  markOnly?: boolean;
}

const SIZES: Record<LogoSize, { mark: number; gap: number; fontSize: number }> = {
  sm: { mark: 20, gap: 8, fontSize: 13 },
  md: { mark: 24, gap: 9, fontSize: 15 },
  lg: { mark: 32, gap: 10, fontSize: 19 },
  xl: { mark: 44, gap: 12, fontSize: 25 },
};

function OudenMark({ size }: { size: number }) {
  const stroke = size >= 32 ? 1.5 : 1;
  const r = Math.round(size * 0.22);
  const dot = Math.max(2, Math.round(size * 0.08));
  const half = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <rect x={stroke / 2} y={stroke / 2} width={size - stroke} height={size - stroke} stroke="#333333" strokeWidth={stroke} fill="none" />
      <circle cx={half} cy={half} r={r} stroke="#D71921" strokeWidth={stroke} fill="none" />
      <circle cx={half} cy={half} r={dot} fill="#D71921" />
    </svg>
  );
}

export function Logo({ size = "md", className = "", markOnly = false }: LogoProps) {
  const s = SIZES[size];

  if (markOnly) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <OudenMark size={s.mark} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`} style={{ gap: s.gap }}>
      <OudenMark size={s.mark} />
      <span
        className="font-bold tracking-[-0.02em] text-[var(--color-ink-primary)]"
        style={{ fontSize: s.fontSize, lineHeight: 1 }}
      >
        ouden<span className="text-[var(--color-accent)]">.cc</span>
      </span>
    </div>
  );
}
