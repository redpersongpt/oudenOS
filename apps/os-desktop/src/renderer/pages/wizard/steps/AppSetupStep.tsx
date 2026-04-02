
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { RecommendedApp } from "@/stores/wizard-store";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

const CATEGORIES: Record<string, { label: string; desc: string }> = {
  browser:       { label: "BROWSERS",         desc: "REPLACE EDGE" },
  utility:       { label: "UTILITIES",        desc: "ESSENTIAL TOOLS" },
  runtime:       { label: "RUNTIMES",         desc: "REQUIRED FRAMEWORKS" },
  gaming:        { label: "GAMING",           desc: "GAME LAUNCHERS" },
  communication: { label: "COMMUNICATION",    desc: "MESSAGING" },
  development:   { label: "DEVELOPMENT",      desc: "CODE TOOLS" },
  monitoring:    { label: "MONITORING",       desc: "HARDWARE INFO" },
  media:         { label: "MEDIA",            desc: "PLAYERS" },
  music:         { label: "MUSIC",            desc: "STREAMING" },
  streaming:     { label: "STREAMING",        desc: "RECORDING" },
};

const CATEGORY_ORDER = ["browser", "utility", "runtime", "gaming", "communication", "development", "monitoring", "media", "music", "streaming"];

function buildMockApps(): RecommendedApp[] {
  return [
    { id: "brave", name: "Brave Browser", category: "browser", description: "Privacy-focused Chromium browser", recommended: true, selected: true, workSafe: true },
    { id: "firefox", name: "Mozilla Firefox", category: "browser", description: "Independent privacy browser", recommended: false, selected: false, workSafe: true },
    { id: "chrome", name: "Google Chrome", category: "browser", description: "Fast Chromium browser", recommended: false, selected: false, workSafe: true },
    { id: "7zip", name: "7-Zip", category: "utility", description: "File archiver", recommended: true, selected: true, workSafe: true },
    { id: "everything", name: "Everything", category: "utility", description: "Instant file search", recommended: true, selected: true, workSafe: true },
    { id: "notepadpp", name: "Notepad++", category: "utility", description: "Source code editor", recommended: true, selected: true, workSafe: true },
    { id: "powertoys", name: "PowerToys", category: "utility", description: "Microsoft power-user utilities", recommended: false, selected: false, workSafe: true },
    { id: "sharex", name: "ShareX", category: "utility", description: "Screenshot tool", recommended: false, selected: false, workSafe: true },
    { id: "winrar", name: "WinRAR", category: "utility", description: "Archive manager", recommended: false, selected: false, workSafe: true },
    { id: "vcredist", name: "Visual C++ Runtimes", category: "runtime", description: "VC++ 2015-2022 x64", recommended: true, selected: true, workSafe: true },
    { id: "dotnet8", name: ".NET 8 Runtime", category: "runtime", description: "Microsoft .NET 8", recommended: true, selected: true, workSafe: true },
    { id: "directx", name: "DirectX End-User", category: "runtime", description: "Legacy DirectX", recommended: true, selected: true, workSafe: true },
    { id: "java", name: "Java (Adoptium)", category: "runtime", description: "Java runtime", recommended: false, selected: false, workSafe: true },
    { id: "steam", name: "Steam", category: "gaming", description: "Valve game store", recommended: true, selected: true, workSafe: false },
    { id: "epicgames", name: "Epic Games", category: "gaming", description: "Free weekly games", recommended: false, selected: false, workSafe: false },
    { id: "discord", name: "Discord", category: "communication", description: "Voice and text", recommended: true, selected: true, workSafe: false },
    { id: "telegram", name: "Telegram", category: "communication", description: "Secure messaging", recommended: false, selected: false, workSafe: true },
    { id: "vscode", name: "VS Code", category: "development", description: "Code editor", recommended: false, selected: false, workSafe: true },
    { id: "git", name: "Git", category: "development", description: "Version control", recommended: false, selected: false, workSafe: true },
    { id: "hwinfo", name: "HWiNFO64", category: "monitoring", description: "Hardware monitoring", recommended: true, selected: false, workSafe: true },
    { id: "vlc", name: "VLC", category: "media", description: "Plays any format", recommended: true, selected: true, workSafe: true },
    { id: "spotify", name: "Spotify", category: "music", description: "Music streaming", recommended: false, selected: false, workSafe: true },
    { id: "obs", name: "OBS Studio", category: "streaming", description: "Screen recording", recommended: false, selected: false, workSafe: true },
  ];
}

