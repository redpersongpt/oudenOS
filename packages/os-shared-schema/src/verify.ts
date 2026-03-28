// ─── Post-Transformation Verification Types ──────────────────────────────────

export interface RegistryVerifyResult {
  hive: string;
  path: string;
  valueName: string;
  exists: boolean;
  currentValue: string | number | null;
  expectedValue: string | number | null;
  matches: boolean;
}
