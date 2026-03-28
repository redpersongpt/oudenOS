// ─── App Setup Step ──────────────────────────────────────────────────────────
// Comprehensive software installer with categories, icons, and descriptions.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Check, Globe, Wrench, Gamepad2, MessageCircle, Monitor, Code, Music, Film, Package, Cpu } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { RecommendedApp } from "@/stores/wizard-store";

// ─── Category config ────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; icon: typeof Globe; desc: string }> = {
  browser:       { label: "Browsers",          icon: Globe,         desc: "Web browsers to replace Edge" },
  utility:       { label: "Utilities",          icon: Wrench,        desc: "Essential tools for daily use" },
  runtime:       { label: "Runtimes",           icon: Package,       desc: "Required frameworks and libraries" },
  gaming:        { label: "Gaming",             icon: Gamepad2,      desc: "Game platforms and launchers" },
  communication: { label: "Communication",      icon: MessageCircle, desc: "Voice, video, and messaging" },
  development:   { label: "Development",        icon: Code,          desc: "Code editors and dev tools" },
  monitoring:    { label: "System Monitoring",   icon: Cpu,           desc: "Hardware info and diagnostics" },
  media:         { label: "Media",              icon: Film,          desc: "Media players and audio tools" },
  streaming:     { label: "Streaming",          icon: Monitor,       desc: "Recording and streaming" },
  music:         { label: "Music",              icon: Music,         desc: "Music players and services" },
};

const CATEGORY_ORDER = ["browser", "utility", "runtime", "gaming", "communication", "development", "monitoring", "media", "music", "streaming"];

// ─── Full app catalog (mock) ────────────────────────────────────────────────

