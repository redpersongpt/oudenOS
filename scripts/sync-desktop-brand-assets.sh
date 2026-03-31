#!/usr/bin/env bash
# ─── Sync Desktop Brand Assets ──────────────────────────────────────────────
# Ensures the desktop app icons are up-to-date before packaging.
#
# IMPORTANT: Desktop app icons are GENERATED from icon.svg via
# scripts/generate-app-icons.mjs — NOT copied from the web app.
# The web app uses a full wordmark logo; the desktop needs icon-only mark.
#
# This script verifies the required icon files exist and are recent.
# If they don't exist, it runs the generator.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OS_RES="$ROOT_DIR/apps/os-desktop/resources"
TUNING_RES="$ROOT_DIR/apps/tuning-desktop/resources"

# ── Verify OS desktop icons exist ────────────────────────────────────────
required_files=(
  "$OS_RES/redcore-icon.ico"
  "$OS_RES/redcore-icon.png"
  "$OS_RES/icon.png"
)

needs_regeneration=false
for f in "${required_files[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  Missing: $f"
    needs_regeneration=true
  fi
done

if $needs_regeneration; then
  echo "  Generating app icons..."
  node "$ROOT_DIR/scripts/generate-app-icons.mjs"
fi

# ── Sync to tuning-desktop (same icon mark, different product) ───────────
mkdir -p "$TUNING_RES"
cp "$OS_RES/redcore-icon.png" "$TUNING_RES/redcore-icon.png"
cp "$OS_RES/favicon.png" "$TUNING_RES/favicon.png"
cp "$OS_RES/redcore-icon.ico" "$TUNING_RES/redcore-icon.ico"

echo "  Brand assets verified."
