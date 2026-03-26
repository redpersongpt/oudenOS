
# OSBUGHUNTERCLAUDE — Automated Code Review & Bug Report for redcore-OS

**I am OS Bug Hunter Claude, your automated code reviewer and quality guardian for redcore-OS.** My role is to deeply scan every push to this repository, identify bugs, security issues, logic errors, and code quality problems, and report them here. I also provide actionable recommendations. **CLI Claude: read this file before making changes — it contains known issues and priorities that should inform your work.**

---

## Last Scan
- **Date:** 2026-03-25
- **Commit:** Latest local (pre-push)
- **Codebase:** redcore-OS — Windows in-place transformation wizard

---

## CRITICAL BUGS

### CRIT-1: Foreign Key Violation in store_plan (Inline Classification Path)
- **File:** `apps/service-core/src/ipc.rs:410`
- **Description:** When `classificationId` is not passed, the code uses `"inline"` as a fallback string. But `PRAGMA foreign_keys=ON` is set and `"inline"` doesn't exist in the `classifications` table. This causes an FK constraint violation on INSERT into `transform_plans`.
- **Impact:** Any plan generation without a prior classification call will crash with a database error.
- **Fix:** Either: (a) insert a synthetic classification record with id `"inline"` before the plan insert, or (b) make `classification_id` nullable in the `transform_plans` table, or (c) require `classificationId` param and return a clear error if missing.

### CRIT-2: Stale Closure in ExecutionStep.tsx — Failed Count Always Shows 0
- **File:** `apps/desktop/src/renderer/pages/wizard/steps/ExecutionStep.tsx:125`
- **Description:** `failed` is a `useState` variable. The `exec` async function closes over its initial value (0). React state updates don't mutate the closure variable. The report step will always show 0 failed actions regardless of reality.
- **Impact:** User sees "0 failed" even when actions actually failed. Trust-destroying UX bug.
- **Fix:** Derive failed count from the completed array: `const actualFailed = completed.filter(c => c.status === 'failed').length`

### CRIT-3: CI TEST 4 Silently Broken — transform.plan Never Actually Tested
- **File:** `.github/workflows/windows-proof.yml:128`
- **Description:** TEST 4 calls `transform.plan` with `{"profile":"vm_cautious","preset":"conservative"}` but the handler requires either `classificationId` or `classification` in params. Returns error -3. But `$allPassed` is never set to false on this failure, so CI reports green.
- **Impact:** The plan generation pipeline is untested in CI. You think it works because CI is green — it doesn't.
- **Fix:** Pass a valid inline `classification` JSON object in the params, AND add `$allPassed = $false` when result is null or error.

---

## HIGH BUGS

### HIGH-1: Classifier Covers 5 Profiles, Schema Defines 8 — 3 Missing
- **File:** `apps/service-core/src/classifier.rs`
- **Description:** TypeScript schema (`profiles.ts`) defines 8 profiles: `gaming_desktop`, `budget_desktop`, `highend_workstation`, `office_laptop`, `gaming_laptop`, `low_spec_system`, `vm_cautious`, `work_pc`. Rust classifier only scores 5 — missing `budget_desktop`, `highend_workstation`, `gaming_laptop`.
- **Impact:** A gaming laptop (discrete GPU + laptop form factor) scores ambiguously between `gaming_desktop` and `office_laptop`. A budget desktop gets misclassified.
- **Fix:** Add scoring logic for the 3 missing profiles in classifier.rs. gaming_laptop: laptop + discrete GPU. budget_desktop: desktop + RAM <= 8GB. highend_workstation: desktop + RAM >= 32GB + multi-core.

### HIGH-2: Risk Type Mismatch Between TS and Rust
- **File:** `packages/shared-schema/` vs `apps/service-core/src/transformer.rs`
- **Description:** TypeScript schema defines risk level `"safe"` but Rust transformer only uses `"low"`, `"medium"`, `"high"`. Actions marked as "safe" in TS won't match Rust filtering.
- **Fix:** Either add `"safe"` to Rust risk enum or replace with `"low"` in TS schema. Pick one, be consistent.

