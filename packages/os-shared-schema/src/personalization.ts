// ─── Personalization Types ────────────────────────────────────────────────────
// UI / shell personalization options applied after the transformation plan.

export type PersonalizationCategory = "appearance" | "taskbar" | "explorer" | "privacy";

export interface PersonalizationOption {
  key: string;                           // Matches PersonalizationPreferences keys
  label: string;
  description: string;
  category: PersonalizationCategory;
  default: boolean;
  safeForWorkPc: boolean;
}

export interface PersonalizationOptions {
  options: PersonalizationOption[];
}

export interface PersonalizationPreferences {
  darkMode: boolean;
  brandAccent: boolean;
  taskbarCleanup: boolean;
  explorerCleanup: boolean;
  transparency: boolean;
  showHiddenFiles: boolean;
}

export const DEFAULT_PERSONALIZATION_PREFERENCES: PersonalizationPreferences = {
  darkMode: true,
  brandAccent: true,
  taskbarCleanup: true,
  explorerCleanup: true,
  transparency: true,
  showHiddenFiles: false,
};
