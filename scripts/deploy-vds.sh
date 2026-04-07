#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Deploy to VDS (REDACTED_VDS_IP) — pulls latest main + builds + restarts services
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

VDS_IP="REDACTED_VDS_IP"
VDS_USER="ubuntu"
VDS_PASSWORD="${VDS_PASSWORD}"
VDS_REPO="/home/ubuntu/redcoreECO"

echo "🚀 Deploying to VDS $VDS_IP..."
echo ""

# SSH into VDS and pull + deploy
ssh ssh "$VDS_USER@$VDS_IP" << 'EOF'
set -euo pipefail

echo "── Pull latest main from GitHub ──"
cd /home/ubuntu/redcoreECO
git pull origin main

echo ""
echo "── Building installers + APIs on VDS ──"
BUILD_OS_RELEASE=1 bash scripts/deploy.sh

echo ""
echo "✅ Deploy complete!"
pm2 ls
EOF

echo ""
echo "✅ VDS deploy finished!"
