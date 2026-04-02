import type { Variants, Transition } from "framer-motion";

// Easing Curves
export const easing = {
  default: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  enter: [0.0, 0.0, 0.2, 1.0] as [number, number, number, number],
  exit: [0.4, 0.0, 1.0, 1.0] as [number, number, number, number],
  emphasized: [0.2, 0.0, 0.0, 1.0] as [number, number, number, number],
};

// Duration Tokens
export const duration = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
  dramatic: 0.8,
  hero: 1.0,
};

// Spring Presets (kept for compatibility but no bounce/snappy springs)
export const spring = {
  snappy: { type: "tween" as const, duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number] },
  smooth: { type: "tween" as const, duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number] },
  gentle: { type: "tween" as const, duration: 0.4, ease: [0.0, 0.0, 0.2, 1.0] as [number, number, number, number] },
  bounce: { type: "tween" as const, duration: 0.25, ease: [0.0, 0.0, 0.2, 1.0] as [number, number, number, number] },
};

// Transition Presets
export const transition = {
  default: { duration: duration.normal, ease: easing.default } satisfies Transition,
  fast: { duration: duration.fast, ease: easing.default } satisfies Transition,
  slow: { duration: duration.slow, ease: easing.emphasized } satisfies Transition,
  enter: { duration: duration.normal, ease: easing.enter } satisfies Transition,
  exit: { duration: duration.fast, ease: easing.exit } satisfies Transition,
};

// Fade In
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.default },
};

// Slide Up
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: easing.enter } },
};

// Slide Up Subtle
export const slideUpSubtle: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: easing.enter } },
};

// Scale In
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: duration.normal, ease: easing.enter } },
};

// Stagger Container
export const staggerContainer = (staggerMs = 0.08, delayMs = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: staggerMs, delayChildren: delayMs },
  },
});

// Stagger Child
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.enter },
  },
};

// Card Hover — flat opacity change, no spring
export const cardHover = {
  rest: { opacity: 1, transition: { duration: duration.fast, ease: easing.default } },
  hover: { opacity: 0.88, transition: { duration: duration.fast, ease: easing.default } },
};

// Button Press — minimal, no spring
export const buttonPress = {
  whileTap: { scale: 0.98 },
  transition: { duration: duration.fast, ease: easing.default },
};

// Hero Text Reveal
export const heroTextReveal: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.enter },
  },
};

// Count Up
export const countUpTransition = {
  duration: duration.hero,
  ease: easing.emphasized,
};

// Parallax Layer (for scroll offset)
export const parallaxOffset = (offset: number): Variants => ({
  hidden: { y: offset },
  visible: { y: 0, transition: { duration: duration.hero, ease: easing.emphasized } },
});
