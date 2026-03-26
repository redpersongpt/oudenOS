---
# BUGHUNTERCLAUDE — Automated Code Review & Bug Report

**I am Bug Hunter Claude, your automated code reviewer and quality guardian.** My role is to deeply scan every push to this repository, identify bugs, security issues, logic errors, and code quality problems, and report them here. I also provide actionable recommendations. **CLI Claude: read this file before making changes — it contains known issues and priorities that should inform your work.**

---

## Review Metadata

- **Date:** 2026-03-25
- **Commit Reviewed:** `20ce97f` (latest — Increase freemium: App Hub, benchmark, rollback, intelligence all free)
- **Prior Reviewed Commit:** `76e5e8b`
- **Branch:** `main`
- **Scope:** Full codebase — all `.ts`, `.tsx`, `.rs` source files read directly
- **Tools run:** `pnpm typecheck` (15 errors, EXIT 2), `cargo check` (skipped — Rust toolchain not on PATH in CI env)
- **Delta since last audit:** 24 files changed. Intelligence system added; freemium tier expanded; CRIT-2 and MED-9 fixed.

---

## Changes Since Last Audit

### ✓ FIXED
| ID | What was fixed |
|----|----------------|
| CRIT-2 | `tuning.applyPlan` now correctly checks `tier_allows(license, "full_tuning_engine")` |
| MED-9 | `requireAuth` now has `return` after 401 send |
| MED-11 | `journal.cancel` now returns proper error response on DB failure |
| HIGH-2 | `apphub.getCatalog` now returns `category`, `description`, `version` fields (partial fix — `checksumAlgo` still wrong, see NEW-MED-3) |

### ✗ STILL OPEN (all carried from prior report unless noted)
CRIT-1, CRIT-3, HIGH-1, HIGH-3, HIGH-4, HIGH-5, HIGH-6, HIGH-7, HIGH-8, all MED/SEC/ARCH/PERF/ERR/DEAD items from prior report remain unaddressed.

---

## 🔴 CRITICAL Bugs

### CRIT-1 — Stripe webhook `userId` is always `undefined` after checkout *(carried)*
**File:** `apps/cloud-api/src/routes/webhooks.ts:75` and `subscription.ts:134`

In `webhooks.ts`, the `checkout.session.completed` handler reads `session.metadata["userId"]`:
```ts
const userId = metadata["userId"];  // always undefined
if (!userId) return;                // handler exits early; tier never saved
```

But in `subscription.ts:134`, the checkout session is created with `userId` inside `subscription_data.metadata` — not at the session level. Stripe puts `subscription_data.metadata` on the **subscription object**, not the session. `session.metadata` is always `{}`. Every subscription purchase silently fails to update the user's tier in the database.

**Fix:** Retrieve the subscription and read from its metadata:
```ts
const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
const userId = stripeSub.metadata["userId"] ?? session.metadata?.["userId"];
```

---

### CRIT-2 — `pnpm typecheck` FAILS — 15 TypeScript errors across 5 files *(NEW — introduced in recent commits)*
**Files:** `ApplyWorkflowPage.tsx:739-741`, `DashboardPage.tsx:242`, `HardwarePage.tsx:74`, `intelligence/components.tsx:99`, `IntelligencePage.tsx:14,16`, `OnboardingPage.tsx:27`, `wizard-store.ts:196,201`

Running `pnpm typecheck` exits with code 2. The desktop app does not type-check cleanly. Full error list:

