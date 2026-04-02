#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/os-desktop"
SERVICE_DIR="$ROOT_DIR/services/os-service"
RELEASE_ROOT="${RELEASE_ROOT:-/var/www/redcore-downloads/os}"
RELEASES_DIR="$RELEASE_ROOT/releases"
ARCHIVE_DIR="$RELEASE_ROOT/archive"
WIZARD_RELEASE_ROOT="$RELEASE_ROOT/wizard"
APBX_RELEASE_ROOT="$RELEASE_ROOT/apbx"
STABLE_NAME="redcore-os-setup.exe"
WIZARD_STABLE_NAME="redcore-os-wizard-playbook.zip"
APBX_STABLE_NAME="redcore-os-template.apbx"
MANIFEST_PATH="$RELEASE_ROOT/latest.json"
MIN_BYTES="${MIN_BYTES:-20000000}"
MIN_FREE_MB="${MIN_FREE_MB:-3072}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

check_free_space_mb() {
  local free_mb
  free_mb="$(df -Pm "$ROOT_DIR" | awk 'NR==2 {print $4}')"
  if [ -z "$free_mb" ] || [ "$free_mb" -lt "$MIN_FREE_MB" ]; then
    echo "Not enough free disk space: ${free_mb:-0}MB available, ${MIN_FREE_MB}MB required" >&2
    exit 1
  fi
}

need_cmd pnpm
need_cmd node
need_cmd sha256sum
need_cmd stat
need_cmd zip

if ! command -v cargo >/dev/null 2>&1; then
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1090
    source "$HOME/.cargo/env"
  fi
fi

need_cmd cargo

# Tauri CLI required for building the desktop installer
if ! cargo tauri --version >/dev/null 2>&1; then
  echo "==> Installing Tauri CLI"
  cargo install tauri-cli --version "^2" --locked
fi

check_free_space_mb

mkdir -p "$RELEASES_DIR" "$ARCHIVE_DIR" "$WIZARD_RELEASE_ROOT" "$APBX_RELEASE_ROOT"

pushd "$ROOT_DIR" >/dev/null

GIT_COMMIT_SHA=""
if git rev-parse --short HEAD >/dev/null 2>&1; then
  GIT_COMMIT_SHA="$(git rev-parse --short HEAD)"
fi

if [ -n "${SOURCE_COMMIT_SHA:-}" ] && [ -n "$GIT_COMMIT_SHA" ] && [ "$SOURCE_COMMIT_SHA" != "$GIT_COMMIT_SHA" ]; then
  echo "SOURCE_COMMIT_SHA ($SOURCE_COMMIT_SHA) does not match git HEAD ($GIT_COMMIT_SHA)" >&2
  exit 1
fi

if [ -n "${SOURCE_COMMIT_SHA:-}" ]; then
  COMMIT_SHA="$SOURCE_COMMIT_SHA"
elif [ -n "$GIT_COMMIT_SHA" ]; then
  COMMIT_SHA="$GIT_COMMIT_SHA"
else
  echo "Unable to resolve source commit. Set SOURCE_COMMIT_SHA when building outside a git checkout." >&2
  exit 1
fi

BUILD_DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
VERSION="$(node -p "require('./apps/os-desktop/package.json').version")"
VERSION_TAG="v${VERSION}-${COMMIT_SHA}"
RELEASE_BASENAME="redcore-os-${VERSION}-${COMMIT_SHA}.exe"
RELEASE_PATH="$RELEASES_DIR/$RELEASE_BASENAME"
# Tauri NSIS output — find the actual file after build
TAURI_NSIS_DIR="$APP_DIR/src-tauri/target/release/bundle/nsis"
INSTALLER_STABLE_PATH="$APP_DIR/dist/installers/$STABLE_NAME"
WIZARD_RELEASE_BASENAME="redcore-os-wizard-playbook-${VERSION}-${COMMIT_SHA}.zip"
WIZARD_RELEASE_PATH="$WIZARD_RELEASE_ROOT/$WIZARD_RELEASE_BASENAME"
WIZARD_BUILD_ROOT="$ROOT_DIR/artifacts/os-wizard-package"
WIZARD_BUILD_PATH="$WIZARD_BUILD_ROOT/$WIZARD_STABLE_NAME"
APBX_RELEASE_BASENAME="redcore-os-template-${VERSION}-${COMMIT_SHA}.apbx"
APBX_RELEASE_PATH="$APBX_RELEASE_ROOT/$APBX_RELEASE_BASENAME"
APBX_BUILD_ROOT="$ROOT_DIR/artifacts/os-apbx-package"
APBX_BUILD_PATH="$APBX_BUILD_ROOT/$APBX_STABLE_NAME"

echo "==> Ensuring Rust target"
cargo --version >/dev/null
rustup target add x86_64-pc-windows-gnu >/dev/null

if [ -d "$ROOT_DIR/node_modules" ] && [ "${FORCE_INSTALL:-0}" != "1" ]; then
  echo "==> Reusing existing workspace node_modules"
else
  echo "==> Installing workspace dependencies"
  pnpm install --frozen-lockfile
fi

echo "==> Building Windows service"
pushd "$SERVICE_DIR" >/dev/null
cargo build --release --target x86_64-pc-windows-gnu
mkdir -p target/release
cp target/x86_64-pc-windows-gnu/release/redcore-os-service.exe target/release/redcore-os-service.exe
popd >/dev/null

echo "==> Building desktop app (Tauri)"
pushd "$APP_DIR" >/dev/null
bash "$ROOT_DIR/scripts/sync-desktop-brand-assets.sh"
pnpm build
cargo tauri build --config src-tauri/tauri.conf.production.json
popd >/dev/null

