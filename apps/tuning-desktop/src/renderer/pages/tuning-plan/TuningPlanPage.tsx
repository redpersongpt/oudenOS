import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Shield,
  Zap,
  Flame,
  Wrench,
  ChevronDown,
  Loader2,
  ScanSearch,
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Wifi,
  Monitor,
  Settings,
  RotateCcw,
  CheckSquare,
  Square,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { useDeviceStore } from "@/stores/device-store";
import { useTuningStore } from "@/stores/tuning-store";
import { serviceCall } from "@/lib/api";
import type { PlanPreset, TuningPlan, TuningPlanAction, TuningCategory, RiskLevel } from "@redcore/shared-schema/tuning";

// Preset definitions

const presets: Array<{
  id: PlanPreset;
  label: string;
  icon: React.ElementType;
  desc: string;
}> = [
  {
    id: "conservative",
    label: "Conservative",
    icon: Shield,
    desc: "Safe, minimal changes. Zero risk.",
  },
  {
    id: "balanced",
    label: "Balanced",
    icon: Sliders,
    desc: "Recommended blend of safety and performance.",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    icon: Flame,
    desc: "Maximum performance. Higher risk tolerance.",
  },
  {
    id: "custom",
    label: "Expert",
    icon: Wrench,
    desc: "Full manual control over every action.",
  },
];

// Category icon mapping

function categoryIcon(cat: TuningCategory): React.ElementType {
  switch (cat) {
    case "cpu":
    case "scheduler":
    case "gaming":
      return Cpu;
    case "memory":
      return MemoryStick;
    case "storage":
    case "drivers":
      return HardDrive;
    case "security":
    case "privacy":
      return Shield;
    case "power":
    case "thermal":
      return Zap;
    case "services":
    case "startup":
    case "debloat":
      return Server;
    case "network":
      return Wifi;
    case "display":
    case "audio":
      return Monitor;
    default:
      return Settings;
  }
}

function categoryLabel(cat: TuningCategory): string {
  const map: Record<TuningCategory, string> = {
    cpu: "CPU",
    gpu: "GPU",
    memory: "Memory",
    storage: "Storage",
    network: "Network",
    power: "Power",
    display: "Display",
    audio: "Audio",
    privacy: "Privacy",
    startup: "Startup",
    services: "Services",
    scheduler: "Scheduler",
    gaming: "Gaming",
    thermal: "Thermal",
    drivers: "Drivers",
    debloat: "Debloat",
    security: "Security",
  };
  return map[cat] ?? cat;
}

// Impact dots

function impactDots(confidence: "measured" | "estimated" | "theoretical"): number {
  if (confidence === "measured") return 5;
  if (confidence === "estimated") return 3;
  return 1;
}

interface ImpactDotsProps {
  dots: number;
}

function ImpactDots({ dots }: ImpactDotsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < dots ? "bg-brand-500" : "bg-neutral-200"
          }`}
        />
      ))}
    </div>
  );
}

// Expert mode toggle

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
    >
      <div
        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
          checked ? "bg-brand-500" : "bg-neutral-200"
        }`}
      >
        <motion.div
          layout
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 16 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-600">{label}</span>
    </button>
  );
}

// Risk category summary

function highestRisk(risks: RiskLevel[]): RiskLevel {
  const order: RiskLevel[] = ["extreme", "high", "medium", "low", "safe"];
  for (const r of order) {
    if (risks.includes(r)) return r;
  }
  return "safe";
}

// Page

