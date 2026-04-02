// Personalization Step — theme toggles with live preview

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";
import type { PersonalizationPreferences } from "@/stores/wizard-store";
import { useDecisionsStore } from "@/stores/decisions-store";
import { resolveEffectivePersonalization } from "@/lib/personalization-resolution";

const ND_EASE = [0.25, 0.1, 0.25, 1] as const;

// Toggle row

function ToggleRow({ label, desc, checked, disabled = false, onChange }: {
  label: string; desc: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between w-full px-4 py-3 border-b border-[var(--border)] text-left transition-colors duration-150 ease-nd ${
        disabled ? "opacity-30 cursor-not-allowed" : checked ? "bg-[var(--surface)]" : "bg-[var(--black)] hover:bg-[var(--surface)]"
      }`}
    >
      <div>
        <span className="font-mono text-caption tracking-label text-[var(--text-primary)]">{label}</span>
        <p className="nd-label-sm text-[var(--text-disabled)] mt-0.5">{desc}</p>
      </div>
      {/* Segment toggle */}
      <div className="flex gap-0.5 shrink-0">
        <div className={`w-4 h-1 transition-colors duration-150 ease-nd ${checked ? "bg-[var(--accent)]" : "bg-nd-border"}`} />
        <div className={`w-4 h-1 transition-colors duration-150 ease-nd ${checked ? "bg-[var(--accent)]" : "bg-nd-border-subtle"}`} />
      </div>
    </button>
  );
}

// Preview

function DesktopPreview({ prefs }: { prefs: PersonalizationPreferences }) {
  const accent = prefs.brandAccent ? "#E8254B" : "#444444";

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-[var(--border)]"
      style={{ width: 480, height: 260, background: "#000000" }}
    >
      {/* Dot grid */}
      <div className="absolute inset-0 nd-dot-grid-subtle opacity-20" />

      {/* Window chrome */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ marginTop: -12 }}>
        <div
          className="overflow-hidden rounded-sm"
          style={{
            width: 200,
            border: "1px solid #222222",
            background: prefs.transparency ? "rgba(17,17,17,0.7)" : "#111111",
            backdropFilter: prefs.transparency ? "blur(12px)" : undefined,
          }}
        >
          <div className="flex items-center gap-1.5 px-3 h-7 border-b border-[var(--border)]">
            <div className="w-2 h-0.5" style={{ background: accent }} />
            <div className="h-1 w-12 bg-nd-border-subtle rounded-none ml-2" />
          </div>
          <div className="p-3 space-y-1.5">
            {[70, 50, 60].map((w, i) => (
              <div key={i} className="h-1 bg-nd-border-subtle" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Taskbar */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 h-8 border-t border-[var(--border)]"
        style={{
          background: prefs.transparency ? "rgba(0,0,0,0.7)" : "#000000",
        }}
      >
        <div className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: accent }}>
          <div className="grid grid-cols-2 gap-px">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[2px] h-[2px] bg-white/80" />
            ))}
          </div>
        </div>
        {Array.from({ length: prefs.taskbarCleanup ? 3 : 6 }).map((_, i) => (
          <div key={i} className="w-4 h-4 bg-nd-border-subtle" />
        ))}
        <div className="ml-auto flex gap-2">
          <div className="w-6 h-1 bg-nd-border-subtle" />
          <div className="w-4 h-1 bg-nd-border-subtle" />
        </div>
      </div>

      {/* Accent bar */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: accent }} />
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
      resolved.taskbarCleanup !== personalization.taskbarCleanup ||
      resolved.explorerCleanup !== personalization.explorerCleanup ||
      resolved.transparency !== personalization.transparency;
    if (changed) setPersonalization(resolved);
  }, [answers, personalization, profileId, setPersonalization]);

  const toggle = (key: keyof typeof personalization) =>
    setPersonalization({ [key]: !personalization[key] });

  const toggles = [
    { label: "DARK MODE",        desc: "DARK THEME FOR APPS AND SYSTEM",     key: "darkMode" as const,        disabled: false },
    { label: "BRAND ACCENT",     desc: "REDCORE RED ACCENT COLOR",           key: "brandAccent" as const,     disabled: false },
    { label: "TRANSPARENCY",     desc: "WINDOW TRANSPARENCY EFFECTS",        key: "transparency" as const,    disabled: isLowSpec || transparencyForcedOff },
    { label: "TASKBAR CLEANUP",  desc: "HIDE TASK VIEW, WIDGETS, CHAT",      key: "taskbarCleanup" as const,  disabled: isWorkPc },
    { label: "EXPLORER CLEANUP", desc: "SHOW EXTENSIONS, HIDE RECENTS",      key: "explorerCleanup" as const, disabled: isWorkPc },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: ND_EASE }}
      className="flex h-full flex-col items-center justify-center gap-6 px-8 bg-[var(--black)]"
    >
      <div className="text-center">
        <h2 className="font-display text-title text-[var(--text-display)]">PERSONALIZATION</h2>
        <p className="mt-2 nd-label text-[var(--text-secondary)]">VISUAL CONFIGURATION</p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: ND_EASE }}
      >
        <DesktopPreview prefs={personalization} />
      </motion.div>

      <div className="w-full max-w-[480px]">
        {toggles.map(({ label, desc, key, disabled }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.2, ease: ND_EASE }}
          >
            <ToggleRow
              label={label} desc={desc}
              checked={personalization[key]}
              disabled={disabled}
              onChange={() => toggle(key)}
            />
          </motion.div>
        ))}
      </div>

      {(isWorkPc || isLowSpec || transparencyForcedOff) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3, ease: ND_EASE }}
          className="nd-label-sm text-[var(--text-disabled)] text-center max-w-[480px]"
        >
          {isWorkPc ? "[WORK PC: TASKBAR/EXPLORER CHANGES DISABLED]" :
           isLowSpec ? "[LOW-SPEC: TRANSPARENCY DISABLED]" :
           "[STRATEGY LOCK: TRANSPARENCY DISABLED]"}
        </motion.div>
      )}
    </motion.div>
  );
}
