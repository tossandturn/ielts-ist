# IELTS-ist deployment

Production access must go directly to the Ubuntu public server.

Current production path:

```text
DNSPod A record -> 43.156.76.217 -> Nginx 443 -> 127.0.0.1:4321 on the same Ubuntu server
```

`127.0.0.1:4321` in the Nginx config is the loopback address on the Ubuntu server, not the Windows development machine.

Do not use Cloudflare Tunnel, LuYouXia, NASCab, or any Windows local tunnel for production.

For Ubuntu setup details, see [deploy/ubuntu/README.md](ubuntu/README.md).

Secrets must stay in server-side `.env` / `.env.local` files or environment variables. Do not commit keys.