```
ApplyWorkflowPage.tsx(739,7): error TS2345: Argument of type '"tuning.actionProgress"'
    is not assignable to parameter of type 'keyof IpcEvents'.
ApplyWorkflowPage.tsx(740,10): error TS2339: Property 'actionId' does not exist
    on type 'EventData<keyof IpcEvents>'.
ApplyWorkflowPage.tsx(740,20): error TS2339: Property 'status' does not exist
    on type 'EventData<keyof IpcEvents>'.
ApplyWorkflowPage.tsx(740,28): error TS2339: Property 'detail' does not exist
    on type 'EventData<keyof IpcEvents>'.
DashboardPage.tsx(242,34): error TS2345: Argument of type '"scan.progress"'
    is not assignable to parameter of type 'keyof IpcEvents'.
DashboardPage.tsx(242,54): error TS2339: Property 'phase' does not exist
    on type 'EventData<keyof IpcEvents>'.
DashboardPage.tsx(242,61): error TS2339: Property 'percent' does not exist
    on type 'EventData<keyof IpcEvents>'.
HardwarePage.tsx(74,34): error TS2345: Argument of type '"scan.progress"'
    is not assignable to parameter of type 'keyof IpcEvents'.
HardwarePage.tsx(74,54): error TS2339: Property 'phase' does not exist on type 'EventData<keyof IpcEvents>'.
HardwarePage.tsx(74,61): error TS2339: Property 'percent' does not exist on type 'EventData<keyof IpcEvents>'.
intelligence/components.tsx(99,9): error TS6133: 'glowColor' is declared but its value is never read.
IntelligencePage.tsx(14,1): error TS6133: 'Badge' is declared but its value is never read.
IntelligencePage.tsx(16,1): error TS6133: 'PremiumGate' is declared but its value is never read.
OnboardingPage.tsx(27,1): error TS6133: 'Checkbox' is declared but its value is never read.
wizard-store.ts(196,27): error TS6133: 'steps' is declared but its value is never read.
wizard-store.ts(201,27): error TS6133: 'steps' is declared but its value is never read.
```

The `"tuning.actionProgress"` and `"scan.progress"` events are used in page-level `useEffect` hooks but are not declared in `IpcEvents` (deliberately commented out as unimplemented). These pages subscribe to events that can never fire, and the subscriptions have broken type signatures. The preload `ALLOWED_EVENTS` set doesn't include these channels, so `window.redcore.on("tuning.actionProgress", ...)` silently returns a no-op at runtime.

The `glowColor`, `Badge`, `PremiumGate`, `Checkbox`, and `steps` errors are stale imports/variables left over from the recent intelligence system additions and freemium tier refactor.

**Fix (for event errors):** Either add these events to `IpcEvents` and wire Rust emission, or remove the dead `useEffect` hooks for unimplemented events. **Fix (for unused vars):** Remove the stale imports and dead variables.

---

### CRIT-3 — 13 IPC methods declared in contract but unimplemented in Rust service *(carried)*
**File:** `apps/service-core/src/ipc.rs` (dispatch match arms)

The following methods are in `IpcMethods` (ipc.ts), in both preload and main-process allowlists, but the Rust `dispatch()` function has no match arm for them. They fall through to `_ =>` which returns `RpcResponse::err(id, -1, "Unknown method: …")`. The main process resolves (not rejects) with `{ error: "Unknown method: …" }`. The UI receives a wrong-typed value and crashes at runtime.

Missing handlers:
- `scan.cpuPower` — CpuPower config page will crash
- `scan.scheduler` — Scheduler page will crash
- `scan.serviceStates` — Services page will crash
- `scan.filesystem` — Filesystem config page will crash
- `scan.memMgmt` — Memory management page will crash
- `tuning.skipAction` — Skip action button silently no-ops
- `benchmark.analyzeBottlenecks` — Thermal bottleneck page crashes
- `rollback.createSnapshot` — Manual snapshot creation always fails
- `rollback.restoreActions` — Selective action restore always fails
- `license.activate` — License activation from UI silently fails
- `license.deactivate` — License deactivation silently fails
- `license.refresh` — License refresh button silently fails
- `apphub.checkUpdates` — App update check always errors

**Fix:** Implement each handler in `ipc.rs`. Sub-scan methods should call individual scan functions in `scanner.rs`. License methods should wire to `license.rs`. `rollback.createSnapshot` should call `rollback::create_snapshot()`.

---

## 🟠 HIGH Bugs

### HIGH-1 — `cloudApi.auth.me()` calls a route that does not exist *(carried)*
**File:** `apps/desktop/src/renderer/lib/cloud-api.ts:169`

```ts
me: () => request<UserProfile>("GET", "/auth/me"),
```

The `/v1/auth` routes handle only `POST /register`, `/login`, `/refresh`, `/logout`. There is no `GET /me`. The actual user profile endpoint is `GET /users/me`. Any code calling `cloudApi.auth.me()` always receives a 404.

**Fix:** Change to `request<UserProfile>("GET", "/users/me")`. Note: the response shape wraps data in `{ user, subscription, preferences }`, so the return type also needs updating.

---

### HIGH-2 — `journal.resume` panics the service on `query_map` failure *(NEW)*
**File:** `apps/service-core/src/ipc.rs:422`

