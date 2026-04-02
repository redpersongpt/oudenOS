// Geometric mark: outer square (--border-visible) → inner square (--accent) → circle (--accent)

export function LogoMark({ size = 20 }: { size?: number }) {
  const outer = size;
  const inner = Math.round(size * 0.5);
  const dot = Math.round(size * 0.2);
  return (
    <div
      style={{ width: outer, height: outer, border: "1px solid var(--border-visible)" }}
      className="flex items-center justify-center"
    >
      <div
        style={{ width: inner, height: inner, border: "1px solid var(--accent)" }}
        className="flex items-center justify-center"
      >
        <div style={{ width: dot, height: dot, background: "var(--accent)", borderRadius: "50%" }} />
      </div>
    </div>
  );
}

export function LogoHero({ size = 64 }: { size?: number }) {
  return <LogoMark size={size} />;
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={18} />
      <span className="font-mono text-label tracking-[0.08em]" style={{ color: "var(--text-primary)" }}>
        REDCORE <span style={{ color: "var(--text-disabled)" }}>OS</span>
      </span>
    </div>
  );
}
