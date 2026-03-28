# ECOBUGHUNTERCLAUDE — Round 5 Final Status

**Date:** 2026-03-28
**Session:** Round 5 — Comprehensive build test + race condition fixes
**Branch:** `main` (HEAD: `fcf04ec`)

---

## BUILD STATUS

| Target | Status | TS Errors | Notes |
|--------|--------|-----------|-------|
| `apps/web` (eco-site Next.js) | ✅ PASS | 0 | 24 routes, static + dynamic |
| `apps/tuning-desktop` (renderer) | ✅ PASS | 0 | Fixed 15 errors in Round 3 |
| `apps/tuning-desktop` (main process) | ✅ PASS | 0 | CommonJS build clean |
| `apps/os-desktop` (renderer) | ✅ PASS | 0 | |
| `apps/os-desktop` (main process) | ✅ PASS | 0 | |
| `apps/tuning-website` | ✅ PASS | 0 | |
| `apps/os-website` | ✅ PASS | 0 | |
| `apps/cloud-api` | ✅ PASS | 0 | |
| `apps/tuning-api` | ✅ PASS | 0 | |
| `apps/os-api` | ✅ PASS | 0 | |
| `packages/os-shared-schema` | ✅ PASS | 0 | |
| `packages/tuning-shared-schema` | ✅ PASS | 0 | |
| `packages/auth-core` | ✅ PASS | 0 | |
| `packages/db` | ✅ PASS | 0 | |
| `packages/system-analyzer` | ✅ PASS | 0 | |
| **Total TypeScript errors** | **0** | — | Verified Round 5: `pnpm typecheck` all green |

---

## ROUND HISTORY SUMMARY

| Round | Commit | Key Work |
|-------|--------|----------|
| Round 1 | `02861cf` | Deep bug hunt — 4 critical + 4 warning fixes, hero live scan |
| Round 2 | `20ce97f` | Freemium expansion, intelligence system, BUGHUNTERCLAUDE audit |
| Round 3 | `1612187` | Full platform wiring, zero TS errors, all builds passing |
| Round 4 | `8db171b` | Documentation consolidation (this file) |
| Round 5 | `fcf04ec` | Comprehensive build test: 0 TS errors, all 5 builds pass; fixed race conditions in BenchmarkStep + ExecutionStep |

---

## PLATFORM: ECO-SITE (apps/web)

### RESOLVED

| ID | Description | Fix |
|----|-------------|-----|
| BUG-01 | `.section-divide` and `.premium-card` CSS classes undefined → donate page cards invisible | Added to `globals.css` |
| BUG-02 | "Download Free" button linked to nonexistent `.exe` path | Changed href to `/downloads` |
| BUG-03 | `.glow-surface` and `.glow-brand-edge` undefined in orphaned sections | Added to `globals.css` |
| BUG-06 | SEO metadata on `/atlasos-alternative` had no AtlasOS keywords | Updated title, description, keywords |

### OPEN — Requires Manual Action

| ID | Severity | Description | Action Required |
|----|----------|-------------|-----------------|
| BUG-07 | MEDIUM | `og:image` uses 512×512 square logo instead of 1200×630 social card | Create proper og:image asset |
| BUG-10 | MEDIUM | `/downloads` page `.exe` link returns 404 | Place installer at `public/downloads/os/redcore-os-setup.exe` or use CDN URL |

### OPEN — Low Risk / Intentional

