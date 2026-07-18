#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="${APP_DIR:-/home/ubuntu/ielts-trainer}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 your-domain.com"
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory not found: $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

sudo apt update
sudo apt install -y git curl nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi

if [[ ! -f .env ]]; then
  cp deploy/ubuntu/env.example .env
  echo "Created .env from deploy/ubuntu/env.example"
fi

npm install

pm2 start deploy/ubuntu/ecosystem.config.cjs --only ieltsist
pm2 save

sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sed "s/__DOMAIN__/${DOMAIN}/g" deploy/ubuntu/nginx-ieltsist.conf.template | sudo tee /etc/nginx/sites-available/ieltsist >/dev/null
sudo ln -sf /etc/nginx/sites-available/ieltsist /etc/nginx/sites-enabled/ieltsist
sudo nginx -t
sudo systemctl reload nginx

echo
echo "App started on 127.0.0.1:4321"
echo "Nginx config installed for ${DOMAIN}"
echo "Next: run certbot if the domain already points to this server:"
echo "sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"