# Copy Tauri NSIS output to stable name
TAURI_NSIS_EXE="$(find "$TAURI_NSIS_DIR" -name '*.exe' -print -quit 2>/dev/null || true)"
if [ -z "$TAURI_NSIS_EXE" ] || [ ! -f "$TAURI_NSIS_EXE" ]; then
  echo "Tauri NSIS installer not found in $TAURI_NSIS_DIR" >&2
  exit 1
fi
mkdir -p "$(dirname "$INSTALLER_STABLE_PATH")"
cp "$TAURI_NSIS_EXE" "$INSTALLER_STABLE_PATH"
echo "==> Installer: $(basename "$TAURI_NSIS_EXE") -> $STABLE_NAME"

echo "==> Building wizard package"
node "$ROOT_DIR/scripts/build-os-wizard-package.mjs" \
  --version "$VERSION" \
  --commit "$COMMIT_SHA" \
  --out-dir "$WIZARD_BUILD_ROOT"

echo "==> Building APBX template package"
pnpm --dir "$APP_DIR" exec tsx "$ROOT_DIR/scripts/build-os-apbx-package.ts" \
  --version "$VERSION" \
  --commit "$COMMIT_SHA" \
  --out-dir "$APBX_BUILD_ROOT" \
  --package-name "$APBX_STABLE_NAME"

if [ ! -f "$INSTALLER_STABLE_PATH" ]; then
  echo "Installer not produced at $INSTALLER_STABLE_PATH" >&2
  exit 1
fi

if [ ! -f "$WIZARD_BUILD_PATH" ]; then
  echo "Wizard package not produced at $WIZARD_BUILD_PATH" >&2
  exit 1
fi

if [ ! -f "$APBX_BUILD_PATH" ]; then
  echo "APBX package not produced at $APBX_BUILD_PATH" >&2
  exit 1
fi

SIZE_BYTES="$(stat -c '%s' "$INSTALLER_STABLE_PATH")"
if [ "$SIZE_BYTES" -lt "$MIN_BYTES" ]; then
  echo "Installer too small: $SIZE_BYTES bytes" >&2
  exit 1
fi

SHA256="$(sha256sum "$INSTALLER_STABLE_PATH" | awk '{print $1}')"
WIZARD_SHA256="$(sha256sum "$WIZARD_BUILD_PATH" | awk '{print $1}')"
WIZARD_SIZE_BYTES="$(stat -c '%s' "$WIZARD_BUILD_PATH")"
APBX_SHA256="$(sha256sum "$APBX_BUILD_PATH" | awk '{print $1}')"
APBX_SIZE_BYTES="$(stat -c '%s' "$APBX_BUILD_PATH")"

if [ -f "$RELEASE_ROOT/$STABLE_NAME" ]; then
  CURRENT_SHA="$(sha256sum "$RELEASE_ROOT/$STABLE_NAME" | awk '{print $1}')"
  if [ "$CURRENT_SHA" != "$SHA256" ]; then
    cp "$RELEASE_ROOT/$STABLE_NAME" "$ARCHIVE_DIR/redcore-os-setup-${CURRENT_SHA:0:12}.exe"
  fi
fi

cp "$INSTALLER_STABLE_PATH" "$RELEASE_PATH"
cp "$INSTALLER_STABLE_PATH" "$RELEASE_ROOT/$STABLE_NAME"
cp "$WIZARD_BUILD_PATH" "$WIZARD_RELEASE_PATH"
cp "$WIZARD_BUILD_PATH" "$WIZARD_RELEASE_ROOT/$WIZARD_STABLE_NAME"
cp "$APBX_BUILD_PATH" "$APBX_RELEASE_PATH"
cp "$APBX_BUILD_PATH" "$APBX_RELEASE_ROOT/$APBX_STABLE_NAME"

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
  "releaseUrl": "https://redcoreos.net/downloads/os/releases/$RELEASE_BASENAME",
  "wizardPackageFilename": "$WIZARD_STABLE_NAME",
  "wizardPackageReleaseFilename": "$WIZARD_RELEASE_BASENAME",
  "wizardPackageSizeBytes": $WIZARD_SIZE_BYTES,
  "wizardPackageSha256": "$WIZARD_SHA256",
  "wizardPackageUrl": "https://redcoreos.net/downloads/os/wizard/$WIZARD_STABLE_NAME",
  "wizardPackageReleaseUrl": "https://redcoreos.net/downloads/os/wizard/$WIZARD_RELEASE_BASENAME",
  "wizardPackageRole": "wizard-template",
  "apbxPackageFilename": "$APBX_STABLE_NAME",
  "apbxPackageReleaseFilename": "$APBX_RELEASE_BASENAME",
  "apbxPackageSizeBytes": $APBX_SIZE_BYTES,
  "apbxPackageSha256": "$APBX_SHA256",
  "apbxPackageUrl": "https://redcoreos.net/downloads/os/apbx/$APBX_STABLE_NAME",
  "apbxPackageReleaseUrl": "https://redcoreos.net/downloads/os/apbx/$APBX_RELEASE_BASENAME",
  "apbxPackageRole": "wizard-template",
  "isoInjectionScriptUrl": "https://github.com/redpersongpt/redcoreECO/blob/main/scripts/stage-os-iso-injection.ps1"
}
JSON

echo "==> Published"
echo "stable:   $RELEASE_ROOT/$STABLE_NAME"
echo "release:  $RELEASE_PATH"
echo "wizard:   $WIZARD_RELEASE_ROOT/$WIZARD_STABLE_NAME"
echo "apbx:     $APBX_RELEASE_ROOT/$APBX_STABLE_NAME"
echo "manifest: $MANIFEST_PATH"
echo "sha256:   $SHA256"
echo "size:     $SIZE_BYTES"

popd >/dev/null
