// Ouden mark: precision square → inner circle → center point
// Industrial alignment symbol — scales from 14px to 64px

export function LogoMark({ size = 20 }: { size?: number }) {
  const stroke = size >= 32 ? 1.5 : 1;
  const r = Math.round(size * 0.22);
  const dot = Math.max(2, Math.round(size * 0.08));
  const half = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Outer frame */}
      <rect
        x={stroke / 2}
        y={stroke / 2}
        width={size - stroke}
        height={size - stroke}
        stroke="var(--border-visible)"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Inner circle */}
      <circle
        cx={half}
        cy={half}
        r={r}
        stroke="var(--accent)"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Center point */}
      <circle cx={half} cy={half} r={dot} fill="var(--accent)" />
    </svg>
  );
}

export function LogoHero({ size = 64 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={18} />
      <span
        className="font-mono text-label tracking-[0.08em]"
        style={{ color: "var(--text-primary)" }}
      >
        OUDEN<span style={{ color: "var(--text-disabled)" }}>OS</span>
      </span>
    </div>
  );
}
