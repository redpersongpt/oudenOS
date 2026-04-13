#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Deploy to VDS — pulls latest main + builds + restarts services
# ═══════════════════════════════════════════════════════════════════════════════
# Requires: VDS_IP, VDS_USER env vars set. SSH key auth configured.

set -euo pipefail

VDS_IP="${VDS_IP:?ERROR: Set VDS_IP environment variable}"
VDS_USER="${VDS_USER:-ubuntu}"
VDS_REPO="/home/${VDS_USER}/redcoreECO"

echo "Deploying to VDS $VDS_IP..."
echo ""

# SSH into VDS and pull + deploy (requires SSH key configured)
ssh "${VDS_USER}@${VDS_IP}" << 'EOF'
set -euo pipefail

echo "── Pull latest main from GitHub ──"
cd ~/redcoreECO
git pull origin main

echo ""
echo "── Building installers + APIs on VDS ──"
BUILD_OS_RELEASE=1 bash scripts/deploy.sh

echo ""
echo "Deploy complete!"
pm2 ls
EOF

echo ""
echo "VDS deploy finished!"
