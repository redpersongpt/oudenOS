// ─── Machine Intelligence Page ────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  staggerContainer,
  staggerChild,
  pageTransition,
} from "@redcore/design-system";
import { ARCHETYPE_META } from "@redcore/shared-schema/device-intelligence";
import type { RecommendationConfidence } from "@redcore/shared-schema/device-intelligence";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useDeviceStore } from "@/stores/device-store";
import { useIntelligenceStore } from "@/stores/intelligence-store";
import {
  HeroCard,
  SignalCard,
  ScoreBreakdown,
  RecommendationCard,
} from "./components";

// ─── Empty / CTA state ───────────────────────────────────────────────────────

function ClassifyCTA({ onClassify, loading }: { onClassify: () => void; loading: boolean }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-center justify-center gap-5 py-20"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <Brain className="h-7 w-7 text-ink-tertiary" strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-1.5 max-w-xs">
        <h2 className="text-base font-semibold text-ink">Classify Your Machine</h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Run machine intelligence to identify your system archetype and generate
          personalized tuning recommendations.
        </p>
      </div>
      <Button
        variant="primary"
        size="md"
        icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
        onClick={onClassify}
        disabled={loading}
        loading={loading}
      >
        {loading ? "Classifying…" : "Classify Now"}
      </Button>
    </motion.div>
  );
}

// ─── No scan state ───────────────────────────────────────────────────────────

function NoScanState() {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-center justify-center gap-4 py-20"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/[0.10]">
        <Brain className="h-6 w-6 text-ink-tertiary" strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-1 max-w-xs">
        <h2 className="text-sm font-semibold text-ink">Scan Required</h2>
        <p className="text-xs text-ink-secondary leading-relaxed">
          Run a hardware scan from the Dashboard before classifying your machine.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Recommendation filter state ─────────────────────────────────────────────

type ConfidenceFilter = "all" | RecommendationConfidence;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function IntelligencePage() {
  const deviceProfile = useDeviceStore((s) => s.profile);
  const { profile, isClassifying, isLoadingProfile, classify, loadProfile } =
    useIntelligenceStore();

  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [showAllRecs, setShowAllRecs] = useState(false);

  const deviceProfileId = (deviceProfile as { id?: string } | null)?.id ?? "local";

  async function handleClassify() {
    await classify(deviceProfileId);
    await loadProfile(deviceProfileId);
  }

  const classification = profile?.classification ?? null;
  const archetypeMeta = classification
    ? ARCHETYPE_META[classification.primary]
    : null;

  const quickWins = profile?.quickWins ?? [];

  const filteredRecs = useMemo(() => {
    const all = profile?.recommendations ?? [];
    const filtered =
      confidenceFilter === "all"
        ? all
        : all.filter((r) => r.confidence === confidenceFilter);
    return [...filtered].sort((a, b) => b.relevance - a.relevance);
  }, [profile, confidenceFilter]);

  const isLoading = isClassifying || isLoadingProfile;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── Page header ── */}
      <motion.div variants={staggerChild} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Machine Intelligence</h1>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Archetype classification and personalized tuning recommendations
          </p>
        </div>
        {profile && (
          <Button
            variant="secondary"
            size="sm"
            icon={isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            onClick={handleClassify}
            disabled={isLoading}
            loading={isLoading}
          >
            Re-classify
          </Button>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {!deviceProfile ? (
          <NoScanState key="no-scan" />
        ) : !profile && !isLoading ? (
          <ClassifyCTA key="cta" onClassify={handleClassify} loading={isLoading} />
        ) : isLoading && !profile ? (
          <motion.div
            key="loading"
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center justify-center gap-4 py-20"
          >
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="text-sm text-ink-secondary">
              {isClassifying ? "Classifying machine archetype…" : "Loading intelligence profile…"}
            </p>
          </motion.div>
        ) : profile && classification && archetypeMeta ? (
          <motion.div
            key="populated"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-5"
          >
            {/* ── A. Hero ── */}
            <HeroCard meta={archetypeMeta} confidence={classification.confidence} archetype={classification.primary} />

            {/* ── B. Classification Signals + C. Score Breakdown ── */}
            <div className="grid grid-cols-5 gap-4">
              {/* Signals — 3 cols */}
              <motion.div variants={staggerChild} className="col-span-3">
                <Card>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-ink">Why This Profile</h2>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      Signals that drove this classification
                    </p>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-3 gap-2.5"
                    >
                      {classification.signals.slice(0, 9).map((sig) => (
                        <SignalCard
                          key={sig.factor}
                          signal={sig}
                          archetypeMeta={archetypeMeta}
                        />
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Score Breakdown — 2 cols */}
              <motion.div variants={staggerChild} className="col-span-2">
                <Card>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-ink">Profile Scores</h2>
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      All archetype scores for this machine
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ScoreBreakdown
                      classification={classification}
                      archetypeMeta={archetypeMeta}
                      allMeta={ARCHETYPE_META}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* ── D. Quick Wins (premium-gated) ── */}
            <motion.div variants={staggerChild}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">
                        Top Improvements for This Machine
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        High-impact, archetype-specific wins
                      </p>
                    </div>
                    {quickWins.length > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-950/60 px-1.5 text-[10px] font-semibold text-brand-400 border border-brand-800">
                        {quickWins.length}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 gap-3"
                    >
                      {quickWins.slice(0, 4).map((rec) => (
                        <RecommendationCard key={rec.actionId} rec={rec} />
                      ))}
                    </motion.div>
                  </>
                </CardContent>
              </Card>
            </motion.div>

            {/* ── E. Full Recommendations (premium-gated) ── */}
            <motion.div variants={staggerChild}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">All Recommendations</h2>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        Full list sorted by relevance
                      </p>
                    </div>
                    {/* Confidence filter */}
                    <div className="flex items-center gap-1.5">
                      {(["all", "high", "medium", "caution"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setConfidenceFilter(f)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            confidenceFilter === f
                              ? "bg-surface-overlay text-ink border border-border"
                              : "text-ink-tertiary hover:text-ink-secondary"
                          }`}
                        >
                          {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="space-y-2"
                    >
                      {(showAllRecs ? filteredRecs : filteredRecs.slice(0, 8)).map(
                        (rec) => (
                          <RecommendationCard key={rec.actionId} rec={rec} compact />
                        ),
                      )}
                    </motion.div>
                    {filteredRecs.length > 8 && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={
                            showAllRecs ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          }
                          iconPosition="right"
                          onClick={() => setShowAllRecs((v) => !v)}
                        >
                          {showAllRecs
                            ? "Show less"
                            : `Show ${filteredRecs.length - 8} more`}
                        </Button>
                      </div>
                    )}
                  </>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