```rust
stmt.query_map([], |row| row.get(0))
    .unwrap_or_else(|_| panic!("query_map failed"))   // ← panic in IPC handler!
```

This is a direct violation of the Rust service rule: "NEVER panic in IPC handler code paths." If `query_map` fails (DB corruption, locked file, I/O error), the service process crashes. Main process restarts it in 2 seconds but the journal resume operation is lost.

**Fix:**
```rust
let mapped = stmt.query_map([], |row| row.get(0))
    .map_err(|e| anyhow::anyhow!("query_map failed: {}", e))?;
```

---

### HIGH-3 — `rollback.rs` `.unwrap()` panics on malformed snapshot data *(carried)*
**File:** `apps/service-core/src/rollback.rs:96`

```rust
Ok(serde_json::from_str::<Snapshot>(&data).unwrap())
```

If any snapshot JSON in SQLite is malformed (schema change, manual edit, truncated write), this `.unwrap()` panics and **kills the service process**. The main process restarts it every 2 seconds, but the rollback center remains broken until the corrupt row is removed.

**Fix:** Replace `.unwrap()` with `?` propagation.

---

### HIGH-4 — Auth registration is non-atomic; orphaned users are possible *(carried)*
**File:** `apps/cloud-api/src/routes/auth.ts:63-66`

The user row is committed before `Promise.all` inserts preferences and subscription. If either insert fails, the user exists without a subscription record.

**Fix:** Wrap the entire registration in a single DB transaction.

---

### HIGH-5 — Login and `/status` return oldest subscription, not latest *(carried)*
**File:** `apps/cloud-api/src/routes/auth.ts:112`, `subscription.ts:97`

Both use `orderBy(subscriptions.createdAt)` without `.desc()`. After an upgrade (free → premium → expert), these endpoints return the original free tier record.

**Fix:** Add `.desc()` to both queries.

---

### HIGH-6 — Development API client connects to wrong port *(carried)*
**File:** `apps/desktop/src/renderer/lib/cloud-api.ts:8`

```ts
"http://localhost:3000"  // ← default
```

`apps/cloud-api/src/index.ts:60` starts the server on port `3001`. All cloud API calls in development fail with ECONNREFUSED unless `VITE_API_URL` is set.

**Fix:** Align the default port to 3001, or add a `.env.example` documenting `VITE_API_URL=http://localhost:3001`.

---

### HIGH-7 — Deleted users can still authenticate; Stripe subscription not cancelled on delete *(carried)*
**Files:** `apps/cloud-api/src/middleware/auth.ts`, `apps/cloud-api/src/routes/users.ts:447`

`requireAuth` validates the JWT but does not check `deletedAt`. After `DELETE /me`, the user's JWT remains valid for up to 15 minutes. Additionally, `DELETE /me` does not cancel the Stripe subscription. The user will continue to be charged after account deletion.

**Fix:**
1. Add `where(isNull(users.deletedAt))` in `requireAuth` user lookup.
2. Cancel Stripe subscription before soft-deleting the user record.

---

### HIGH-8 — `UserProfile.tier` missing `"expert"` value *(carried)*
**File:** `apps/desktop/src/renderer/lib/cloud-api.ts:151`

```ts
tier: "free" | "premium";  // "expert" missing
```

Expert-tier users are narrowed to a type that doesn't include their tier. Any `if (user.tier === "expert")` check after receiving `UserProfile` from `cloudApi` may be unreachable per TypeScript's type checker.

---

### HIGH-9 — `intelligence.build_profile` returns `"warnings"` but TypeScript type expects `"warningNotes"` *(NEW)*
**File:** `apps/service-core/src/intelligence.rs:697` vs `packages/shared-schema/src/device-intelligence.ts:123`

```rust
Ok(json!({
    ...
    "warnings": warnings,    // ← Rust field name
    ...
}))
```

But `IntelligentTuningProfile` has:
```ts
warningNotes: string[];      // ← TypeScript expects this
```

Any code accessing `profile.warningNotes` gets `undefined`. In `apps/desktop/src/renderer/pages/wizard/steps/ProfileStep.tsx:124`:
```ts
const warnings = profile?.warningNotes ?? [];  // always []
```

The warnings section in the wizard is always empty, silently hiding important per-archetype safety warnings (e.g., "Registry changes may not persist across VM resets" for VM users).

