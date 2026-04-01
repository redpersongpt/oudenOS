// App Hub Step
// Compact grid with real app logos. Fits viewport. No scrolling.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

// App catalog with real logo URLs

interface AppDef {
  id: string;
  name: string;
  category: string;
  logo: string; // real PNG/SVG URL
}

const APPS: AppDef[] = [
  // Gaming
  // Gaming — using stable CDN PNG URLs
  { id: "steam",       name: "Steam",          category: "gaming",   logo: "https://store.steampowered.com/favicon.ico" },
  { id: "discord",     name: "Discord",        category: "gaming",   logo: "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/6257d23c5fb25be7e0b6e220_Open%20Source%20Projects%20702x540%20(1).png" },
  { id: "epic-games",  name: "Epic Games",     category: "gaming",   logo: "https://static-assets-prod.epicgames.com/epic-store/static/favicon.ico" },
  { id: "battle-net",  name: "Battle.net",     category: "gaming",   logo: "https://blznav.akamaized.net/img/favicon.ico" },
  { id: "riot-client", name: "Riot Client",    category: "gaming",   logo: "https://lolstatic-a.akamaihd.net/frontpage/apps/prod/rg-account-settings/en-us/favicon.ico" },
  { id: "ea-app",      name: "EA App",         category: "gaming",   logo: "https://www.ea.com/assets/images/favicon.png" },
  // Browsers
  { id: "brave",       name: "Brave",          category: "browsers", logo: "https://brave.com/static-assets/images/brave-logo-sans-text.svg" },
  { id: "firefox",     name: "Firefox",        category: "browsers", logo: "https://www.mozilla.org/media/img/favicons/firefox/browser/favicon-196x196.59e3822720be.png" },
  { id: "chrome",      name: "Chrome",         category: "browsers", logo: "https://www.google.com/chrome/static/images/favicons/favicon-32x32.png" },
  // Media
  { id: "obs-studio",  name: "OBS Studio",     category: "media",    logo: "https://obsproject.com/favicon-32x32.png" },
  { id: "spotify",     name: "Spotify",        category: "media",    logo: "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png" },
  { id: "vlc",         name: "VLC",            category: "media",    logo: "https://www.videolan.org/images/goodies/thumbnails/vlc-icon-160.png" },
  // Utilities
  { id: "7zip",        name: "7-Zip",          category: "tools",    logo: "https://www.7-zip.org/7ziplogo.png" },
  { id: "notepadpp",   name: "Notepad++",      category: "tools",    logo: "https://notepad-plus-plus.org/images/logo.svg" },
  { id: "sharex",      name: "ShareX",         category: "tools",    logo: "https://getsharex.com/favicon.ico" },
  // Monitoring
  { id: "hwinfo64",    name: "HWiNFO64",       category: "monitor",  logo: "https://www.hwinfo.com/favicon.ico" },
  // Dev
  { id: "vscode",      name: "VS Code",        category: "dev",      logo: "https://code.visualstudio.com/favicon.ico" },
];

const TABS = [
  { id: "all",      label: "All" },
  { id: "gaming",   label: "Gaming" },
  { id: "browsers", label: "Browsers" },
  { id: "media",    label: "Media" },
  { id: "tools",    label: "Tools" },
];

// Fallback initial for broken images

function AppIcon({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] overflow-hidden">
      {!failed ? (
        <img
          src={src}
          alt={name}
          className="h-5 w-5 object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[11px] font-bold text-ink-tertiary">{name.charAt(0)}</span>
      )}
    </div>
  );
}

// Component

export function AppHubStep() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["brave", "7zip", "discord", "steam"]));
  const [tab, setTab] = useState("all");

  const filtered = tab === "all" ? APPS : APPS.filter(a => a.category === tab);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col px-6 py-5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">App Hub</h1>
        <span className="text-[11px] font-medium text-ink-secondary">
          {selected.size} selected
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === t.id
                ? "bg-white/[0.08] text-ink"
                : "text-ink-tertiary hover:text-ink-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="grid grid-cols-3 gap-1.5 flex-1 content-start"
        >
          {filtered.map(app => {
            const on = selected.has(app.id);
            return (
              <button
                key={app.id}
                onClick={() => toggle(app.id)}
                className={`relative flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${
                  on
                    ? "border-brand-500/30 bg-brand-500/[0.05]"
                    : "border-white/[0.05] bg-transparent hover:bg-white/[0.03]"
                }`}
              >
                <AppIcon src={app.logo} name={app.name} />
                <span className={`text-xs font-medium truncate ${on ? "text-ink" : "text-ink-secondary"}`}>
                  {app.name}
                </span>
                {on && (
                  <div className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500">
                    <Check className="h-2 w-2 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
