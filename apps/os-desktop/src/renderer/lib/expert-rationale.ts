// Expert Rationale — visible product intelligence
// Maps action IDs to human-readable "why" explanations.
// Used by PlaybookReview, Execution, and Report steps.

import rationaleTr from "@/i18n/rationale-tr.json";

type RationaleLang = "en" | "tr";
const TR = rationaleTr as {
  actions: Record<string, { why?: string; profileWarning?: Record<string, string>; antiCheatNote?: string }>;
  phases: Record<string, string>;
};

interface ActionRationale {
  why: string;
  profileNote?: Record<string, string>;
  antiCheatNote?: string;
  // Inline Turkish for entries rewritten in v1.1; takes precedence over
  // i18n/rationale-tr.json (which may still hold the older wording).
  tr?: { why?: string; antiCheatNote?: string };
}

const RATIONALE: Record<string, ActionRationale> = {
  // Privacy
  "privacy.disable-telemetry": { why: "Windows quietly narrates what you do back to Microsoft. This turns the volume down to the minimum your edition allows." ,
    tr: { why: "Windows yaptıklarını sessizce Microsoft'a anlatır. Bu, sesi sürümünün izin verdiği en düşük seviyeye indirir." } },
  "privacy.disable-recall": { why: "Windows was screenshotting everything on your screen so AI could 'remember' it. Hard pass." },
  "privacy.disable-advertising-id": { why: "Kills the ad ID apps use to profile you. Wild that you had to opt out of this." },
  "privacy.disable-click-to-do": { why: "Removes the AI overlay that reads your screen and 'suggests' things nobody asked for." },
  "privacy.disable-ai-svc-autostart": { why: "Turns off the Windows AI background service on builds that have it.",
    tr: { why: "Bulunan sürümlerde Windows yapay zekâ arka plan servisini kapatır." } },
  "privacy.disable-edge-ai": { why: "Stops Edge from shipping your browsing history off to cloud AI." },
  "privacy.disable-paint-ai": { why: "Paint does not need the cloud to draw a circle. Disconnected." },
  "privacy.disable-notepad-ai": { why: "Notepad is for notes — not for phoning the cloud about them." },
  "privacy.disable-location": {
    why: "Stops Windows and apps from following you around the map.",
    profileNote: { work_pc: "May affect VPN geo-detection on managed networks." },
  },
  "privacy.disable-input-personalization": { why: "Stops Windows from studying how you type." },
  "privacy.disable-online-speech": { why: "Your voice stays on your machine instead of Microsoft's servers." },
  "privacy.disable-find-my-device": { why: "Stops your PC from reporting its location for Find My Device." ,
    tr: { why: "PC'nin Cihazımı Bul için konum bildirmesini durdurur." } },
  "privacy.disable-smartscreen": {
    why: "SmartScreen runs every download past Microsoft before it opens. Turning it off removes that check — and the download protection that comes with it. No gaming impact.",
    profileNote: { work_pc: "Not recommended — provides protection against malicious downloads." },
    tr: { why: "SmartScreen her indirmeyi açılmadan önce Microsoft'tan geçirir. Kapatmak bu denetimi — ve getirdiği indirme korumasını — kaldırır. Oyun performansına etkisi yoktur." },
  },
  "privacy.disable-wpbt": { why: "Stops the motherboard from slipping vendor software (like Armoury Crate) into Windows on its own.",
    tr: { why: "Anakartın üretici yazılımlarını (Armoury Crate gibi) kendiliğinden Windows'a sokmasını durdurur." } },

  // Shell
  "shell.disable-copilot": { why: "Turns off the built-in Copilot sidebar on older Windows 11 builds." ,
    tr: { why: "Eski Windows 11 sürümlerinde yerleşik Copilot kenar çubuğunu kapatır." } },
  "appx.remove-copilot-app": { why: "Removes the Copilot app — the only thing that actually works on 24H2.",
    tr: { why: "Copilot uygulamasını kaldırır — 24H2'de gerçekten işe yarayan tek yol bu." } },
  "shell.show-file-extensions": { why: "Shows real file types (.exe, .pdf) in Explorer — so 'invoice.pdf.exe' can't hide from you." },
  "shell.enable-end-task": { why: "Adds 'End task' to the taskbar right-click, so you can kill a frozen app without opening Task Manager." },
  "shell.remove-cast-to-device": { why: "Removes the Cast to Device entry nobody's clicked since 2017." },
  "shell.remove-troubleshoot-compatibility": { why: "Clears the compatibility-troubleshooter clutter out of your right-click menu." },
  "shell.remove-edit-with-paint3d": { why: "Hides the Paint 3D leftover on builds that still ship it." ,
    tr: { why: "Hâlâ içeren sürümlerde Paint 3D kalıntısını gizler." } },
  "shell.hide-task-view": { why: "Removes the Task View button. Win+Tab still does the same thing." },
  "shell.hide-widgets-button": { why: "Turns Widgets off by policy — the button goes with it, and so does the news feed it fetched.",
    tr: { why: "Pencere Öğeleri'ni ilkeyle kapatır — düğme ve getirdiği haber akışı da gider." } },
  "shell.disable-web-search": { why: "Your Start menu searches stop getting detoured through Bing." },
  "shell.disable-edge-ads": { why: "Shuts off Edge's shopping 'suggestions', new-tab ads, and promo popups." },
  "shell.hide-chat-icon": { why: "Drops the old Teams Chat icon off the taskbar on 22H2." ,
    tr: { why: "22H2'de eski Teams Sohbet simgesini görev çubuğundan kaldırır." } },
  "shell.disable-content-delivery": { why: "Stops Windows from silently installing 'suggested' apps and the welcome-tour tips." },

  // Performance — all opt-in; no FPS promises
  "perf.disable-game-dvr": { why: "Stops the background 'record what happened' buffer. Game Bar stays so Windows can still recognise your games. Measure before/after.",
    tr: { why: "Arka plandaki 'olanı kaydet' tamponunu durdurur. Windows oyunlarını tanıyabilsin diye Game Bar kalır. Öncesini ve sonrasını ölç." } },
  "perf.disable-fullscreen-optimizations": { why: "Makes games prefer exclusive fullscreen. Not a recommendation of which mode is better — try the per-game checkbox first and measure.",
    tr: { why: "Oyunların özel tam ekranı tercih etmesini sağlar. Hangi modun daha iyi olduğuna dair bir öneri değil — önce oyun başına kutuyu dene ve ölç." } },
  "perf.disable-transparency": { why: "Removes the blur and see-through effects. Cosmetic.",
    tr: { why: "Bulanıklık ve saydamlık efektlerini kaldırır. Görsel bir tercih." } },
  "perf.disable-fault-tolerant-heap": { why: "Stops Windows from silently patching around apps that keep crashing.",
    tr: { why: "Windows'un sürekli çöken uygulamaları sessizce yamalamasını durdurur." } },
  "perf.disable-sticky-keys": { why: "Stops the Shift key popup from interrupting fullscreen games." },
  "perf.svchost-split-threshold": { why: "Groups background services into fewer processes. Can upset Xbox controller services, so gaming profiles skip it.",
    tr: { why: "Arka plan servislerini daha az işlemde toplar. Xbox kumanda servislerini bozabildiği için oyun profilleri bunu atlar." } },
  "perf.disable-pointer-acceleration": { why: "1:1 desktop cursor. Most modern games use raw input anyway — this is a preference, not a boost.",
    tr: { why: "Masaüstünde 1:1 imleç. Çoğu modern oyun zaten ham giriş kullanır — bu bir tercih, performans artışı değil." } },
  "memory.disable-compression": { why: "Trades a little paging for a little CPU. Only worth trying with lots of RAM — measure it.",
    tr: { why: "Biraz sayfalamayı biraz CPU ile takas eder. Yalnızca bol RAM'de denemeye değer — ölç." } },
  "cpu.disable-core-parking": {
    why: "Keeps all cores unparked. More idle power and heat; often no measurable gain on modern CPUs (Ryzen X3D especially). Measure it.",
    profileNote: {
      office_laptop: "Not applied — increases power consumption and heat on battery.",
      gaming_laptop: "Not applied — thermal management is more critical on laptops.",
    },
    tr: { why: "Tüm çekirdekleri uyanık tutar. Daha fazla boşta güç ve ısı; modern işlemcilerde (özellikle Ryzen X3D) çoğu zaman ölçülebilir kazanç yok. Ölç." },
  },
  "cpu.aggressive-boost-mode": { why: "Boosts harder for longer on AC power. More heat; results depend on your CPU — measure it.",
    tr: { why: "Prizdeyken daha uzun ve daha agresif turbo yapar. Daha fazla ısı; sonuç işlemcine bağlı — ölç." } },
  "cpu.min-processor-state-100": { why: "Holds the clock floor at 100% without switching plans. Balanced is often as good or better on Ryzen X3D — benchmark both.",
    tr: { why: "Plan değiştirmeden saat tabanını %100'de tutar. Ryzen X3D'de Dengeli çoğu zaman eşit veya daha iyi — ikisini de ölç." } },

  // Power
  "power.disable-fast-startup": { why: "Makes your PC fully shut down instead of saving a snapshot. Prevents driver issues from stale state." },
  "power.disable-modern-standby": {
    why: "Switches sleep to classic S3 on desktops. Check that sleep still works afterwards.",
    profileNote: {
      office_laptop: "Not applied — Modern Standby is important for quick wake and background sync on laptops.",
      gaming_laptop: "Not applied — desktops only.",
    },
    tr: { why: "Masaüstlerinde uykuyu klasik S3'e geçirir. Sonrasında uykunun çalıştığını kontrol et." },
  },
  "power.disable-hibernation": { why: "Frees the hibernation file (several GB) and ensures clean shutdowns.",
    tr: { why: "Hazırda bekletme dosyasını (birkaç GB) boşaltır ve temiz kapanış sağlar." } },
  "power.disable-device-power-saving": {
    why: "Stops Windows switching devices off to save power. Desktops only; undo in Device Manager.",
    profileNote: { office_laptop: "Not applied — device power saving is important for battery life." },
    tr: { why: "Windows'un güç tasarrufu için cihazları kapatmasını durdurur. Yalnızca masaüstü; Aygıt Yöneticisi'nden geri alınır." },
  },

  // GPU
  "gpu.disable-nvidia-container": { why: "Stops NVIDIA's container services — and with them NVIDIA Control Panel and the NVIDIA App. No measured FPS gain.",
    tr: { why: "NVIDIA'nın konteyner servislerini — ve onlarla birlikte NVIDIA Denetim Masası ile NVIDIA App'i — durdurur. Ölçülmüş bir FPS kazancı yok." } },
  "gpu.disable-amd-services": { why: "Stops AMD crash reporting and the UX-program launcher. FreeSync is not touched.",
    tr: { why: "AMD çökme raporlamasını ve UX programı başlatıcısını durdurur. FreeSync'e dokunulmaz." } },
  "gpu.tdr-delay": { why: "Gives the GPU more time before Windows thinks it crashed. Prevents false 'driver stopped responding' errors." },

  // AppX / Edge
  "appx.remove-consumer-bloat": { why: "Boots Candy Crush, Solitaire and the rest of the uninvited guests off your Start menu. Less clutter — not more FPS.",
    tr: { why: "Candy Crush, Solitaire ve diğer davetsiz misafirleri Başlat menüsünden çıkarır. Daha az kalabalık — daha fazla FPS değil." } },
  "appx.remove-xbox-apps": { why: "Removes the Xbox app and its helpers. Keep them if you use Game Pass.",
    tr: { why: "Xbox uygulamasını ve yardımcılarını kaldırır. Game Pass kullanıyorsan kalsın." } },
  "appx.disable-edge-updates": { why: "Stops Edge (and WebView2) updating itself. Security updates stop too — re-enable when you can.",
    tr: { why: "Edge'in (ve WebView2'nin) kendini güncellemesini durdurur. Güvenlik güncellemeleri de durur — fırsat bulunca yeniden aç." } },
  "appx.disable-edge-preload": { why: "Edge preloads into RAM at sign-in even when you never open it. This stops the freeloading." ,
    tr: { why: "Edge, hiç açmasan bile oturum açılışında belleğe yüklenir. Bu bedavacılığı durdurur." } },
  "appx.remove-edge": {
    why: "Permanently deletes the Edge browser. WebView2 stays. Some Windows links that need a browser will stop working.",
    antiCheatNote: "Some enterprise web apps require Edge. Verify before removing.",
    tr: { why: "Edge tarayıcısını kalıcı olarak siler. WebView2 kalır. Tarayıcı gerektiren bazı Windows bağlantıları çalışmaz." },
  },

  // Services
  "services.disable-sysmain": { why: "Stops Windows preloading apps into RAM. Skipped automatically if you still have a hard drive.",
    tr: { why: "Windows'un uygulamaları belleğe önceden yüklemesini durdurur. Hâlâ HDD'n varsa otomatik atlanır." } },
  "services.disable-xbox-services": { why: "Shuts down Xbox services. Breaks Game Pass — only for PCs that never use it.",
    tr: { why: "Xbox servislerini kapatır. Game Pass'i bozar — yalnızca hiç kullanmayan PC'ler için." } },
  "services.disable-print-spooler": {
    why: "The print service has known security flaws. Safe to turn off if you don't use a printer.",
    profileNote: { work_pc: "Preserved — printing is required for business workflows." },
  },

  // Startup
  "startup.disable-background-apps": { why: "Store apps only run while open. Their background notifications stop too.",
    tr: { why: "Store uygulamaları yalnızca açıkken çalışır. Arka plan bildirimleri de durur." } },
  "startup.disable-autoplay": { why: "Stops USB drives from running programs automatically. Prevents a common way malware spreads." },
  "startup.enable-game-mode": { why: "Keeps Game Mode on — the Windows default. No measurable difference either way; not a boost.",
    tr: { why: "Oyun Modu'nu açık tutar — Windows varsayılanı. İki durumda da ölçülebilir fark yok; bir hızlandırma değil." } },

  // Security / updates
  "security.disable-delivery-optimization": { why: "Stops Windows from using your internet to upload updates to other people's PCs." },
  "security.disable-update-asap": { why: "Stops Windows from opting you into early preview updates that may be less stable." },
  "perf.disable-driver-updates-via-wu": { why: "Stops Windows Update swapping out drivers you installed yourself. You handle driver updates from now on.",
    tr: { why: "Windows Update'in kendi kurduğun sürücüleri değiştirmesini durdurur. Sürücü güncellemeleri artık sende." } },
  "perf.disable-auto-maintenance": { why: "Stops scheduled maintenance — including SSD TRIM. Run Optimize Drives yourself.",
    tr: { why: "Zamanlanmış bakımı — SSD TRIM dahil — durdurur. Sürücüleri İyileştir'i kendin çalıştır." } },
  "perf.disable-auto-sign-on": { why: "Prevents auto-login after restarts. Security improvement, no performance cost." },
  "perf.disable-store-auto-updates": { why: "Stops Microsoft Store from updating apps in the background — including security fixes.",
    tr: { why: "Microsoft Store'un uygulamaları arka planda güncellemesini — güvenlik düzeltmeleri dahil — durdurur." } },
  "privacy.powershell-telemetry-optout": { why: "Sets POWERSHELL_TELEMETRY_OPTOUT=1. PowerShell sends telemetry by default — this stops it." },
  "privacy.disable-typing-insights": { why: "Stops Windows from analyzing your typing patterns. InsightsEnabled=0." },
  "privacy.disable-msrt": { why: "Stops the monthly Malicious Software Removal Tool. One less malware cleanup pass.",
    tr: { why: "Aylık Kötü Amaçlı Yazılım Temizleme Aracı'nı durdurur. Bir kötü amaçlı yazılım temizliği eksilir." } },
  "security.disable-defender-realtime": {
    why: "Policy-level only: ignored while Tamper Protection is on. Removes real-time malware protection once it applies.",
    profileNote: { work_pc: "NEVER disable on work PCs — enterprise compliance requires active AV." },
    antiCheatNote: "Some anti-cheat systems may expect Defender to be running.",
    tr: { why: "Yalnızca ilke düzeyinde: Kurcalama Koruması açıkken yok sayılır. Uygulandığında gerçek zamanlı kötü amaçlı yazılım korumasını kaldırır.", antiCheatNote: "Bazı hile önleme sistemleri Defender'ın çalışmasını bekleyebilir." },
  },
  "security.disable-hvci": {
    why: "Turns off Memory Integrity. Weaker kernel protection; no FPS promise — measure it.",
    antiCheatNote: "Vanguard and FACEIT may require HVCI, TPM 2.0 and Secure Boot.",
    tr: { why: "Bellek Bütünlüğü'nü kapatır. Daha zayıf çekirdek koruması; FPS vaadi yok — ölç.", antiCheatNote: "Vanguard ve FACEIT; HVCI, TPM 2.0 ve Güvenli Önyükleme gerektirebilir." },
  },
  "security.disable-vbs": {
    why: "Requests VBS and Credential Guard off. Firmware-locked VBS needs SVM/IOMMU off in the BIOS instead.",
    antiCheatNote: "Vanguard and FACEIT may require HVCI/VBS, TPM 2.0 and Secure Boot.",
    tr: { why: "VBS ve Credential Guard'ın kapatılmasını ister. Donanım yazılımıyla kilitli VBS için BIOS'ta SVM/IOMMU kapatılmalı.", antiCheatNote: "Vanguard ve FACEIT; HVCI/VBS, TPM 2.0 ve Güvenli Önyükleme gerektirebilir." },
  },
  "security.disable-vulnerable-driver-blocklist": {
    why: "Lets blocked drivers load. Some low-level tuning tools (e.g. RW-Everything) need it.",
    tr: { why: "Engellenen sürücülerin yüklenmesine izin verir. Bazı düşük seviye ayar araçları (ör. RW-Everything) buna ihtiyaç duyar." },
  },
  "security.disable-cpu-mitigations": {
    why: "Disables Spectre/Meltdown mitigations. Can be SLOWER on newer CPUs, and FACEIT requires them — benchmark and revert if it doesn't help.",
    profileNote: { work_pc: "NEVER disable on systems handling sensitive data." },
    antiCheatNote: "FACEIT requires CPU mitigations to be enabled.",
    tr: { why: "Spectre/Meltdown önlemlerini kapatır. Yeni işlemcilerde daha YAVAŞ olabilir ve FACEIT bunları gerektirir — ölç, fayda yoksa geri al.", antiCheatNote: "FACEIT, CPU önlemlerinin açık olmasını gerektirir." },
  },
};

