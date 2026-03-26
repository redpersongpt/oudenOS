// ─── redcore-Tuning Color System ────────────────────────────────────────────
// Premium dark-first palette. Deep/muted, not garish.
// Red accent, cool-charcoal surfaces, precise hierarchy.

export const colors = {
  // ─── Brand Red ──────────────────────────────────────────────────────────
  // Signature accent. CTAs, active states, critical indicators.
  red: {
    50: "#FFF5F5",
    100: "#FFE3E3",
    200: "#FFC9C9",
    300: "#FFA3A3",
    400: "#FF7070",
    500: "#E8453C",   // Primary brand red
    600: "#D03030",
    700: "#B52424",
    800: "#961E1E",
    900: "#7A1A1A",
    950: "#4C0D0D",
  },

  // ─── Dark surfaces ───────────────────────────────────────────────────────
  // Layered elevation system. Cool-tinted near-blacks.
  // Each step is visually distinct but never garish.
  dark: {
    950: "#0D0D10",   // deepest background
    900: "#131316",   // primary card / surface
    850: "#1B1B1F",   // raised surface (modals, elevated cards)
    800: "#232328",   // overlay (menus, dropdowns, hover fills)
    750: "#2A2A30",   // muted fill (disabled, subtle backgrounds)
    border: "#26262C",     // default border
    borderSubtle: "#1C1C21", // hairline / very subtle
    borderStrong: "#3A3A44", // strong separation
  },

  // ─── Ink (text on dark) ─────────────────────────────────────────────────
  ink: {
    primary: "#EDEDEF",    // near-white, slightly cool
    secondary: "#8A8A9E",  // mid-gray, readable
    tertiary: "#52526A",   // dim, disabled, helper text
    inverse: "#0D0D10",    // text on light/brand backgrounds
  },

  // ─── Success ────────────────────────────────────────────────────────────
  green: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    900: "#14532D",
    // Dark-mode variants (muted, not neon)
    subtle: "#0D2318",  // dark bg fill
    dim: "#1A4A2E",     // border on dark
    muted: "#2A7A4A",   // text-accessible on dark
  },

  // ─── Warning ────────────────────────────────────────────────────────────
  amber: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    900: "#78350F",
    // Dark-mode variants
    subtle: "#1F1500",
    dim: "#3D2800",
    muted: "#8A5A00",
  },

  // ─── Info / Accent Blue ─────────────────────────────────────────────────
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    900: "#1E3A5F",
    // Dark-mode variants
    subtle: "#0A1628",
    dim: "#152444",
    muted: "#1E4A8A",
  },

  // ─── Neutral (warm gray) ────────────────────────────────────────────────
  // Preserved for migration. Prefer ink.* and dark.* on dark surfaces.
  neutral: {
    0: "#FFFFFF",
    25: "#FAFAF9",
    50: "#F7F6F5",
    100: "#F0EFED",
    150: "#E8E7E4",
    200: "#DDDCD8",
    300: "#C4C3BE",
    400: "#A3A29C",
    500: "#85847E",
    600: "#6B6A65",
    700: "#53524E",
    800: "#3D3C39",
    900: "#282724",
    950: "#1A1917",
  },

  // ─── Semantic aliases ───────────────────────────────────────────────────
  // Source of truth for component authors — use these, never raw values.
  semantic: {
    // Surfaces (dark-first)
    background: "#0D0D10",
    surface: "#131316",
    surfaceRaised: "#1B1B1F",
    surfaceOverlay: "#232328",
    surfaceMuted: "#2A2A30",

    // Text
    textPrimary: "#EDEDEF",
    textSecondary: "#8A8A9E",
    textTertiary: "#52526A",
    textInverse: "#0D0D10",
    textBrand: "#E8453C",

    // Borders
    border: "#26262C",
    borderSubtle: "#1C1C21",
    borderStrong: "#3A3A44",
    borderFocus: "#E8453C",

    // Interactive
    primaryDefault: "#E8453C",
    primaryHover: "#F05048",   // brighter on hover against dark
    primaryActive: "#C83830",
    primaryDisabled: "#5C1A18",

    // Status
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#E8453C",
    info: "#3B82F6",

    // Risk levels (accessible on dark surfaces)
    riskSafe: "#22C55E",
    riskLow: "#4ADE80",
    riskMedium: "#F59E0B",
    riskHigh: "#E8453C",
    riskExtreme: "#FF4040",
  },
} as const;

export type ColorToken = typeof colors;
