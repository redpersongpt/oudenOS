// ─── App Hub Catalog ─────────────────────────────────────────────────────────
// Defines the app catalog for the Download Center / App Hub feature.
// All download URLs point to official sources. Silent install args are for
// unattended deployment via the Rust executor.

export type AppCategory =
  | "gaming"
  | "streaming_media"
  | "communication"
  | "browsers"
  | "utilities"
  | "development"
  | "system_monitoring";

export interface AppCatalogItem {
  id: string;
  name: string;
  category: AppCategory;
  description: string;
  publisher: string;
  homepageUrl: string;
  downloadUrl: string;
  silentInstallArgs: string | null;
  checksumAlgo: "sha256" | "none";
  trusted: boolean;
  iconId: string;
  tags: string[];
  sizeEstimateMb: number;
}

export interface AppPresetBundle {
  id: string;
  name: string;
  description: string;
  appIds: string[];
  tags: string[];
}

// ─── App Catalog ─────────────────────────────────────────────────────────────

export const APP_CATALOG: AppCatalogItem[] = [
  // ── Gaming ──────────────────────────────────────────────────────────────────

  {
    id: "steam",
    name: "Steam",
    category: "gaming",
    description: "Valve's PC gaming platform and storefront. Required for most PC games.",
    publisher: "Valve Corporation",
    homepageUrl: "https://store.steampowered.com",
    downloadUrl: "https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "none",
    trusted: true,
    iconId: "steam",
    tags: ["gaming", "store", "essential"],
    sizeEstimateMb: 3,
  },
  {
    id: "discord",
    name: "Discord",
    category: "gaming",
    description: "Voice, video, and text chat platform popular with gaming communities.",
    publisher: "Discord Inc.",
    homepageUrl: "https://discord.com",
    downloadUrl: "https://dl.discordapp.net/distro/app/stable/win/x86/DiscordSetup.exe",
    silentInstallArgs: "-s",
    checksumAlgo: "none",
    trusted: true,
    iconId: "discord",
    tags: ["gaming", "communication", "voice-chat"],
    sizeEstimateMb: 80,
  },
  {
    id: "epic-games-launcher",
    name: "Epic Games Launcher",
    category: "gaming",
    description: "Epic Games storefront and launcher. Access free weekly games and the Unreal Engine ecosystem.",
    publisher: "Epic Games, Inc.",
    homepageUrl: "https://www.epicgames.com",
    downloadUrl: "https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncherInstaller.msi",
    silentInstallArgs: "/quiet /norestart",
    checksumAlgo: "none",
    trusted: true,
    iconId: "epic-games",
    tags: ["gaming", "store"],
    sizeEstimateMb: 35,
  },
  {
    id: "battle-net",
    name: "Battle.net",
    category: "gaming",
    description: "Blizzard Entertainment launcher for World of Warcraft, Diablo, Overwatch, and more.",
    publisher: "Blizzard Entertainment",
    homepageUrl: "https://www.blizzard.com",
    downloadUrl: "https://www.battle.net/download/getInstallerForGame?os=win&gameProgram=BATTLENET_APP&version=Live",
    silentInstallArgs: null,
    checksumAlgo: "none",
    trusted: true,
    iconId: "battle-net",
    tags: ["gaming", "store", "blizzard"],
    sizeEstimateMb: 5,
  },
  {
    id: "ea-app",
    name: "EA App",
    category: "gaming",
    description: "Electronic Arts game launcher, successor to Origin. Required for EA titles.",
    publisher: "Electronic Arts",
    homepageUrl: "https://www.ea.com",
    downloadUrl: "https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer/EAappInstaller.exe",
    silentInstallArgs: null,
    checksumAlgo: "none",
    trusted: true,
    iconId: "ea-app",
    tags: ["gaming", "store"],
    sizeEstimateMb: 2,
  },
  {
    id: "ubisoft-connect",
    name: "Ubisoft Connect",
    category: "gaming",
    description: "Ubisoft game launcher and store. Required for Ubisoft PC titles.",
    publisher: "Ubisoft",
    homepageUrl: "https://www.ubisoft.com",
    downloadUrl: "https://static3.cdn.ubi.com/orbit/launcher_installer/UbisoftConnectInstaller.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "none",
    trusted: true,
    iconId: "ubisoft-connect",
    tags: ["gaming", "store"],
    sizeEstimateMb: 100,
  },
  {
    id: "gog-galaxy",
    name: "GOG Galaxy",
    category: "gaming",
    description: "CD Projekt's DRM-free game platform and universal library manager.",
    publisher: "GOG sp. z o.o.",
    homepageUrl: "https://www.gog.com",
    downloadUrl: "https://webinstallers.gog-statics.com/download/GOG_Galaxy_Installation.exe",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "none",
    trusted: true,
    iconId: "gog-galaxy",
    tags: ["gaming", "store", "drm-free"],
    sizeEstimateMb: 120,
  },
  {
    id: "riot-client",
    name: "Riot Client",
    category: "gaming",
    description: "Riot Games launcher for League of Legends, Valorant, and other Riot titles.",
    publisher: "Riot Games",
    homepageUrl: "https://www.riotgames.com",
    downloadUrl: "https://valorant.secure.dyn.riotcdn.net/channels/public/x/installer/current/live.live.eu.exe",
    silentInstallArgs: null,
    checksumAlgo: "none",
    trusted: true,
    iconId: "riot-client",
    tags: ["gaming", "store", "riot"],
    sizeEstimateMb: 70,
  },

  // ── Streaming & Media ──────────────────────────────────────────────────────

  {
    id: "obs-studio",
    name: "OBS Studio",
    category: "streaming_media",
    description: "Open-source broadcasting and recording software. Industry standard for streaming.",
    publisher: "OBS Project",
    homepageUrl: "https://obsproject.com",
    downloadUrl: "https://github.com/obsproject/obs-studio/releases/latest/download/OBS-Studio-30.2.3-Windows-Installer.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "obs-studio",
    tags: ["streaming", "recording", "open-source"],
    sizeEstimateMb: 180,
  },
  {
    id: "spotify",
    name: "Spotify",
    category: "streaming_media",
    description: "Music streaming service with the largest library of songs, podcasts, and playlists.",
    publisher: "Spotify AB",
    homepageUrl: "https://www.spotify.com",
    downloadUrl: "https://download.scdn.co/SpotifySetup.exe",
    silentInstallArgs: "/silent",
    checksumAlgo: "none",
    trusted: true,
    iconId: "spotify",
    tags: ["music", "streaming", "media"],
    sizeEstimateMb: 120,
  },
  {
    id: "vlc",
    name: "VLC Media Player",
    category: "streaming_media",
    description: "Free, open-source multimedia player that plays virtually any media format.",
    publisher: "VideoLAN",
    homepageUrl: "https://www.videolan.org",
    downloadUrl: "https://get.videolan.org/vlc/last/win64/vlc-3.0.21-win64.exe",
    silentInstallArgs: "/S /L=1033",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "vlc",
    tags: ["media", "video", "audio", "open-source"],
    sizeEstimateMb: 45,
  },

  // ── Communication ──────────────────────────────────────────────────────────

  {
    id: "telegram",
    name: "Telegram",
    category: "communication",
    description: "Cloud-based messaging app with a focus on speed and security.",
    publisher: "Telegram FZ-LLC",
    homepageUrl: "https://telegram.org",
    downloadUrl: "https://telegram.org/dl/desktop/win64",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "none",
    trusted: true,
    iconId: "telegram",
    tags: ["messaging", "communication"],
    sizeEstimateMb: 45,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Desktop",
    category: "communication",
    description: "Desktop client for WhatsApp messaging and calling.",
    publisher: "Meta Platforms, Inc.",
    homepageUrl: "https://www.whatsapp.com",
    downloadUrl: "https://web.whatsapp.com/desktop/windows/release/x64/WhatsAppSetup.exe",
    silentInstallArgs: null,
    checksumAlgo: "none",
    trusted: true,
    iconId: "whatsapp",
    tags: ["messaging", "communication"],
    sizeEstimateMb: 150,
  },

  // ── Browsers ───────────────────────────────────────────────────────────────

  {
    id: "chrome",
    name: "Chrome",
    category: "browsers",
    description: "Google's web browser. Fast, widely compatible, and supports a vast extension ecosystem.",
    publisher: "Google LLC",
    homepageUrl: "https://www.google.com/chrome",
    downloadUrl: "https://dl.google.com/chrome/install/GoogleChromeStandaloneEnterprise64.msi",
    silentInstallArgs: "/quiet /norestart",
    checksumAlgo: "none",
    trusted: true,
    iconId: "chrome",
    tags: ["browser", "web"],
    sizeEstimateMb: 90,
  },
  {
    id: "firefox",
    name: "Firefox",
    category: "browsers",
    description: "Mozilla's open-source web browser with strong privacy features.",
    publisher: "Mozilla Foundation",
    homepageUrl: "https://www.mozilla.org",
    downloadUrl: "https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=en-US",
    silentInstallArgs: "/S",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "firefox",
    tags: ["browser", "web", "privacy", "open-source"],
    sizeEstimateMb: 60,
  },
  {
    id: "brave",
    name: "Brave",
    category: "browsers",
    description: "Privacy-focused Chromium browser with built-in ad and tracker blocking.",
    publisher: "Brave Software, Inc.",
    homepageUrl: "https://brave.com",
    downloadUrl: "https://laptop-updates.brave.com/latest/winx64",
    silentInstallArgs: "--silent --system-level",
    checksumAlgo: "none",
    trusted: true,
    iconId: "brave",
    tags: ["browser", "web", "privacy"],
    sizeEstimateMb: 100,
  },

  // ── Utilities ──────────────────────────────────────────────────────────────

  {
    id: "7zip",
    name: "7-Zip",
    category: "utilities",
    description: "Free, open-source file archiver with high compression ratio. Supports 7z, ZIP, RAR, and more.",
    publisher: "Igor Pavlov",
    homepageUrl: "https://www.7-zip.org",
    downloadUrl: "https://www.7-zip.org/a/7z2408-x64.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "7zip",
    tags: ["utility", "archive", "compression", "open-source"],
    sizeEstimateMb: 2,
  },
  {
    id: "winrar",
    name: "WinRAR",
    category: "utilities",
    description: "Powerful archive manager for RAR and ZIP files with extensive format support.",
    publisher: "win.rar GmbH",
    homepageUrl: "https://www.rarlab.com",
    downloadUrl: "https://www.rarlab.com/rar/winrar-x64-710.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "none",
    trusted: true,
    iconId: "winrar",
    tags: ["utility", "archive", "compression"],
    sizeEstimateMb: 4,
  },
  {
    id: "notepadpp",
    name: "Notepad++",
    category: "utilities",
    description: "Free source code editor and Notepad replacement with syntax highlighting.",
    publisher: "Don Ho",
    homepageUrl: "https://notepad-plus-plus.org",
    downloadUrl: "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/latest/download/npp.8.7.1.Installer.x64.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "notepadpp",
    tags: ["utility", "editor", "text", "open-source"],
    sizeEstimateMb: 5,
  },
  {
    id: "everything",
    name: "Everything",
    category: "utilities",
    description: "Instant file search engine for Windows. Indexes every file and folder by name in seconds.",
    publisher: "voidtools",
    homepageUrl: "https://www.voidtools.com",
    downloadUrl: "https://www.voidtools.com/Everything-1.4.1.1026.x64-Setup.exe",
    silentInstallArgs: "/S",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "everything",
    tags: ["utility", "search", "productivity"],
    sizeEstimateMb: 2,
  },
  {
    id: "sharex",
    name: "ShareX",
    category: "utilities",
    description: "Free and open-source screenshot and screen recording tool with annotation support.",
    publisher: "ShareX Team",
    homepageUrl: "https://getsharex.com",
    downloadUrl: "https://github.com/ShareX/ShareX/releases/latest/download/ShareX-16.1.0-setup.exe",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "sharex",
    tags: ["utility", "screenshot", "recording", "open-source"],
    sizeEstimateMb: 10,
  },
  {
    id: "revo-uninstaller",
    name: "Revo Uninstaller",
    category: "utilities",
    description: "Advanced uninstaller that removes programs and cleans leftover files, folders, and registry entries.",
    publisher: "VS Revo Group",
    homepageUrl: "https://www.revouninstaller.com",
    downloadUrl: "https://download.revouninstaller.com/download/revosetup.exe",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "none",
    trusted: true,
    iconId: "revo-uninstaller",
    tags: ["utility", "uninstaller", "cleanup"],
    sizeEstimateMb: 15,
  },
  {
    id: "qbittorrent",
    name: "qBittorrent",
    category: "utilities",
    description: "Free, open-source BitTorrent client with no ads or bundled software.",
    publisher: "The qBittorrent project",
    homepageUrl: "https://www.qbittorrent.org",
    downloadUrl: "https://sourceforge.net/projects/qbittorrent/files/latest/download",
    silentInstallArgs: "/S",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "qbittorrent",
    tags: ["utility", "torrent", "open-source"],
    sizeEstimateMb: 35,
  },

  // ── Development ────────────────────────────────────────────────────────────

  {
    id: "vscode",
    name: "Visual Studio Code",
    category: "development",
    description: "Microsoft's free, extensible source-code editor with IntelliSense, debugging, and Git integration.",
    publisher: "Microsoft Corporation",
    homepageUrl: "https://code.visualstudio.com",
    downloadUrl: "https://code.visualstudio.com/sha/download?build=stable&os=win32-x64",
    silentInstallArgs: "/VERYSILENT /NORESTART /MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,addtopath",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "vscode",
    tags: ["development", "editor", "ide"],
    sizeEstimateMb: 100,
  },

  // ── System Monitoring ──────────────────────────────────────────────────────

  {
    id: "msi-afterburner",
    name: "MSI Afterburner",
    category: "system_monitoring",
    description: "GPU overclocking utility with real-time hardware monitoring and on-screen display (RTSS).",
    publisher: "MSI / Guru3D",
    homepageUrl: "https://www.msi.com",
    downloadUrl: "https://download.msi.com/uti_exe/vga/MSIAfterburnerSetup.zip",
    silentInstallArgs: "/S",
    checksumAlgo: "none",
    trusted: true,
    iconId: "msi-afterburner",
    tags: ["monitoring", "gpu", "overclock", "osd"],
    sizeEstimateMb: 55,
  },
  {
    id: "hwinfo64",
    name: "HWiNFO64",
    category: "system_monitoring",
    description: "Comprehensive hardware analysis, monitoring, and reporting tool for Windows.",
    publisher: "Martin Malik (REALiX)",
    homepageUrl: "https://www.hwinfo.com",
    downloadUrl: "https://www.hwinfo.com/files/hwi_812.exe",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "hwinfo64",
    tags: ["monitoring", "hardware", "sensors", "diagnostics"],
    sizeEstimateMb: 10,
  },
  {
    id: "cpuz",
    name: "CPU-Z",
    category: "system_monitoring",
    description: "Lightweight CPU information utility showing processor, cache, mainboard, and memory details.",
    publisher: "CPUID",
    homepageUrl: "https://www.cpuid.com",
    downloadUrl: "https://download.cpuid.com/cpu-z/cpu-z_2.12-en.exe",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "cpuz",
    tags: ["monitoring", "cpu", "diagnostics"],
    sizeEstimateMb: 3,
  },
  {
    id: "gpuz",
    name: "GPU-Z",
    category: "system_monitoring",
    description: "Lightweight GPU information utility showing graphics card details, clock speeds, and sensor data.",
    publisher: "TechPowerUp",
    homepageUrl: "https://www.techpowerup.com",
    downloadUrl: "https://www.techpowerup.com/download/techpowerup-gpu-z/",
    silentInstallArgs: null,
    checksumAlgo: "none",
    trusted: true,
    iconId: "gpuz",
    tags: ["monitoring", "gpu", "diagnostics"],
    sizeEstimateMb: 10,
  },
  {
    id: "crystaldiskinfo",
    name: "CrystalDiskInfo",
    category: "system_monitoring",
    description: "Disk health monitoring utility that reads S.M.A.R.T. data from HDDs and SSDs.",
    publisher: "Crystal Dew World",
    homepageUrl: "https://crystalmark.info",
    downloadUrl: "https://sourceforge.net/projects/crystaldiskinfo/files/latest/download",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "crystaldiskinfo",
    tags: ["monitoring", "disk", "health", "smart"],
    sizeEstimateMb: 6,
  },
  {
    id: "crystaldiskmark",
    name: "CrystalDiskMark",
    category: "system_monitoring",
    description: "Disk benchmark utility measuring sequential and random read/write performance.",
    publisher: "Crystal Dew World",
    homepageUrl: "https://crystalmark.info",
    downloadUrl: "https://sourceforge.net/projects/crystaldiskmark/files/latest/download",
    silentInstallArgs: "/VERYSILENT /NORESTART",
    checksumAlgo: "sha256",
    trusted: true,
    iconId: "crystaldiskmark",
    tags: ["monitoring", "disk", "benchmark"],
    sizeEstimateMb: 5,
  },
];

