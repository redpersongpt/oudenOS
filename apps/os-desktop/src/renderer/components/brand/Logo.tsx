
export function LogoMark({ size = 20 }: { size?: number }) {
  const s = size;
  const inner = Math.round(s * 0.5);
  const dot = Math.round(s * 0.2);
  return (
    <div style={{ width: s, height: s }} className="relative border border-brand-500 rounded-sm flex items-center justify-center">
      <div style={{ width: inner, height: inner }} className="border border-brand-500/50 rounded-sm flex items-center justify-center">
        <div style={{ width: dot, height: dot }} className="bg-brand-500 rounded-full" />
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
      <span className="font-mono text-label tracking-label text-nd-text-primary">
        REDCORE <span className="text-nd-text-disabled">OS</span>
      </span>
    </div>
  );
}