function AppRow({ app, selected, onToggle }: { app: RecommendedApp; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-4 py-2 text-left transition-colors duration-150 ease-nd border-b border-nd-border-subtle ${
        selected ? "bg-nd-surface" : "bg-nd-bg hover:bg-nd-surface"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">
          {selected ? (
            <div className="w-3 h-0.5 bg-brand-500" />
          ) : (
            <div className="w-2 h-px bg-nd-border" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-caption tracking-label ${selected ? "text-nd-text-display" : "text-nd-text-secondary"}`}>
              {app.name.toUpperCase()}
            </span>
            {app.recommended && (
              <span className="nd-label-sm text-brand-500">REC</span>
            )}
          </div>
          <p className="nd-label-sm text-nd-text-disabled truncate">{app.description.toUpperCase()}</p>
        </div>
      </div>
      <div className="flex gap-0.5 shrink-0">
        <div className={`w-3 h-1 ${selected ? "bg-brand-500" : "bg-nd-border-subtle"}`} />
        <div className={`w-3 h-1 ${selected ? "bg-brand-500" : "bg-nd-border-subtle"}`} />
      </div>
    </button>
  );
}

export function AppSetupStep() {
  const { detectedProfile, recommendedApps, selectedAppIds, demoMode, setRecommendedApps, toggleApp, setStepReady } = useWizardStore();
  const [loading, setLoading] = useState(recommendedApps.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setStepReady("app-setup", false);
    if (recommendedApps.length > 0) return;
    const load = async () => {
      setLoadError(null);
      try {
        const { serviceCall } = await import("@/lib/service");
        const profile = detectedProfile?.id ?? "gaming_desktop";
        const result = await serviceCall<{ apps: RecommendedApp[] }>("appbundle.getRecommended", { profile });
        if (result.ok && result.data?.apps && Array.isArray(result.data.apps)) {
          setRecommendedApps(result.data.apps);
        } else if (demoMode) {
          setRecommendedApps(buildMockApps());
        } else {
          setRecommendedApps([]);
          setLoadError((!result.ok && result.error) || "Unable to load catalog.");
        }
      } catch {
        if (demoMode) setRecommendedApps(buildMockApps());
        else { setRecommendedApps([]); setLoadError("Unable to load catalog."); }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [demoMode, detectedProfile, recommendedApps.length, setRecommendedApps, setStepReady]);

  useEffect(() => {
    setStepReady("app-setup", !loading && recommendedApps.length > 0);
  }, [loading, recommendedApps.length, setStepReady]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-nd-bg">
        <div className="w-2 h-2 bg-brand-500 nd-pulse" />
      </div>
    );
  }

  if (recommendedApps.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-nd-bg">
        <Package className="h-6 w-6 text-nd-text-disabled" />
        <p className="nd-label text-nd-text-disabled">{(loadError ?? "CATALOG NOT AVAILABLE").toUpperCase()}</p>
      </div>
    );
  }

  const byCategory = new Map<string, RecommendedApp[]>();
  for (const app of recommendedApps) {
    const list = byCategory.get(app.category) ?? [];
    list.push(app);
    byCategory.set(app.category, list);
  }
  const sortedCategories = [...byCategory.entries()].sort(
    ([a], [b]) => (CATEGORY_ORDER.indexOf(a) === -1 ? 99 : CATEGORY_ORDER.indexOf(a)) - (CATEGORY_ORDER.indexOf(b) === -1 ? 99 : CATEGORY_ORDER.indexOf(b))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col bg-nd-bg overflow-y-auto scrollbar-thin"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-nd-border-subtle">
        <h2 className="font-display text-title text-nd-text-display">SOFTWARE</h2>
        <p className="mt-1 nd-label text-nd-text-secondary">
          SELECT APPS FOR {(detectedProfile?.label ?? "YOUR MACHINE").toUpperCase()}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="font-mono text-label tracking-label text-nd-text-display">
            {selectedAppIds.length}
          </span>
          <span className="nd-label text-nd-text-secondary">SELECTED</span>
          {selectedAppIds.length > 0 && (
            <button
              onClick={() => { for (const id of selectedAppIds) toggleApp(id); }}
              className="ml-auto nd-label-sm text-nd-text-disabled hover:text-nd-text-secondary transition-colors duration-150 ease-nd"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1">
        {sortedCategories.map(([category, apps], catIdx) => {
          const meta = CATEGORIES[category] ?? { label: category.toUpperCase(), desc: "" };
          return (
            <motion.div
              key={category}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: catIdx * 0.03, duration: 0.2, ease: ND_EASE }}
            >
              <div className="px-4 py-2 bg-nd-surface border-b border-nd-border-subtle flex items-center gap-3">
                <span className="nd-label text-nd-text-secondary">{meta.label}</span>
                <span className="nd-label-sm text-nd-text-disabled">{meta.desc}</span>
              </div>
              {apps.map((app) => (
                <AppRow
                  key={app.id}
                  app={app}
                  selected={selectedAppIds.includes(app.id)}
                  onToggle={() => toggleApp(app.id)}
                />
              ))}
            </motion.div>
          );
        })}
      </div>

      <div className="px-6 py-3 border-t border-nd-border-subtle">
        <p className="nd-label-sm text-nd-text-disabled text-center">
          [ALL APPS INSTALLED SILENTLY · SKIP TO CONTINUE WITHOUT INSTALLING]
        </p>
      </div>
    </motion.div>
  );
}