function buildMockApps(): RecommendedApp[] {
  return [
    // Browsers
    { id: "brave",     name: "Brave Browser",    category: "browser", description: "Privacy-focused Chromium browser with built-in ad blocking", recommended: true, selected: true, workSafe: true },
    { id: "firefox",   name: "Mozilla Firefox",  category: "browser", description: "Independent, privacy-respecting browser", recommended: false, selected: false, workSafe: true },
    { id: "chrome",    name: "Google Chrome",    category: "browser", description: "Fast Chromium browser with Google integration", recommended: false, selected: false, workSafe: true },

    // Utilities
    { id: "7zip",        name: "7-Zip",            category: "utility", description: "Free file archiver with high compression ratio", recommended: true, selected: true, workSafe: true },
    { id: "winrar",      name: "WinRAR",           category: "utility", description: "Popular archive manager with RAR support", recommended: false, selected: false, workSafe: true },
    { id: "everything",  name: "Everything",       category: "utility", description: "Instant file search — finds any file in milliseconds", recommended: true, selected: true, workSafe: true },
    { id: "notepadpp",   name: "Notepad++",        category: "utility", description: "Lightweight source code editor with syntax highlighting", recommended: true, selected: true, workSafe: true },
    { id: "powertoys",   name: "PowerToys",        category: "utility", description: "Microsoft power-user utilities (FancyZones, Color Picker, etc.)", recommended: false, selected: false, workSafe: true },
    { id: "sharex",      name: "ShareX",           category: "utility", description: "Advanced screenshot and screen recording tool", recommended: false, selected: false, workSafe: true },

    // Runtimes
    { id: "vcredist",    name: "Visual C++ Runtimes",  category: "runtime", description: "VC++ 2015-2022 x64 — required by most games and apps", recommended: true, selected: true, workSafe: true },
    { id: "dotnet8",     name: ".NET 8 Runtime",       category: "runtime", description: "Microsoft .NET 8 desktop runtime", recommended: true, selected: true, workSafe: true },
    { id: "java",        name: "Java (Adoptium JRE)",  category: "runtime", description: "Java runtime for Minecraft, dev tools, and enterprise apps", recommended: false, selected: false, workSafe: true },
    { id: "directx",     name: "DirectX End-User",     category: "runtime", description: "Legacy DirectX components for older games", recommended: true, selected: true, workSafe: true },

    // Gaming
    { id: "steam",       name: "Steam",              category: "gaming", description: "Valve's game store and community platform", recommended: true, selected: true, workSafe: false },
    { id: "epicgames",   name: "Epic Games",          category: "gaming", description: "Epic Games Store with free weekly games", recommended: false, selected: false, workSafe: false },
    { id: "battlenet",   name: "Battle.net",          category: "gaming", description: "Blizzard launcher (WoW, Diablo, Overwatch)", recommended: false, selected: false, workSafe: false },
    { id: "riotclient",  name: "Riot Client",         category: "gaming", description: "Valorant, League of Legends launcher", recommended: false, selected: false, workSafe: false },
    { id: "ea",          name: "EA App",              category: "gaming", description: "Electronic Arts game launcher", recommended: false, selected: false, workSafe: false },
    { id: "gog",         name: "GOG Galaxy",          category: "gaming", description: "DRM-free game store and multi-launcher", recommended: false, selected: false, workSafe: false },

    // Communication
    { id: "discord",     name: "Discord",             category: "communication", description: "Voice, video, and text for gaming communities", recommended: true, selected: true, workSafe: false },
    { id: "telegram",    name: "Telegram",            category: "communication", description: "Fast, secure messaging with cloud sync", recommended: false, selected: false, workSafe: true },
    { id: "signal",      name: "Signal",              category: "communication", description: "End-to-end encrypted private messaging", recommended: false, selected: false, workSafe: true },

    // Development
    { id: "vscode",      name: "Visual Studio Code",  category: "development", description: "Microsoft's free code editor with extensions", recommended: false, selected: false, workSafe: true },
    { id: "git",         name: "Git",                 category: "development", description: "Distributed version control system", recommended: false, selected: false, workSafe: true },
    { id: "wt",          name: "Windows Terminal",    category: "development", description: "Modern terminal with tabs, themes, and GPU rendering", recommended: false, selected: false, workSafe: true },
    { id: "python",      name: "Python",              category: "development", description: "Python programming language and runtime", recommended: false, selected: false, workSafe: true },
    { id: "nodejs",      name: "Node.js LTS",         category: "development", description: "JavaScript runtime for server and tooling", recommended: false, selected: false, workSafe: true },

    // Monitoring
    { id: "hwinfo",      name: "HWiNFO64",           category: "monitoring", description: "Comprehensive hardware monitoring and sensor readout", recommended: true, selected: false, workSafe: true },
    { id: "afterburner", name: "MSI Afterburner",     category: "monitoring", description: "GPU overclocking, monitoring, and on-screen display", recommended: false, selected: false, workSafe: false },
    { id: "cpuz",        name: "CPU-Z",              category: "monitoring", description: "Detailed CPU, memory, and motherboard information", recommended: false, selected: false, workSafe: true },
    { id: "gpuz",        name: "GPU-Z",              category: "monitoring", description: "GPU specifications, clock speeds, and sensor monitoring", recommended: false, selected: false, workSafe: true },

    // Media
    { id: "vlc",         name: "VLC Media Player",   category: "media", description: "Plays any video/audio format without codec packs", recommended: true, selected: true, workSafe: true },
    { id: "mpv",         name: "mpv",                category: "media", description: "Minimalist, high-performance video player", recommended: false, selected: false, workSafe: true },
    { id: "irfanview",   name: "IrfanView",          category: "media", description: "Fast, lightweight image viewer and converter", recommended: false, selected: false, workSafe: true },

    // Music
    { id: "spotify",     name: "Spotify",            category: "music", description: "Music streaming with free and premium tiers", recommended: false, selected: false, workSafe: true },

    // Streaming
    { id: "obs",         name: "OBS Studio",         category: "streaming", description: "Open-source screen recording and live streaming", recommended: false, selected: false, workSafe: true },
  ];
}

// ─── App Card ───────────────────────────────────────────────────────────────

