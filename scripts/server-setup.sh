#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# GMOpero — VPS Initial Setup Script
# Run once on a fresh Ubuntu/Debian VPS:
#   curl -sSL https://raw.githubusercontent.com/OWNER/GMOpero/main/scripts/server-setup.sh | bash
# ─────────────────────────────────────────────────────────
set -euo pipefail

echo "══════════════════════════════════════════"
echo "  GMOpero Server Setup"
echo "══════════════════════════════════════════"

# ── 1. System updates ───────────────────────────────────
echo "📦 Updating system..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ── 2. Install Docker ───────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "  Docker installed. You may need to log out/in for group to take effect."
else
  echo "🐳 Docker already installed"
fi

# ── 3. Create app directory ─────────────────────────────
echo "📁 Creating app directory..."
mkdir -p ~/gmopero/backups

# ── 4. Firewall ─────────────────────────────────────────
echo "🔥 Configuring firewall..."
sudo apt-get install -y -qq ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (certbot + redirect)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
echo "  Firewall enabled (22, 80, 443)"

# ── 5. Fail2ban ─────────────────────────────────────────
echo "🛡️  Installing fail2ban..."
sudo apt-get install -y -qq fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ── 6. Swap (useful on small VPS) ──────────────────────
if [ ! -f /swapfile ]; then
  echo "💾 Creating 2GB swap..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# ── 7. Unattended upgrades ─────────────────────────────
echo "🔄 Enabling automatic security updates..."
sudo apt-get install -y -qq unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Add your SSH public key to ~/.ssh/authorized_keys"
echo "  2. Configure GitHub Actions secrets (see below)"
echo "  3. Push to main branch to trigger first deploy"
echo "  4. After first deploy, get SSL certs:"
echo "     cd ~/gmopero"
echo "     docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot"
echo "     docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "  GitHub Secrets needed:"
echo "    VPS_HOST        → Your VPS IP address"
echo "    VPS_USER        → SSH username (e.g. root)"
echo "    VPS_SSH_KEY     → SSH private key"
echo "    DB_USER         → PostgreSQL username"
echo "    DB_PASSWORD     → PostgreSQL password"
echo "    JWT_SECRET      → Random 64-char string"
echo "    PLUGNOTAS_API_KEY"
echo "    PLUGNOTAS_WEBHOOK_SECRET"
echo ""
echo "  GitHub Variables (non-secret):"
echo "    DOMAIN               → gmopero.com.br"
echo "    FRONTEND_URL         → https://app.gmopero.com.br"
echo "    NEXT_PUBLIC_API_URL  → https://api.gmopero.com.br"
echo "    PLUGNOTAS_BASE_URL   → https://api.plugnotas.com.br"
echo "    PLUGNOTAS_ALLOWED_HOSTS → plugnotas.com.br"
echo "    JWT_EXPIRES_IN       → 12h"
echo "    SSL_EMAIL            → admin@gmopero.com.br"
echo "══════════════════════════════════════════"
