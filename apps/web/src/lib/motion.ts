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
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
  dramatic: 1.0,
  hero: 1.4,
};

// Spring Presets
export const spring = {
  snappy: { type: "spring" as const, stiffness: 550, damping: 32, mass: 1 },
  smooth: { type: "spring" as const, stiffness: 280, damping: 28, mass: 1 },
  gentle: { type: "spring" as const, stiffness: 180, damping: 22, mass: 1 },
  bounce: { type: "spring" as const, stiffness: 340, damping: 16, mass: 1 },
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
  visible: { opacity: 1, scale: 1, transition: spring.smooth },
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

// Card Hover
export const cardHover = {
  rest: { y: 0, transition: spring.snappy },
  hover: { y: -4, transition: spring.snappy },
};

// Button Press
export const buttonPress = {
  whileTap: { scale: 0.97 },
  transition: spring.snappy,
};

// Hero Text Reveal
export const heroTextReveal: Variants = {
  hidden: { opacity: 0, y: 60, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.dramatic, ease: easing.emphasized },
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