function AppCard({ app, selected, onToggle }: {
  app: RecommendedApp;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
        selected
          ? "border-brand-500/25 bg-brand-500/[0.06]"
          : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.10]"
      }`}
    >
      {/* Checkbox */}
      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${
        selected ? "bg-brand-500" : "border border-white/[0.15]"
      }`}>
        {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold ${selected ? "text-ink" : "text-ink-secondary"}`}>{app.name}</span>
          {app.recommended && (
            <span className="rounded bg-brand-500/15 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-400">
              recommended
            </span>
          )}
        </div>
        <p className="text-[10px] text-ink-tertiary truncate">{app.description}</p>
      </div>
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSetupStep() {
  const { detectedProfile, recommendedApps, selectedAppIds, setRecommendedApps, toggleApp } = useWizardStore();
  const [loading, setLoading] = useState(recommendedApps.length === 0);

  useEffect(() => {
    if (recommendedApps.length > 0) return;

    const load = async () => {
      try {
        const { serviceCall } = await import("@/lib/service");
        const profile = detectedProfile?.id ?? "gaming_desktop";
        const result = await serviceCall<{ apps: RecommendedApp[] }>("appbundle.getRecommended", { profile });
        if (result.ok && result.data?.apps && Array.isArray(result.data.apps)) {
          setRecommendedApps(result.data.apps);
        } else {
          setRecommendedApps(buildMockApps());
        }
      } catch {
        setRecommendedApps(buildMockApps());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [detectedProfile, recommendedApps.length, setRecommendedApps]);

  if (loading) {
    return (
      <div className="flex h-full flex-col px-5 py-4">
        {/* Skeleton header */}
        <div className="mb-3 space-y-1.5">
          <div className="h-5 w-44 rounded-md bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-72 rounded bg-white/[0.03] animate-pulse" />
        </div>
        {/* Skeleton selection bar */}
        <div className="mb-3 h-9 w-full rounded-lg bg-white/[0.03] animate-pulse" />
        {/* Skeleton categories */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="mb-4">
            <div className="mb-1.5 h-3 w-24 rounded bg-white/[0.03] animate-pulse" style={{ animationDelay: `${i * 0.08}s` }} />
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-11 rounded-lg bg-white/[0.02] animate-pulse" style={{ animationDelay: `${(i * 4 + j) * 0.05}s` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Group by category
  const byCategory = new Map<string, RecommendedApp[]>();
  for (const app of recommendedApps) {
    const list = byCategory.get(app.category) ?? [];
    list.push(app);
    byCategory.set(app.category, list);
  }

  const sortedCategories = [...byCategory.entries()].sort(
    ([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
  );

  const selectedCount = selectedAppIds.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col px-5 py-4 overflow-y-auto scrollbar-thin"
    >
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-[17px] font-bold tracking-tight text-ink">
          Software Setup
        </h1>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
          Choose what to install on your{" "}
          <span className="font-medium text-ink">{detectedProfile?.label ?? "machine"}</span>.
          {" "}Apps marked <span className="text-brand-400 font-medium">recommended</span> are selected by default for your profile.
        </p>
      </div>

      {/* Selection bar */}
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
        <Download className="h-3.5 w-3.5 text-brand-400" />
        <span className="text-[11px] font-medium text-ink-secondary">
          {selectedCount} app{selectedCount !== 1 ? "s" : ""} selected for installation
        </span>
        {selectedCount > 0 && (
          <button
            onClick={() => {
              for (const id of selectedAppIds) toggleApp(id);
            }}
            className="ml-auto text-[10px] text-ink-muted hover:text-ink-tertiary transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Categories — staggered entrance */}
      <div className="space-y-4">
        {sortedCategories.map(([category, apps], catIdx) => {
          const meta = CATEGORIES[category] ?? { label: category, icon: Package, desc: "" };
          const Icon = meta.icon;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIdx * 0.04, duration: 0.2, ease: [0.0, 0.0, 0.2, 1.0] }}
            >
              {/* Category header */}
              <div className="mb-1.5 flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-ink-muted" />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">
                  {meta.label}
                </span>
                <span className="text-[9px] text-ink-muted">— {meta.desc}</span>
              </div>
              {/* App cards */}
              <div className="grid grid-cols-2 gap-1.5">
                {apps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    selected={Boolean(selectedAppIds.includes(app.id))}
                    onToggle={(): void => { toggleApp(app.id); }}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-3 text-center text-[10px] text-ink-muted">
        All apps are installed silently. You can skip this step and install software later.
      </p>
    </motion.div>
  );
}
