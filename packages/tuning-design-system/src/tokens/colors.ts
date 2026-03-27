// ─── redcore-Tuning Color System ────────────────────────────────────────────
// Premium dark-first palette matching redperson brand banner.
// Pink-red accent, warm charcoal surfaces, precise hierarchy.

export const colors = {
  // ─── Brand Red ──────────────────────────────────────────────────────────
  red: {
    50: "#FFF5F7",
    100: "#FFE3E8",
    200: "#FFC9D3",
    300: "#FFA3B4",
    400: "#FF4D6A",
    500: "#E8254B",   // Primary brand red (pink-red)
    600: "#C41E3E",
    700: "#A01832",
    800: "#7C1226",
    900: "#580C1A",
    950: "#34070F",
  },

  // ─── Dark surfaces ───────────────────────────────────────────────────────
  dark: {
    950: "#1a1a1e",   // deepest background
    900: "#1e1e22",   // primary bg
    850: "#252529",   // raised surface
    800: "#2c2c31",   // overlay
    750: "#333338",   // muted fill
    border: "#38383e",
    borderSubtle: "#2e2e34",
    borderStrong: "#48484f",
  },

  // ─── Ink (text on dark) ─────────────────────────────────────────────────
  ink: {
    primary: "#f0f0f4",
    secondary: "#a0a0ac",
    tertiary: "#6a6a76",
    inverse: "#1e1e22",
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
    subtle: "#1A2E22",
    dim: "#244A32",
    muted: "#2A7A4A",
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
    subtle: "#2A2200",
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
    subtle: "#1A2238",
    dim: "#1E2C4A",
    muted: "#2A4A8A",
  },

  // ─── Neutral (warm gray) ────────────────────────────────────────────────
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
  semantic: {
    background: "#1e1e22",
    surface: "#252529",
    surfaceRaised: "#2c2c31",
    surfaceOverlay: "#333338",
    surfaceMuted: "#38383e",

    textPrimary: "#f0f0f4",
    textSecondary: "#a0a0ac",
    textTertiary: "#6a6a76",
    textInverse: "#1e1e22",
    textBrand: "#E8254B",

    border: "#38383e",
    borderSubtle: "#2e2e34",
    borderStrong: "#48484f",
    borderFocus: "#E8254B",

    primaryDefault: "#E8254B",
    primaryHover: "#FF3860",
    primaryActive: "#C41E3E",
    primaryDisabled: "#5C1A28",

    success: "#22C55E",
    warning: "#F59E0B",
    error: "#E8254B",
    info: "#3B82F6",

    riskSafe: "#22C55E",
    riskLow: "#4ADE80",
    riskMedium: "#F59E0B",
    riskHigh: "#E8254B",
    riskExtreme: "#FF3040",
  },
} as const;

export type ColorToken = typeof colors;
