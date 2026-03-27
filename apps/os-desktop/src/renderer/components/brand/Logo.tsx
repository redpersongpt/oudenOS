import { motion } from "framer-motion";

// Matches the website logo exactly — #E8254B pink-red accent

export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z" fill="#E8254B" opacity="0.12" />
      <path d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z" stroke="#E8254B" strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="17" stroke="#E8254B" strokeWidth="2.5" fill="none" opacity="0.5" />
      <circle cx="32" cy="32" r="10" fill="#E8254B" />
    </svg>
  );
}

export function LogoHero({ size = 64 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
        className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl"
        style={{ width: size, height: size }}
      />
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="relative">
        <path d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z" fill="#E8254B" opacity="0.15" />
        <path d="M32 4L56.5 18v28L32 60 7.5 46V18L32 4z" stroke="#E8254B" strokeWidth="1.5" fill="none" />
        <circle cx="32" cy="32" r="14" stroke="#E8254B" strokeWidth="1.5" fill="none" opacity="0.4" />
        <circle cx="32" cy="32" r="8" fill="#E8254B" />
      </svg>
    </motion.div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={22} />
      <span className="text-[13px] font-bold tracking-[-0.02em] text-ink">
        red<span className="text-brand-500">core</span><span className="text-ink-secondary font-normal"> · OS</span>
      </span>
    </div>
  );
}
