// Ouden Color System
// OLED black base with monochrome accent

export const colors = {
  red: {
    50: "#FFF5F5", 100: "#FFE0E0", 200: "#FFC0C0", 300: "#FF8888",
    400: "#F0F0F0", 500: "#E8E8E8", 600: "#CCCCCC", 700: "#999999",
    800: "#6A0B10", 900: "#46070A", 950: "#2D0A10",
  },

  dark: {
    950: "#000000",
    900: "#000000",
    850: "#111111",
    800: "#1A1A1A",
    750: "#222222",
    border: "#333333",
    borderSubtle: "#222222",
    borderStrong: "#444444",
  },

  ink: {
    primary: "#E8E8E8",
    secondary: "#999999",
    tertiary: "#666666",
    inverse: "#000000",
  },

  green: {
    50: "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0",
    400: "#4A9E5C", 500: "#3D8B4F", 600: "#16A34A", 700: "#15803D",
    900: "#14532D", subtle: "#0A1A0E", dim: "#122A18", muted: "#1A3A22",
  },

  amber: {
    50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A",
    400: "#D4A843", 500: "#C49A38", 600: "#D97706", 700: "#B45309",
    900: "#78350F", subtle: "#1A1400", dim: "#2A1E00", muted: "#5A3A00",
  },

  blue: {
    50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE",
    400: "#5B9BF6", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
    900: "#1E3A5F", subtle: "#0A1220", dim: "#0E1A2A", muted: "#1A2A4A",
  },

  neutral: {
    0: "#FFFFFF", 25: "#FAFAF9", 50: "#F7F6F5", 100: "#F0EFED",
    150: "#E8E7E4", 200: "#DDDCD8", 300: "#C4C3BE", 400: "#A3A29C",
    500: "#85847E", 600: "#6B6A65", 700: "#53524E", 800: "#3D3C39",
    900: "#282724", 950: "#1A1917",
  },

  semantic: {
    background: "#000000",
    surface: "#111111",
    surfaceRaised: "#1A1A1A",
    surfaceOverlay: "#222222",
    surfaceMuted: "#0A0A0A",

    textPrimary: "#E8E8E8",
    textSecondary: "#999999",
    textTertiary: "#666666",
    textInverse: "#000000",
    textBrand: "#E8E8E8",

    border: "#333333",
    borderSubtle: "#222222",
    borderStrong: "#444444",
    borderFocus: "#E8E8E8",

    primaryDefault: "#E8E8E8",
    primaryHover: "#FFFFFF",
    primaryActive: "#CCCCCC",
    primaryDisabled: "#333333",

    success: "#4A9E5C",
    warning: "#D4A843",
    error: "#FF6B6B",
    info: "#5B9BF6",

    riskSafe: "#4A9E5C",
    riskLow: "#4A9E5C",
    riskMedium: "#D4A843",
    riskHigh: "#FF6B6B",
    riskExtreme: "#FF3040",
  },
} as const;

export type ColorToken = typeof colors;
