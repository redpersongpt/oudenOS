#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Deploy to VDS — pulls latest main + builds web/APIs + restarts services
# ═══════════════════════════════════════════════════════════════════════════════
# Requires: VDS_IP, VDS_USER env vars set. SSH key auth configured.
# Windows installers are published by GitHub Releases, not built on the Linux VDS.

set -euo pipefail

VDS_IP="${VDS_IP:?ERROR: Set VDS_IP environment variable}"
VDS_USER="${VDS_USER:-ubuntu}"
VDS_REPO="${VDS_REPO:-/opt/oudenos/app}"
VDS_REPO_ESCAPED="$(printf '%q' "${VDS_REPO}")"

echo "Deploying to VDS $VDS_IP..."
echo ""

# SSH into VDS and pull + deploy (requires SSH key configured)
ssh "${VDS_USER}@${VDS_IP}" "VDS_REPO=${VDS_REPO_ESCAPED} bash -s" << 'EOF'
set -euo pipefail

echo "── Pull latest main from GitHub ──"
if [[ ! -d "${VDS_REPO}/.git" && -d "${HOME}/oudenOS/.git" ]]; then
  VDS_REPO="${HOME}/oudenOS"
fi
cd "${VDS_REPO}"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Remote repo has uncommitted tracked changes; refusing to deploy." >&2
  exit 1
fi

git fetch origin main
git checkout -B main origin/main

echo ""
echo "── Building web + APIs on VDS ──"
ALLOW_STALE_OS_RELEASE=1 SKIP_GIT_PULL=1 bash scripts/deploy.sh

echo ""
echo "Deploy complete!"
pm2 ls
EOF

echo ""
echo "VDS deploy finished!"
