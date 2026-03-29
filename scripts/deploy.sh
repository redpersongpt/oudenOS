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
WEB_DATABASE_URL="${WEB_DATABASE_URL:-file:${APP_ROOT}/apps/web/prisma/prisma/dev.db}"

cd "${APP_ROOT}"

if [[ "${SKIP_GIT_PULL:-0}" == "1" ]]; then
  echo "── Skip git pull (release checkout mode) ──"
else
  echo "── Pull latest code ──"
  git pull origin main
fi

echo "── Install dependencies ──"
pnpm install --frozen-lockfile

if [[ -f apps/web/.env.local ]]; then
  echo "── Load web environment ──"
  set -a
  . apps/web/.env.local
  set +a
fi

echo "── Sync web Prisma client and schema ──"
DATABASE_URL="${WEB_DATABASE_URL}" pnpm --dir apps/web db:generate
DATABASE_URL="${WEB_DATABASE_URL}" pnpm --dir apps/web db:push

echo "── Build shared DB package ──"
pnpm --dir packages/db build

echo "── Build web ──"
pnpm --dir apps/web build

echo "── Wire web standalone assets ──"
mkdir -p apps/web/.next/standalone/apps/web/.next
rm -rf apps/web/.next/standalone/apps/web/public apps/web/.next/standalone/apps/web/.next/static
cp -R apps/web/public apps/web/.next/standalone/apps/web/public
cp -R apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

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
