# Deployment overview

- For the Ubuntu public MVP, use [deploy/ubuntu/README.md](ubuntu/README.md).
- For the current Windows local/public bridge, use the LuYouXia notes below.

# IELTS-ist public access with LuYouXia

This machine runs the Node app on `127.0.0.1:4321`. Because the machine has no public IP, LuYouXia must stay online and forward the custom domain to that local port.

## Start

Run:

```powershell
powershell -ExecutionPolicy Bypass -File D:\CodexWork\ielts-trainer\deploy\start-public-ielts-ist.ps1
```

This starts:

- IELTS-ist Node server on `127.0.0.1:4321`
- LuYouXia UI/service from `D:\Program Files (x86)\路由侠v2\LyxUI.exe`

## LuYouXia mapping

The mapping should point to:

- protocol: HTTP
- local host: `127.0.0.1`
- local port: `4321`
- custom domain: `ieltsist.com`
- certificate: Tencent certificate for `ieltsist.com` and `www.ieltsist.com`

Current verified working URL:

- `https://ieltsist.com`

`www.ieltsist.com` must be added as another custom-domain mapping or certificate binding before using it.

## Required checks

```powershell
curl.exe -s https://ieltsist.com/api/tasks -o NUL -D -
```

Expected:

- HTTP status `200`
- no certificate warning
- page source contains `IELTS-ist`

For mobile microphone support, students must use valid HTTPS. Do not use plain HTTP or the raw LuYouXia domain.

## Secrets

Secrets must stay in `.env.local` or environment variables. Do not commit `.env` or `.env.local`.
