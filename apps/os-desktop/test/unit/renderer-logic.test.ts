// Unit tests for the renderer's pure logic. Run: pnpm --dir apps/os-desktop test
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizePlatform, normalizeStatus, isLiveWindows, demoProfileAllowed } from "../../src/renderer/lib/runtime.ts";
import { classifyActionResult, classifyActionCall, classifyPersonalizationResult, describeFailedOperations, describeRestorePoint, reasonLabelKey, reasonLabelEn, SKIP_REASONS } from "../../src/renderer/lib/service-errors.ts";
import { classifyBlockedReason, isNotApplicable } from "../../src/renderer/lib/blocked-reason.ts";
import { readWindowsBuild, readHealthChecks } from "../../src/renderer/lib/assessment.ts";
import { migrateWizardState, decideRehydrate, alignSteps, WIZARD_STATE_VERSION } from "../../src/renderer/lib/wizard-persist.ts";
import { estimateRemainingMs, etaBucket } from "../../src/renderer/lib/eta.ts";
import { readQuickSetups, fillUnanswered, buildQuickSetupAnswers, setupForPreset, optInValue } from "../../src/renderer/lib/quick-setup.ts";
import { snapshotsForRun } from "../../src/renderer/lib/undo.ts";
import { formatLog } from "../../src/renderer/stores/log-store.ts";

test("platform normalisation maps Tauri's 'windows' to win32", () => {
  assert.equal(normalizePlatform("windows"), "win32");
  assert.equal(normalizePlatform("win32"), "win32");
  assert.equal(normalizePlatform("macos"), "darwin");
  assert.equal(normalizePlatform("linux"), "linux");
  assert.equal(normalizePlatform(undefined), "unknown");
});

test("runtime status: live Windows never allows the demo profile", () => {
  const live = normalizeStatus({ running: true, mode: "live", isAdmin: true, platform: "windows" });
  assert.equal(isLiveWindows(live), true);
  assert.equal(demoProfileAllowed(live), false);
  const down = normalizeStatus({ running: false, mode: "demo", isAdmin: null, platform: "windows", startError: "missing binary" });
  assert.equal(isLiveWindows(down), false);
  assert.equal(demoProfileAllowed(down), false, "a broken install on Windows is an error, not a demo");
  assert.equal(down.startError, "missing binary");
  assert.equal(down.isAdmin, null);
  const mac = normalizeStatus({ running: true, mode: "simulated", isAdmin: false, platform: "macos" });
  assert.equal(demoProfileAllowed(mac), true);
});

test("nested failure text is surfaced for rolled_back actions", () => {
  const outcome = classifyActionResult({
    status: "rolled_back",
    failed: 1,
    results: [
      { type: "registry", status: "success" },
      { type: "appx_remove", package: "Microsoft.BingNews", status: "failed", error: "Access is denied" },
      { type: "auto_rollback", status: "success" },
    ],
  });
  assert.equal(outcome.status, "failed");
  assert.equal(outcome.blocking, false);
  assert.match(outcome.errorMessage ?? "", /Rolled back after failure/);
  assert.match(outcome.errorMessage ?? "", /appx_remove \[Microsoft\.BingNews\]: Access is denied/);
});

test("rollback_failed is blocking; success/skipped are not failures", () => {
  const blocking = classifyActionResult({ status: "rollback_failed", failed: 2, results: [{ type: "auto_rollback", status: "failed", error: "restore failed" }] });
  assert.equal(blocking.blocking, true);
  assert.equal(classifyActionResult({ status: "success", failed: 0 }).status, "applied");
  assert.equal(classifyActionResult({ status: "skipped", failed: 0 }).status, "skipped");
  assert.equal(classifyActionResult(null).status, "failed");
  assert.equal(describeFailedOperations({ results: [] }), null);
});

