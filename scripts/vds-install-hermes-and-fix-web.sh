#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/redcoreECO}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env}"
HERMES_INSTALL_DIR="${HERMES_INSTALL_DIR:-$HOME/.hermes/hermes-agent}"
BACKUP_SUFFIX="$(date -u +%Y%m%d-%H%M%S)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

upsert_env() {
  local key="$1"
  local value="${2:-}"
  if [ -z "$value" ]; then
    return 0
  fi

  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    python3 - "$ENV_FILE" "$key" "$value" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
lines = path.read_text().splitlines()
out = []
replaced = False
for line in lines:
    if line.startswith(f"{key}="):
        out.append(f"{key}={value}")
        replaced = True
    else:
        out.append(line)
if not replaced:
    out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n")
PY
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

require_cmd curl
require_cmd git
require_cmd pnpm
require_cmd pm2
require_cmd python3

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
cp "$ENV_FILE" "${ENV_FILE}.${BACKUP_SUFFIX}.bak"

upsert_env "AUTH_URL" "${AUTH_URL:-https://redcoreos.net}"
upsert_env "NEXTAUTH_URL" "${NEXTAUTH_URL:-https://redcoreos.net}"
upsert_env "APP_URL" "${APP_URL:-https://redcoreos.net}"
upsert_env "CORS_ORIGINS" "${CORS_ORIGINS:-https://redcoreos.net,https://api.redcoreos.net}"
upsert_env "ALLOWED_REDIRECT_HOSTS" "${ALLOWED_REDIRECT_HOSTS:-redcoreos.net,api.redcoreos.net}"
upsert_env "AUTH_SECRET" "${AUTH_SECRET:-${NEXTAUTH_SECRET:-}}"
upsert_env "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET:-${AUTH_SECRET:-}}"
upsert_env "GOOGLE_CLIENT_ID" "${GOOGLE_CLIENT_ID:-}"
upsert_env "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET:-}"

cd "$REPO_DIR"

if [ ! -d "$HERMES_INSTALL_DIR" ]; then
  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-setup
else
  echo "Hermes already installed at $HERMES_INSTALL_DIR"
fi

pnpm --dir apps/web build
pm2 restart redcore-web

echo
echo "Done."
echo "Env backup: ${ENV_FILE}.${BACKUP_SUFFIX}.bak"
echo "Google OAuth callback URI must be configured in Google Cloud Console:"
echo "  https://redcoreos.net/api/auth/callback/google"
echo
if grep -q '^GOOGLE_CLIENT_ID=$' "$ENV_FILE" || ! grep -q '^GOOGLE_CLIENT_ID=' "$ENV_FILE"; then
  echo "WARNING: GOOGLE_CLIENT_ID is still missing in $ENV_FILE"
fi
if grep -q '^GOOGLE_CLIENT_SECRET=$' "$ENV_FILE" || ! grep -q '^GOOGLE_CLIENT_SECRET=' "$ENV_FILE"; then
  echo "WARNING: GOOGLE_CLIENT_SECRET is still missing in $ENV_FILE"
fi