// ─── Preset Bundles ──────────────────────────────────────────────────────────

export const APP_PRESET_BUNDLES: AppPresetBundle[] = [
  {
    id: "fresh-gaming-setup",
    name: "Fresh Gaming Setup",
    description: "Essential apps for a new gaming PC: launcher, comms, browser, and core utilities.",
    appIds: ["steam", "discord", "brave", "7zip", "everything", "hwinfo64"],
    tags: ["gaming", "starter"],
  },
  {
    id: "competitive-fps-setup",
    name: "Competitive FPS Setup",
    description: "Optimized for competitive shooters: game launcher, comms, monitoring, and minimal browser.",
    appIds: ["steam", "discord", "brave", "msi-afterburner", "hwinfo64", "everything"],
    tags: ["gaming", "competitive", "fps"],
  },
  {
    id: "creator-setup",
    name: "Creator Setup",
    description: "Streaming, recording, and content creation essentials.",
    appIds: ["obs-studio", "discord", "vscode", "7zip", "vlc", "sharex"],
    tags: ["creator", "streaming", "recording"],
  },
  {
    id: "essential-utilities",
    name: "Essential Utilities",
    description: "Must-have utilities for any Windows PC: archiver, search, editor, media, and screenshots.",
    appIds: ["7zip", "everything", "notepadpp", "vlc", "sharex", "brave"],
    tags: ["utilities", "essentials"],
  },
  {
    id: "monitoring-toolkit",
    name: "Monitoring Toolkit",
    description: "Complete hardware monitoring suite: CPU, GPU, disk, and temperature sensors.",
    appIds: ["hwinfo64", "cpuz", "gpuz", "crystaldiskinfo", "crystaldiskmark", "msi-afterburner"],
    tags: ["monitoring", "diagnostics", "hardware"],
  },
];

// ─── Helper Maps ─────────────────────────────────────────────────────────────

export const APP_CATALOG_BY_ID: ReadonlyMap<string, AppCatalogItem> = new Map(
  APP_CATALOG.map((app) => [app.id, app]),
);

export const APP_CATALOG_BY_CATEGORY: ReadonlyMap<AppCategory, AppCatalogItem[]> = (() => {
  const map = new Map<AppCategory, AppCatalogItem[]>();
  for (const app of APP_CATALOG) {
    const list = map.get(app.category) ?? [];
    list.push(app);
    map.set(app.category, list);
  }
  return map;
})();