| ID | Severity | Description | Notes |
|----|----------|-------------|-------|
| BUG-04 | HIGH | `border-border-default` used widely — works in Tailwind v4 but fragile | OK now, risk if var renamed |
| BUG-05 | HIGH | `hover:border-border-strong` used widely — works in Tailwind v4 | Same as above |
| BUG-08 | MEDIUM | `accent="green"` passed to `FeatureCard` but both branches identical | Intentional: same accent color for both products |
| BUG-09 | MEDIUM | Hero constellation hidden on mobile (`hidden lg:flex`) | Intentional responsive decision |
| BUG-11 | LOW | `scroll-behavior: smooth` CSS + Lenis JS = potential double-smooth | Low risk in practice |
| BUG-12 | LOW | `brand-950`, `brand-900` tokens used in `Badge.tsx` but not defined | Badge not used on any active page |
| BUG-13 | LOW | `border-l-brand-500` invalid Tailwind class in `PathsSection.tsx` | PathsSection not used on any active page |
| BUG-14 | LOW | `--color-success: #E8254B` (same red as accent) | Semantic issue, no active component uses it |
| BUG-15 | LOW | Tuning/OS anchor IDs exist but not linked from nav | Works correctly via checkout cancel URL |
| BUG-16 | LOW | 19 orphaned section components / UI components not used on any page | Dead code from homepage redesign |

### Missing Canonical

`/donate` page has no `alternates.canonical` or explicit `openGraph` tags — inherits from root layout only. Low SEO risk.

---

## PLATFORM: redcore-TUNING DESKTOP (apps/tuning-desktop + services/tuning-service)

### RESOLVED

| ID | Description | Round Fixed |
|----|-------------|-------------|
| CRIT-2 | 15 TypeScript errors (TS build broken) | Round 3 |
| MED-9 | `requireAuth` missing `return` after 401 | Round 2 |
| MED-11 | `journal.cancel` error response missing | Round 2 |
| HIGH-2 | `apphub.getCatalog` missing fields (partial) | Round 2 |

### OPEN — CRITICAL

| ID | File | Description |
|----|------|-------------|
| CRIT-1 | `apps/cloud-api/src/routes/webhooks.ts:75` | Stripe webhook `userId` always `undefined` — subscriptions never activate in DB. `session.metadata` is always `{}`, must retrieve from `stripeSub.metadata` |
| CRIT-3 | `services/tuning-service/src/ipc.rs` | 13 IPC methods declared but unimplemented in Rust: `scan.cpuPower`, `scan.scheduler`, `scan.serviceStates`, `scan.filesystem`, `scan.memMgmt`, `tuning.skipAction`, `benchmark.analyzeBottlenecks`, `rollback.createSnapshot`, `rollback.restoreActions`, `license.activate`, `license.deactivate`, `license.refresh`, `apphub.checkUpdates` |

### OPEN — HIGH

| ID | File | Description |
|----|------|-------------|
| HIGH-1 | `apps/tuning-desktop/src/renderer/lib/cloud-api.ts:169` | `cloudApi.auth.me()` calls `GET /auth/me` — route does not exist; should be `GET /users/me` |
| HIGH-2 | `services/tuning-service/src/ipc.rs:422` | `journal.resume` uses `.unwrap_or_else(\|_\| panic!(...))` in IPC handler — violates no-panic rule |
| HIGH-3 | `services/tuning-service/src/rollback.rs:96` | `.unwrap()` on `serde_json::from_str` — corrupt snapshot JSON crashes the service |
| HIGH-4 | `apps/cloud-api/src/routes/auth.ts:63-66` | Registration non-atomic — orphaned users possible on transient DB error |
| HIGH-5 | `apps/cloud-api/src/routes/auth.ts:112` | Login returns oldest subscription (missing `.desc()`) — users see wrong tier after upgrade |
| HIGH-6 | `apps/tuning-desktop/src/renderer/lib/cloud-api.ts:8` | Dev API client connects to port 3000, server runs on 3001 — all cloud calls fail in dev |
| HIGH-7 | `apps/cloud-api/src/middleware/auth.ts` | Deleted users can still authenticate (no `deletedAt` check); Stripe subscription not cancelled on account delete |
| HIGH-8 | `apps/tuning-desktop/src/renderer/lib/cloud-api.ts:151` | `UserProfile.tier` missing `"expert"` value — expert users get wrong type |
| HIGH-9 | `services/tuning-service/src/intelligence.rs:697` | Rust returns `"warnings"` field, TypeScript expects `"warningNotes"` — wizard always shows empty safety warnings |
| HIGH-10 | `services/tuning-service/src/ipc.rs:612-615` | Machine classification runs 3× on single "Classify Now" click |

