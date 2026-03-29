#!/usr/bin/env bash
# ─── redcore VDS Production Deployment ──────────────────────────────────────
# Target: Ubuntu 24.04 @ REDACTED_VDS_IP
# Deploys: apps/web (Next.js standalone) only
# Domain: redcoreos.net
#
# Usage: Copy this script to VDS and run:
#   chmod +x vds-deploy.sh && sudo ./vds-deploy.sh
#
# BEFORE RUNNING: Replace these placeholders:
#   YOUR_EMAIL_HERE → your real email for Let's Encrypt
# ────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DOMAIN="redcoreos.net"
CERTBOT_EMAIL="REDACTED_EMAIL"  # ← REPLACE THIS
REPO_URL="https://github.com/redpersongpt/redcoreECO.git"
APP_DIR="/opt/redcore/app"
DATA_DIR="/opt/redcore/data"
DOWNLOADS_DIR="/var/www/redcore-downloads"
DEPLOY_USER="ubuntu"

# ─── Validation ─────────────────────────────────────────────────────────────

if [[ "$CERTBOT_EMAIL" == "REDACTED_EMAIL" ]]; then
  echo "ERROR: Replace YOUR_EMAIL_HERE in this script with your real email."
  exit 1
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: Run with sudo"
  exit 1
fi

echo "═══ STEP 1/10: System packages ═══"
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx ufw build-essential sqlite3

echo "═══ STEP 2/10: Node 22 + pnpm + PM2 ═══"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi
npm install -g pnpm@9 pm2
echo "node=$(node -v) pnpm=$(pnpm -v) pm2=$(pm2 -v)"

echo "═══ STEP 3/10: Firewall ═══"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "═══ STEP 4/10: Directories ═══"
mkdir -p "$APP_DIR" "$DATA_DIR"
mkdir -p "$DOWNLOADS_DIR"/{os,tuning,archive}
chown -R "$DEPLOY_USER":"$DEPLOY_USER" /opt/redcore "$DOWNLOADS_DIR"

echo "═══ STEP 5/10: Clone & Build ═══"
sudo -u "$DEPLOY_USER" bash << 'BUILDEOF'
set -euo pipefail

cd /opt/redcore

# Clone or pull
if [ -d "app/.git" ]; then
  cd app && git pull origin main
else
  rm -rf app
  git clone https://github.com/redpersongpt/redcoreECO.git app
  cd app
fi

# Install deps from monorepo root (pnpm workspace)
pnpm install --frozen-lockfile || pnpm install

# Build web app
cd apps/web
npx prisma generate
pnpm build

# Copy static assets into the standalone bundle used by PM2
bash ../../scripts/sync-web-standalone-assets.sh "$(pwd)"
BUILDEOF

echo "═══ STEP 6/10: Environment ═══"
ENV_FILE="$APP_DIR/apps/web/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  SECRET=$(openssl rand -base64 32)
  sudo -u "$DEPLOY_USER" bash -c "cat > '$ENV_FILE'" << ENVEOF
NODE_ENV=production
DATABASE_URL=file:/opt/redcore/data/production.db
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$SECRET
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENVEOF
  echo "Created .env.production with generated NEXTAUTH_SECRET"
else
  echo ".env.production already exists, skipping"
fi

echo "═══ STEP 7/10: Initialize Database ═══"
sudo -u "$DEPLOY_USER" bash -c "cd '$APP_DIR/apps/web' && DATABASE_URL='file:/opt/redcore/data/production.db' npx prisma db push --skip-generate"

echo "═══ STEP 8/10: PM2 ═══"
sudo -u "$DEPLOY_USER" bash -c "cat > '$APP_DIR/ecosystem.config.cjs'" << 'PM2EOF'
module.exports = {
  apps: [{
    name: "redcore-web",
    cwd: "/opt/redcore/app/apps/web/.next/standalone/apps/web",
    script: "server.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: "file:/opt/redcore/data/production.db",
    },
    max_memory_restart: "512M",
    restart_delay: 3000,
    max_restarts: 10,
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
  }],
};
PM2EOF

# Source env vars into PM2 env
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  export "$key=$value"
done < "$ENV_FILE"

sudo -u "$DEPLOY_USER" bash -c "
  cd '$APP_DIR'
  # Load env into PM2
  set -a
  source '$ENV_FILE' 2>/dev/null || true
  set +a
  pm2 delete redcore-web 2>/dev/null || true
  pm2 start ecosystem.config.cjs
  pm2 save
"

# Startup on boot
PM2_STARTUP=$(sudo -u "$DEPLOY_USER" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" 2>&1 | grep "sudo env")
if [ -n "$PM2_STARTUP" ]; then
  eval "$PM2_STARTUP"
fi

echo "═══ STEP 9/10: Nginx ═══"
cat > /etc/nginx/sites-available/redcore << 'NGINX'
server {
    listen 80;
    server_name www.redcoreos.net;
    return 301 https://redcoreos.net$request_uri;
}

server {
    listen 80;
    server_name redcoreos.net;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /downloads/ {
        alias /var/www/redcore-downloads/;
        autoindex off;
        sendfile on;
        tcp_nopush on;
        expires 1h;

        types {
            application/x-msdownload exe;
            application/x-msi        msi;
            application/zip          zip;
            application/gzip         gz;
            application/octet-stream bin;
        }

        add_header Content-Disposition 'attachment' always;
        add_header X-Content-Type-Options nosniff always;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX

ln -sf /etc/nginx/sites-available/redcore /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "═══ STEP 10/10: SSL ═══"
certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$CERTBOT_EMAIL" \
  --redirect

certbot renew --dry-run

echo ""
echo "════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE"
echo "════════════════════════════════════════════════"
echo ""
echo "  Website:   https://$DOMAIN"
echo "  Downloads: https://$DOMAIN/downloads/"
echo "  PM2:       pm2 status / pm2 logs redcore-web"
echo "  Nginx:     /etc/nginx/sites-available/redcore"
echo "  Env:       $ENV_FILE"
echo "  Database:  $DATA_DIR/production.db"
echo "  Releases:  $DOWNLOADS_DIR/{os,tuning,archive}/"
echo ""
echo "  Upload installers:"
echo "    scp file.exe ubuntu@REDACTED_VDS_IP:$DOWNLOADS_DIR/os/"
echo ""
