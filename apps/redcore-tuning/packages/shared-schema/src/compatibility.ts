// ─── Windows Version Compatibility Matrix ───────────────────────────────────

export interface WindowsBuild {
  version: string;       // "10" | "11"
  build: number;
  displayVersion: string; // "21H2", "23H2", "24H2"
  releaseDate: string;
  eolDate: string | null;
  supported: boolean;
  notes: string[];
}

export const WINDOWS_BUILD_MATRIX: WindowsBuild[] = [
  // Windows 10
  { version: "10", build: 19041, displayVersion: "2004", releaseDate: "2020-05-27", eolDate: "2021-12-14", supported: true, notes: ["GlobalTimerResolutionRequests NOT available"] },
  { version: "10", build: 19042, displayVersion: "20H2", releaseDate: "2020-10-20", eolDate: "2022-05-10", supported: true, notes: [] },
  { version: "10", build: 19043, displayVersion: "21H1", releaseDate: "2021-05-18", eolDate: "2022-12-13", supported: true, notes: [] },
  { version: "10", build: 19044, displayVersion: "21H2", releaseDate: "2021-11-16", eolDate: "2023-06-13", supported: true, notes: ["LTSC 2021 base"] },
  { version: "10", build: 19045, displayVersion: "22H2", releaseDate: "2022-10-18", eolDate: "2025-10-14", supported: true, notes: ["Final Win10 feature update"] },

  // Windows 11
  { version: "11", build: 22000, displayVersion: "21H2", releaseDate: "2021-10-04", eolDate: "2023-10-10", supported: true, notes: ["GlobalTimerResolutionRequests available"] },
  { version: "11", build: 22621, displayVersion: "22H2", releaseDate: "2022-09-20", eolDate: "2024-10-08", supported: true, notes: [] },
  { version: "11", build: 22631, displayVersion: "23H2", releaseDate: "2023-10-31", eolDate: "2025-11-11", supported: true, notes: [] },
  { version: "11", build: 26100, displayVersion: "24H2", releaseDate: "2024-10-01", eolDate: null, supported: true, notes: ["New quantum table values", "LTSC 2024 base"] },
];

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
  warnings: string[];
  fallbackMode: "full" | "reduced" | "analyze_only" | "blocked";
}

export type EditionCapability = {
  edition: string;
  groupPolicySupport: boolean;
  hyperVSupport: boolean;
  bitlockerSupport: boolean;
  rdpHostSupport: boolean;
  sandboxSupport: boolean;
  wslSupport: boolean;
};

export const EDITION_CAPABILITIES: EditionCapability[] = [
  { edition: "Home", groupPolicySupport: false, hyperVSupport: false, bitlockerSupport: false, rdpHostSupport: false, sandboxSupport: false, wslSupport: true },
  { edition: "Pro", groupPolicySupport: true, hyperVSupport: true, bitlockerSupport: true, rdpHostSupport: true, sandboxSupport: true, wslSupport: true },
  { edition: "Enterprise", groupPolicySupport: true, hyperVSupport: true, bitlockerSupport: true, rdpHostSupport: true, sandboxSupport: true, wslSupport: true },
  { edition: "Education", groupPolicySupport: true, hyperVSupport: true, bitlockerSupport: true, rdpHostSupport: true, sandboxSupport: true, wslSupport: true },
  { edition: "Enterprise LTSC", groupPolicySupport: true, hyperVSupport: true, bitlockerSupport: true, rdpHostSupport: true, sandboxSupport: true, wslSupport: true },
];
