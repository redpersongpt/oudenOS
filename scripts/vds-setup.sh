#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# redcoreECO — VDS Server Setup Script
# ═══════════════════════════════════════════════════════════════════════════════
# Run this on the VDS as root (or with sudo):
#   ssh ubuntu@YOUR_VDS_IP
#   sudo bash vds-setup.sh
#
# What this installs:
#   - PostgreSQL 16
#   - Node.js 22 LTS
#   - pnpm
#   - PM2
#   - Caddy (reverse proxy + auto-HTTPS)
#   - UFW firewall rules
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "╔══════════════════════════════════════════╗"
echo "║  redcoreECO VDS Setup                    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── 1. System Update ──────────────────────────────────────────────────────
echo "── 1. System update ──"
apt update && apt upgrade -y
apt install -y curl wget gnupg2 lsb-release ca-certificates git build-essential

# ─── 2. PostgreSQL 16 ──────────────────────────────────────────────────────
echo "── 2. PostgreSQL 16 ──"
if ! command -v psql &> /dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
  apt update
  apt install -y postgresql-16
  systemctl enable postgresql
  systemctl start postgresql
  echo "  PostgreSQL 16 installed"
else
  echo "  PostgreSQL already installed"
fi

# Create database and user
DB_PASS=$(openssl rand -hex 16)
sudo -u postgres psql -c "CREATE USER redcore WITH PASSWORD '${DB_PASS}' CREATEDB;" 2>/dev/null || echo "  User already exists"
sudo -u postgres psql -c "CREATE DATABASE redcore OWNER redcore;" 2>/dev/null || echo "  Database already exists"
echo "  Database: redcore, User: redcore, Password: ${DB_PASS}"
echo "  SAVE THIS PASSWORD — it will be written to .env"

# ─── 3. Node.js 22 LTS ────────────────────────────────────────────────────
echo "── 3. Node.js 22 ──"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
  echo "  Node.js $(node -v) installed"
else
  echo "  Node.js $(node -v) already installed"
fi

# ─── 4. pnpm ──────────────────────────────────────────────────────────────
echo "── 4. pnpm ──"
if ! command -v pnpm &> /dev/null; then
  npm install -g pnpm
  echo "  pnpm installed"
else
  echo "  pnpm already installed"
fi

# ─── 5. PM2 ───────────────────────────────────────────────────────────────
echo "── 5. PM2 ──"
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  pm2 startup systemd -u ubuntu --hp /home/ubuntu
  echo "  PM2 installed with systemd startup"
else
  echo "  PM2 already installed"
fi

# ─── 6. Caddy ─────────────────────────────────────────────────────────────
echo "── 6. Caddy ──"
if ! command -v caddy &> /dev/null; then
  apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt update
  apt install -y caddy
  echo "  Caddy installed"
else
  echo "  Caddy already installed"
fi

# ─── 7. Firewall ──────────────────────────────────────────────────────────
echo "── 7. Firewall ──"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  UFW: SSH + HTTP + HTTPS allowed"

# ─── 8. Caddy Config ─────────────────────────────────────────────────────
echo "── 8. Caddy config ──"
cat > /etc/caddy/Caddyfile << 'CADDYEOF'
# ─── redcoreECO Reverse Proxy ────────────────────────────────────────────

redcoreos.net {
    reverse_proxy localhost:3000
    encode gzip
}

tuning-api.redcoreos.net {
    reverse_proxy localhost:3001
    encode gzip
}

os-api.redcoreos.net {
    reverse_proxy localhost:3002
    encode gzip
}
CADDYEOF

systemctl restart caddy
echo "  Caddy configured for redcoreos.net + subdomains"

# ─── 9. App Directory ────────────────────────────────────────────────────
echo "── 9. App directory ──"
mkdir -p /home/ubuntu/redcoreECO
chown ubuntu:ubuntu /home/ubuntu/redcoreECO
echo "  /home/ubuntu/redcoreECO ready"

# ─── 10. Environment Template ─────────────────────────────────────────────
echo "── 10. Environment template ──"
cat > /home/ubuntu/redcoreECO/.env << 'ENVEOF'
# ─── Shared across all services ──────────────────────────────────────────
DATABASE_URL=postgres://redcore:${DB_PASS}@localhost:5432/redcore
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=production

# ─── Web (Next.js) ──────────────────────────────────────────────────────
NEXTAUTH_URL=https://redcoreos.net
NEXTAUTH_SECRET=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ─── tuning-api ─────────────────────────────────────────────────────────
TUNING_API_PORT=3001

# ─── os-api ─────────────────────────────────────────────────────────────
OS_API_PORT=3002
ENVEOF

chown ubuntu:ubuntu /home/ubuntu/redcoreECO/.env
echo "  .env template created at /home/ubuntu/redcoreECO/.env"

# ─── Done ─────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  VDS SETUP COMPLETE                      ║"
echo "╠══════════════════════════════════════════╣"
echo "║  PostgreSQL: localhost:5432/redcore       ║"
echo "║  Caddy: redcoreos.net (auto-HTTPS)       ║"
echo "║  PM2: ready for app deployment            ║"
echo "║  Node.js: $(node -v)                     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "NEXT STEPS:"
echo "  1. Edit /home/ubuntu/redcoreECO/.env — set real passwords and API keys"
echo "  2. Point DNS: redcoreos.net → REDACTED_VDS_IP"
echo "  3. Point DNS: tuning-api.redcoreos.net → REDACTED_VDS_IP"
echo "  4. Point DNS: os-api.redcoreos.net → REDACTED_VDS_IP"
echo "  5. Clone repo and deploy apps"
echo "  6. CHANGE YOUR SSH PASSWORD: passwd"
