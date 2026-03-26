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

## Stack

| Layer | Tech |
|-------|------|
| UI | React 18, TypeScript, Tailwind, Framer Motion |
| Desktop | Electron (frameless, custom titlebar) |
| Build | Vite, pnpm workspaces |
| Service | Rust, tokio, windows-rs 0.58, rusqlite, interprocess |
| Cloud | Fastify, PostgreSQL |
| IPC | JSON-RPC over stdio/named pipe |

## Features

- **66 tuning actions** across 15 categories (CPU, GPU, memory, network, storage, power, audio, display, privacy, startup, services, security, scheduler, gaming, system controls)
- **Real hardware scanning** via WMI + registry + PowerShell
- **Adaptive plan generation** with risk/tier/compatibility gating
- **Full rollback system** with SQLite-persisted snapshots
- **Real benchmark engine** (system latency, storage speed, memory throughput)
- **App Hub** with silent installer support (Brave, 7-Zip, Notepad++, Everything, VLC)
- **Reboot-resume journal** for multi-step tuning workflows
- **Offline-first licensing** with AES-256-GCM encrypted cache

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

## Project Activity

![Alt](https://repobeats.axiom.co/api/embed/d3501dcf0fd81b97796a54adfb2658582ad6b97e.svg "Repobeats analytics image")