test("personalization and restore point keep the real reason", () => {
  const pers = classifyPersonalizationResult({
    ok: true,
    data: { status: "partial", failed: 1, snapshotId: "snap-1", results: [{ type: "wallpaper", status: "failed", error: "file not found" }] },
  });
  assert.equal(pers.applied, false);
  assert.equal(pers.snapshotId, "snap-1");
  assert.match(pers.errorMessage ?? "", /wallpaper: file not found/);
  assert.equal(classifyPersonalizationResult({ ok: false, error: "timed out" }).errorMessage, "timed out");
  const rp = describeRestorePoint({ ok: true, data: { status: "failed", message: "Windows could not create a restore point.", error: "COM error" } });
  assert.equal(rp.status, "failed");
  assert.match(rp.detail ?? "", /COM error/);
});

const STEPS = [
  { id: "welcome", label: "Welcome", status: "current" as const },
  { id: "execution", label: "Apply", status: "locked" as const },
  { id: "reboot-resume", label: "Reboot", status: "locked" as const },
  { id: "report", label: "Complete", status: "locked" as const },
];

test("persist migrate drops v1 state except a pending reboot-resume", () => {
  assert.equal(WIZARD_STATE_VERSION, 2);
  assert.deepEqual(migrateWizardState({ currentStep: "report", detectedProfile: { id: "gaming_desktop" } }, 0, STEPS), {});
  const resumed = migrateWizardState(
    { currentStep: "reboot-resume", steps: [{ id: "reboot-resume", status: "current" }, { id: "gone", status: "completed" }], resolvedPlaybook: { x: 1 } },
    0,
    STEPS,
  );
  assert.equal(resumed.currentStep, "reboot-resume");
  assert.equal(resumed.detectedProfile, null);
  const steps = resumed.steps as Array<{ id: string; status: string }>;
  assert.deepEqual(steps.map((s) => s.id), ["welcome", "execution", "reboot-resume", "report"]);
  assert.equal(steps.find((s) => s.id === "reboot-resume")?.status, "current");
  // current version passes through untouched
  assert.deepEqual(migrateWizardState({ currentStep: "profile" }, 2, STEPS), { currentStep: "profile" });
});

test("rehydrate: finished runs start fresh, interrupted applies are flagged", () => {
  assert.deepEqual(decideRehydrate("handoff"), { freshSession: true, interrupted: false });
  assert.deepEqual(decideRehydrate("report"), { freshSession: true, interrupted: false });
  assert.deepEqual(decideRehydrate("execution"), { freshSession: false, interrupted: true });
  assert.deepEqual(decideRehydrate("playbook-strategy"), { freshSession: false, interrupted: false });
  assert.equal(alignSteps(undefined, STEPS)[0].status, "current");
});

test("ETA needs two samples and buckets calmly", () => {
  assert.equal(estimateRemainingMs([1000], 5), null);
  assert.equal(estimateRemainingMs([1000, 3000], 5), 10_000);
  assert.equal(estimateRemainingMs([1000, 3000], 0), 0);
  assert.deepEqual(etaBucket(10_000), { unit: "lessThanMinute", minutes: 0 });
  assert.deepEqual(etaBucket(150_000), { unit: "minutes", minutes: 3 });
  assert.equal(etaBucket(null), null);
});

test("quick setups: parse, fill unanswered, opt-ins", () => {
  const setups = readQuickSetups({
    quickSetups: [
      { id: "recommended", preset: "balanced", answers: { a: true, b: "keep", junk: 3 }, optionalQuestionKeys: ["disableDefender"] },
      { id: "broken" },
    ],
  });
  assert.equal(setups.length, 1);
  assert.deepEqual(setups[0].answers, { a: true, b: "keep" });
  assert.deepEqual(readQuickSetups({}), []);
  assert.equal(setupForPreset(setups, "aggressive")?.id, "recommended");

  const questions = [
    { key: "a", options: [{ value: true }, { value: false }] },
    { key: "b", options: [{ value: "keep" }, { value: "remove" }] },
    { key: "c", options: [{ value: true }] },
  ];
  assert.deepEqual(fillUnanswered(questions, { a: false }, setups[0]), { b: "keep" });

  assert.equal(optInValue({ options: [{ value: "keep" }, { value: "off", danger: true }] }), "off");
  assert.equal(optInValue({ options: [{ value: true }, { value: false }] }), true);
  assert.equal(optInValue({ options: [{ value: "x" }] }), null);
  const answers = buildQuickSetupAnswers(setups[0], { disableDefender: true, notOptional: true });
  assert.equal(answers.aggressionPreset, "balanced");
  assert.equal(answers.disableDefender, true);
  assert.equal(answers.notOptional, undefined, "only listed optional keys can be opted into");
});