export function getActionRationale(actionId: string, profile?: string, lang: RationaleLang = "en"): { why: string; profileWarning?: string; antiCheatNote?: string } {
  const r = RATIONALE[actionId];
  if (!r) return { why: "" };
  const tr = lang === "tr" ? TR.actions[actionId] : undefined;
  const inline = lang === "tr" ? r.tr : undefined;

  return {
    why: inline?.why || tr?.why || r.why,
    profileWarning: profile ? (tr?.profileWarning?.[profile] ?? r.profileNote?.[profile]) : undefined,
    antiCheatNote: inline?.antiCheatNote ?? tr?.antiCheatNote ?? r.antiCheatNote,
  };
}

// Phase-level explanations
export const PHASE_RATIONALE: Record<string, string> = {
  cleanup: "Evicts the apps you never installed — Candy Crush, TikTok, the lot — and the background noise they drag in.",
  services: "Switches off background services your PC doesn't need. Dependencies get checked first, so nothing important breaks.",
  tasks: "Kills the scheduled tasks that phone home, check for updates, and run 'maintenance' while you're trying to use your PC.",
  privacy: "Shrinks what Microsoft knows about you: tracking, ads, AI snooping, and the data collection you never opted into.",
  performance: "Opt-in power, capture, memory and input settings. No FPS promises — measure them on your own system.",
  shell: "Declutters the taskbar, right-click menus, search, and Explorer — the desktop you actually wanted.",
  "startup-shutdown": "Background Store apps, AutoPlay and shutdown timeouts.",
  networking: "Retires an old, abusable name-resolution protocol (LLMNR).",
  security: "Tunes Windows Update and security to the risk level you're actually comfortable with.",
  personalization: "Your look: dark mode, colors, taskbar layout, transparency.",
};

