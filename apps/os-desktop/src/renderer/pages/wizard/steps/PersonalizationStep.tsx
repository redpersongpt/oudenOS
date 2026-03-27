// ─── Personalization Step ─────────────────────────────────────────────────────
// Premium visual personalization: theme toggles with live desktop preview mockup.
// Compact — fits 900×600 without scrolling.

import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { PersonalizationPreferences } from "@/stores/wizard-store";

// ─── Toggle card ──────────────────────────────────────────────────────────────

interface ToggleCardProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function ToggleCard({ label, description, checked, disabled = false, onChange }: ToggleCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500/50",
        disabled
          ? "cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-40"
          : checked
          ? "border-brand-500/25 bg-brand-500/[0.06] hover:bg-brand-500/[0.09]"
          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink">{label}</span>
        {/* Toggle pill */}
        <span
          aria-hidden="true"
          className={[
            "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
            disabled
              ? "bg-ink-muted"
              : checked
              ? "bg-brand-500"
              : "bg-ink-muted",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform",
              checked ? "translate-x-3.5" : "translate-x-0.5",
            ].join(" ")}
          />
        </span>
      </div>
      <p className="text-[10px] leading-snug text-ink-tertiary">{description}</p>
    </button>
  );
}

// ─── Desktop preview mockup ───────────────────────────────────────────────────

interface PreviewProps {
  prefs: PersonalizationPreferences;
}