test("undo restores only this run's snapshots, newest first", () => {
  const picked = snapshotsForRun(
    [
      { id: "old", createdAt: "2026-11-20T10:00:00Z" },
      { id: "a", createdAt: "2026-11-21T10:00:05Z" },
      { id: "b", createdAt: "2026-11-21T10:00:09Z" },
      { id: "pers", createdAt: "2026-11-21T10:00:10Z" },
    ],
    "2026-11-21T10:00:00Z",
    ["pers"],
  );
  assert.deepEqual(picked.map((s) => s.id), ["b", "a"]);
  assert.deepEqual(snapshotsForRun([{ id: "x", createdAt: "2026-01-01T00:00:00Z" }], "not a date"), []);
});

test("log export header carries the bug-report context", () => {
  const text = formatLog(
    [{ timestamp: "t", level: "error", category: "Action", message: "Failed: X", details: "appx_remove: denied" }],
    { appVersion: "1.1.0", windowsBuild: 26100, profile: "gaming_desktop", preset: "balanced", language: "tr", mode: "live", platform: "win32", isAdmin: true },
    new Date("2026-11-21T00:00:00Z"),
  );
  assert.match(text, /App version: 1\.1\.0/);
  assert.match(text, /Windows build: 26100/);
  assert.match(text, /Language: tr/);
  assert.match(text, /└─ appx_remove: denied/);
});

// ── v1.1 service contract: status / reason / RPC-code mapping ───────────────

test("partial = applied with skipped steps (never a failure)", () => {
  const o = classifyActionResult({
    status: "partial",
    failed: 0,
    snapshotId: "s1",
    results: [
      { type: "registry", status: "success" },
      { type: "registry", valueName: "TaskbarDa", status: "skipped", reason: "access_denied_protected", note: "UCPD" },
    ],
  });
  assert.equal(o.status, "applied");
  assert.equal(o.blocking, false);
  assert.equal(o.skippedSteps.length, 1);
  assert.equal(o.skippedSteps[0].reason, "access_denied_protected");
  assert.equal(o.skippedSteps[0].target, "TaskbarDa");
  assert.equal(o.snapshotId, "s1");
});

