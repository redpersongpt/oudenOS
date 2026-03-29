#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ICON_PNG="$ROOT_DIR/apps/web/public/redcore-icon.png"
WEB_ICON_ICO="$ROOT_DIR/apps/web/src/app/favicon.ico"

copy_asset() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
}

copy_asset "$WEB_ICON_PNG" "$ROOT_DIR/apps/os-desktop/resources/redcore-icon.png"
copy_asset "$WEB_ICON_PNG" "$ROOT_DIR/apps/os-desktop/resources/icon.png"
copy_asset "$WEB_ICON_PNG" "$ROOT_DIR/apps/os-desktop/resources/favicon.png"
copy_asset "$WEB_ICON_ICO" "$ROOT_DIR/apps/os-desktop/resources/redcore-icon.ico"

copy_asset "$WEB_ICON_PNG" "$ROOT_DIR/apps/tuning-desktop/resources/redcore-icon.png"
copy_asset "$WEB_ICON_PNG" "$ROOT_DIR/apps/tuning-desktop/resources/favicon.png"
copy_asset "$WEB_ICON_ICO" "$ROOT_DIR/apps/tuning-desktop/resources/redcore-icon.ico"
