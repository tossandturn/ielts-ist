# Membership integration (`stemist-membership-v1`)

The shared IELTSist account service is the membership authority for IELTSist and STEM. The only current plan is `all-access-month`: CNY 28.80, 30 fixed days, manual renewal, and no automatic debit. Renewal extends from `max(providerPaidAt, activeExpiry)`.

## Safe defaults

Checkout requires both commerce feature flags and a reviewed provider registry entry with `readiness().ready === true` plus a non-empty server-owned platform allowlist. The runtime registry is empty by default and remains empty until merchant eligibility, production product configuration, platform eligibility, and real-payment acceptance are explicit. Enforcement independently requires both enforcement flags and defaults OFF.

Do not enable either path merely because environment values exist. Missing provider/authority configuration fails closed; it never creates an order or grants access.

### Runtime configuration

The runtime reads only these standard server variables; external secret stores must map into them without changing source code or logging values:

- Capability: `MEMBERSHIP_WECHAT_VIRTUAL_ENABLED`, `MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY`, `MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED`, `MEMBERSHIP_WECHAT_VIRTUAL_MODE=production`.
- Public product identity: `MEMBERSHIP_WECHAT_VIRTUAL_APP_ID`, `MEMBERSHIP_WECHAT_VIRTUAL_OFFER_ID`, `MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID`.
- Server secrets: `MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY` and `MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET` (the existing Mini Program AppSecret may be used through its standard server variable).
- Platform readiness: `MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY`; iOS additionally requires both `MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED` and `MEMBERSHIP_WECHAT_VIRTUAL_IOS_IAP_READY` and is denied by default.
- Callback: `WECHAT_VIRTUAL_CALLBACK_READY`, `WECHAT_VIRTUAL_CALLBACK_MODE=safe`, `WECHAT_VIRTUAL_CALLBACK_TOKEN`, `WECHAT_VIRTUAL_CALLBACK_AES_KEY`, and explicit `WECHAT_VIRTUAL_CALLBACK_FORMAT=json|xml`.
- Acceptance: `MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED` is separate from configuration/signing capability. The registry also remains empty unless the existing checkout/commerce flags are both enabled.

No AppID, OfferID, product ID, key, token, or platform is compiled as a live default. Access tokens come from the official `POST https://api.weixin.qq.com/cgi-bin/stable_token` flow with `force_refresh:false`, bounded HTTPS, a single in-process refresh request, and refresh before expiry. Tokens and provider response bodies are never logged or returned to clients.

### WeChat message-push setup

Configure the public callback URL as `/api/membership/wechat/notify` on the production HTTPS origin. The platform setup needs:

- URL;
- a private 3–32 character alphanumeric Token mapped to `WECHAT_VIRTUAL_CALLBACK_TOKEN`;
- a separate 43-character alphanumeric EncodingAESKey mapped to `WECHAT_VIRTUAL_CALLBACK_AES_KEY`;
- security/encryption mode enabled;
- message format matching the explicit runtime callback format;
- virtual-payment delivery/refund notification events enabled.

Do not submit the platform form until this exact server version is deployed and the HTTPS GET verification path has passed a bounded live check. Local source presence is not evidence that the URL is reachable.

Initial GET verification validates the ordinary SHA-1 Token/timestamp/nonce signature before echoing `echostr`. This handshake can be configured independently of payment keys, product readiness, eligible platforms or live checkout. POST notifications require complete provider configuration, the safe-mode encrypted signature, AES/AppID validation, and then act only as query triggers. The runtime must query the official order API and durably apply or confirm an idempotent terminal event before returning success; an invalid, unknown, non-terminal, or failed query returns a non-success acknowledgement so the platform can retry.

## Public contract

- Public `GET /api/membership/catalog` returns one `plan`, `commerce`, provider `platforms`, and enforcement state.
- Authenticated `GET /api/membership/status` returns the authoritative entitlement for canonical user ID `ielts:<numeric-id>`.
- Authenticated `GET /api/membership/orders` returns owner-scoped orders newest first.
- Authenticated `POST /api/membership/orders` accepts only `planId`, `idempotencyKey`, `wxCode`, `platform`, and `clientCapability`. Price, duration, product, provider, payer OpenID, and eligible platforms are server-owned.
- Authenticated `GET /api/membership/orders/:id` is owner-scoped and confirms non-final orders through the reviewed provider before changing entitlement.

Order IDs are 31-character server-generated trade numbers (`M` plus 30 lowercase hexadecimal characters) and are also the virtual-payment `outTradeNo`. Reusing an owner-scoped idempotency key always reuses this order/trade number. Payment terminal states return order plus entitlement and no new payment parameters.

Order states are `created`, `pending`, `paid`, `fulfilled`, `refunded`, `closed`, and `failed`. Only `created`, `pending`, and `failed` may obtain payment parameters again. A late checkout result cannot overwrite `paid`, `fulfilled`, `refunded`, or `closed`; callback/query event replay is idempotent, and a refunded grant cannot be restored by a late paid event.

## Provider boundary

The virtual provider interface is `createWechatVirtualProvider({config,httpClient,clock})`, exposing `readiness`, `createCheckout`, `queryOrder`, and authenticated notification parsing. It uses server-authoritative app-scoped OpenID, transient code-to-session context, OfferID/AppKey signatures, and exact query-order normalization. AppKey, sessionKey, access token, and payment parameters are never persisted in membership tables or logs.

Client payment success is never fulfillment authority. Only a verified provider event may grant or reverse membership. Safe-mode delivery and full-refund notifications trigger an official order query before any grant/reversal. A verified full refund arriving before paid delivery closes the order without granting membership or removing unrelated legacy entitlements. Proactive refund initiation is not implemented: refunds initiated by an authorized operator in WeChat or by the platform are synchronized through the verified notification/query path. Partial-refund policy is not enabled. `wechat_jsapi` is a separate provider and must not be treated as a virtual-payment fallback.

## Entitlement and enforcement

Payment/redemption grants form an idempotent ledger. Existing membership is captured as a baseline; renewal adds exactly 30 days for the paid plan; refund reverses only its matching payment grant and recomputes the entitlement.

IELTS HTTP paid routes and the realtime WebSocket upgrade enforce the local authoritative membership when enforcement is ON. Authentication, membership/order recovery, owner history reads/exports/deletion, and reviewed public discovery routes remain available. The signed internal STEM endpoints expose membership/status decisions but no public grant or mock route.

## Activation blockers

- Live payment credentials, merchant/product and each platform's eligibility must be independently verified before activation; local tests use synthetic fixtures only.
- The default-OFF runtime registry, access-token authority and notification endpoint are implemented locally, but their production deployment/configuration is not verified by these tests.
- The actual public callback URL must pass WeChat's handshake and receive a real authenticated payment/refund notification; proactive and partial refunds remain outside this implementation.
- Existing public bundles/download caches cannot be revoked. New `/generated/**`/legacy media requests are gated and private/no-store when enforcement is ON, but previously cached bytes remain.
- Real Mini/browser payment and authenticated image/PDF/index downloads have not passed device acceptance.

Checkout and enforcement must stay OFF until all blockers are closed. This implementation is not DRM and is not a complete paywall.

Primary references: [Tencent CloudBase virtual payment](https://github.com/TencentCloudBase/skills/blob/main/skills/cloudbase-wechat-integration/references/virtual-payment.md), [WeChat virtual payment API](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html), and [official WeChat Pay APIv3 library](https://github.com/wechatpay-apiv3/wechatpay-go).