test("failed = nothing changed, no rollback; rolled_back keeps the first error", () => {
  const failed = classifyActionResult({
    status: "failed", failed: 1, nothingChanged: true, error: "preflight: key missing", snapshotId: null,
    results: [{ type: "registry", status: "failed", reason: "preflight_failed", error: "preflight: key missing" }],
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.nothingChanged, true);
  assert.equal(failed.rolledBack, false);
  assert.equal(failed.snapshotId, null);
  assert.match(failed.errorMessage ?? "", /^Failed before anything changed: registry: preflight: key missing/);

  const rb = classifyActionResult({
    status: "rolled_back", failed: 1, error: "Access is denied",
    rollback: { type: "auto_rollback", status: "success" },
    results: [
      { type: "service", service: "DiagTrack", status: "failed", error: "Access is denied" },
      { type: "auto_rollback", status: "success" },
    ],
  });
  assert.equal(rb.rolledBack, true);
  assert.equal(rb.blocking, false);
  assert.match(rb.errorMessage ?? "", /service \[DiagTrack\]: Access is denied/);
});

test("skipped action carries its reason; hardware_not_applicable marks not-applicable", () => {
  const o = classifyActionResult({ status: "skipped", failed: 0, snapshotId: null, results: [{ type: "bcd", status: "skipped", reason: "hardware_not_applicable" }] });
  assert.equal(o.status, "skipped");
  assert.equal(o.notApplicable, true);
  assert.match(o.errorMessage ?? "", /Doesn't apply to this hardware/);
});

test("RPC codes: -23 skipped, -403 needs elevation (blocking), -3 / -500 failed", () => {
  const na = classifyActionCall({ ok: false, error: "Action not applicable on this system: AMD only", code: -23 });
  assert.equal(na.status, "skipped");
  assert.equal(na.notApplicable, true);
  const el = classifyActionCall({ ok: false, error: "not elevated", code: -403 });
  assert.equal(el.status, "failed");
  assert.equal(el.needsElevation, true);
  assert.equal(el.blocking, true);
  assert.match(classifyActionCall({ ok: false, error: "Invalid actionId", code: -3 }).errorMessage ?? "", /^Invalid target/);
  assert.match(classifyActionCall({ ok: false, error: "panicked", code: -500 }).errorMessage ?? "", /^Internal service error/);
  assert.equal(classifyActionCall({ ok: false, error: "timed out", code: null }).status, "failed");
});

test("every skip reason has a label; unknown reasons fall back", () => {
  for (const r of SKIP_REASONS) {
    assert.equal(reasonLabelKey(r), `reason.${r}`);
    assert.notEqual(reasonLabelEn(r), `reason.${r}`);
  }
  assert.equal(reasonLabelKey("something_new"), "reason.unknown");
  assert.equal(reasonLabelEn("access_denied_protected"), "Protected by Windows (skipped)");
});

test("restore point: created / throttled / unavailable / failed", () => {
  assert.equal(describeRestorePoint({ ok: true, data: { status: "created" } }).status, "created");
  assert.equal(describeRestorePoint({ ok: true, data: { status: "skipped", reason: "throttled" } }).status, "throttled");
  assert.equal(describeRestorePoint({ ok: true, data: { status: "unavailable", reason: "off" } }).status, "unavailable");
  assert.equal(describeRestorePoint({ ok: false, error: "x" }).status, "failed");
});

test("personalization: partial/skipped features are not failures; UCPD widgets flagged", () => {
  const p = classifyPersonalizationResult({
    ok: true,
    data: {
      status: "success", failed: 0, skipped: 1, snapshotId: "p1",
      results: [
        { feature: "darkMode", status: "success" },
        { feature: "taskbarCleanup", status: "partial", items: [
          { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", valueName: "TaskbarDa", status: "skipped", reason: "access_denied_protected" },
        ] },
      ],
    },
  });
  assert.equal(p.applied, true);
  assert.equal(p.skippedItems.length, 1);
  assert.equal(p.skippedItems[0].type, "taskbarCleanup");
  assert.equal(p.widgetsProtected, true);
  const someFailed = classifyPersonalizationResult({ ok: true, data: { status: "partial", failed: 1, error: "wallpaper: x", results: [] } });
  assert.equal(someFailed.applied, false, "personalizer 'partial' means some features FAILED");
  assert.equal(classifyPersonalizationResult({ ok: false, error: "no", code: -403 }).needsElevation, true);
});

test("blocked reasons: not-applicable kinds are neutral, choices are not", () => {
  assert.equal(classifyBlockedReason("retired: replaced by X")?.kind, "notApplicable");
  assert.equal(classifyBlockedReason("Duplicate of perf.foo")?.vars.of, "perf.foo");
  assert.equal(classifyBlockedReason("hardware not applicable: no NVIDIA GPU")?.kind, "notApplicable");
  assert.equal(classifyBlockedReason("Not applicable after Windows build 19045")?.vars.build, 19045);
  assert.equal(classifyBlockedReason("Expert-only action")?.kind, "expert");
  assert.equal(classifyBlockedReason('You chose "No" for X.')?.kind, "choice");
  assert.equal(isNotApplicable(null, "BuildGated"), true);
  assert.equal(isNotApplicable("Work PC safeguard", "Blocked"), false);
});

test("assessment: service-detected build and health checks", () => {
  assert.equal(readWindowsBuild({ detectedBuild: 26100 }), 26100);
  assert.equal(readWindowsBuild({ windowsBuild: { build: 22631, displayVersion: "23H2" } }), 22631);
  assert.equal(readWindowsBuild({ windows: { BuildNumber: "19045" } }), 19045);
  assert.equal(readWindowsBuild({}), null);
  const checks = readHealthChecks({ healthChecks: [
    { id: "bios-age", status: "attention", title: "BIOS", detail: "old", evidence: { ageDays: 516 } },
    { id: "bad", status: "weird" },
  ] });
  assert.equal(checks.length, 1);
  assert.equal(checks[0].status, "attention");
});