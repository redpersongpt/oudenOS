# Ouden

Premium Windows optimization ecosystem — OudenOS, Ouden.Tuning, ouden.cc

## Products

| Product | Description | Price |
|---------|-------------|-------|
| **OudenOS** | Windows optimization wizard — debloat, privacy, performance | Free |
| **Ouden.Tuning** | Deep tuning desktop — CPU, GPU, latency, benchmarks | $12.99 one-time |
| **ouden.cc** | Marketing site + SaaS backend | — |

## Structure

```
apps/
  web/               Next.js website (ouden.cc)
  tuning-desktop/    Electron tuning app (Ouden.Tuning)
  os-desktop/        Tauri optimization wizard (OudenOS)
  cloud-api/         SaaS backend — auth, billing, licensing
  tuning-api/        Tuning product API
  os-api/            OS product API

packages/
  db/                     Shared PostgreSQL schema
  tuning-design-system/   Design tokens + Tailwind preset
  system-analyzer/        Hardware classification + recommendations

services/
  tuning-service/    Rust privileged daemon
  os-service/        Rust transformation engine + playbook loader

playbooks/           YAML transformation modules
```

## Deploy

VDS: `REDACTED_VDS_IP` — nginx + PM2 + PostgreSQL

```bash
ssh ubuntu@REDACTED_VDS_IP
cd /home/ubuntu/redcoreECO && bash scripts/deploy.sh
```

## Dev

```bash
pnpm install
pnpm dev:web        # ouden.cc
pnpm dev:tuning     # Ouden.Tuning desktop
pnpm dev:os         # OudenOS desktop
```
