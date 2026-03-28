# CODEX HANDOFF — redcore-OS Playbook-Native Wiring

**Date:** 2026-03-26
**Previous session:** Claude Opus (Hizir) — two sessions
**Workspace:** `/Users/redperson/redcoreECO`
**Mission:** Finish wiring to make redcore-OS truly playbook-native in runtime, UI, and CI.

---

## GIT STATE RIGHT NOW

**Modified:**
- `apps/os-desktop/src/renderer/pages/wizard/steps/ExecutionStep.tsx`

**Untracked:**
- `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookStrategyStep.tsx`
- `CODEXHANDOFF.md`

---

## WHAT IS DONE (verified in files)

### ExecutionStep.tsx — REWIRED ✅

Old state: Used `MOCK_ACTIONS` — 15 hardcoded label strings. Sent label text as `actionId`.

New state:
- `useMemo` builds `ExecutableAction[]` from `resolvedPlaybook.phases[].actions` where `status === "Included"`
- Sends real `action.id` to `execute.applyAction` via IPC
- Phase 2: calls `personalize.apply` after playbook actions
- Phase 3: calls `appbundle.resolve` for `selectedAppIds`
- Empty-state guard if no actions resolved
- `failCount` replaces shadowed `failed` variable

**Known issues in this file:**
- Imports `PlaybookResolvedAction` but doesn't use it directly (unused import — fix or remove)
- Passes `profile: "auto"` to `personalize.apply` — should use `detectedProfile?.id`
- `appbundle.resolve` resolves install queue but doesn't execute installs
- Treats `"partial"` status as applied

### PlaybookStrategyStep.tsx — CREATED, NOT WIRED ⚠️

Component exists with 3 strategy cards (Conservative/Balanced/Aggressive). But:
- Calls `setPlaybookPreset` which DOES NOT EXIST in wizard-store yet
- Not in `WizardStepId` type
- Not in `INITIAL_STEPS` array
- Not imported in `WizardPage.tsx`

---

## EXACT REMAINING TASKS (in order)

### Task 1: Wire PlaybookStrategyStep into store + router

**File: `apps/os-desktop/src/renderer/stores/wizard-store.ts`**

1. Add `"playbook-strategy"` to `WizardStepId` union (between `"preservation"` and `"playbook-review"`):
```typescript
export type WizardStepId =
  | "welcome"
  | "assessment"
  | "profile"
  | "preservation"
  | "playbook-strategy"   // ← ADD
  | "playbook-review"
  | "personalization"
  | "app-setup"
  | "final-review"
  | "execution"
  | "reboot-resume"       // ← ADD (Task 2)
  | "report"
  | "handoff";            // ← ADD (Task 2)
```

2. Add to `WizardState` interface:
```typescript
playbookPreset: string;
setPlaybookPreset: (preset: string) => void;
```

3. Add to `INITIAL_STEPS` after preservation:
```typescript
{ id: "playbook-strategy", label: "Strategy",  status: "locked" },
```

4. Implement in store:
```typescript
playbookPreset: "balanced",
setPlaybookPreset: (preset) => set({ playbookPreset: preset, resolvedPlaybook: null }),
// ^ clears resolvedPlaybook so PlaybookReviewStep re-fetches with new preset
```

5. Add to `reset()`: `playbookPreset: "balanced"`

**File: `apps/os-desktop/src/renderer/pages/wizard/WizardPage.tsx`**

Add import and render:
```typescript
import { PlaybookStrategyStep } from "./steps/PlaybookStrategyStep";
// in JSX:
{currentStep === "playbook-strategy" && <PlaybookStrategyStep key="playbook-strategy" />}
```

**File: `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookReviewStep.tsx`**

Line 78-82: Replace hardcoded preset with store value:
```typescript
const { detectedProfile, resolvedPlaybook, setResolvedPlaybook, playbookPreset } = useWizardStore();
// ...
const result = await win.redcore.service.call("playbook.resolve", {
  profile,
  preset: playbookPreset ?? (detectedProfile?.isWorkPc ? "conservative" : "balanced"),
});
```

### Task 2: Create RebootResumeStep + HandoffStep

**File to create: `apps/os-desktop/src/renderer/pages/wizard/steps/RebootResumeStep.tsx`**

Purpose: After execution, if any resolved actions had `requiresReboot: true`, show reboot prompt. Otherwise auto-skip.

