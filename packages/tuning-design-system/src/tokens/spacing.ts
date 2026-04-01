// Spacing & Layout System
// 4px base unit. Calm, precise, intentional.

export const spacing = {
  0: "0px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
  32: "128px",
} as const;

export const radius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
} as const;

// Dark-first shadow system — uses rgba(0,0,0,...) with higher opacity.
// Surfaces are dark so shadows need to be deeper to create elevation contrast.
export const shadow = {
  none: "none",
  xs:   "0 1px 2px rgba(0, 0, 0, 0.35)",
  sm:   "0 1px 3px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.25)",
  md:   "0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.25)",
  lg:   "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
  xl:   "0 20px 25px -5px rgba(0, 0, 0, 0.55), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
  inner: "inset 0 2px 4px rgba(0, 0, 0, 0.35)",
  // Elevation layers — card sitting on #0D0D10 background
  card:      "0 1px 3px rgba(0, 0, 0, 0.45), 0 6px 16px rgba(0, 0, 0, 0.3)",
  cardHover: "0 2px 8px rgba(0, 0, 0, 0.55), 0 12px 28px rgba(0, 0, 0, 0.4)",
  // Modal — needs to float clearly above dark surface
  modal: "0 24px 48px -8px rgba(0, 0, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.4)",
  // Brand glow — stronger on dark for CTAs
  brandGlow:       "0 0 0 3px rgba(232, 69, 60, 0.25)",
  brandGlowStrong: "0 0 0 4px rgba(232, 69, 60, 0.35)",
  // Danger/warning glow
  amberGlow: "0 0 0 3px rgba(245, 158, 11, 0.2)",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

export const layout = {
  sidebarWidth: "260px",
  sidebarCollapsedWidth: "68px",
  headerHeight: "56px",
  maxContentWidth: "1200px",
  pageGutter: spacing[6],
  cardPadding: spacing[5],
  sectionGap: spacing[8],
} as const;
