#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# redcoreECO — Deploy to VDS
# ═══════════════════════════════════════════════════════════════════════════════
# Canonical VDS root:
#   cd /opt/redcore/app && bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_ROOT}"

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

if [[ "${BUILD_OS_RELEASE:-0}" == "1" ]]; then
  echo "── Build and publish latest redcore OS release ──"
  bash scripts/build-and-publish-os-release.sh
fi

echo "── Restart services ──"
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  DEPLOY COMPLETE                         ║"
echo "╚══════════════════════════════════════════╝"
pm2 ls
