// ─── Motion System ──────────────────────────────────────────────────────────
// Framer Motion presets for premium, intentional animation.
// Every animation communicates: trust, precision, momentum, polish.

import type { Transition, Variants } from "framer-motion";

// ─── Timing curves ──────────────────────────────────────────────────────────

export const easing = {
  // Default — smooth and premium
  default:    [0.25, 0.1, 0.25, 1.0] as const,
  // Enter — decelerates into position (Material standard)
  enter:      [0.0, 0.0, 0.2, 1.0] as const,
  // Exit — accelerates out cleanly
  exit:       [0.4, 0.0, 1.0, 1.0] as const,
  // Emphasized — used for hero / layout transitions
  emphasized: [0.2, 0.0, 0.0, 1.0] as const,
  // Overshoot — playful, used for confirmations / toasts
  overshoot:  [0.34, 1.56, 0.64, 1.0] as const,
} as const;

// ─── Duration tokens ────────────────────────────────────────────────────────

export const duration = {
  instant: 0.08,
  fast:    0.15,
  normal:  0.22,
  slow:    0.38,
  slower:  0.55,
  dramatic: 0.75,
  hero:    1.1,
} as const;

// ─── Spring presets ─────────────────────────────────────────────────────────
// Named after feel, not physics. Use consistently across the app.

export const spring = {
  // Snappy — immediate feedback, micro-interactions (buttons, toggles)
  snappy: {
    type: "spring" as const,
    stiffness: 550,
    damping: 32,
    mass: 1,
  },
  // Smooth — standard UI movement (panels, sidebars, cards)
  smooth: {
    type: "spring" as const,
    stiffness: 280,
    damping: 28,
    mass: 1,
  },
  // Gentle — slow, weighty content (page loads, large regions)
  gentle: {
    type: "spring" as const,
    stiffness: 180,
    damping: 22,
    mass: 1,
  },
  // Bounce — delightful confirmation (success state, toasts)
  bounce: {
    type: "spring" as const,
    stiffness: 340,
    damping: 16,
    mass: 1,
  },
} as const;

// ─── Transition presets ─────────────────────────────────────────────────────

export const transition = {
  default:  { duration: duration.normal,  ease: easing.default }    satisfies Transition,
  fast:     { duration: duration.fast,    ease: easing.default }    satisfies Transition,
  slow:     { duration: duration.slow,    ease: easing.emphasized } satisfies Transition,
  enter:    { duration: duration.normal,  ease: easing.enter }      satisfies Transition,
  exit:     { duration: duration.fast,    ease: easing.exit }       satisfies Transition,
  spring:   spring.smooth                                            satisfies Transition,
} as const;

// ─── Page transition ─────────────────────────────────────────────────────────
// Subtle — content slides 6px up on enter, 4px up on exit.
// The subdued motion respects the user's focus.

export const pageTransition: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.enter },
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: { duration: duration.fast, ease: easing.exit },
  },
};

// ─── Fade ────────────────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: transition.default },
  exit:    { opacity: 0, transition: transition.exit },
};

// ─── Slide up + fade — standard content reveal ───────────────────────────────

export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { ...transition.enter } },
  exit:    { opacity: 0, y: -6, transition: transition.exit },
};

// ─── Slide in from left — sidebar / panel entrance ───────────────────────────

export const slideInLeft: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0,  transition: transition.enter },
  exit:    { opacity: 0, x: -20, transition: transition.exit },
};

// ─── Scale up — modal / dialog spring entrance ───────────────────────────────
// Slight scale (0.96 → 1) with fade, spring physics for natural deceleration.

export const scaleUp: Variants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1,    transition: spring.smooth },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: duration.fast, ease: easing.exit } },
};

// ─── Modal spring ─────────────────────────────────────────────────────────────
// Rises from slight below-center with spring physics.
// Use this for all dialog / modal entrances.

export const modalSpring: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: spring.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: duration.fast, ease: easing.exit },
  },
};

// ─── Modal backdrop ───────────────────────────────────────────────────────────

export const backdropFade: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.normal, ease: easing.enter } },
  exit:    { opacity: 0, transition: { duration: duration.fast,   ease: easing.exit } },
};

// ─── Toast slide-in ──────────────────────────────────────────────────────────
// Slides in from bottom-right, slight bounce to signal arrival.

export const toastSlide: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.bounce,
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.97,
    transition: { duration: duration.fast, ease: easing.exit },
  },
};

// ─── Stagger container + children ────────────────────────────────────────────
// Standard list / grid reveal. Children enter with 60ms stagger.

