// ─── App Setup Step ──────────────────────────────────────────────────────────
// Profile-aware app recommendations. Calls appbundle.getRecommended via IPC.
// User toggles apps on/off. Selected apps are installed during execution.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Check, AlertTriangle } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import type { RecommendedApp } from "@/stores/wizard-store";

const CATEGORY_ORDER = ["browser", "utility", "gaming", "communication", "monitoring", "development", "streaming", "media"];

function AppCard({ app, selected, onToggle }: {
  app: RecommendedApp;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
        selected
          ? "border-brand-500/30 bg-brand-500/8"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
      }`}
    >
      {/* Check indicator */}
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
        selected ? "bg-brand-500" : "border border-white/[0.15] bg-transparent"
      }`}>
        {selected && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
      </div>

      {/* App info */}
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-ink">{app.name}</p>
        <p className="text-[10px] text-ink-tertiary truncate">{app.description}</p>
      </div>

      {/* Category */}
      <span className="shrink-0 text-[10px] text-ink-tertiary">{app.category}</span>
    </button>
  );
}

export function AppSetupStep() {
  const { detectedProfile, recommendedApps, selectedAppIds, setRecommendedApps, toggleApp } = useWizardStore();
  const [loading, setLoading] = useState(recommendedApps.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recommendedApps.length > 0) return;

    const load = async () => {
      try {
        const win = window as unknown as {
          redcore: { service: { call: (m: string, p: object) => Promise<{ apps: RecommendedApp[] }> } };
        };
        const profile = detectedProfile?.id ?? "gaming_desktop";
        const result = await win.redcore.service.call("appbundle.getRecommended", { profile });
        if (result && Array.isArray(result.apps)) {
          setRecommendedApps(result.apps);
        } else if (result && !Array.isArray(result.apps)) {
          // Handle direct array response
          setRecommendedApps(result as unknown as RecommendedApp[]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load app recommendations");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [detectedProfile, recommendedApps.length, setRecommendedApps]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-ink-secondary">Loading app recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-sm text-ink-secondary">{error}</p>
        <p className="text-xs text-ink-tertiary">You can skip this step and install apps later.</p>
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
    ([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex h-full flex-col px-6 py-6 overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Recommended Software
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-secondary">
          Install essential apps for your{" "}
          <span className="font-medium text-ink">{detectedProfile?.label ?? "machine"}</span> profile.
          Toggle apps to customize your install.
        </p>
      </div>

      {/* Selection count */}
      <div className="mb-4 flex items-center gap-2">
        <Download className="h-3.5 w-3.5 text-brand-400" />
        <span className="text-[12px] font-medium text-ink-secondary">
          {selectedAppIds.length} app{selectedAppIds.length !== 1 ? "s" : ""} selected
        </span>
      </div>

      {/* App list by category */}
      <div className="space-y-4">
        {sortedCategories.map(([category, apps]) => (
          <div key={category}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
              {category}
            </p>
            <div className="space-y-1.5">
              {apps.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  selected={selectedAppIds.includes(app.id)}
                  onToggle={() => toggleApp(app.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Skip note */}
      <p className="mt-4 text-center text-[11px] text-ink-tertiary">
        You can skip app installation and set up software later.
      </p>
    </motion.div>
  );
}
