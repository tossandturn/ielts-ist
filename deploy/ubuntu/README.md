# IELTS-ist Ubuntu Public MVP

This folder is the Linux deployment package for the public MVP.
It does not change the local Windows setup.

## Layout

- `env.example` - server environment variables
- `ecosystem.config.cjs` - PM2 process config
- `nginx-ieltsist.conf.template` - Nginx reverse proxy template
- `setup.sh` - bootstrap helper for Ubuntu

## Target

- Ubuntu 24.04 LTS
- Node.js 22+
- Nginx
- PM2
- HTTPS with a real domain

## Quick start

1. Clone the repo to the server, for example:

```bash
git clone <repo-url> /home/ubuntu/ielts-trainer
cd /home/ubuntu/ielts-trainer
```

2. Create the env file:

```bash
cp deploy/ubuntu/env.example .env
```

3. Fill in real secrets only on the server.

4. Install dependencies:

```bash
npm install
```

5. Start the app with PM2:

```bash
pm2 start deploy/ubuntu/ecosystem.config.cjs
pm2 save
```

6. Enable PM2 on boot:

```bash
pm2 startup systemd
```

Run the command PM2 prints, then run:

```bash
pm2 save
```

7. Install the Nginx config by replacing `__DOMAIN__` in the template.

8. Issue TLS with certbot:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Important

- Keep `CAMBRIDGE15_DIR` pointed to the Linux copy of the Cambridge 15 assets.
- Keep secrets out of Git.
- Use HTTPS for microphone and realtime voice features.
- If you use `setup.sh`, run it from the repo root after making it executable:

```bash
chmod +x deploy/ubuntu/setup.sh
./deploy/ubuntu/setup.sh your-domain.com
```