export function getPhaseRationale(phaseId: string, lang: RationaleLang = "en"): string {
  if (lang === "tr") return TR.phases[phaseId] || PHASE_RATIONALE[phaseId] || "";
  return PHASE_RATIONALE[phaseId] || "";
}

// Blocked reason explanations
export function getBlockedExplanation(actionId: string, reason: string | null, profile: string): string {
  if (reason) return reason;

  if (profile === "work_pc") {
    if (actionId.includes("print")) return "Preserved — printing stack is required for business workflows.";
    if (actionId.includes("remote") || actionId.includes("rdp")) return "Preserved — remote support and RDP access are required for IT management.";
    if (actionId.includes("smb")) return "Preserved — network file sharing is required for mapped drives.";
    if (actionId.includes("edge")) return "Blocked — enterprise web apps and IT policies may depend on Edge.";
    if (actionId.includes("update")) return "Blocked — managed update policies are controlled by IT.";
    return "Blocked — may affect business-critical workflows on this Work PC.";
  }

  if (profile === "office_laptop" || profile === "gaming_laptop") {
    if (actionId.includes("core-parking") || actionId.includes("modern-standby") || actionId.includes("processor-state"))
      return "Not applied — increases power consumption and heat on battery-powered systems.";
    if (actionId.includes("pcie") || actionId.includes("aspm"))
      return "Not applied — PCIe power management is essential for battery life.";
  }

  if (profile === "vm_cautious") {
    if (actionId.includes("appx") || actionId.includes("gpu") || actionId.includes("nvidia") || actionId.includes("amd"))
      return "Blocked — hardware-specific tweaks don't apply in virtual environments.";
    return "Blocked — aggressive changes are suppressed in cautious mode.";
  }

  return "Blocked by profile safety rules.";
}
