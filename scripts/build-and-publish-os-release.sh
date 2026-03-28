#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/os-desktop"
SERVICE_DIR="$ROOT_DIR/services/os-service"
RELEASE_ROOT="${RELEASE_ROOT:-/var/www/redcore-downloads/os}"
RELEASES_DIR="$RELEASE_ROOT/releases"
ARCHIVE_DIR="$RELEASE_ROOT/archive"
STABLE_NAME="redcore-os-setup.exe"
MANIFEST_PATH="$RELEASE_ROOT/latest.json"
MIN_BYTES="${MIN_BYTES:-20000000}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required" >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1090
    source "$HOME/.cargo/env"
  fi
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required" >&2
  exit 1
fi

if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "xvfb-run is required for headless Windows packaging" >&2
  exit 1
fi

mkdir -p "$RELEASES_DIR" "$ARCHIVE_DIR"

pushd "$ROOT_DIR" >/dev/null

COMMIT_SHA="$(git rev-parse --short HEAD)"
BUILD_DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
VERSION="$(node -p "require('./apps/os-desktop/package.json').version")"
VERSION_TAG="v${VERSION}-${COMMIT_SHA}"
RELEASE_BASENAME="redcore-os-${VERSION}-${COMMIT_SHA}.exe"
RELEASE_PATH="$RELEASES_DIR/$RELEASE_BASENAME"
INSTALLER_PATH="$APP_DIR/dist/installers/$STABLE_NAME"

echo "==> Ensuring Rust target"
cargo --version >/dev/null
rustup target add x86_64-pc-windows-gnu >/dev/null

echo "==> Installing workspace dependencies"
pnpm install --frozen-lockfile

echo "==> Building Windows service"
pushd "$SERVICE_DIR" >/dev/null
cargo build --release --target x86_64-pc-windows-gnu
mkdir -p target/release
cp target/x86_64-pc-windows-gnu/release/redcore-os-service.exe target/release/redcore-os-service.exe
popd >/dev/null

echo "==> Building desktop app"
pushd "$APP_DIR" >/dev/null
pnpm build
rm -f dist/installers/"$STABLE_NAME"
xvfb-run -a pnpm exec electron-builder --win --x64 --publish never -c.win.signAndEditExecutable=false
popd >/dev/null

if [ ! -f "$INSTALLER_PATH" ]; then
  echo "Installer not produced at $INSTALLER_PATH" >&2
  exit 1
fi

SIZE_BYTES="$(stat -c '%s' "$INSTALLER_PATH")"
if [ "$SIZE_BYTES" -lt "$MIN_BYTES" ]; then
  echo "Installer too small: $SIZE_BYTES bytes" >&2
  exit 1
fi

SHA256="$(sha256sum "$INSTALLER_PATH" | awk '{print $1}')"

if [ -f "$RELEASE_ROOT/$STABLE_NAME" ]; then
  CURRENT_SHA="$(sha256sum "$RELEASE_ROOT/$STABLE_NAME" | awk '{print $1}')"
  if [ "$CURRENT_SHA" != "$SHA256" ]; then
    cp "$RELEASE_ROOT/$STABLE_NAME" "$ARCHIVE_DIR/redcore-os-setup-${CURRENT_SHA:0:12}.exe"
  fi
fi

cp "$INSTALLER_PATH" "$RELEASE_PATH"
cp "$INSTALLER_PATH" "$RELEASE_ROOT/$STABLE_NAME"

cat > "$MANIFEST_PATH" <<JSON
{
  "product": "redcore-os",
  "channel": "latest",
  "version": "$VERSION",
  "versionTag": "$VERSION_TAG",
  "commit": "$COMMIT_SHA",
  "builtAt": "$BUILD_DATE_UTC",
  "filename": "$STABLE_NAME",
  "releaseFilename": "$RELEASE_BASENAME",
  "sizeBytes": $SIZE_BYTES,
  "sha256": "$SHA256",
  "url": "https://redcoreos.net/downloads/os/$STABLE_NAME",
  "releaseUrl": "https://redcoreos.net/downloads/os/releases/$RELEASE_BASENAME"
}
JSON

echo "==> Published"
echo "stable:   $RELEASE_ROOT/$STABLE_NAME"
echo "release:  $RELEASE_PATH"
echo "manifest: $MANIFEST_PATH"
echo "sha256:   $SHA256"
echo "size:     $SIZE_BYTES"

popd >/dev/null
