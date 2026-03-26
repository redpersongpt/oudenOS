import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  RotateCcw,
  Clock,
  ChevronRight,
  FileCode,
  Shield,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  Plus,
  X,
} from "lucide-react";
import { staggerContainer, staggerChild } from "@redcore/design-system";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { serviceCall } from "@/lib/api";
import type { RollbackSnapshot, ConfigDiffEntry } from "@redcore/shared-schema/rollback";

type RestoreStep = "idle" | "backing-up" | "reverting" | "verifying" | "done";

const restoreSteps: Array<{ step: RestoreStep; label: string }> = [
  { step: "backing-up", label: "Creating safety backup…"  },
  { step: "reverting",  label: "Reverting registry changes…" },
  { step: "verifying",  label: "Verifying system state…"  },
  { step: "done",       label: "Restore complete"         },
];

export function RollbackCenterPage() {
  const [snapshots, setSnapshots]         = useState<RollbackSnapshot[]>([]);
  const [loading, setLoading]             = useState(true);
  const [restoreStep, setRestoreStep]     = useState<RestoreStep>("idle");
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [diff, setDiff]                   = useState<ConfigDiffEntry[]>([]);
  const [diffLoading, setDiffLoading]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set());
  const [creating, setCreating]           = useState(false);

  useEffect(() => { loadSnapshots(); }, []);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const result = await serviceCall("rollback.listSnapshots", {});
      const list   = Array.isArray(result) ? result : [];
      setSnapshots(list);
      if (list.length > 0 && !selectedSnapshot) {
        handleSelectSnapshot(list[0]!.id, list);
      }
    } catch (err) {
      console.error("Failed to load snapshots:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSnapshot = async (id: string, snapshotList?: RollbackSnapshot[]) => {
    setSelectedSnapshot(id);
    setDiff([]);
    const snap = (snapshotList ?? snapshots).find((s) => s.id === id);
    if (!snap || snap.previousValues.length === 0) return;

    setDiffLoading(true);
    try {
      const diffResult = await serviceCall("rollback.getDiff", { snapshotId: id });
      setDiff(Array.isArray(diffResult?.changes) ? diffResult.changes : []);
    } catch {
      setDiff([]);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedSnapshot || restoreStep !== "idle") return;
    try {
      // Animate through restore steps
      for (const { step } of restoreSteps.slice(0, -1)) {
        setRestoreStep(step);
        await new Promise((r) => setTimeout(r, 900));
      }
      await serviceCall("rollback.restore", { snapshotId: selectedSnapshot });
      setRestoreStep("done");
      await new Promise((r) => setTimeout(r, 1200));
      await loadSnapshots();
    } catch (err) {
      console.error("Restore failed:", err);
    } finally {
      setRestoreStep("idle");
    }
  };

  const handleCreateSnapshot = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await serviceCall("rollback.createSnapshot", {
        description: "Manual snapshot",
      });
      await loadSnapshots();
    } catch (err) {
      console.error("Failed to create snapshot:", err);
    } finally {
      setCreating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const selected       = snapshots.find((s) => s.id === selectedSnapshot);
  const availableCount = snapshots.length;
  const oldest         = snapshots[snapshots.length - 1];
  const isRestoring    = restoreStep !== "idle";

  const filteredSnapshots = searchQuery.trim()
    ? snapshots.filter(
        (s) =>
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.scope.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : snapshots;

  // Scope badge color
  const scopeVariant = (scope: string): "default" | "info" | "premium" =>
    scope === "full" ? "premium" : scope === "targeted" ? "info" : "default";

  return (
    <PremiumGate feature="rollback_center">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-5"
      >
        {/* ── Header ── */}
        <motion.div variants={staggerChild}>
          <Card>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10">
                  <History className="h-5 w-5 text-brand-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-ink">Rollback Center</h2>
                  <p className="text-xs text-ink-tertiary">
                    {loading
                      ? "Loading snapshots…"
                      : snapshots.length === 0
                        ? "No snapshots yet"
                        : `${availableCount} snapshot${availableCount !== 1 ? "s" : ""} available${oldest ? ` · Oldest: ${oldest.createdAt}` : ""}`}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={
                  creating
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />
                }
                onClick={handleCreateSnapshot}
                disabled={creating}
              >
                Create Snapshot
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* ── Loading ── */}
        {loading && (
          <motion.div variants={staggerChild}>
            <Card>
              <div className="flex flex-col items-center gap-3 py-16 text-ink-tertiary">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Loading snapshots…</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Empty ── */}
        {!loading && snapshots.length === 0 && (
          <motion.div variants={staggerChild}>
            <Card>
              <div className="flex flex-col items-center gap-4 py-16 text-ink-tertiary">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-overlay border border-border">
                  <History className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink-secondary">No snapshots yet</p>
                  <p className="mt-1 text-xs text-ink-tertiary">
                    Apply tuning actions to create restore points, or create one manually.
                  </p>
                </div>
                <Button
                  size="sm"
                  icon={<Shield className="h-3.5 w-3.5" />}
                  onClick={handleCreateSnapshot}
                  disabled={creating}
                >
                  Create First Snapshot
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Main layout: timeline + detail ── */}
        {!loading && snapshots.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {/* Timeline column */}
            <motion.div variants={staggerChild} className="col-span-1">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-ink">Snapshots</h2>
                    <span className="text-[10px] text-ink-tertiary tabular-nums">{filteredSnapshots.length}</span>
                  </div>
                  {/* Search */}
                  <div className="mt-2 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-tertiary pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search snapshots…"
                      className="w-full rounded-lg border border-border bg-surface-overlay py-2 pl-8 pr-8 text-xs text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-3 w-3 text-ink-tertiary hover:text-ink-secondary" />
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[9px] top-3 bottom-3 w-px bg-white/[0.08]" />

                    <div className="space-y-1">
                      {filteredSnapshots.map((snapshot) => {
                        const isSelected = selectedSnapshot === snapshot.id;
                        const isExpanded = expandedIds.has(snapshot.id);
                        return (
                          <div key={snapshot.id}>
                            <button
                              onClick={() => {
                                handleSelectSnapshot(snapshot.id);
                                toggleExpand(snapshot.id);
                              }}
                              className={`relative flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-brand-500/10 border border-brand-500/20"
                                  : "border border-transparent hover:bg-white/[0.04]"
                              }`}
                            >
                              {/* Timeline dot */}
                              <div className="relative flex flex-col items-center pt-0.5 shrink-0">
                                <motion.div
                                  animate={{ scale: isSelected ? 1.2 : 1 }}
                                  className={`h-2.5 w-2.5 rounded-full ring-2 ring-surface ${
                                    isSelected
                                      ? "bg-brand-500"
                                      : snapshot.actionIds.length === 0
                                        ? "bg-white/20"
                                        : "bg-white/30"
                                  }`}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="truncate text-xs font-semibold text-ink leading-snug">
                                  {snapshot.description}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <Clock className="h-2.5 w-2.5 text-ink-tertiary shrink-0" />
                                  <span className="text-[10px] text-ink-tertiary truncate">
                                    {snapshot.createdAt}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  <Badge variant={scopeVariant(snapshot.scope)}>
                                    {snapshot.scope}
                                  </Badge>
                                  {snapshot.actionIds.length > 0 && (
                                    <span className="text-[10px] text-ink-tertiary">
                                      {snapshot.actionIds.length} action{snapshot.actionIds.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.15 }}
                                className="shrink-0 mt-0.5"
                              >
                                <ChevronRight className="h-3.5 w-3.5 text-ink-tertiary" />
                              </motion.div>
                            </button>

                            {/* Inline expand: action IDs */}
                            <AnimatePresence>
                              {isExpanded && snapshot.actionIds.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden ml-6 mt-0.5 mb-1"
                                >
                                  <div className="space-y-0.5 rounded-lg border border-border bg-surface-overlay p-2">
                                    {snapshot.actionIds.map((aid) => (
                                      <div
                                        key={aid}
                                        className="flex items-center gap-2 rounded px-1.5 py-1"
                                      >
                                        <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                                        <span className="truncate font-mono text-[10px] text-ink-secondary">
                                          {aid}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Detail column */}
            <motion.div variants={staggerChild} className="col-span-2">
              <AnimatePresence mode="wait">
                {/* ── Restore progress overlay ── */}
                {isRestoring ? (
                  <motion.div
                    key="restoring"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card>
                      <div className="flex flex-col items-center gap-6 py-14 px-8">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-brand-500/20"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          />
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/20">
                            <RotateCcw className="h-5 w-5 text-brand-500" />
                          </div>
                        </div>

                        <div className="w-full max-w-xs space-y-3">
                          {restoreSteps.map(({ step, label }) => {
                            const idx      = restoreSteps.findIndex((s) => s.step === restoreStep);
                            const thisIdx  = restoreSteps.findIndex((s) => s.step === step);
                            const isDone   = thisIdx < idx;
                            const isCurrent = step === restoreStep;
                            return (
                              <motion.div
                                key={step}
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: isDone || isCurrent ? 1 : 0.35 }}
                                className="flex items-center gap-3"
                              >
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                  isDone    ? "bg-green-500/15 text-green-400" :
                                  isCurrent ? "bg-brand-500/15 text-brand-400" :
                                              "bg-white/[0.06] text-ink-tertiary"
                                }`}>
                                  {isDone ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : isCurrent ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <span className="text-[10px] font-bold">{thisIdx + 1}</span>
                                  )}
                                </div>
                                <span className={`text-sm ${isCurrent ? "font-medium text-ink" : "text-ink-tertiary"}`}>
                                  {label}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                ) : selected ? (
                  <motion.div
                    key={selected.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Snapshot detail header */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-sm font-semibold text-ink">
                              {selected.description}
                            </h2>
                            <p className="mt-0.5 text-xs text-ink-tertiary">
                              {selected.createdAt} &middot; {selected.actionIds.length} changes &middot; {selected.scope} scope
                            </p>
                          </div>
                          {selected.actionIds.length > 0 && (
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<RotateCcw className="h-3.5 w-3.5" />}
                              onClick={handleRestore}
                              disabled={isRestoring}
                            >
                              Restore This Snapshot
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Diff view */}
                    {diffLoading ? (
                      <Card>
                        <div className="flex flex-col items-center gap-3 py-12 text-ink-tertiary">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <p className="text-xs">Loading diff…</p>
                        </div>
                      </Card>
                    ) : diff.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4 text-ink-tertiary" />
                            <h2 className="text-sm font-semibold text-ink">Changes Diff</h2>
                            <Badge>{diff.length} entries</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {diff.map((entry, i) => (
                              <motion.div
                                key={`${entry.path}-${entry.valueName}-${i}`}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="overflow-hidden rounded-lg border border-border"
                              >
                                {/* Entry header */}
                                <div className="flex items-center gap-2 border-b border-border bg-surface-overlay px-3 py-2">
                                  <FileCode className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />
                                  <span className="text-xs font-semibold text-ink-secondary">
                                    {entry.valueName}
                                  </span>
                                  <span className="truncate font-mono text-[10px] text-ink-tertiary flex-1">
                                    {entry.path}
                                  </span>
                                  <Badge>{entry.changeType}</Badge>
                                </div>
                                {/* Before / After */}
                                <div className="grid grid-cols-2 divide-x divide-border">
                                  <div className="px-3 py-2">
                                    <p className="mb-1 text-[10px] uppercase tracking-wider text-ink-tertiary">Before</p>
                                    <p className="rounded bg-red-500/10 px-2 py-1 font-mono text-xs text-red-400 break-all">
                                      {entry.beforeValue !== null ? String(entry.beforeValue) : "(not set)"}
                                    </p>
                                  </div>
                                  <div className="px-3 py-2">
                                    <p className="mb-1 text-[10px] uppercase tracking-wider text-ink-tertiary">After</p>
                                    <p className="rounded bg-green-500/10 px-2 py-1 font-mono text-xs text-green-400 break-all">
                                      {entry.afterValue !== null ? String(entry.afterValue) : "(not set)"}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : selected.actionIds.length > 0 ? (
                      <Card>
                        <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
                          <ArrowLeftRight className="mb-2 h-6 w-6" strokeWidth={1.5} />
                          <p className="text-sm">No diff data available for this snapshot.</p>
                        </div>
                      </Card>
                    ) : (
                      <Card>
                        <div className="flex flex-col items-center justify-center py-12 text-ink-tertiary">
                          <CheckCircle2 className="mb-2 h-8 w-8" strokeWidth={1.5} />
                          <p className="text-sm">Baseline snapshot — no changes to display.</p>
                        </div>
                      </Card>
                    )}

                    {/* Restore warning */}
                    {selected.actionIds.length > 0 && (
                      <Card>
                        <CardContent>
                          <div className="flex items-start gap-3 py-1">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                            <div>
                              <p className="text-xs font-semibold text-ink-secondary">
                                Restoring this snapshot will revert{" "}
                                {selected.actionIds.length} action
                                {selected.actionIds.length !== 1 ? "s" : ""}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-tertiary">
                                A new snapshot of the current state will be created automatically before
                                restoring. A reboot may be required for all changes to take effect.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>

                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card>
                      <div className="flex flex-col items-center justify-center py-16 text-ink-tertiary">
                        <History className="mb-2 h-8 w-8" strokeWidth={1.5} />
                        <p className="text-sm">Select a snapshot to view details.</p>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </motion.div>
    </PremiumGate>
  );
}
