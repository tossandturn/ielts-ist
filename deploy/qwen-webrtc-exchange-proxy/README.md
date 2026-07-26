# Qwen WebRTC Exchange Proxy

This tiny service handles only the authenticated SDP exchange with Qwen Realtime.
It does not proxy student audio after WebRTC is established.

Use it when the main IELTS-ist server is in a region where Qwen returns
`unsupported_district`.

## Run

```bash
cp .env.example .env
nano .env
node server.js
```

Expose it over HTTPS, then configure the main IELTS-ist server:

```bash
QWEN_WEBRTC_EXCHANGE_PROXY_URL=https://your-proxy-domain/api/qwen-webrtc-offer
```

Restart the main IELTS-ist service after setting the environment variable.
