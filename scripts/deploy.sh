#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# redcoreECO — Deploy to VDS
# ═══════════════════════════════════════════════════════════════════════════════
# Run from the project root on the VDS:
#   cd /home/ubuntu/redcoreECO && bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "── Pull latest code ──"
git pull origin main

echo "── Install dependencies ──"
pnpm install --frozen-lockfile

echo "── Build shared DB package ──"
pnpm --dir packages/db build

echo "── Build web ──"
pnpm --dir apps/web build

echo "── Build tuning-api ──"
pnpm --dir apps/tuning-api build

echo "── Build os-api ──"
pnpm --dir apps/os-api build

echo "── Build cloud-api ──"
pnpm --dir apps/cloud-api build

echo "── Run database migrations ──"
pnpm --dir packages/db db:push

echo "── Restart services ──"
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  DEPLOY COMPLETE                         ║"
echo "╚══════════════════════════════════════════╝"
pm2 ls
