# Membership integration (`stemist-membership-v1`)

The shared IELTSist account service is the membership authority for IELTSist and STEM. The only current plan is `all-access-month`: CNY 28.80, 30 fixed days, manual renewal, and no automatic debit. Renewal extends from `max(providerPaidAt, activeExpiry)`.

## Safe defaults

Checkout requires both commerce feature flags and a reviewed provider registry entry with `readiness().ready === true` plus a non-empty server-owned platform allowlist. The registry is intentionally empty until merchant eligibility, production product configuration, platform eligibility, and real-payment acceptance are complete. Enforcement independently requires both enforcement flags and defaults OFF.

Do not enable either path merely because environment values exist. Missing provider/authority configuration fails closed; it never creates an order or grants access.

## Public contract

- Public `GET /api/membership/catalog` returns one `plan`, `commerce`, provider `platforms`, and enforcement state.
- Authenticated `GET /api/membership/status` returns the authoritative entitlement for canonical user ID `ielts:<numeric-id>`.
- Authenticated `GET /api/membership/orders` returns owner-scoped orders newest first.
- Authenticated `POST /api/membership/orders` accepts only `planId`, `idempotencyKey`, `wxCode`, `platform`, and `clientCapability`. Price, duration, product, provider, payer OpenID, and eligible platforms are server-owned.
- Authenticated `GET /api/membership/orders/:id` is owner-scoped and confirms non-final orders through the reviewed provider before changing entitlement.

Order IDs are 31-character server-generated trade numbers (`M` plus 30 lowercase hexadecimal characters) and are also the virtual-payment `outTradeNo`. Reusing an owner-scoped idempotency key always reuses this order/trade number. Payment terminal states return order plus entitlement and no new payment parameters.

Order states are `created`, `pending`, `paid`, `fulfilled`, `refunded`, `closed`, and `failed`. Only `created`, `pending`, and `failed` may obtain payment parameters again. A late checkout result cannot overwrite `paid`, `fulfilled`, `refunded`, or `closed`; callback/query event replay is idempotent, and a refunded grant cannot be restored by a late paid event.

## Provider boundary

The virtual provider interface is `createWechatVirtualProvider({config,httpClient,clock})`, exposing `readiness`, `createCheckout`, and `queryOrder`. It uses server-authoritative app-scoped OpenID, transient code-to-session context, OfferID/AppKey signatures, and exact query-order normalization. AppKey, sessionKey, access token, and payment parameters are never persisted in membership tables or logs.

Client payment success is never fulfillment authority. Only a verified provider event may grant or reverse membership. Delivery-callback verification and refund initiation remain fail-closed until their complete official contracts are reviewed. `wechat_jsapi` is a separate provider and must not be treated as a virtual-payment fallback.

## Entitlement and enforcement

Payment/redemption grants form an idempotent ledger. Existing membership is captured as a baseline; renewal adds exactly 30 days for the paid plan; refund reverses only its matching payment grant and recomputes the entitlement.

IELTS HTTP paid routes and the realtime WebSocket upgrade enforce the local authoritative membership when enforcement is ON. Authentication, membership/order recovery, owner history reads/exports/deletion, and reviewed public discovery routes remain available. The signed internal STEM endpoints expose membership/status decisions but no public grant or mock route.

## Activation blockers

- Merchant capability, OfferID/product, AppKey, Android/iOS eligibility, and iOS IAP status are not confirmed.
- The production provider registry/access-token authority is not connected.
- Callback verification and refund initiation are not complete.
- Existing public bundles/download caches cannot be revoked. New `/generated/**`/legacy media requests are gated and private/no-store when enforcement is ON, but previously cached bytes remain.
- Real Mini/browser payment and authenticated image/PDF/index downloads have not passed device acceptance.

Checkout and enforcement must stay OFF until all blockers are closed. This implementation is not DRM and is not a complete paywall.

Primary references: [Tencent CloudBase virtual payment](https://github.com/TencentCloudBase/skills/blob/main/skills/cloudbase-wechat-integration/references/virtual-payment.md), [WeChat virtual payment API](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html), and [official WeChat Pay APIv3 library](https://github.com/wechatpay-apiv3/wechatpay-go).