export function TuningPlanPage() {
  const navigate = useNavigate();
  const profile = useDeviceStore((s) => s.profile);
  const setPlan = useTuningStore((s) => s.setPlan);

  const [selectedPreset, setSelectedPreset] = useState<PlanPreset>("balanced");
  const [plan, setLocalPlan] = useState<TuningPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expertMode, setExpertMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await serviceCall("tuning.generatePlan", {
        deviceProfileId: profile.id,
        preset: selectedPreset,
      });
      setLocalPlan(result);
      // Select all actions by default
      const allIds = new Set(result.actions.map((a) => a.action.id));
      setSelectedIds(allIds);
      // Expand all categories by default
      const allCats = new Set(result.actions.map((a) => a.action.category));
      setExpandedCategories(allCats);
    } catch (err) {
      console.error("Plan generation failed:", err);
      setGenerateError(
        err instanceof Error ? err.message : "Plan generation failed",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (!plan) return;
    // Filter to only selected actions
    const filtered: TuningPlan = {
      ...plan,
      actions: plan.actions.filter((a) => selectedIds.has(a.action.id)),
    };
    setPlan(filtered);
    navigate("/apply");
  };

  // Group actions by category
  const grouped = useMemo(() => {
    if (!plan) return new Map<TuningCategory, TuningPlanAction[]>();
    const map = new Map<TuningCategory, TuningPlanAction[]>();
    for (const planAction of plan.actions) {
      const cat = planAction.action.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(planAction);
    }
    return map;
  }, [plan]);

  const selectedCount = selectedIds.size;
  const rebootCount = plan
    ? plan.actions.filter(
        (a) => selectedIds.has(a.action.id) && a.action.requiresReboot,
      ).length
    : 0;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const toggleAction = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCategoryAll = (actions: TuningPlanAction[], _cat: TuningCategory) => {
    if (!actions) return;
    const ids = actions.map((a) => a.action.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!plan) return;
    setSelectedIds(new Set(plan.actions.map((a) => a.action.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  return (
    <PremiumGate feature="tuning_plans">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-5 pb-24"
      >
        {/* Preset selector */}
        <motion.div variants={staggerChild} className="grid grid-cols-4 gap-3">
          {presets.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            const Icon = preset.icon;
            return (
              <motion.button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`relative flex flex-col items-start gap-2.5 rounded-lg border p-4 text-left transition-all ${
                  isSelected
                    ? "border-brand-400 bg-brand-50/30 shadow-sm"
                    : "border-neutral-150 bg-white hover:bg-neutral-25 hover:border-neutral-200"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isSelected ? "bg-brand-100" : "bg-neutral-100"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isSelected ? "text-brand-600" : "text-neutral-400"}`}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      isSelected ? "text-brand-700" : "text-neutral-800"
                    }`}
                  >
                    {preset.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-neutral-400">
                    {preset.desc}
                  </p>
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="preset-indicator"
                    className="absolute inset-0 rounded-lg ring-1.5 ring-brand-400 ring-inset pointer-events-none"
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* No profile state */}
        {!profile && (
          <motion.div variants={staggerChild}>
            <Card>
              <div className="flex flex-col items-center gap-4 px-5 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50">
                  <ScanSearch
                    className="h-6 w-6 text-neutral-300"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900">
                    No device profile
                  </h2>
                  <p className="mt-1 text-xs text-neutral-400">
                    Run a hardware scan first to generate a machine-specific plan.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Generate bar */}
        {profile && (
          <motion.div variants={staggerChild}>
            <Card>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {plan
                      ? `${plan.actions.length} actions in plan`
                      : "Generate a machine-specific plan"}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {plan
                      ? `Preset: ${presets.find((p) => p.id === plan.preset)?.label ?? plan.preset} · ${plan.rebootsRequired} reboot${plan.rebootsRequired !== 1 ? "s" : ""} required`
                      : `Select a preset above, then generate your ${presets.find((p) => p.id === selectedPreset)?.label ?? selectedPreset} plan`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ToggleSwitch
                    checked={expertMode}
                    onChange={setExpertMode}
                    label="Expert mode"
                  />
                  <Button
                    variant={plan ? "secondary" : "primary"}
                    size="sm"
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Generating…
                      </>
                    ) : plan ? (
                      "Regenerate"
                    ) : (
                      "Generate Plan"
                    )}
                  </Button>
                </div>
              </div>

              {generateError && (
                <div className="mx-5 mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs text-red-600">{generateError}</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Plan category sections */}
        {plan && grouped.size > 0 && (
          <motion.div variants={staggerChild} className="space-y-3">
            {/* Batch controls */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-500">
                  {selectedCount} of {plan.actions.length} selected
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  <Square className="h-3.5 w-3.5" />
                  Deselect all
                </Button>
              </div>
            </div>

            {/* Category sections */}
            {Array.from(grouped.entries()).map(([cat, actions]) => {
              const Icon = categoryIcon(cat);
              const isExpanded = expandedCategories.has(cat);
              const catRisk = highestRisk(actions.map((a) => a.action.risk));
              const allCatSelected = actions.every((a) =>
                selectedIds.has(a.action.id),
              );
              const someCatSelected = actions.some((a) =>
                selectedIds.has(a.action.id),
              );

              return (
                <Card key={cat}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-neutral-25 rounded-lg transition-colors"
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    >
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    </motion.div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100">
                      <Icon
                        className="h-3.5 w-3.5 text-neutral-500"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-800">
                          {categoryLabel(cat)}
                        </span>
                        <span className="inline-flex h-4.5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-[10px] font-medium text-neutral-500">
                          {actions.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="risk" risk={catRisk}>
                        {catRisk}
                      </Badge>
                      {/* Select-all toggle for category */}
                      <div
                        role="checkbox"
                        aria-checked={allCatSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryAll(actions, cat);
                        }}
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors cursor-pointer ${
                          allCatSelected
                            ? "border-brand-500 bg-brand-500"
                            : someCatSelected
                              ? "border-brand-300 bg-brand-100"
                              : "border-neutral-300 bg-white"
                        }`}
                      >
                        {allCatSelected && (
                          <svg
                            className="h-3 w-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {!allCatSelected && someCatSelected && (
                          <div className="h-1.5 w-1.5 rounded-sm bg-brand-500" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Action rows */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-3 space-y-1.5">
                          <div className="h-px bg-neutral-100 mb-2" />
                          {actions.map((planAction) => {
                            const action = planAction.action;
                            const isSelected = selectedIds.has(action.id);
                            const dots = action.estimatedImpact
                              ? impactDots(action.estimatedImpact.confidence)
                              : 0;

                            return (
                              <div
                                key={action.id}
                                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-neutral-25"
                                    : "bg-white hover:bg-neutral-25"
                                }`}
                                onClick={() => toggleAction(action.id)}
                              >
                                {/* Checkbox */}
                                <div
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                                    isSelected
                                      ? "border-brand-500 bg-brand-500"
                                      : "border-neutral-300 bg-white"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg
                                      className="h-2.5 w-2.5 text-white"
                                      viewBox="0 0 12 12"
                                      fill="none"
                                    >
                                      <path
                                        d="M2 6l3 3 5-5"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </div>

                                {/* Name + desc */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-neutral-800 leading-snug">
                                    {action.name}
                                  </p>
                                  <p
                                    className={`mt-0.5 text-xs text-neutral-400 ${
                                      expertMode ? "" : "truncate"
                                    }`}
                                  >
                                    {action.description}
                                  </p>
                                  {expertMode && (
                                    <div className="mt-2 space-y-1.5">
                                      <p className="text-[11px] text-neutral-500 italic leading-relaxed">
                                        {action.rationale}
                                      </p>
                                      {action.sideEffects.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {action.sideEffects.map((se) => (
                                            <span
                                              key={se}
                                              className="rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] text-amber-700"
                                            >
                                              {se}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Metadata cluster */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {action.estimatedImpact && (
                                    <ImpactDots dots={dots} />
                                  )}
                                  {action.requiresReboot && (
                                    <RotateCcw
                                      className="h-3.5 w-3.5 text-amber-400"
                                      strokeWidth={2}
                                    />
                                  )}
                                  {action.tier === "premium" && (
                                    <Badge variant="premium">Pro</Badge>
                                  )}
                                  <Badge variant="risk" risk={action.risk}>
                                    {action.risk}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Sticky summary bar */}
      <AnimatePresence>
        {plan && (
          <motion.div
            key="summary-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-56 right-0 z-40 border-t border-neutral-150 bg-white/95 backdrop-blur-sm px-6 py-3 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-neutral-700">
                  <span className="font-mono font-bold text-neutral-900">
                    {selectedCount}
                  </span>{" "}
                  action{selectedCount !== 1 ? "s" : ""} selected
                </span>
                {rebootCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>
                      {rebootCount} reboot{rebootCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {plan.estimatedTotalRisk && (
                  <Badge variant="risk" risk={plan.estimatedTotalRisk}>
                    Risk: {plan.estimatedTotalRisk}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLocalPlan(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApply}
                  disabled={selectedCount === 0}
                  icon={<Zap className="h-3.5 w-3.5" />}
                >
                  Apply {selectedCount} Action{selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumGate>
  );
}
