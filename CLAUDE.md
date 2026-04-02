# redcoreECO

**Last updated:** 2026-03-28

## Repo Shape

- `apps/web`: Next.js marketing site
- `apps/cloud-api`: primary SaaS backend
- `apps/tuning-api`: slim product API, only app catalog
- `apps/os-api`: slim product API, only OS-specific license, updates, fleet admin
- `apps/tuning-desktop`: Electron desktop for redcore Tuning
- `apps/os-desktop`: Tauri desktop for redcore OS
- `services/*`: Rust privileged services
- `packages/db`: shared PostgreSQL schema package

## Backend Truth

- `cloud-api` owns auth, users, Stripe billing, subscriptions, webhooks, telemetry, admin, tuning updates, and OS donations.
- `tuning-api` is no longer a duplicate SaaS backend.
- `os-api` is no longer a duplicate SaaS backend.
- OS donations are served from `cloud-api /v1/donations/*`.

## Verified Commands

```bash
cd apps/cloud-api && pnpm exec tsc --noEmit
cd apps/cloud-api && pnpm exec tsc
cd apps/tuning-api && pnpm exec tsc
cd apps/os-api && pnpm exec tsc
```

## Deploy

- VDS IP: `REDACTED_VDS_IP`
- Main deploy entrypoint: [scripts/deploy.sh](/Users/redperson/redcoreECO/scripts/deploy.sh)
- First-time setup: [scripts/vds-setup.sh](/Users/redperson/redcoreECO/scripts/vds-setup.sh)

## Important Caveat

- This file is a compact operational summary, not a full architecture spec.
- If this file conflicts with code, trust the code.