### OPEN — MEDIUM

| ID | Description |
|----|-------------|
| MED-1 | `isFeatureAvailable()` returns `false` for expert tier (`tier === "premium"` only) |
| MED-2 | `FEATURE_GATES` tuning_plans: verify consistency between Rust and TypeScript (was fixed, needs re-audit) |
| MED-3 | `scan.hardware` and `scan.quick` both call `scan_full()` — no lightweight scan path |
| MED-4 | Executor rollback uses positional indexing into `previous_values` — fragile |
| MED-5 | Device fingerprint uses only hostname + platform — VMs with default hostnames collide |
| MED-6 | OAuth `accessToken` stored in plaintext in DB |
| MED-7 | Avatar stored as raw base64 in `users` table (up to ~2MB per user query) |
| MED-8 | `annualSavingsPercent: 20` but actual math is ~33% savings |
| MED-9 | Hardcoded Notepad++ 8.7.1 URL in `apphub.rs` — will 404 on next release | (FIXED in Round 2 per prior report — verify) |
| MED-10 | `signRefreshToken()` defined in `auth.ts` but never called — dead code |
| MED-11 | `useLicenseStore((s) => s.isPremium)()` Zustand anti-pattern in Sidebar, ProfilePage, SubscriptionPage — stale tier until reload |
| MED-12 | `intelligence.getProfile` license gate says "Premium feature" for a free feature — dead code |
| MED-13 | `apphub.getCatalog` returns `checksumAlgo: "none"` but TypeScript type expects `"sha256"` |
| MED-14 | `suggestedPreset` diverges between Rust `build_profile` and TypeScript `ARCHETYPE_META` |
| MED-15 | `intelligence.classify` IPC handler double-injects `deviceProfileId` |

### OPEN — SECURITY

| ID | File | Description |
|----|------|-------------|
| SEC-1 | `apps/cloud-api/src/middleware/auth.ts:12` | JWT secret defaults to `"dev-secret-change-in-production"` — if unset in prod, all JWTs forgeable |
| SEC-2 | `services/tuning-service/src/rollback.rs:303,476` | PowerShell command built via string formatting with DB-sourced values — injection risk |
| SEC-3 | `apps/tuning-desktop/src/preload/index.ts:118` | `openExternal` only checks `https://` prefix, no domain allowlist |
| SEC-4 | `apps/cloud-api/src/routes/webhooks.ts:8,12` | Stripe env vars fall back to `""` — runtime auth errors instead of startup validation |

### OPEN — ARCHITECTURE

| ID | Description |
|----|-------------|
| ARCH-1 | No SQLite schema migration system — schema changes corrupt existing installs |
| ARCH-2 | License validation split between TypeScript `license-client` and Rust `license.rs` — can diverge |
| ARCH-3 | License keys from env var; `license.activate` IPC unimplemented |
| ARCH-4 | `rusqlite::Connection` not `Send` — blocks future IPC concurrency |

### OPEN — PERFORMANCE

| ID | Description |
|----|-------------|
| PERF-1 | Full WMI scan on every `scan.quick` call (3-5 sec on cold start) |
| PERF-2 | New `reqwest::Client` created on every license validation call |
| PERF-3 | Full action catalog deserialized per `tuning.applyAction` call |
| PERF-4 | Machine classification runs 3× on single user action (see HIGH-10) |

### OPEN — MISSING ERROR HANDLING