Pattern to follow (same as PreservationStep auto-skip):
```typescript
useEffect(() => {
  if (!needsReboot) {
    const t = setTimeout(() => skipStep("reboot-resume"), 150);
    return () => clearTimeout(t);
  }
}, [needsReboot, skipStep]);
```

Determine `needsReboot` from: `resolvedPlaybook.phases[].actions.some(a => a.status === "Included" && a.requiresReboot)`

IPC methods available: `journal.state`, `journal.resume` (already in preload allowlist).

**File to create: `apps/os-desktop/src/renderer/pages/wizard/steps/HandoffStep.tsx`**

Purpose: Final step. "Your OS is optimized. Continue with redcore-Tuning for advanced tuning."

Move the Tuning CTA from ReportStep into this dedicated step. ReportStep becomes stats-only.

**Store + WizardPage updates:**
- Add `"reboot-resume"` and `"handoff"` to `WizardStepId`, `INITIAL_STEPS`
- Add imports + render in WizardPage
- Final step order (13 steps):

```
welcome → assessment → profile → preservation → playbook-strategy → playbook-review → personalization → app-setup → final-review → execution → reboot-resume → report → handoff
```

### Task 3: Deprecate transform.plan from store

**File: `apps/os-desktop/src/renderer/stores/wizard-store.ts`**

Remove:
- `TransformationPlan` interface (lines 88-93)
- `plan: TransformationPlan | null` from state (line 133)
- `setPlan` from interface and implementation
- `plan: null` from initial state and reset()

**DO NOT** remove `transform.plan` from Rust service or preload — it's still a valid IPC method for direct testing. Just remove it from UI state.

### Task 4: Update CI to prove playbook→execute chain

**File: `.github/workflows/os-windows-proof.yml`**

After existing step 11 (`playbook.resolve` test at line ~674), add:

```powershell
# ── STEP 13: PLAYBOOK → EXECUTE CHAIN PROOF ──
Write-Output "`n── STEP 13: playbook.resolve → execute.applyAction chain ──"
$pb = Send-Rpc "playbook.resolve" @{ profile = "gaming_desktop"; preset = "balanced" }
$includedActions = @()
foreach ($phase in $pb.result.phases) {
    foreach ($action in $phase.actions) {
        if ($action.status -eq "Included" -and $includedActions.Count -lt 3) {
            $includedActions += $action.id
        }
    }
}
Write-Output "  Resolved $($pb.result.totalIncluded) included actions"
Write-Output "  Testing execution of: $($includedActions -join ', ')"
$chainPass = $true
foreach ($actionId in $includedActions) {
    $r = Send-Rpc "execute.applyAction" @{ actionId = $actionId }
    if ($r.result.status -eq "success" -or $r.result.status -eq "partial") {
        Write-Output "  PASS: execute $actionId"
    } else {
        Write-Output "  FAIL: execute $actionId"
        $chainPass = $false
    }
}
if ($chainPass) { Write-Output "  PASS: playbook→execute chain" }
else { Write-Output "  FAIL: playbook→execute chain"; $allPassed = $false }

