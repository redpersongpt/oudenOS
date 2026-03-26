# Codemap — redcore-Tuning

## Entry points
- `apps/desktop/src/main/index.ts` — Electron main process (thin relay, window management, IPC forwarding)
- `apps/desktop/src/renderer/main.tsx` — React app entry
- `apps/desktop/src/preload/index.ts` — contextBridge API (`window.redcore`)
- `apps/service-core/src/main.rs` — Rust service daemon (tokio, SQLite init, IPC server)
- `apps/cloud-api/src/index.ts` — Fastify server entry

## IPC contract (source of truth)
- `packages/shared-schema/src/ipc.ts` — `IpcMethods` (request/response) + `IpcEvents` (push)
- `packages/shared-schema/src/device.ts` — DeviceProfile
- `packages/shared-schema/src/tuning.ts` — TuningPlan, TuningAction, ActionOutcome
- `packages/shared-schema/src/benchmark.ts` — BenchmarkConfig, BenchmarkResult, BottleneckAnalysis
- `packages/shared-schema/src/rollback.ts` — RollbackSnapshot, AuditLogEntry, ConfigDiff
- `packages/shared-schema/src/journal.ts` — JournalState (reboot-resume)
- `packages/shared-schema/src/license.ts` — LicenseState, FEATURE_GATES, SubscriptionTier
- `packages/shared-schema/src/compatibility.ts` — Windows version compatibility predicates

## UI layer
- `apps/desktop/src/renderer/App.tsx` — Root component with routing
- `apps/desktop/src/renderer/pages/` — Feature pages (dashboard, tuning-plan, benchmark-lab, rollback-center, hardware, settings, onboarding, splash, bios-guidance, thermal-bottleneck, app-hub, apply-workflow)
- `apps/desktop/src/renderer/components/ui/` — Shared UI primitives (Button, Card, Badge, MetricCard, PremiumGate)
- `apps/desktop/src/renderer/components/layout/` — AppLayout, Sidebar, TitleBar
- `apps/desktop/src/renderer/stores/` — Zustand stores (device-store, license-store)
- `apps/desktop/src/renderer/lib/api.ts` — Service call wrapper

## Design system
- `packages/design-system/src/tokens/` — colors, spacing, typography, tailwind-preset
- `packages/design-system/src/motion/` — Framer Motion shared variants

## Rust service modules
- `apps/service-core/src/scanner.rs` — Hardware scan (WMI, registry reads)
- `apps/service-core/src/planner.rs` — Generates TuningPlan from DeviceProfile
- `apps/service-core/src/executor.rs` — Applies tuning actions (registry writes, service config)
- `apps/service-core/src/rollback.rs` — Snapshot/restore system
- `apps/service-core/src/journal.rs` — Reboot-resume state machine
- `apps/service-core/src/benchmark.rs` — Performance benchmarking
- `apps/service-core/src/db.rs` — SQLite schema and queries
- `apps/service-core/src/ipc.rs` — JSON-RPC server (stdio/named pipe)
- `apps/service-core/src/license.rs` — License validation with offline grace
- `apps/service-core/src/compatibility.rs` — Windows build compatibility checks
- `apps/service-core/src/powershell.rs` — Audited PS execution wrapper
- `apps/service-core/src/error.rs` — Error types (thiserror)

## Cloud API routes
- `apps/cloud-api/src/routes/auth.ts` — Authentication
- `apps/cloud-api/src/routes/license.ts` — License management
- `apps/cloud-api/src/routes/telemetry.ts` — Usage telemetry
- `apps/cloud-api/src/routes/updates.ts` — App update checks
- `apps/cloud-api/src/routes/webhooks.ts` — Payment/subscription webhooks

## Packages
- `packages/tuning-modules/src/` — Module definitions per category (cpu, gpu, memory, network, storage, audio, display, power, privacy, startup)
- `packages/benchmark-runners/` — Benchmark harness types
- `packages/rollback/` — Rollback diff utilities
- `packages/license-client/` — Client-side license validation
- `packages/download-center/` — App hub download logic

## Agent skills (`.agents/skills/`)
20 domain-specific tuning skill files covering: audio-latency, bios-optimization, bloatware-removal, cpu-optimization, display-tuning, driver-optimization, gaming-optimization, gpu-optimization, interrupt-affinity, latency-reduction, memory-optimization, network-optimization, power-management, privacy-hardening, process-priority, registry-tweaks, storage-optimization, syscall-optimization, thermal-management, timer-resolution

## Agent subagents (`.agents/subagents/`)
20 specialized subagents: audio-tuner, benchmark-runner, bloatware-cleaner, display-configurator, dpc-latency-analyzer, driver-updater, gaming-tuner, gpu-tuner, memory-optimizer, network-optimizer, performance-profiler, power-plan-configurator, registry-auditor, rollback-manager, security-hardener, service-manager, startup-optimizer, storage-optimizer, system-analyzer, thermal-monitor
