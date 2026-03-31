# redcoreECO

Premium Windows optimization ecosystem.

## Structure

```
apps/
  web/               Next.js website (Render)
  tuning-desktop/    Electron optimizer
  tuning-api/        Cloud API (Fastify)
  tuning-website/    Marketing site
  os-desktop/        Installer wizard (Electron 820x580)
  os-api/            Cloud API
  os-website/        Marketing site

packages/
  tuning-shared-schema/    IPC contracts
  tuning-design-system/    Design tokens
  tuning-license-client/   License validation
  tuning-benchmark/        Benchmark harness
  tuning-rollback/         Rollback utilities
  tuning-modules/          Module definitions
  tuning-download/         App hub downloads
  os-shared-schema/        OS IPC contracts
  os-design-system/        OS design tokens

services/
  tuning-service/    Rust privileged daemon
  os-service/        Rust transformation engine + playbook loader

playbooks/           YAML transformation modules (37 files)
docs/                Product docs (CLAUDE.md, BUGHUNTER, etc.)
proof/               Visual proof screenshots
scripts/             Consumer Windows proof, utilities
```

## Deploy (Render)

Branch: `main` | Root: `apps/web` | Build: `pnpm install && pnpm build`

## AME Wizard Playbook

We rebuilt this repo with the same wizard/playbook flow as ReviOS: drop the relevant playbook into the AME Wizard installer, follow the prompts, and the local Rust service applies the reversible transformation plan. The `playbooks/` YAMLs now expose the same configuration hooks as the AME Wizard (version 2.0+). The docs folder contains walkthroughs, and `scripts/build-and-publish-os-release.sh` keeps the exported bundle aligned with the wizard expectation.

## Dev

```bash
pnpm install
pnpm dev:web        # Website
pnpm dev:tuning     # Tuning desktop
pnpm dev:os         # OS desktop
pnpm typecheck      # All packages
```
