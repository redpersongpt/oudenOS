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

echo "── Build web ──"
pnpm --filter redcore-web build

echo "── Build tuning-api ──"
pnpm --filter tuning-api build 2>/dev/null || echo "  (skipped — no build script)"

echo "── Build os-api ──"
pnpm --filter os-api build 2>/dev/null || echo "  (skipped — no build script)"

echo "── Run database migrations ──"
cd packages/db && npx drizzle-kit push && cd ../..

echo "── Restart services ──"
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  DEPLOY COMPLETE                         ║"
echo "╚══════════════════════════════════════════╝"
pm2 ls