**Fix:** Rename `"warnings"` to `"warningNotes"` in `intelligence.rs:697`.

---

### HIGH-10 — `intelligence.getProfile` / `intelligence.getRecommendations` double-classify on every call *(NEW)*
**File:** `apps/service-core/src/ipc.rs:612-615, 635-638`

Both IPC handlers for `intelligence.getProfile` and `intelligence.getRecommendations` independently call `intelligence::classify(&profile)`. When the UI calls `handleClassify()` (which invokes `classify()` then `loadProfile()`), the machine is classified **3 times total** in a single user action. Classification involves extracting WMI hardware signals and scoring all archetypes — it's not trivial. The `machine_classifications` table (where classified data is persisted by `intelligence.classify`) is never read back; it only writes.

**Fix:** Pass the already-computed classification result as a parameter, or read the latest classification from the DB when it exists.

---

## 🟡 MEDIUM Bugs

### MED-1 — `isFeatureAvailable()` doesn't handle expert tier *(carried)*
**File:** `packages/license-client/src/index.ts:102`

```ts
return tier === "premium";  // expert users get false for premium features
```

**Fix:** `return tier === "premium" || tier === "expert";`

---

### MED-2 — `FEATURE_GATES` inconsistency: `tuning_plans` free in Rust, premium in TypeScript *(carried)*
**Files:** `packages/shared-schema/src/license.ts:63`, `apps/service-core/src/ipc.rs:67`

TypeScript: `"tuning_plans": "free"` (correctly marked free in the updated license.ts). Rust `tier_allows` free list also includes `"tuning_plans"`. This appears now consistent. *(Note: Previous audit found a discrepancy — this may have been fixed in the freemium expansion. Verify by reading the exact TS line.)*

---

### MED-3 — `scan.hardware` and `scan.quick` are identical *(carried)*
**File:** `apps/service-core/src/ipc.rs:132`

Both call `scanner::scan_full(|_progress| {})`. No lightweight scan path exists. Every "quick" status refresh runs the full expensive WMI scan.

---

### MED-4 — Executor positional indexing into `previous_values` is fragile *(carried)*
**File:** `apps/service-core/src/executor.rs`

Phase 1 pushes previous values in order. Phase 3 accesses them via positional offset. If the push order or any loop is modified, the wrong previous values are associated with changes, silently corrupting rollback data.

**Fix:** Use a HashMap keyed by `(change_type, path, value_name)`.

---

### MED-5 — `generate_device_fingerprint()` uses only hostname + platform *(carried)*
**File:** `packages/license-client/src/index.ts:122`

Multiple VMs with default hostnames get identical fingerprints. This is used as the AES cache key seed, meaning different machines can decrypt each other's license caches.

---

### MED-6 — OAuth `accessToken` stored in plaintext in DB *(carried)*
**File:** `apps/cloud-api/src/routes/users.ts:352`

OAuth provider access tokens are written directly to `connected_accounts.access_token` without encryption.

---

### MED-7 — Avatar stored as raw base64 in `users` table *(carried)*
**File:** `apps/cloud-api/src/routes/users.ts:207-213`

Up to ~2MB of base64 image data stored directly in the user row. Every user query that returns `avatarUrl` carries this payload.

---

### MED-8 — Subscription pricing displays wrong savings percentage *(carried)*
**File:** `apps/cloud-api/src/routes/subscription.ts:75-86`

Code says `annualSavingsPercent: 20` but actual math is ~33% savings.

---

### MED-9 — Hardcoded Notepad++ version URL will 404 on next release *(carried)*
**File:** `apps/service-core/src/apphub.rs:23`

```rust
".../notepad-plus-plus/releases/latest/download/npp.8.7.1.Installer.x64.exe"
```

**Fix:** Use the latest-redirect URL pattern without a hardcoded version.

---

### MED-10 — `signRefreshToken()` defined but never used *(carried)*
**File:** `apps/cloud-api/src/middleware/auth.ts:18`

Dead code. Refresh tokens are stored as HMAC-hashed random bytes, not JWTs.

---

### MED-11 — `useLicenseStore((s) => s.isPremium)()` Zustand anti-pattern — stale subscription *(NEW)*
**Files:** `apps/desktop/src/renderer/components/layout/Sidebar.tsx:43`, `apps/desktop/src/renderer/pages/profile/ProfilePage.tsx:17`, `apps/desktop/src/renderer/pages/subscription/SubscriptionPage.tsx:45`

