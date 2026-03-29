# redcore OS Verification Harness

This is the operational-truth layer for redcore OS.

It is not another UI proof.
It is not another structural questionnaire audit.
It is the post-apply harness for:

- question -> plan delta proof
- action-by-action apply proof
- post-apply readback
- rollback readback
- personalization verification
- blocked/preserved profile proof

## What it generates

Running the harness creates an artifact bundle with:

- `question-plan-deltas.json`
- `action-verification-matrix.json`
- `action-verification-matrix.md`
- `resolved-playbook.json`
- `selected-question-deltas.json`
- `action-results.json`
- `personalization-report.json`
- `blocked-actions.json`
- `certification-summary.json`

## One-command consumer Windows run

From the repo root on a real consumer Windows machine:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1
```

That command will:

1. install workspace dependencies
2. run questionnaire integrity audit
3. generate the action verification matrix
4. run the consumer Windows certification harness
5. write a timestamped artifact bundle under `artifacts/os-certification/`

## Prerequisites

- Windows 11 or later
- Node.js + pnpm
- Rust toolchain installed
- `services/os-service/target/debug/redcore-os-service.exe` or release build available
- elevated PowerShell session recommended

If the service binary does not exist yet:

```powershell
cd services/os-service
cargo build
cd ../..
```

## Safer rollout order

Start narrow, then widen:

1. `tier1`
   - shell/taskbar/explorer
   - AI/privacy user-visible actions
   - Edge suppression logic
   - personalization
2. `tier2`
   - services
   - tasks
   - startup cleanup
   - telemetry reduction
3. `all`
   - includes reboot-sensitive and harder expert actions

Examples:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1 -Priority tier1
powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1 -Priority tier2
powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1 -Priority all
```

## Custom answer sets

Default gaming answer fixture:

- `apps/os-desktop/test/fixtures/gaming-certification-answers.json`

Work PC preservation fixture:

- `apps/os-desktop/test/fixtures/workpc-preservation-answers.json`

Example:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/consumer-windows-proof.ps1 `
  -Profile work_pc `
  -Preset conservative `
  -AnswersPath apps/os-desktop/test/fixtures/workpc-preservation-answers.json `
  -Priority tier1
```

## Pass/fail interpretation

Read `certification-summary.json` first.

- `overallStatus = pass`
  - all verified checks passed
- `overallStatus = partial`
  - some actions require reboot, expose machine-specific gaps, or only have partial readback
- `overallStatus = fail`
  - at least one apply/readback/rollback assertion failed

Then inspect:

- `action-results.json`
  - exact per-action apply/readback/rollback truth
- `personalization-report.json`
  - dark mode, accent, taskbar cleanup, explorer cleanup, transparency, explorer process readback
- `selected-question-deltas.json`
  - proof of which chosen answers changed the final plan
- `blocked-actions.json`
  - preserved or blocked actions with honest reasons

## Honest limits

The harness is designed to tell the truth when proof is incomplete.

Expected honest outcomes include:

- `requires reboot to verify fully`
- `executable but readback not yet implemented`
- `not safely machine-verifiable yet`
- `blocked by profile by design`

Those are product-truth states, not cosmetic failures.
