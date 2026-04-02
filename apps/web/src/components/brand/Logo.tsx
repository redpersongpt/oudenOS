"use client";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  className?: string;
  markOnly?: boolean;
}

const SIZES: Record<LogoSize, { mark: number; gap: number; fontSize: number }> = {
  sm: { mark: 20, gap: 7, fontSize: 13 },
  md: { mark: 24, gap: 8, fontSize: 15 },
  lg: { mark: 32, gap: 10, fontSize: 19 },
  xl: { mark: 44, gap: 12, fontSize: 25 },
};

/**
 * Ouden Mark — open ring with accent dot
 *
 * A thick circular arc with a gap at ~5 o'clock, terminated by a small
 * red dot. Represents precision, optimization, and intentional removal.
 * Scales cleanly from 16px favicon to 512px splash.
 */
function OudenMark({ size }: { size: number }) {
  // All geometry relative to a 100×100 viewBox for consistency
  const cx = 50;
  const cy = 50;
  const r = 32;
  const sw = size >= 32 ? 8 : size >= 20 ? 6 : 5; // stroke width
  const dotR = size >= 32 ? 4.5 : 3.5;

  // Arc: starts at ~315° (top-right-ish), sweeps clockwise ~290°,
  // leaving a gap at bottom-right (~305°-355°)
  // Gap from 310° to 350° (40° gap)
  const gapStart = 310;
  const gapEnd = 350;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Arc goes from gapEnd to gapStart (the long way, clockwise)
  const startAngle = gapEnd;
  const endAngle = gapStart;

  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));

  // large-arc-flag = 1 (we want the major arc, >180°)
  const arcPath = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;

  // Dot position: at the gap start terminus (310°)
  const dotX = cx + r * Math.cos(toRad(gapStart));
  const dotY = cy + r * Math.sin(toRad(gapStart));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Main arc — off-white */}
      <path
        d={arcPath}
        stroke="#E8E8E8"
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
      {/* Accent dot at gap terminus */}
      <circle cx={dotX} cy={dotY} r={dotR} fill="#E8E8E8" />
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
        ouden<span className="text-[var(--color-ink-secondary)]">.cc</span>
      </span>
    </div>
  );
}
