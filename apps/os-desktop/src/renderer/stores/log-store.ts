import { create } from "zustand";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  category: string;
  message: string;
  details?: string;
}

/** Context printed at the top of an exported log so a bug report is self-contained. */
export interface LogExportMeta {
  appVersion: string;
  windowsBuild: number | null;
  profile: string | null;
  preset: string | null;
  language: string;
  mode: string;
  platform: string;
  isAdmin: boolean | null;
}

interface LogState {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, "timestamp">) => void;
  clear: () => void;
  exportAsText: (meta?: LogExportMeta) => string;
}

const MAX_ENTRIES = 5000;

export function formatLog(entries: LogEntry[], meta?: LogExportMeta, now = new Date()): string {
  const rule = "═══════════════════════════════════════════";
  const lines = [rule, "  Ouden OS — Execution Log", `  Generated: ${now.toISOString()}`];
  if (meta) {
    lines.push(
      `  App version: ${meta.appVersion}`,
      `  Windows build: ${meta.windowsBuild ?? "unknown"}`,
      `  Profile: ${meta.profile ?? "none"}`,
      `  Preset: ${meta.preset ?? "none"}`,
      `  Language: ${meta.language}`,
      `  Service mode: ${meta.mode} (${meta.platform})`,
      `  Elevated: ${meta.isAdmin === null ? "unknown" : meta.isAdmin ? "yes" : "no"}`,
    );
  }
  lines.push(`  Total entries: ${entries.length}`, rule, "");

  for (const entry of entries) {
    const icon =
      entry.level === "success" ? "✓" : entry.level === "error" ? "✗" : entry.level === "warn" ? "⚠" : "·";
    lines.push(`[${entry.timestamp}] ${icon} [${entry.category}] ${entry.message}`);
    if (entry.details) lines.push(`  └─ ${entry.details}`);
  }

  lines.push("", rule, "  End of log", rule);
  // CRLF + BOM are added by the shell when the file is written.
  return lines.join("\n");
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  addEntry: (entry) =>
    set((state) => ({
      entries: [...state.entries, { ...entry, timestamp: new Date().toISOString() }].slice(-MAX_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
  exportAsText: (meta) => formatLog(get().entries, meta),
}));
