# Quick Fix: Wizard Steps — Type Safety + Animation + Logic Fixes
Generated: 2026-03-28

## Changes Made

### 1. ExecutionStep.tsx — Fix stale closure (failCount always 0)
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/ExecutionStep.tsx`
- Lines: 72–83
- Removed `failCount` useState, now derived as `completed.filter(c => c.status === "failed").length`
- Removed `setFailCount((f) => f + 1)` call inside exec loop (line ~125)

### 2. PlaybookReviewStep.tsx — Fix React.ReactNode without import
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookReviewStep.tsx`
- Added `type ReactNode` to React import
- Replaced `React.ReactNode` with `ReactNode` in icons Record type

### 3. PlaybookStrategyStep.tsx — Fix React.JSX.Element, React.ReactNode, and hardcoded bg class
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookStrategyStep.tsx`
- Added `type ReactNode` to React import
- Replaced `React.ReactNode` → `ReactNode` in Screen children prop
- Replaced `React.JSX.Element` → `JSX.Element` in QDef interface
- Replaced `bg-surface-card` → `bg-surface-raised/60` on bottom bar div (dark theme consistency)

### 4. FinalReviewStep.tsx — Fix React.ElementType and React.ReactNode (no React import)
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/FinalReviewStep.tsx`
- Added `import { type ElementType, type ReactNode } from "react";`
- Replaced `React.ElementType` → `ElementType` and `React.ReactNode` → `ReactNode` in ReviewSection props

### 5. AssessmentStep.tsx — Add consistent exit transition
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/AssessmentStep.tsx`
- Added `y: -6` to exit prop and `transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}`

### 6. WelcomeStep.tsx — Add consistent exit transition
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/WelcomeStep.tsx`
- Added `y: -6` to exit prop and `transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}`

### 7. ProfileStep.tsx — Add consistent exit transition
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/ProfileStep.tsx`
- Added `y: -6` to exit prop and `transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}`

### 8. AppSetupStep.tsx — Add consistent exit transition
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/AppSetupStep.tsx`
- Added `y: -6` to exit prop and `transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}`

### 9. ReportStep.tsx — Add consistent exit transition
- File: `apps/os-desktop/src/renderer/pages/wizard/steps/ReportStep.tsx`
- Added `y: -6` to exit prop and `transition={{ duration: 0.22, ease: [0.0, 0.0, 0.2, 1.0] }}`

## Verification
- All edits verified by re-reading changed sections
- Pattern followed: existing code style, type-only imports from react

## Files Modified
1. `apps/os-desktop/src/renderer/pages/wizard/steps/ExecutionStep.tsx`
2. `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookReviewStep.tsx`
3. `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookStrategyStep.tsx`
4. `apps/os-desktop/src/renderer/pages/wizard/steps/FinalReviewStep.tsx`
5. `apps/os-desktop/src/renderer/pages/wizard/steps/AssessmentStep.tsx`
6. `apps/os-desktop/src/renderer/pages/wizard/steps/WelcomeStep.tsx`
7. `apps/os-desktop/src/renderer/pages/wizard/steps/ProfileStep.tsx`
8. `apps/os-desktop/src/renderer/pages/wizard/steps/AppSetupStep.tsx`
9. `apps/os-desktop/src/renderer/pages/wizard/steps/ReportStep.tsx`