```ts
const isPremium = useLicenseStore((s) => s.isPremium)();
```

The selector `(s) => s.isPremium` extracts the **function reference** (which is stable across renders — it's defined once in the `create()` call). Zustand's subscription mechanism sees the same reference every render and never triggers a re-render when the license tier changes. These 3 components will show stale premium status until a full page reload, even after a `license.changed` event or `license:refresh` IPC call.

**Fix:** Call inside the selector so the selected value is the computed boolean:
```ts
const isPremium = useLicenseStore((s) => s.isPremium());
```

---

### MED-12 — `intelligence.getProfile` gate error message says "Premium feature" for a free feature *(NEW)*
**File:** `apps/service-core/src/ipc.rs:602, 624`

```rust
if !tier_allows(license, "intelligent_recommendations") {
    return RpcResponse::err(id, -403, "Premium feature: intelligent_recommendations".into());
}
```

`intelligent_recommendations` is in the free features list in `tier_allows`. This gate never fires (always returns true), making the check dead code. If the feature gates are ever tightened, the error message would mislead users by saying "Premium feature" when `intelligent_recommendations` may remain free.

---

### MED-13 — `apphub.getCatalog` `checksumAlgo` violates contract type *(carried/updated)*
**File:** `apps/service-core/src/ipc.rs:470`

```rust
"checksumAlgo": "none",
```

`AppCatalogEntry.checksumAlgo` is typed as the literal `"sha256"`. The Rust returns `"none"`. Any type narrowing `entry.checksumAlgo === "sha256"` fails at runtime. Combined with ERR-2 (no installer checksum verification), app hub downloads are unverified against tampering.

---

### MED-14 — `suggestedPreset` in Rust `build_profile` diverges from `ARCHETYPE_META` in TypeScript *(NEW)*
**File:** `apps/service-core/src/intelligence.rs:648-657` vs `packages/shared-schema/src/device-intelligence.ts:25-74`

Different parts of the app use different preset values for the same archetype:
- `HeroCard` shows `ARCHETYPE_META[archetype].suggestedPreset` (from TypeScript — e.g., `"aggressive"` for gaming_desktop)
- `IntelligentTuningProfile.suggestedPreset` from Rust `build_profile` returns `"competitive_fps"` for gaming_desktop

Full divergence table:
| Archetype | ARCHETYPE_META (TS/UI) | build_profile (Rust/IPC) |
|---|---|---|
| gaming_desktop | `"aggressive"` | `"competitive_fps"` |
| budget_desktop | `"balanced"` | `"clean_lean"` |
| highend_workstation | `"balanced"` | `"creator_workstation"` |
| office_laptop | `"conservative"` | `"laptop_balanced"` |
| gaming_laptop | `"balanced"` | `"aaa_smoothness"` |
| vm_cautious | `"conservative"` | `"privacy_focused"` |
| low_spec_system | `"conservative"` | `"conservative"` ✓ |

The wizard uses the Rust value to pre-select the preset; the Intelligence page HeroCard shows the TypeScript value. Users may see conflicting preset recommendations depending on which screen they look at.

**Fix:** Align `ARCHETYPE_META.suggestedPreset` in TypeScript to match the Rust values, or vice versa.

---

### MED-15 — `intelligence.classify` IPC handler double-injects `deviceProfileId` *(NEW)*
**File:** `apps/service-core/src/ipc.rs:576-578`

`intelligence::classify()` already includes `deviceProfileId` in its output (from the profile's own `id` field — `intelligence.rs:613`). The IPC handler then overwrites it with the `device_profile_id` from request params:
```rust
obj.insert("deviceProfileId".to_string(), serde_json::json!(device_profile_id));
```

If the stored profile's `id` field doesn't match the lookup key (which can happen due to the "unknown" fallback in `store_device_profile`), the injected value and the classify result would disagree. Additionally, the TypeScript fallback for `deviceProfileId` is `"local"` but Rust stores as `"unknown"` — a mismatch that causes `intelligence.classify` to return a 404 "Device profile not found" for users whose profile was stored under the "unknown" key.

---

## 🔒 Security Concerns

### SEC-1 — JWT secret has insecure hardcoded default *(carried)*
**File:** `apps/cloud-api/src/middleware/auth.ts:12`

```ts
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
```

If `JWT_SECRET` is unset in production, all JWTs can be forged.

**Fix:**
```ts
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}
```

---

### SEC-2 — PowerShell scripts built via string formatting with DB-sourced values *(carried)*
**Files:** `apps/service-core/src/rollback.rs:303`, `rollback.rs:476`

Registry restore and BCD restore build PowerShell/bcdedit command strings by directly interpolating `prev.path`, `prev.value_name`, and `val_str` from SQLite. A compromised DB row could inject shell metacharacters. The BCD case is especially risky:
```rust
let script = format!("bcdedit /set {{current}} {} {}", element, val_str);
```

**Fix:** Wrap all dynamic values in single-quotes with inner single-quote escaping, or pass via PowerShell `-ArgumentList`.

---

### SEC-3 — `openExternal` only checks `https://` prefix, no domain restriction *(carried)*
**File:** `apps/desktop/src/preload/index.ts:118`

Any `https://` URL can be opened in the system browser. Consider restricting to a known allowlist (`stripe.com`, `redcore-tuning.com`).

---

### SEC-4 — Stripe env vars fall back to empty strings without startup validation *(carried)*
**Files:** `apps/cloud-api/src/routes/webhooks.ts:8,12`, `subscription.ts:10`

Both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` default to `""`. With an empty key, Stripe operations fail at runtime with auth errors rather than at startup.

---

## Architecture Recommendations

### ARCH-1 — No SQLite schema migration system *(carried)*
**File:** `apps/service-core/src/db.rs:47`

`run_migrations()` uses `CREATE TABLE IF NOT EXISTS` in a single batch. Adding a column (e.g., new fields on `rollback_snapshots`) requires `ALTER TABLE` — not handled anywhere. Existing user installations will not receive schema updates.

**Recommendation:** Add a `schema_version` table and versioned migration steps.

---

### ARCH-2 — License validation split across two independent systems *(carried)*
The TypeScript `license-client` (AES-256-GCM encrypted file cache) and the Rust `license.rs` (unencrypted SQLite JSON blob) validate licenses independently and can have different views of the user's tier. The `license.setTier` IPC call partially patches this but relies on a hardcoded 3-second startup delay (`main.ts:315`) that's fragile under slow machines or service startup failures.

**Recommendation:** Make Rust service the single license authority; Electron reads tier from the service via IPC.

---

### ARCH-3 — License key delivered via environment variable *(carried)*
**Files:** `apps/desktop/src/main/index.ts:31`, `apps/service-core/src/license.rs:139`

License keys come from `REDCORE_LICENSE_KEY` env var. `license.activate` IPC is declared in the contract but unimplemented (CRIT-3). License activation is currently undoable through the app UI.

---

### ARCH-4 — `Database` not `Send` — blocks future IPC concurrency *(carried)*
`rusqlite::Connection` is not `Send`. The current single-threaded IPC loop works, but adding any async parallelism to request handling will require major refactoring.

---

## Performance Concerns

### PERF-1 — Full WMI hardware scan runs for every `scan.quick` call *(carried)*
Both `scan.hardware` and `scan.quick` call `scan_full()`. On Windows, WMI cold-start takes 3-5 seconds.

### PERF-2 — New `reqwest::Client` created on every Rust license validation call *(carried)*
**File:** `apps/service-core/src/license.rs:132`

`reqwest::Client::builder().build()` inside `validate_remote()`. HTTP clients should be created once and reused.

### PERF-3 — `planner::get_actions()` deserializes the full action catalog per call *(carried)*
**File:** `apps/service-core/src/ipc.rs:209`

Deserializes the full catalog on every `tuning.applyAction` call. Cache or preload the catalog on service startup.

### PERF-4 — Machine classification runs 3× on a single "Classify Now" click *(NEW)*
See HIGH-10. `classify()` + `loadProfile()` → 3× calls to `intelligence::classify()`.

---

## Missing Error Handling

### ERR-1 — `saveCache()` silently swallows all errors including disk full *(carried)*
**File:** `packages/license-client/src/index.ts:228`

The entire function body is in a `try/catch {}` with no logging.

### ERR-2 — App hub downloads have no checksum verification *(carried)*
**File:** `apps/service-core/src/apphub.rs:41`

Installers are downloaded and executed with no hash verification. `AppCatalogEntry` has `checksum` and `checksumAlgo` fields but `AppEntry` struct doesn't, and `install_app()` never verifies the hash. A CDN compromise or MITM can serve a malicious installer.

### ERR-3 — Service restart loop has no backoff or retry limit *(carried)*
**File:** `apps/desktop/src/main/index.ts:152-155`

On crash, service restarts after exactly 2 seconds, forever. If the binary is broken or a required DLL is missing, this burns CPU indefinitely with no user notification.

---

## Dead Code / Incomplete Implementations

- **DEAD-1:** `signRefreshToken()` in `auth.ts` — never called
- **DEAD-2:** `rollback.createSnapshot` and `rollback.restoreActions` declared in IPC contract, unimplemented in Rust (CRIT-3)
- **DEAD-3:** `IpcEvents` planned events (`scan.progress`, `tuning.actionProgress`, `benchmark.progress`, `thermal.update`) commented out — but `ApplyWorkflowPage.tsx`, `DashboardPage.tsx`, and `HardwarePage.tsx` still subscribe to them → TypeScript errors (see CRIT-2)
- **DEAD-4:** `apps/cloud-api/src/lib/oauth.ts` exists but no OAuth callback route is registered. The connected accounts feature accepts `providerUserId` directly from the client — anyone can claim any OAuth identity without going through the OAuth flow
- **DEAD-5:** `apphub.checkUpdates` in IPC contract, unimplemented in Rust (CRIT-3)
- **DEAD-6:** `intelligence.getProfile` and `intelligence.getRecommendations` license gate (`tier_allows(license, "intelligent_recommendations")`) will never fire — `intelligent_recommendations` is in the free features list (MED-12)
- **DEAD-7:** `machine_classifications` DB table is written to in `intelligence.classify` handler but never read. The full classification history is stored but unused.

---

## Recommended Fix Priority Order

| # | ID | Description | Why First |
|---|-----|-------------|-----------|
| 1 | CRIT-2 | TypeScript build fails with 15 errors | CI is broken; app doesn't type-check. Blocks confidence in all other changes. |
| 2 | CRIT-1 | Stripe webhook userId always undefined | No subscriptions ever activate. Revenue pipeline is broken. |
| 3 | CRIT-3 | 13 missing IPC handlers | Multiple pages crash on load; core features non-functional. |
| 4 | HIGH-2 | journal.resume panics service on DB failure | Panic in IPC handler violates core Rust service rules. |
| 5 | HIGH-3 | rollback.rs `.unwrap()` panic | Any corrupt snapshot crashes the service permanently. |
| 6 | HIGH-9 | intelligence build_profile returns "warnings" not "warningNotes" | Silent data loss — safety warnings never shown. |
| 7 | SEC-1 | JWT secret has insecure default | If env var unset in production, all auth is bypassable. |
| 8 | HIGH-7 | Deleted users still auth; no Stripe cancel | Security + billing integrity. |
| 9 | MED-11 | isPremium Zustand anti-pattern | License tier changes never reflected in sidebar/profile without reload. |
| 10 | HIGH-1 | `cloudApi.auth.me()` wrong route | User profile fetch always 404s. |
| 11 | HIGH-4 | Registration not atomic | Orphaned users on any transient DB error. |
| 12 | HIGH-5 | Oldest subscription returned | Users see wrong tier after upgrade. |
| 13 | HIGH-6 | Wrong default API port | Dev workflow broken without documentation. |
| 14 | HIGH-8 | `UserProfile.tier` missing "expert" | Type safety broken for expert tier users. |
| 15 | MED-14 | suggestedPreset divergence Rust vs TypeScript | Users see conflicting preset recommendations. |
| 16 | HIGH-10 | Triple-classify on single user action | WMI overhead × 3 per click. |
| 17 | MED-13 | checksumAlgo contract violation | Compound with ERR-2: supply chain risk on app hub. |
| 18 | SEC-2 | PowerShell string injection from DB | Low probability, high impact if exploited. |
| 19 | ARCH-1 | No DB migration system | Schema additions will corrupt existing installs. |
| 20 | ERR-2 | No installer checksum verification | Supply chain risk on app hub. |
| 21 | All remaining MEDIUM/LOW/PERF | — | Cleanup after critical path is fixed. |