export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

export const staggerChild: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0,  transition: { ...transition.enter } },
};

// ─── Card stagger ─────────────────────────────────────────────────────────────
// Tighter stagger for card grids (40ms). Cards rise from slight below.

export const cardStaggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

export const cardStaggerItem: Variants = {
  hidden:  { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...spring.smooth, duration: undefined },
  },
};

// ─── Card hover lift ─────────────────────────────────────────────────────────
// Subtle elevation on hover — 2px upward + deeper shadow.

export const cardHover = {
  rest: {
    y: 0,
    boxShadow: "0 1px 3px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.3)",
  },
  hover: {
    y: -2,
    boxShadow: "0 2px 8px rgba(0,0,0,0.55), 0 12px 28px rgba(0,0,0,0.4)",
    transition: spring.snappy,
  },
} as const;

// ─── Button press ─────────────────────────────────────────────────────────────
// Scale down on press, spring back. Used in Button component.

export const buttonPress = {
  whileTap: { scale: 0.97 },
  transition: spring.snappy,
} as const;

// ─── Tab underline slide ─────────────────────────────────────────────────────
// Use with layoutId="tab-underline" for animated indicator.
// See: <motion.div layoutId="tab-underline" transition={tabUnderlineTransition} />

export const tabUnderlineTransition: Transition = {
  ...spring.snappy,
};

// ─── Hover lift (generic) ────────────────────────────────────────────────────
// Reusable hover effect for any elevated element.

export const hoverLift = {
  rest:  { y: 0, transition: spring.snappy },
  hover: { y: -2, transition: spring.snappy },
} as const;

// ─── Progress bar fill ───────────────────────────────────────────────────────
// Custom variant — pass percentage as custom prop.

export const progressFill: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: (percent: number) => ({
    scaleX: percent / 100,
    originX: 0,
    transition: { duration: duration.slow, ease: easing.emphasized },
  }),
};

// ─── Number count-up ─────────────────────────────────────────────────────────
// Pair with useMotionValue + animate() for metric count-ups.

export const countUpTransition = {
  duration: duration.hero,
  ease: easing.emphasized,
} as const;

/** Horizontal slide — for onboarding step transitions */
export const slideHorizontal = (direction: 1 | -1 = 1): Variants => ({
  hidden: { opacity: 0, x: direction * 40 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.normal, ease: easing.enter } },
  exit: { opacity: 0, x: direction * -40, transition: { duration: duration.fast, ease: easing.exit } },
});

/** Shimmer — for skeleton loaders */
export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: { duration: 1.5, ease: "linear", repeat: Infinity },
  },
} as const;

// ─── Wizard step transitions ────────────────────────────────────────────────
// Premium horizontal slide for wizard step changes.
// Direction: 1 = forward (slide left), -1 = backward (slide right)

export const wizardStep = (direction: 1 | -1 = 1): Variants => ({
  hidden: {
    opacity: 0,
    x: direction * 60,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: duration.slow,
      ease: easing.emphasized,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    x: direction * -40,
    scale: 0.99,
    transition: {
      duration: duration.normal,
      ease: easing.exit,
    },
  },
});

// ─── Wizard section reveal ──────────────────────────────────────────────────
// For content sections within a wizard step — rises up with opacity.

export const wizardSection: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: easing.enter,
      staggerChildren: 0.04,
    },
  },
};

export const wizardSectionChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.enter },
  },
};

// ─── Pulse glow — for active/current indicators ─────────────────────────────

export const pulseGlow: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

// ─── Success celebration ────────────────────────────────────────────────────
// Scale-in with bounce for completion states.

export const successReveal: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      ...spring.bounce,
      delay: 0.1,
    },
  },
};

// ─── Progress bar spring ────────────────────────────────────────────────────
// Animated width with spring physics.

export const progressSpring = (percent: number) => ({
  width: `${percent}%`,
  transition: {
    ...spring.smooth,
    duration: undefined, // let spring handle timing
  },
});

// ─── Execution pulse — for live operation indicators ────────────────────────

export const executionPulse: Variants = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(232,69,60,0.0)",
      "0 0 0 6px rgba(232,69,60,0.15)",
      "0 0 0 0 rgba(232,69,60,0.0)",
    ],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

// ─── Timeline item enter ────────────────────────────────────────────────────
// For execution timeline items appearing one by one.

export const timelineItem: Variants = {
  hidden: { opacity: 0, x: -12, height: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: "auto",
    transition: {
      duration: duration.normal,
      ease: easing.enter,
      height: { duration: duration.fast },
    },
  },
};
