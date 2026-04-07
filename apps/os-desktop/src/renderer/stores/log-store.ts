import { create } from "zustand";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  category: string;
  message: string;
  details?: string;
}

interface LogState {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, "timestamp">) => void;
  clear: () => void;
  exportAsText: () => string;
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  addEntry: (entry) =>
    set((state) => ({
      entries: [
        ...state.entries,
        { ...entry, timestamp: new Date().toISOString() },
      ],
    })),
  clear: () => set({ entries: [] }),
  exportAsText: () => {
    const { entries } = get();
    const lines = [
      "═══════════════════════════════════════════",
      "  Ouden OS — Execution Log",
      `  Generated: ${new Date().toISOString()}`,
      `  Total entries: ${entries.length}`,
      "═══════════════════════════════════════════",
      "",
    ];

    for (const entry of entries) {
      const icon =
        entry.level === "success"
          ? "✓"
          : entry.level === "error"
            ? "✗"
            : entry.level === "warn"
              ? "⚠"
              : "·";
      lines.push(
        `[${entry.timestamp}] ${icon} [${entry.category}] ${entry.message}`,
      );
      if (entry.details) {
        lines.push(`  └─ ${entry.details}`);
      }
    }

    lines.push("");
    lines.push("═══════════════════════════════════════════");
    lines.push("  End of log");
    lines.push("═══════════════════════════════════════════");
    return lines.join("\n");
  },
}));
