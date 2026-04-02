// Ouden mark — open ring with accent dot
// Scales from 14px to 64px

export function LogoMark({ size = 20 }: { size?: number }) {
  const sw = size >= 32 ? 8 : size >= 20 ? 6 : 5;
  const dotR = size >= 32 ? 4.5 : 3.5;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <path
        d="M 82.14 66.08 A 32 32 0 1 1 77.1 39.9"
        stroke="var(--text-primary, #E8E8E8)"
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="77.1" cy="39.9" r={dotR} fill="var(--accent, #D42A45)" />
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
