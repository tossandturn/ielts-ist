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

## STEM marking configuration

The IELTSist server owns STEM's shared AI marking contract. Deploy the reviewed manifest
with the release under `data/stem-marking/` and set these variables only in the server
`.env` (never in the STEM browser bundle):

```text
STEM_MARKING_TRUSTED_MANIFEST_PATH=./data/stem-marking/0580_m25_qp_12-reviewed-manifest.json
STEM_MARKING_AI_MODEL=<server-only model name>
STEM_MARKING_AI_BASE_URL=<server-only compatible API base URL>
STEM_MARKING_AI_API_KEY=<server-only provider key>
STEM_MARKING_AI_DISABLED=0
STEM_MARKING_QUEUE_DISABLED=0
```

Without the manifest, provider configuration, or authenticated shared identity,
`GET /api/stem/marking/availability` must report `enabled: false`; the create endpoint
must return `503` with `code: "marking_unavailable"` and must not persist a queued job.
After setting the variables, restart only the `ieltsist` PM2 process with `--update-env`,
then verify availability from the STEM origin and complete one reviewed question-level
submission. Do not print the `.env` file or provider diagnostics in release evidence.

## Important

- Keep secrets out of Git.
- Use HTTPS for microphone and realtime voice features.
- Do not use Cloudflare Tunnel, LuYouXia, NASCab, or Windows local tunnel for production.
