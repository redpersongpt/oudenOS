# AGENTS.md — oudenOS contributor & agent playbook

## CI monitoring + failure-fix loop (MANDATORY after every push)

Do **not** push and walk away. After every push, actively watch GitHub Actions and
drive the branch to green (or to a clearly-explained blocker). An agent run that
pushes without verifying CI is incomplete.

1. **After every push, immediately inspect GitHub Actions.**
2. Find the newest runs for the current branch:
   ```bash
   gh run list --branch <branch> --limit 10
   ```
3. Follow the active run:
   ```bash
   gh run watch --branch <branch> --exit-status
   # If --branch is unsupported by your gh version, watch by id:
   RUN_ID="$(gh run list --branch <branch> --limit 1 --json databaseId --jq '.[0].databaseId')"
   gh run watch "$RUN_ID" --exit-status
   ```
4. On failure, inspect **only the failed jobs first**:
   ```bash
   gh run view <RUN_ID> --json status,conclusion,name,event,headBranch,headSha,url
   gh run view <RUN_ID> --log-failed
   ```
5. **Fix the root cause, not the symptom.** Categorize first: typecheck / lint /
   unit tests / `cargo check`/`test` / Tauri build / Windows-only build / secret
   scan / dependency install / path or package-rename issue / stale `redcore`
   reference / workflow syntax.
6. Re-run the **strongest local checks** before pushing (use the *actual* scripts —
   inspect `package.json`, `pnpm-workspace.yaml`, `Cargo.toml`; do not invent names):
   ```bash
   pnpm install --frozen-lockfile
   pnpm -r --no-bail typecheck
   pnpm -r --no-bail lint
   pnpm -r --no-bail test
   cargo check && cargo test            # in services/os-service and services/tuning-service
   pnpm --dir apps/os-desktop audit:questionnaire   # Windows-proof gate (Node 22)
   ```
7. Push the fix.
8. Watch CI again (step 2).
9. Repeat until green.
10. **Never claim success until CI is actually green.** Verify, don't assume.
11. **If CI cannot be verified, say exactly why** (queued/pending, Windows-only,
    missing maintainer secret, etc.) and give the run URL.

### Rules while fixing CI
- Do **not** disable/skip tests to get green. Do **not** weaken the secret scan or
  the Windows shell-safety checks. Do **not** bypass Rust compile errors with broad
  `#[allow]` or dead code unless justified. Do **not** delete failing code unless it
  is *truly obsolete and verified unused* — and even then prefer a maintainer review.
- Do not touch unrelated product behavior. Fix the smallest correct thing.
- If a failure is environment-only (Windows runner, signing cert, unavailable
  secret), fix the workflow logic if it's wrong; otherwise document the exact
  missing secret/config **name** (never the value).

## This repo's CI map (as of the rebrand/hardening work)

| Workflow | Trigger | Notes |
|---|---|---|
| `secret-scan.yml` (gitleaks) | push `**`, PR | Runs on **every branch**. Must stay green; never weaken `gitleaks.toml`. |
| `os-windows-proof.yml` ("Windows Vertical Slice Proof") | push `main`, `workflow_dispatch` | windows-latest. Builds `services/os-service` + runs `audit:questionnaire`/`audit:verification` + IPC proof + Electron smoke. |
| `tuning-windows-proof.yml` ("Windows Vertical Slice Proof") | push `main`, `ci/windows-proof`, `workflow_dispatch` | Legacy line; builds `services/tuning-service`. |
| `build-installers.yml` | PR→`main` (path-filtered), `workflow_dispatch` | NSIS/Tauri installers. |
| `validate-tauri-migration.yml` | push `main` (path-filtered), `workflow_dispatch` | Tauri bridge parity. |
| `release.yml` | tag `v*`, `workflow_dispatch` | Builds + publishes; legacy `services/tuning-service`. |

**Most Windows workflows are `main`-scoped.** To test a feature branch against them,
trigger them on the branch:
```bash
gh workflow run os-windows-proof.yml --ref <branch>
```

### Known pre-existing blockers (NOT introduced by the rebrand)
- `os-windows-proof` `audit:questionnaire`/`audit:verification` import
  `applyDecisionOverrides` from `apps/os-desktop/src/renderer/lib/playbook-decision-overrides.ts`,
  which was **deleted** when plan resolution moved server-side (Rust
  `services/os-service/src/playbook/resolver.rs`, covered by
  `test_build_gated_actions_resolve_by_windows_build`). The client-side audit
  harness (`questionnaire-execution-audit.ts`, `verification-lib.ts`) is therefore
  unrunnable and needs a maintainer decision: rewrite to validate the server-side
  resolver, or retire in favour of the Rust resolver tests. **Do not** fabricate the
  removed module or delete the suite without that decision.

### Cross-platform gotchas
- Never use `new URL(import.meta.url).pathname` for filesystem paths — it yields
  `D:\D:\…` on Windows. Use `fileURLToPath(import.meta.url)` (`node:url`).
- `ripgrep` skips hidden dirs by default; use `git grep` (or `rg --hidden`) when
  auditing `.github/`, `.gitignore`, etc.