| ID | Description |
|----|-------------|
| ERR-1 | `saveCache()` in license-client swallows all errors including disk full |
| ERR-2 | App hub downloads have no checksum verification (supply chain risk) |
| ERR-3 | Service restart loop has no backoff or retry limit — burns CPU on broken binary |

### OPEN — DEAD CODE

| ID | Description |
|----|-------------|
| DEAD-1 | `signRefreshToken()` in `auth.ts` — never called |
| DEAD-2 | `rollback.createSnapshot` + `rollback.restoreActions` — in IPC contract, unimplemented in Rust |
| DEAD-3 | `IpcEvents` planned events (`scan.progress`, `tuning.actionProgress`, etc.) commented out but pages still subscribe to them |
| DEAD-4 | `apps/cloud-api/src/lib/oauth.ts` exists but no OAuth callback route registered |
| DEAD-5 | `apphub.checkUpdates` — in IPC contract, unimplemented in Rust |
| DEAD-6 | `intelligence.getProfile` license gate never fires (feature is free) |
| DEAD-7 | `machine_classifications` table written to but never read |

---

## PLATFORM: redcore-OS DESKTOP (apps/os-desktop + services/os-service)

### RESOLVED

| ID | Description | Round Fixed |
|----|-------------|-------------|
| OS-CRIT-2 | Stale closure in ExecutionStep.tsx — `failed` count always 0 | Round 3 (`failCount` fix) |
| OS-MED-1 | Electron `main/index.ts` and `preload/index.ts` missing | Round 3 (created) |

### OPEN — CRITICAL

| ID | File | Description |
|----|------|-------------|
| OS-CRIT-1 | `services/os-service/src/ipc.rs:410` | FK violation in `store_plan` — `"inline"` classificationId doesn't exist in classifications table, causes DB error on any plan gen without prior classify call |
| OS-CRIT-3 | `.github/workflows/os-windows-proof.yml:128` | CI TEST 4 doesn't set `$allPassed = $false` on error — CI reports green when `transform.plan` actually fails |

### OPEN — HIGH

| ID | Description |
|----|-------------|
| OS-HIGH-1 | Classifier covers 5 profiles, schema defines 8 — `budget_desktop`, `highend_workstation`, `gaming_laptop` not scored |
| OS-HIGH-2 | Risk type mismatch: TypeScript uses `"safe"`, Rust uses `"low"/"medium"/"high"` |
| OS-HIGH-3 | `execute_elevated` path in `powershell.rs` not wired into executor — AppX removal will fail on Windows 11 |
| OS-HIGH-4 | 11 of 20 IPC methods return "Unknown method": `assess.hardware`, `assess.health`, `journal.recent`, `journal.detail`, `apphub.available`, `apphub.install`, `execute.apply`, `system.reboot`, `system.scheduleReboot`, `rollback.restore`, `rollback.detail` |

### OPEN — MEDIUM

| ID | Description |
|----|-------------|
| OS-MED-2 | Wizard implemented at ~13 steps, CLAUDE.md spec defines 18 — reboot-resume, handoff steps not yet created |
| OS-MED-3 | Only 4 of 12 action categories implemented (`appx`, `tasks`, `privacy`, `startup`) — missing: `services`, `performance`, `infrastructure`, `features`, `shell`, `advanced`, `preservation`, `network` |
| OS-MED-4 | AppX rollback limitation (manual reinstall from Store) not surfaced to user before applying |
| OS-MED-5 | `diagnose.*` IPC methods wired in UI but not implemented in `services/os-service/src/ipc.rs` |

### OPEN — WIRING INCOMPLETE (from CODEXHANDOFF.md)