function DesktopPreview({ prefs }: PreviewProps) {
  const wallpaperBg = prefs.darkMode
    ? "linear-gradient(135deg, #0d0d14 0%, #111120 40%, #0a0a10 100%)"
    : "linear-gradient(135deg, #1e1e2e 0%, #252538 40%, #1a1a2a 100%)";

  const accentColor = prefs.brandAccent ? "#E8254B" : "#4b4b5a";
  const taskbarDotCount = prefs.taskbarCleanup ? 3 : 7;

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-card"
      style={{
        width: 500,
        height: 280,
        background: wallpaperBg,
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Accent bar at top */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] transition-colors duration-300"
        style={{ background: accentColor }}
      />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,0.5) 24px,rgba(255,255,255,0.5) 25px)," +
            "repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,0.5) 24px,rgba(255,255,255,0.5) 25px)",
        }}
      />

      {/* Transparency shimmer overlay (visible when transparency on) */}
      {prefs.transparency && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 70% 30%, rgba(255,255,255,0.025) 0%, transparent 100%)",
          }}
        />
      )}

      {/* Centered redcore wordmark watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span
          className="font-sans text-[13px] font-semibold tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.04)", letterSpacing: "0.3em" }}
        >
          redcore
        </span>
      </div>

      {/* Simulated window chrome */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ marginTop: -16 }}
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{
            width: 220,
            border: "1px solid rgba(255,255,255,0.09)",
            background: prefs.transparency
              ? "rgba(16,16,22,0.72)"
              : "rgba(16,16,22,0.95)",
            backdropFilter: prefs.transparency ? "blur(12px)" : undefined,
          }}
        >
          {/* Window titlebar */}
          <div
            className="flex items-center gap-1.5 px-3"
            style={{
              height: 28,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: prefs.transparency
                ? "rgba(20,20,28,0.6)"
                : "rgba(20,20,28,0.95)",
            }}
          >
            <div className="h-2 w-2 rounded-full" style={{ background: accentColor, opacity: 0.9 }} />
            <div className="h-2 w-2 rounded-full bg-ink-muted" />
            <div className="h-2 w-2 rounded-full bg-ink-muted" />
            <div
              className="ml-2 rounded"
              style={{
                height: 6,
                width: 64,
                background: "rgba(255,255,255,0.07)",
              }}
            />
          </div>
          {/* Window body */}
          <div className="p-3 flex flex-col gap-2">
            {[80, 56, 68].map((w, i) => (
              <div
                key={i}
                className="rounded"
                style={{
                  height: 5,
                  width: `${w}%`,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Taskbar */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-4"
        style={{
          height: 36,
          background: prefs.transparency
            ? "rgba(8,8,12,0.7)"
            : "rgba(8,8,12,0.96)",
          backdropFilter: prefs.transparency ? "blur(20px)" : undefined,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Start button */}
        <div
          className="flex h-5 w-5 items-center justify-center rounded-sm"
          style={{ background: accentColor, opacity: 0.85 }}
        >
          <div className="grid grid-cols-2 gap-[1.5px]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[3px] w-[3px] rounded-[0.5px] bg-white/80" />
            ))}
          </div>
        </div>

        {/* Task dots (pinned apps) */}
        <div className="flex items-center gap-1.5 ml-1">
          {Array.from({ length: taskbarDotCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{
                width: 18,
                height: 18,
                background: i === 0
                  ? `rgba(232,69,60,${prefs.brandAccent ? 0.35 : 0.12})`
                  : "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
          ))}
        </div>

        {/* Clock stub — right side */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="rounded"
            style={{ width: 28, height: 5, background: "rgba(255,255,255,0.07)" }}
          />
          <div
            className="rounded"
            style={{ width: 20, height: 5, background: "rgba(255,255,255,0.05)" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Profile note ─────────────────────────────────────────────────────────────

function ProfileNote({ isWorkPc, isLowSpec }: { isWorkPc: boolean; isLowSpec: boolean }) {
  if (isWorkPc) {
    return (
      <p className="text-center text-[11px] leading-snug text-ink-tertiary">
        Work PC mode: taskbar and explorer changes are disabled to preserve your familiar workspace.
      </p>
    );
  }
  if (isLowSpec) {
    return (
      <p className="text-center text-[11px] leading-snug text-ink-tertiary">
        Low-spec mode: transparency disabled to reduce GPU load.
      </p>
    );
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PersonalizationStep() {
  const { personalization, setPersonalization, detectedProfile, goNext } = useWizardStore();
  const profileId = detectedProfile?.id;

  const isWorkPc   = detectedProfile?.isWorkPc ?? false;
  const isLowSpec  = profileId === "low_spec_system" || profileId === "low_spec";

  const toggle = (key: keyof typeof personalization) =>
    setPersonalization({ [key]: !personalization[key] });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.04 }}
        className="flex flex-col items-center gap-1 text-center"
      >
        <h2 className="text-lg font-semibold tracking-tight text-ink">
          Visual Personalization
        </h2>
        <p className="text-xs text-ink-secondary">Make Windows feel like yours</p>
      </motion.div>

      {/* Preview card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.09 }}
      >
        <DesktopPreview prefs={personalization} />
      </motion.div>

      {/* Toggles — row of 3 then row of 2 */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0], delay: 0.15 }}
        className="w-full max-w-[500px] space-y-2"
      >
        <div className="grid grid-cols-3 gap-2">
          <ToggleCard
            label="Dark Mode"
            description="Dark theme for apps and system"
            checked={personalization.darkMode}
            onChange={() => toggle("darkMode")}
          />
          <ToggleCard
            label="Brand Accent"
            description="redcore red accent color"
            checked={personalization.brandAccent}
            onChange={() => toggle("brandAccent")}
          />
          <ToggleCard
            label="Transparency"
            description="Window transparency effects"
            checked={personalization.transparency}
            disabled={isLowSpec}
            onChange={() => toggle("transparency")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToggleCard
            label="Taskbar Cleanup"
            description="Hide Task View, Widgets, Chat"
            checked={personalization.taskbarCleanup}
            disabled={isWorkPc}
            onChange={() => toggle("taskbarCleanup")}
          />
          <ToggleCard
            label="Explorer Cleanup"
            description="Show extensions, hide recents"
            checked={personalization.explorerCleanup}
            disabled={isWorkPc}
            onChange={() => toggle("explorerCleanup")}
          />
        </div>
      </motion.div>

      {/* Profile note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-[500px]"
      >
        <ProfileNote isWorkPc={isWorkPc} isLowSpec={isLowSpec} />
      </motion.div>
    </motion.div>
  );
}
