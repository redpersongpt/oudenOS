// Remaining-time estimate for the apply screen: rolling average of the most
// recent action durations × actions left. Returns null until there is enough
// signal (2+ samples) so the UI never shows a made-up number.

export function estimateRemainingMs(durationsMs: number[], remaining: number, window = 8): number | null {
  if (remaining <= 0) return 0;
  const samples = durationsMs.filter((d) => Number.isFinite(d) && d >= 0).slice(-window);
  if (samples.length < 2) return null;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return Math.round(avg * remaining);
}

/** Bucket an estimate into something calm to read: "<1 min", "~3 min", "~12 min". */
export function etaBucket(ms: number | null): { unit: "lessThanMinute" | "minutes"; minutes: number } | null {
  if (ms === null) return null;
  if (ms < 60_000) return { unit: "lessThanMinute", minutes: 0 };
  return { unit: "minutes", minutes: Math.max(1, Math.round(ms / 60_000)) };
}
