// Typography System
// Space Grotesk for UI. Space Mono for data/labels. Doto for display moments.

export const fontFamily = {
  sans: '"Space Grotesk", system-ui, sans-serif',
  mono: '"Space Mono", "Cascadia Code", monospace',
  display: '"Doto", monospace',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// Modular scale: 1.200 (minor third)
export const fontSize = {
  xs: "0.694rem",     // 11.1px
  sm: "0.833rem",     // 13.3px
  base: "0.875rem",   // 14px — base UI text
  md: "1rem",         // 16px
  lg: "1.125rem",     // 18px
  xl: "1.35rem",      // 21.6px
  "2xl": "1.62rem",   // 25.9px
  "3xl": "1.944rem",  // 31.1px
  "4xl": "2.333rem",  // 37.3px
  "5xl": "2.8rem",    // 44.8px
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.625,
} as const;

export const letterSpacing = {
  tighter: "-0.03em",
  tight: "-0.015em",
  normal: "0em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
} as const;

// Pre-composed text styles for common use
export const textStyles = {
  // Display — hero numbers, splash screen
  displayLg: { fontSize: fontSize["5xl"], fontWeight: fontWeight.bold, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tighter, fontFamily: fontFamily.sans },
  displayMd: { fontSize: fontSize["4xl"], fontWeight: fontWeight.bold, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tighter, fontFamily: fontFamily.sans },
  displaySm: { fontSize: fontSize["3xl"], fontWeight: fontWeight.semibold, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tight, fontFamily: fontFamily.sans },

  // Headings
  h1: { fontSize: fontSize["2xl"], fontWeight: fontWeight.semibold, lineHeight: lineHeight.snug, letterSpacing: letterSpacing.tight, fontFamily: fontFamily.sans },
  h2: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, lineHeight: lineHeight.snug, letterSpacing: letterSpacing.tight, fontFamily: fontFamily.sans },
  h3: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, lineHeight: lineHeight.snug, letterSpacing: letterSpacing.normal, fontFamily: fontFamily.sans },

  // Body
  bodyLg: { fontSize: fontSize.md, fontWeight: fontWeight.regular, lineHeight: lineHeight.normal, letterSpacing: letterSpacing.normal, fontFamily: fontFamily.sans },
  body: { fontSize: fontSize.base, fontWeight: fontWeight.regular, lineHeight: lineHeight.normal, letterSpacing: letterSpacing.normal, fontFamily: fontFamily.sans },
  bodySm: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, lineHeight: lineHeight.normal, letterSpacing: letterSpacing.normal, fontFamily: fontFamily.sans },

  // Labels & UI
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.wide, fontFamily: fontFamily.sans },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, lineHeight: lineHeight.normal, letterSpacing: letterSpacing.wide, fontFamily: fontFamily.sans },
  overline: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.widest, fontFamily: fontFamily.sans, textTransform: "uppercase" as const },

  // Mono — metrics, registry paths, benchmark numbers
  metric: { fontSize: fontSize["2xl"], fontWeight: fontWeight.semibold, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.tight, fontFamily: fontFamily.mono },
  metricSm: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, lineHeight: lineHeight.tight, letterSpacing: letterSpacing.normal, fontFamily: fontFamily.mono },
  code: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, lineHeight: lineHeight.relaxed, letterSpacing: letterSpacing.normal, fontFamily: fontFamily.mono },
} as const;
