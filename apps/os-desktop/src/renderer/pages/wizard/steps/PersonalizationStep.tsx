// Personalization Step — theme toggles with live preview

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { PersonalizationPreferences } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// Toggle row with scale-pulse feedback

function ToggleRow({ label, desc, checked, disabled = false, onChange }: {
  label: string; desc: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  const [pulse, setPulse] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
    setPulse(true);
    setTimeout(() => setPulse(false), 200);
  };

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={{ duration: 0.18, ease: ND_EASE }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className={`flex items-center justify-between w-full px-4 py-3 border-b border-[var(--border)] text-left transition-colors duration-200 ${
          disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-white/[0.03]"
        }`}
      >
        <div>
          <span className="text-[12px] font-medium text-[var(--text-primary)]">{label}</span>
          <p className="text-[10px] text-[var(--text-disabled)] mt-0.5">{desc}</p>
        </div>
        {/* Toggle switch pill */}
        <div
          className="w-8 h-4 rounded-full relative shrink-0 transition-colors duration-200"
          style={{ background: checked ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)" }}
        >
          <div
            className="absolute top-0.5 h-3 w-3 rounded-full transition-all duration-200"
            style={{
              left: checked ? "calc(100% - 14px)" : "2px",
              background: checked ? "var(--text-display)" : "var(--text-disabled)",
            }}
          />
        </div>
      </button>
    </motion.div>
  );
}

// Windows 11 faithful desktop preview

function DesktopPreview({ prefs }: { prefs: PersonalizationPreferences }) {
  const accent = prefs.brandAccent ? "#E8E8E8" : "#888";

  // Desktop background
  const desktopBg = prefs.wallpaper
    ? "radial-gradient(ellipse at 30% 60%, rgba(60,40,120,0.5) 0%, transparent 50%), radial-gradient(ellipse at 70% 40%, rgba(30,60,140,0.4) 0%, transparent 50%), linear-gradient(180deg, #0a0a1e 0%, #151530 50%, #0a0a1e 100%)"
    : "#1a1a2e";

  // Window colors based on dark mode
  const winTitleBg = prefs.darkMode ? "#2d2d2d" : "#f3f3f3";
  const winContentBg = prefs.darkMode ? "#2d2d2d" : "#f3f3f3";
  const winText = prefs.darkMode ? "#ffffff" : "#1a1a1a";
  const winSubtext = prefs.darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
  const winBorder = prefs.darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
  const toggleTrack = prefs.darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const toggleActive = prefs.brandAccent ? accent : (prefs.darkMode ? "#666" : "#999");

  // Transparency
  const winOpacity = prefs.transparency ? 0.85 : 1;
  const winBlur = prefs.transparency ? "blur(12px)" : "none";

  // Taskbar
  const taskbarBg = prefs.darkMode ? "#1c1c1c" : "#f0f0f0";
  const taskbarText = prefs.darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const taskbarIcon = prefs.darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
  const taskbarIconActive = prefs.brandAccent ? accent : (prefs.darkMode ? "#555" : "#bbb");

  const taskbarIconCount = prefs.taskbarCleanup ? 3 : 5;

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[var(--border)]"
      style={{ width: 480, height: 280, transition: "all 300ms ease" }}
    >
      {/* Desktop background */}
      <div
        className="absolute inset-0"
        style={{ background: desktopBg, transition: "background 300ms ease" }}
      />

      {/* Desktop icons */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        {/* Recycle Bin icon */}
        <div className="flex flex-col items-center gap-0.5">
          <div
            className="w-5 h-5 rounded-[3px]"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <span
            className="text-[6px] leading-none select-none"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Recycle Bin
          </span>
        </div>
        {/* Another icon with .exe hint when explorer cleanup is on */}
        {prefs.explorerCleanup && (
          <div className="flex flex-col items-center gap-0.5">
            <div
              className="w-5 h-5 rounded-[3px]"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
            <span
              className="text-[6px] leading-none select-none"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              App.exe
            </span>
          </div>
        )}
      </div>

      {/* Settings window — centered */}
      <div
        className="absolute rounded-lg overflow-hidden"
        style={{
          width: 280,
          height: 160,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -55%)",
          border: `1px solid ${winBorder}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          transition: "all 300ms ease",
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center justify-between px-3"
          style={{
            height: 28,
            background: winTitleBg,
            opacity: winOpacity,
            backdropFilter: winBlur,
            borderBottom: `1px solid ${winBorder}`,
            transition: "all 300ms ease",
          }}
        >
          <span
            className="select-none"
            style={{ fontSize: 10, color: winText, transition: "color 300ms ease" }}
          >
            Settings
          </span>
          {/* Window controls */}
          <div className="flex items-center gap-[6px]">
            <div style={{ width: 8, height: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 8, height: 1, background: winSubtext, transition: "background 300ms ease" }} />
            </div>
            <div style={{ width: 8, height: 8, border: `1px solid ${winSubtext}`, transition: "border-color 300ms ease" }} />
            <div style={{ width: 8, height: 8, position: "relative" }}>
              <div style={{ position: "absolute", width: "100%", height: 1, top: "50%", transform: "rotate(45deg)", background: winSubtext, transition: "background 300ms ease" }} />
              <div style={{ position: "absolute", width: "100%", height: 1, top: "50%", transform: "rotate(-45deg)", background: winSubtext, transition: "background 300ms ease" }} />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          className="px-4 py-3 space-y-3"
          style={{
            background: winContentBg,
            opacity: winOpacity,
            backdropFilter: winBlur,
            height: 132,
            transition: "all 300ms ease",
          }}
        >
          {/* Setting row 1 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-1.5 w-16 rounded-full" style={{ background: winText, opacity: 0.7, transition: "background 300ms ease" }} />
              <div className="h-1 w-24 rounded-full mt-1.5" style={{ background: winSubtext, transition: "background 300ms ease" }} />
            </div>
            <div
              className="w-7 h-3.5 rounded-full relative"
              style={{ background: toggleTrack, transition: "background 300ms ease" }}
            >
              <div
                className="absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all duration-200"
                style={{ left: 12, background: toggleActive }}
              />
            </div>
          </div>
          {/* Setting row 2 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-1.5 w-20 rounded-full" style={{ background: winText, opacity: 0.7, transition: "background 300ms ease" }} />
              <div className="h-1 w-16 rounded-full mt-1.5" style={{ background: winSubtext, transition: "background 300ms ease" }} />
            </div>
            <div
              className="w-7 h-3.5 rounded-full relative"
              style={{ background: toggleTrack, transition: "background 300ms ease" }}
            >
              <div
                className="absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all duration-200"
                style={{ left: 2, background: winSubtext }}
              />
            </div>
          </div>
          {/* Setting row 3 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-1.5 w-14 rounded-full" style={{ background: winText, opacity: 0.7, transition: "background 300ms ease" }} />
              <div className="h-1 w-20 rounded-full mt-1.5" style={{ background: winSubtext, transition: "background 300ms ease" }} />
            </div>
            <div
              className="w-7 h-3.5 rounded-full relative"
              style={{ background: toggleTrack, transition: "background 300ms ease" }}
            >
              <div
                className="absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all duration-200"
                style={{ left: 12, background: toggleActive }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Taskbar */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center px-3"
        style={{
          height: 40,
          background: prefs.transparency
            ? (prefs.darkMode ? "rgba(28,28,28,0.85)" : "rgba(240,240,240,0.85)")
            : taskbarBg,
          backdropFilter: prefs.transparency ? "blur(12px)" : "none",
          borderTop: `1px solid ${winBorder}`,
          transition: "all 300ms ease",
        }}
      >
        {/* Windows logo — 4-square grid */}
        <div className="grid grid-cols-2 gap-[1.5px] shrink-0 mr-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[5px] h-[5px]"
              style={{ background: taskbarText, transition: "background 300ms ease" }}
            />
          ))}
        </div>

        {/* Center: pinned app icons */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {/* Search bar placeholder (only when not cleaned up) */}
          <AnimatePresence initial={false}>
            {!prefs.taskbarCleanup && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 60 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: ND_EASE }}
                className="h-5 rounded-full overflow-hidden"
                style={{ background: taskbarIcon, transition: "background 300ms ease" }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {Array.from({ length: taskbarIconCount }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2, ease: ND_EASE }}
              >
                <div className="flex flex-col items-center gap-[2px]">
                  <div
                    className="h-5 w-5 rounded-[4px]"
                    style={{
                      background: i === 1 ? taskbarIconActive : taskbarIcon,
                      transition: "background 300ms ease",
                    }}
                  />
                  {/* Active indicator dot */}
                  {i === 1 && (
                    <div
                      className="w-1 h-[2px] rounded-full"
                      style={{ background: taskbarIconActive, transition: "background 300ms ease" }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right: system tray */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Wifi icon placeholder */}
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: taskbarIcon, transition: "background 300ms ease" }}
          />
          {/* Battery icon placeholder */}
          <div
            className="w-4 h-2.5 rounded-[2px] border"
            style={{ borderColor: taskbarText, transition: "border-color 300ms ease" }}
          />
          {/* Clock */}
          <span
            className="select-none font-mono"
            style={{ fontSize: 9, color: taskbarText, transition: "color 300ms ease" }}
          >
            12:00
          </span>
        </div>
      </div>
    </div>
  );
}

export function PersonalizationStep() {
  const { personalization, setPersonalization, detectedProfile } = useWizardStore();
  const answers = useDecisionsStore((state) => state.answers);
  const profileId = detectedProfile?.id;
  const isWorkPc = detectedProfile?.isWorkPc ?? false;
  const isLowSpec = profileId === "low_spec_system" || profileId === "low_spec";
  const transparencyForcedOff = answers.disableTransparency === true;

  useEffect(() => {
    const resolved = resolveEffectivePersonalization(profileId, personalization, answers);
    const changed =
      resolved.darkMode !== personalization.darkMode ||
      resolved.brandAccent !== personalization.brandAccent ||
      resolved.wallpaper !== personalization.wallpaper ||
      resolved.taskbarCleanup !== personalization.taskbarCleanup ||
      resolved.explorerCleanup !== personalization.explorerCleanup ||
      resolved.transparency !== personalization.transparency;
    if (changed) setPersonalization(resolved);
  }, [answers, personalization, profileId, setPersonalization]);

  const toggle = (key: keyof typeof personalization) =>
    setPersonalization({ [key]: !personalization[key] });

  const toggles = [
    { label: "Dark mode",        desc: "Use the dark theme for Windows and apps",      key: "darkMode" as const,        disabled: false },
    { label: "Accent color",     desc: "Use the standard Ouden accent color",          key: "brandAccent" as const,     disabled: false },
    { label: "Wallpaper",        desc: "Set the default desktop wallpaper",            key: "wallpaper" as const,       disabled: false },
    { label: "Transparency",     desc: "Use transparency effects in Windows",          key: "transparency" as const,    disabled: isLowSpec || transparencyForcedOff },
    { label: "Taskbar cleanup",  desc: "Hide Task View, Widgets, and Chat",            key: "taskbarCleanup" as const,  disabled: isWorkPc },
    { label: "Explorer cleanup", desc: "Show file extensions and hide recent items",   key: "explorerCleanup" as const, disabled: isWorkPc },
  ];

  const note = isWorkPc
    ? "Some appearance changes are turned off for work systems."
    : isLowSpec
      ? "Transparency is turned off on this system."
      : transparencyForcedOff
        ? "Transparency is off because of your strategy choice."
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-full min-h-0 flex-col bg-[var(--black)] px-6 py-6 overflow-hidden"
    >
      {/* Header */}
      <div className="shrink-0 text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">Personalization</h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">Choose how Windows should look after setup.</p>
      </div>

      {/* Content: scrollable */}
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col items-center gap-5">

          {/* Preview */}
          <div className="w-full max-w-[480px]">
            <DesktopPreview prefs={personalization} />
          </div>

          {/* Toggles list */}
          <div className="w-full max-w-[480px] border border-[var(--border)] rounded-sm overflow-hidden">
            {toggles.map(({ label, desc, key, disabled }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.04, duration: 0.2, ease: ND_EASE }}
              >
                <ToggleRow
                  label={label}
                  desc={desc}
                  checked={personalization[key]}
                  disabled={disabled}
                  onChange={() => toggle(key)}
                />
              </motion.div>
            ))}
          </div>

          {/* Conditional note about disabled toggles */}
          {note && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3, ease: ND_EASE }}
              className="nd-label-sm text-[var(--text-disabled)] text-center max-w-[480px]"
            >
              {note}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
