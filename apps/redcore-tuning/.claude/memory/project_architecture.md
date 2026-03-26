---
name: Platform Architecture
description: redcore-Tuning is a premium Windows optimization platform with Electron desktop, Rust privileged service, and Fastify cloud API — all connected via typed JSON-RPC IPC contracts
type: project
---

redcore-Tuning is a commercial Windows optimization product with three layers:

1. **Desktop** (Electron + React + Tailwind + Framer Motion) — premium UI with custom frameless titlebar, Apple-grade polish
2. **Service** (Rust + tokio + windows-rs) — privileged daemon handling registry, WMI, ETW, benchmarks, rollback via SQLite
3. **Cloud API** (Fastify + PostgreSQL) — licensing, auth, telemetry, updates

**Why:** The separation ensures security (renderer never touches system APIs) and reversibility (every tuning action has backup/rollback).

**How to apply:** All system changes must flow through the IPC contract (`packages/shared-schema/src/ipc.ts`). When adding features, touch all three layers as needed. Feature gating uses `FEATURE_GATES` in shared-schema.