| Item | Status |
|------|--------|
| `PlaybookStrategyStep.tsx` — `setPlaybookPreset` missing from wizard-store | OPEN |
| `RebootResumeStep.tsx` — not created | OPEN |
| `HandoffStep.tsx` — not created | OPEN |
| `PlaybookReviewStep.tsx` — uses hardcoded preset instead of store value | OPEN |
| `ExecutionStep.tsx` — unused `PlaybookResolvedAction` import | OPEN |
| `ExecutionStep.tsx` — passes `profile: "auto"` instead of `detectedProfile?.id` | OPEN |
| `ExecutionStep.tsx` — `appbundle.resolve` resolves but doesn't execute installs | OPEN |
| CI: `os-windows-proof.yml` missing playbook→execute chain + appbundle.resolve proofs | OPEN |
| `test/mock-service.mjs` missing handlers for `playbook.resolve`, `appbundle.*` | OPEN |
| Rust `TransformationPlan` path still in wizard-store UI state | OPEN |

---

## INFRASTRUCTURE / DEPLOYMENT

| Item | Status |
|------|--------|
| `cloud-api` DB migrations not generated (`pnpm drizzle-kit generate`) | OPEN |
| VDS deployment (`scripts/vds-deploy.sh`) ready but not run | OPEN (pending IHS.com.tr setup) |
| `apps/os-api` donations route added | DONE |
| GitHub Actions: `build-installers.yml`, `release.yml` | Present |
| GitHub Actions: `os-windows-proof.yml`, `tuning-windows-proof.yml` | Present |

---

## RECOMMENDED FIX PRIORITY (Round 4)

| Priority | ID | Platform | Effort | Why |
|----------|-----|----------|--------|-----|
| P0 | CRIT-1 | Tuning | 30 min | No subscriptions ever activate — revenue broken |
| P0 | OS-CRIT-1 | OS | 15 min | Plan generation crashes without prior classify |
| P0 | OS-CRIT-3 | OS | 10 min | CI silently hides broken plan pipeline |
| P1 | CRIT-3 | Tuning | 2 hr | 13 IPC methods crash pages at runtime |
| P1 | HIGH-2 | Tuning | 5 min | Service panic in IPC handler |
| P1 | HIGH-9 | Tuning | 5 min | Safety warnings always hidden |
| P1 | SEC-1 | Tuning | 5 min | JWT forgeable if env var unset |
| P1 | OS-HIGH-3 | OS | 45 min | AppX removal fails silently on Win11 |
| P2 | HIGH-7 | Tuning | 30 min | Deleted users auth; billing not stopped |
| P2 | MED-11 | Tuning | 10 min | Zustand anti-pattern — stale tier UI |
| P2 | OS-MED-2 | OS | 2 hr | Create RebootResume + Handoff steps |
| P2 | Wiring | OS | 3 hr | PlaybookStrategy store wiring + CI updates |
| P3 | HIGH-1,5,6 | Tuning | 1 hr | Auth/subscription correctness |
| P3 | OS-HIGH-1 | OS | 30 min | 3 missing classifier profiles |
| P3 | BUG-07 | Eco-site | Manual | Create proper og:image |
| P3 | All remaining MEDIUM | Both | — | Cleanup pass |

---

## ROUND 5 FIXES

| ID | File | Fix Applied |
|----|------|-------------|
| RACE-1 | `apps/tuning-desktop/src/renderer/pages/wizard/steps/BenchmarkStep.tsx` | Added `cancelledRef` + `intervalRef` cleanup on unmount — prevents state update after unmount |
| RACE-2 | `apps/tuning-desktop/src/renderer/pages/wizard/steps/ExecutionStep.tsx` | Added `cancelledRef` guards at all state update sites in async loop — prevents stale update after unmount |

## NEXT SESSION PRIORITIES

1. Fix CRIT-1 (Stripe webhook) — revenue blocker
2. Fix OS-CRIT-1 (FK violation) + OS-CRIT-3 (CI silent fail)
3. Wire `PlaybookStrategyStep` into store + create `RebootResumeStep` + `HandoffStep`
4. Generate cloud-api DB migrations
5. Fix HIGH-2 (service panic) + HIGH-9 (warningNotes field name)
6. VDS deployment prep
