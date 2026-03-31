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
WEB_DATABASE_URL="file:${APP_ROOT}/apps/web/prisma/prisma/dev.db"

cd "${APP_ROOT}"

if [[ -f .env ]]; then
  echo "── Load root environment ──"
  set -a
  . ./.env
  set +a
fi

API_DATABASE_URL="${DATABASE_URL:-}"
HEAD_SHA=""

if [[ "${SKIP_GIT_PULL:-0}" == "1" ]]; then
  echo "── Skip git pull (release checkout mode) ──"
else
  echo "── Pull latest code ──"
  git pull origin main
fi

if git rev-parse --short HEAD >/dev/null 2>&1; then
  HEAD_SHA="$(git rev-parse --short HEAD)"
fi

echo "── Install dependencies ──"
pnpm install --frozen-lockfile --prod=false

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
bash scripts/sync-web-standalone-assets.sh apps/web

echo "── Build tuning-api ──"
pnpm --dir apps/tuning-api build

echo "── Build os-api ──"
pnpm --dir apps/os-api build

echo "── Build cloud-api ──"
pnpm --dir apps/cloud-api build

echo "── Run database migrations ──"
DATABASE_URL="${API_DATABASE_URL}" pnpm --dir packages/db db:push

if [[ "${BUILD_OS_RELEASE:-0}" == "1" ]]; then
  echo "── Build and publish latest redcore OS release ──"
  SOURCE_COMMIT_SHA="${HEAD_SHA}" bash scripts/build-and-publish-os-release.sh
elif [[ -n "${HEAD_SHA}" && "${ALLOW_STALE_OS_RELEASE:-0}" != "1" && -f /var/www/redcore-downloads/os/latest.json ]]; then
  LIVE_SHA="$(node -e "const fs=require('fs');const p='/var/www/redcore-downloads/os/latest.json';try{const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(String(data.commit||''));}catch{process.exit(1)}")"
  if [[ -n "${LIVE_SHA}" && "${LIVE_SHA}" != "${HEAD_SHA}" ]]; then
    echo "Latest installer drift detected: latest.json commit ${LIVE_SHA} != deploy HEAD ${HEAD_SHA}" >&2
    echo "Re-run with BUILD_OS_RELEASE=1 to publish a matching installer, or ALLOW_STALE_OS_RELEASE=1 to bypass." >&2
    exit 1
  fi
fi

echo "── Restart services ──"
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  DEPLOY COMPLETE                         ║"
echo "╚══════════════════════════════════════════╝"
pm2 ls
