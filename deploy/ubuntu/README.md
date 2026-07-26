# IELTS-ist Ubuntu Public MVP

This folder is the Linux deployment package for the public MVP.
It does not change the local Windows setup.

## Layout

- `env.example` - server environment variables
- `ecosystem.config.cjs` - PM2 process config
- `nginx-ieltsist.conf.template` - Nginx reverse proxy template
- `nginx-ieltsist-tencent-cert.conf` - current production config for `ieltsist.com`
- `setup.sh` - bootstrap helper for Ubuntu

## Target

- Ubuntu 24.04 LTS
- Node.js 22+
- Nginx
- PM2
- Tencent Cloud certificate for `ieltsist.com`

## Current Production Path

```text
DNSPod -> 43.156.76.217 -> Nginx HTTPS -> 127.0.0.1:4321
```

The `127.0.0.1:4321` backend is the Node service on the same Ubuntu server.
It is not the Windows development machine.

Required DNS records:

```text
@    A      43.156.76.217
www  CNAME  ieltsist.com
```

## Server Update

```bash
cd /home/ubuntu/ielts-trainer
npm install --omit=dev
pm2 start deploy/ubuntu/ecosystem.config.cjs --update-env
pm2 save
```

## Nginx

Copy the Tencent Cloud certificate files to:

```text
/etc/nginx/ssl/ieltsist/ieltsist.com_bundle.crt
/etc/nginx/ssl/ieltsist/ieltsist.com.key
```

Install the production config:

```bash
sudo install -m 0644 deploy/ubuntu/nginx-ieltsist-tencent-cert.conf /etc/nginx/sites-available/ieltsist
sudo ln -sf /etc/nginx/sites-available/ieltsist /etc/nginx/sites-enabled/ieltsist
sudo nginx -t
sudo systemctl reload nginx
```

## Checks

```bash
curl -I http://43.156.76.217/
curl -I https://ieltsist.com/
pm2 status
```

Expected:

- `http://ieltsist.com` redirects to HTTPS
- `https://ieltsist.com` returns 200
- `wss://ieltsist.com/qwen-client` upgrades through Nginx
- PM2 process `ieltsist` is online

## Important

- Keep secrets out of Git.
- Use HTTPS for microphone and realtime voice features.
- Do not use Cloudflare Tunnel, LuYouXia, NASCab, or Windows local tunnel for production.
