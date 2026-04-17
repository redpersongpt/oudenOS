#!/usr/bin/env bash

set -euo pipefail

TARGET_DIR="${1:?usage: check-redcore-os-open-source.sh <target-dir>}"

declare -a forbidden_files=(
  "CLAUDE.md"
  "CODEXHANDOFF.md"
  "ECOBUGHUNTERCLAUDE.md"
  "render.yaml"
  ".github/workflows/build-installers.yml"
)

for file in "${forbidden_files[@]}"; do
  if [[ -e "$TARGET_DIR/$file" ]]; then
    echo "forbidden file present: $file" >&2
    exit 1
  fi
done

declare -a forbidden_patterns=(
  # Infrastructure / credentials
  "185\\.48\\.182\\.164"
  "185\\.48\\.182\\.165"
  "postgres://redcore:"
  "sshpass"
  "-----BEGIN.*PRIVATE KEY"
  # Auth secrets
  "JWT_SECRET="
  "NEXTAUTH_SECRET="
  "AUTH_SECRET="
  # Payment
  "STRIPE_SECRET_KEY="
  "STRIPE_WEBHOOK_SECRET="
  "sk_live_"
  "sk_test_"
  "whsec_"
  # Email / API
  "SENDGRID_API_KEY="
  "SG\\."
  # OAuth
  "GOCSPX-"
  "apps\\.googleusercontent\\.com"
  # Personal identifiers
  "[a-zA-Z0-9._%+-]+@gmail\\.com"
  # Code hygiene
  "BUGHUNTER"
  "TODO"
  "FIXME"
  "HACK"
)

for pattern in "${forbidden_patterns[@]}"; do
  if rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!dist/**' "$pattern" "$TARGET_DIR" >/dev/null; then
    echo "forbidden pattern present: $pattern" >&2
    rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!dist/**' "$pattern" "$TARGET_DIR" >&2
    exit 1
  fi
done

echo "Open-source check passed for $TARGET_DIR"