# ── STEP 14: appbundle.resolve PROOF ──
Write-Output "`n── STEP 14: appbundle.resolve ──"
$rec = Send-Rpc "appbundle.getRecommended" @{ profile = "gaming_desktop" }
$selectedApps = @()
foreach ($app in $rec.result.apps) {
    if ($app.recommended -and $selectedApps.Count -lt 2) {
        $selectedApps += $app.id
    }
}
$resolved = Send-Rpc "appbundle.resolve" @{ profile = "gaming_desktop"; selectedApps = $selectedApps }
if ($resolved.result) {
    Write-Output "  PASS: appbundle.resolve ($($selectedApps.Count) apps)"
} else {
    Write-Output "  FAIL: appbundle.resolve"; $allPassed = $false
}
```

### Task 5: Update mock-service.mjs

**File: `apps/os-desktop/test/mock-service.mjs`**

Add handlers for:
- `playbook.resolve` — return mock resolved playbook matching `ResolvedPlaybook` shape
- `appbundle.getRecommended` — return mock recommended apps matching `RecommendedApp[]` shape
- `appbundle.resolve` — return mock install queue

Without these, the headed UI dev flow breaks because renderer calls playbook methods that mock service doesn't handle.

### Task 6: Fix minor issues in ExecutionStep

**File: `apps/os-desktop/src/renderer/pages/wizard/steps/ExecutionStep.tsx`**

1. Remove unused `PlaybookResolvedAction` import (line 10)
2. Replace `profile: "auto"` with `detectedProfile?.id ?? "auto"` in personalize.apply call (need to add `detectedProfile` to store destructure)

---

## KEY FILE MAP

| File | Status | What to do |
|------|--------|-----------|
| `stores/wizard-store.ts` | ❌ NEEDS UPDATE | Add 3 step IDs, playbookPreset, setPlaybookPreset, remove TransformationPlan |
| `WizardPage.tsx` | ❌ NEEDS UPDATE | Import + render 3 new steps |
| `PlaybookStrategyStep.tsx` | ✅ CREATED | Wire into store (needs setPlaybookPreset to exist) |
| `PlaybookReviewStep.tsx` | ❌ NEEDS UPDATE | Use playbookPreset from store instead of hardcoding |
| `RebootResumeStep.tsx` | ❌ NOT CREATED | Auto-skip if no reboot needed, journal.state/resume |
| `HandoffStep.tsx` | ❌ NOT CREATED | Tuning CTA as dedicated step |
| `ExecutionStep.tsx` | ✅ DONE | Minor cleanup: unused import, profile:auto |
| `os-windows-proof.yml` | ❌ NEEDS UPDATE | Add playbook→execute chain + appbundle.resolve proofs |
| `test/mock-service.mjs` | ❌ NEEDS UPDATE | Add playbook.resolve, appbundle.* handlers |

---

## ARCHITECTURE REFERENCE

### IPC Methods (preload allowlist — all already registered)
```
playbook.resolve         → PlaybookReviewStep (wired)
appbundle.getRecommended → AppSetupStep (wired)
appbundle.resolve        → ExecutionStep (just wired)
execute.applyAction      → ExecutionStep (just wired — now sends real IDs)
personalize.apply        → ExecutionStep (just wired)
journal.state            → RebootResumeStep (needs wiring)
journal.resume           → RebootResumeStep (needs wiring)
verify.registryValue     → available for post-reboot verification
```

### Store Data Flow (after all wiring complete)
```
Assessment       → detectedProfile
PlaybookStrategy → playbookPreset (clears resolvedPlaybook)
PlaybookReview   → playbook.resolve(profile, preset) → resolvedPlaybook
AppSetup         → appbundle.getRecommended(profile) → recommendedApps
FinalReview      → reads all state for summary
Execution        → resolvedPlaybook.phases[].actions → execute.applyAction(id)
                 → personalize.apply
                 → appbundle.resolve(selectedApps)
RebootResume     → journal.state / journal.resume (or auto-skip)
Report           → executionResult stats
Handoff          → Tuning CTA
```

### Design Pattern for Steps
```tsx
import { motion } from "framer-motion";
import { useWizardStore } from "@/stores/wizard-store";

export function XxxStep() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}
      className="flex h-full flex-col px-6 py-6"
    >
      {/* content */}
    </motion.div>
  );
}
```

### Auto-skip Pattern (for conditional steps)
```tsx
useEffect(() => {
  if (shouldSkip) {
    const t = setTimeout(() => skipStep("step-id"), 150);
    return () => clearTimeout(t);
  }
}, [shouldSkip, skipStep]);
```

---

## HONEST STATUS

| Criteria | Status |
|----------|--------|
| UI calls playbook.resolve | ✅ PlaybookReviewStep |
| ExecutionStep reads playbook | ✅ Wired this session |
| PlaybookReview exists | ✅ Fully functional |
| AppSetup exists | ✅ Recommendation picker |
| PlaybookStrategy exists | ⚠️ Component created, NOT wired |
| RebootResume exists | ❌ Not created |
| Handoff step exists | ❌ Not created |
| CI proves playbook→execute | ❌ Still uses hardcoded IDs |
| CI proves appbundle.resolve | ❌ Not tested |
| Old path deprecated from UI | ❌ TransformationPlan still in store |
| Mock service updated | ❌ Missing playbook/appbundle handlers |

**Verdict: architecture strong, wiring ~60% complete.**

The critical bridge (ExecutionStep→playbook) is done. Store wiring, 2 new steps, CI updates, and mock service remain.
