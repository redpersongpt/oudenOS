# redcore OS Open-Source Publication Plan

## Non-negotiable rule

Do not publish the current monorepo as-is.

The current repository still contains tracked internal material and infrastructure references, including:

- `CODEXHANDOFF.md`
- `CLAUDE.md`
- `CoWorkClaude.md`
- `ECOBUGHUNTERCLAUDE.md`
- `docs/tuning/BUGHUNTERCLAUDE.md`
- `.github/workflows/build-installers.yml`
- `render.yaml`

That is enough to leak internal process and production infrastructure context even if raw secrets are later removed.

## Correct boundary

The public `redcore OS` repository should contain only:

- `apps/os-desktop`
- `services/os-service`
- `playbooks`
- public repo metadata and docs

It should not contain:

- web/auth/Stripe/email infrastructure
- VDS deployment scripts
- cloud/tuning products
- internal handoff docs
- private operations notes

## Why not blanket-strip every code comment

Removing every comment is the wrong optimization.

It hurts maintainability and does not meaningfully improve public trust on its own. The correct standard is:

- remove internal notes
- remove review leftovers and AI-looking filler
- remove deployment/process references
- keep comments that explain non-obvious system behavior

The open-source checker enforces that internal-style markers like `TODO`, `FIXME`, `HACK`, `CLAUDE`, and `BUGHUNTER` do not ship in the export.

## Publication flow

1. Run:

```bash
bash scripts/prepare-redcore-os-open-source.sh
```

2. Review the generated repo under:

```bash
artifacts/open-source/redcore-os
```

3. Create a new empty public GitHub repository.

4. Copy only the generated export into that repository.

5. Run a final human review for:

- naming
- wording
- screenshots
- legal/license choice
- Windows build instructions
- source-first wording instead of binary release promises

6. Push the new repo.

## Manual items before first public push

- rotate any secrets that were ever pasted into chat, docs, or terminals
- decide the public repo slug and badge URLs
- choose screenshots for the README
- optionally rewrite commit history if you insist on publishing from this repository lineage

## Current recommendation

Use a fresh public repository with the generated export. Keep the public repo source-first and build-from-source. Do not try to convert this monorepo directly into a public repository.