### HIGH-3: execute_elevated Not Wired Into Executor
- **File:** `apps/service-core/src/powershell.rs` + `apps/service-core/src/executor.rs`
- **Description:** `execute_elevated` (MinSudo/TrustedInstaller) path exists in powershell.rs but executor.rs uses regular `execute()`. AppX removal (`Get-AppxPackage | Remove-AppxPackage`) and certain registry writes need elevation on Windows 11.
- **Impact:** AppX removal will fail silently or with "Access denied" on real user machines.
- **Fix:** Wire `execute_elevated` into executor for action categories that require it (appx, certain registry paths under HKLM).

### HIGH-4: 11 of 20 IPC Methods Not Implemented
- **Description:** These methods are in the schema but return "Unknown method" from Rust:
  - `assess.hardware`, `assess.health`
  - `journal.recent`, `journal.detail`
  - `apphub.available`, `apphub.install`
  - `execute.apply` (batch apply)
  - `system.reboot`, `system.scheduleReboot`
  - `rollback.restore`
  - `rollback.detail`
- **Impact:** Any UI code calling these methods will get an error. Wizard steps depending on these will break.
- **Fix:** Implement or stub with clear "not yet implemented" responses.

---

## MEDIUM BUGS

### MED-1: Electron main.ts and preload.ts Missing
- **File:** `apps/desktop/src/main/` and `apps/desktop/src/preload/`
- **Description:** Directories exist but no files. The Electron shell can't actually launch. IPC bridge between renderer and Rust service isn't wired.
- **Impact:** Desktop app doesn't work. Wizard UI is renderer-only with no backend connection.

### MED-2: Wizard Has 8 Steps, CLAUDE.md Spec Has 18
- **Description:** Current wizard: Welcome → Assessment → Classification → Plan → Customization → Preservation → Execution → Report. Missing: advanced controls, app hub, reboot/resume, hand-off to redcore-Tuning, progress persistence, error recovery.

### MED-3: Only 4 of 12 Action Categories Implemented
- **Description:** Have: `appx`, `tasks`, `privacy`, `startup`. Missing: `services`, `performance`, `infrastructure`, `features`, `shell`, `advanced`, `preservation`, `network`.

### MED-4: AppX Rollback Limitation Not Surfaced to User
- **File:** `apps/service-core/src/rollback.rs`
- **Description:** AppX removal rollback is flagged as "reinstall from Store" — can't auto-restore. But the UI doesn't warn the user before applying AppX actions that rollback is manual.

---

## SECURITY CONCERNS

### SEC-1: PowerShell Command Construction
- **File:** `apps/service-core/src/powershell.rs`
- **Status:** SAFE — commands use embedded data, not user input. No injection vector found.

### SEC-2: No Electron Security Enforcement Yet
- **Description:** CLAUDE.md specifies `nodeIntegration:false` + contextBridge, but main.ts doesn't exist yet. When it's created, must enforce this.

---

## ARCHITECTURE — WHAT'S WELL DONE

1. **Security model correct from day one** — renderer never touches system APIs
2. **Dual compilation paths** — every system function has `#[cfg(not(windows))]` simulation for macOS dev
3. **CI runs real WMI queries** on Windows Server 2025 — not mocked
4. **Work PC preservation design** — `preservationFlags` threading through assess → classify → transform is thoughtful
5. **SQLite audit trail** — every action logged with timestamp, category, severity
6. **Shared TypeScript schema** — same contract pattern as redcore-Tuning

---

## RECOMMENDED FIX PRIORITY

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | CRIT-1: FK violation in store_plan | 15 min |
| P0 | CRIT-2: Stale closure in ExecutionStep | 5 min |
| P0 | CRIT-3: Fix CI TEST 4 | 10 min |
| P1 | HIGH-1: Add 3 missing classifier profiles | 30 min |
| P1 | HIGH-3: Wire execute_elevated | 45 min |
| P1 | HIGH-2: Align risk types | 10 min |
| P2 | HIGH-4: Stub remaining IPC methods | 1 hr |
| P2 | MED-1: Create Electron main.ts + preload.ts | 2 hr |
| P3 | MED-2: Expand wizard to full 18 steps | 1 day |
| P3 | MED-3: Add remaining action categories | 1 day |

---

*This file is maintained by OS Bug Hunter Claude. Updated on every scan.*
