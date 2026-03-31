# Release Readiness

Status of all release-blocking conditions for redcore OS public release.

## Repo-Enforced (automated, cannot be bypassed)

| Gate | Enforcement | Status |
|------|-------------|--------|
| Action parity validation | `pnpm verify:full` in CI on every PR and push | Active |
| TypeScript type-check | `pnpm verify:full` in CI on every PR and push | Active |
| Windows Rust compilation | `cargo check` / `cargo build` in CI on every PR | Active |
| Service IPC smoke (7 checks) | `smoke-test-os-service.mjs` in CI on every PR | Active |
| Desktop contract smoke (9 checks) | `smoke-desktop.mjs` in CI on every PR | Active |
| Wizard navigation smoke (6 checks) | `smoke-desktop.mjs` in CI on every PR | Active |
| Semantic scenario smoke (5 checks) | `smoke-desktop.mjs` in CI on every PR | Active |
| Action-ID causality (7 checks) | `smoke-desktop.mjs` in CI on every PR | Active |
| Answer-toggle causality (10 checks) | `smoke-desktop.mjs` in CI on every PR | Active |
| Release gate blocks on missing proof | `release-gate.mjs` in release workflow | Active |

## Admin-Enforced (GitHub repo settings — must configure manually)

These settings are NOT controlled by repo files. A repo admin must configure them.

| Setting | Where | Required Value |
|---------|-------|---------------|
| Require PRs to merge to main | Repo > Settings > Branches > Branch protection rules > main | Enabled |
| Require status checks to pass | Same > Require status checks > `Structural Integrity` + `Rust Build + Smoke` | Enabled |
| Require up-to-date branches | Same > Require branches to be up to date | Recommended |
| Restrict force-push to main | Same > Do not allow force pushes | Enabled |
| Restrict tag creation | Repo > Settings > Tags > Protected tags > `v*` | Recommended |
| Require release-gate for tags | release.yml enforces this; but force-tagging bypasses it | See above |

### How to configure

1. Go to `github.com/redpersongpt/redcoreECO/settings/branches`
2. Add rule for `main`
3. Enable: Require pull request, Require status checks, Require up-to-date
4. Add required checks: `Structural Integrity`, `Rust Build + Smoke (Windows)`
5. Enable: Do not allow force pushes
6. Go to tag protection, add `v*`

## Manual Proof Required (cannot be automated in CI)

| Proof | Script | Status |
|-------|--------|--------|
| Windows apply + rollback | `scripts/capture-windows-proof.ps1` | Run on real Windows, commit artifacts |
| Windows reboot + resume | `scripts/capture-reboot-proof.ps1 -Phase pre-reboot` then Phase B auto-runs after reboot | Run on real Windows VM, commit artifacts |

### How to capture proof

```powershell
# 1. Build the service
cargo build --release -p redcore-os-service

# 2. Apply/rollback proof
.\scripts\capture-windows-proof.ps1

# 3. Reboot/resume proof (triggers real reboot)
.\scripts\capture-reboot-proof.ps1 -Phase pre-reboot
# (system reboots, Phase B runs automatically after login)

# 4. Commit artifacts
git add artifacts/windows-proof/ artifacts/reboot-proof/
git commit -m "proof: Windows runtime + reboot/resume proof for vX.Y.Z"
git push

# 5. Verify release gate passes
node scripts/release-gate.mjs --version X.Y.Z
```

## Release Checklist

Before tagging a release:

- [ ] `pnpm verify:full` passes locally
- [ ] CI pipeline is green on main
- [ ] Windows apply/rollback proof exists and is recent (<7 days)
- [ ] Windows reboot/resume proof exists and is recent (<7 days)
- [ ] Proof version matches release target
- [ ] `node scripts/release-gate.mjs --version vX.Y.Z` returns CLEAR TO RELEASE
- [ ] Branch protection is configured (see Admin-Enforced section)
- [ ] No `RELEASE_BLOCKER` markers in codebase
