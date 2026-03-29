#!/usr/bin/env bash
# Keep the Next.js standalone bundle self-contained for PM2/nginx deployments.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${1:-${APP_ROOT}/apps/web}"
STANDALONE_DIR="${WEB_DIR}/.next/standalone/apps/web"

if [[ ! -d "${WEB_DIR}/.next/static" ]]; then
  echo "ERROR: missing ${WEB_DIR}/.next/static; run web build first." >&2
  exit 1
fi

if [[ ! -d "${WEB_DIR}/public" ]]; then
  echo "ERROR: missing ${WEB_DIR}/public." >&2
  exit 1
fi

mkdir -p "${STANDALONE_DIR}/.next"
rm -rf "${STANDALONE_DIR}/public" "${STANDALONE_DIR}/.next/static"
cp -R "${WEB_DIR}/public" "${STANDALONE_DIR}/public"
cp -R "${WEB_DIR}/.next/static" "${STANDALONE_DIR}/.next/static"

echo "Synced web standalone assets into ${STANDALONE_DIR}"
