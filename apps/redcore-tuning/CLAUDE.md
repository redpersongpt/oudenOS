# redcore-Tuning

Premium Windows optimization platform: Electron desktop shell + Rust privileged service + cloud licensing API.

## Architecture

```
Desktop (Electron + React + Vite)     Cloud API (Fastify)
  renderer ──contextBridge──► main     ├── auth
            preload typed API  │       ├── license
                               │       ├── telemetry
                    JSON-RPC   │       └── updates
                    stdio/pipe │
                               ▼
              service-core (Rust/tokio)
              ├── scanner (WMI, registry reads)
              ├── planner (generates TuningPlan)
              ├── executor (applies actions)
              ├── rollback (snapshot/restore)
              ├── journal (reboot-resume)
              ├── benchmark (performance metrics)
              └── db (SQLite state)
```

## Monorepo layout

- `apps/desktop` — Electron + React + Tailwind + Framer Motion
- `apps/service-core` — Rust privileged daemon (windows-rs, WMI, ETW, SQLite)
- `apps/cloud-api` — Fastify + TypeScript + PostgreSQL
- `packages/shared-schema` — **Typed IPC contracts** (source of truth for UI ↔ Rust)
- `packages/design-system` — Design tokens, Tailwind preset, motion variants
- `packages/tuning-modules` — TypeScript tuning module definitions
- `packages/benchmark-runners` — Benchmark harness types
- `packages/rollback` — Rollback diff utilities
- `packages/license-client` — License validation client
- `packages/download-center` — App hub download logic

## Hard rules

1. **Renderer NEVER touches system APIs** — all privileged ops route through `window.redcore.service.call()` → main process → Rust service
2. **Context isolation is mandatory** — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. All renderer APIs go through preload `contextBridge`
3. **Every tuning action must be reversible** — backup before apply, rollback on failure, audit log entry
4. **IPC contract is shared-schema** — `packages/shared-schema/src/ipc.ts` defines all method signatures. UI and Rust must both conform
5. **Feature gating** — check `FEATURE_GATES` in `packages/shared-schema/src/license.ts`. Premium features must gate in both UI and service
6. **Windows version awareness** — check compatibility predicates (`packages/shared-schema/src/compatibility.ts`) before applying any tweak
7. **No PowerShell as core engine** — PS is an audited execution backend only, wrapped by `service-core/src/powershell.rs`
8. **Electron main is thin relay** — no business logic in main process, just IPC forwarding

## Stack

| Layer | Tech |
|-------|------|
| UI | React 18, TypeScript, Tailwind, Framer Motion |
| Desktop | Electron (frameless, custom titlebar) |
| Build | Vite, pnpm workspaces |
| Service | Rust, tokio, windows-rs 0.58, rusqlite, interprocess |
| Cloud | Fastify, PostgreSQL |
| IPC | JSON-RPC over stdio/named pipe |

## Commands

```bash
pnpm dev              # Desktop dev (Vite HMR)
pnpm dev:api          # Cloud API dev
pnpm build            # Build all
pnpm build:desktop    # Build Electron app
pnpm typecheck        # tsc --noEmit across all packages
pnpm lint             # Lint all packages
pnpm test             # Test all packages
```

## Conventions

- TypeScript strict mode everywhere
- Discriminated unions for IPC message types
- Zustand for client state (`renderer/stores/`)
- Design tokens from `packages/design-system` — never hardcode colors/spacing
- UI components in `renderer/components/ui/` — reuse before creating
- Pages in `renderer/pages/<feature>/` — one directory per feature
- Rust error handling: `thiserror` for domain errors, `anyhow` for infra errors, no panics in IPC handlers
- No `unsafe` blocks without documented justification

## After edits

- Run `pnpm typecheck` to verify type safety
- Run related tests if they exist
- For Rust changes: `cargo check` in `apps/service-core/`
