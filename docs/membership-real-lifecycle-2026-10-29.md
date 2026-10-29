# Membership lifecycle completion

## Scope

CNY 28.80, fixed 30 days, manual renewal, shared account entitlement across Android and Apple devices. No automatic charge, mock grant, credential in the client, or actual payment executed by these tests.

### Completed source changes

- The previously separate platform-order and independent testbuyer slot implementation is included.
- Safe-mode JSON/XML Apple refund inquiries are authenticated and answered with an encrypted business response. Local lookup has a 300 ms budget and makes no remote API request. It reports only a matched local order status, never claims unmeasured consumption. Default policy does not object to refund; Apple decides. An inquiry cannot grant or revoke membership.
- Final refunds retain both refund identifiers. The server matches the signed notification to the payment, then queries that exact WeChat refund ID. Original payment identity, payer, full amount, environment, platform and refund type must match; refund status 8 means the user received the refund. Status 5 only means merchant debit and is not sufficient. Failed and partial/mismatched notices cannot reverse unrelated access.
- Query-based fulfillment acknowledges delivery through `/xpay/notify_provide_goods` only after the local grant is durable. A failed acknowledgement leaves the paid entitlement intact and is retried without adding another month.
- A non-overlapping five-minute reconciliation loop processes at most ten outstanding orders per pass, with a 45-second pass-start budget and bounded provider requests. The initial recovery window is seven days; older unresolved cases require owner query/manual investigation. The loop never creates orders or initiates payments and is dormant when payment provider configuration is absent.
- Additive schema fields are `provider_delivered_at` and `last_reconciled_at`. Existing memberships/grants and source data are preserved. Rolling back code does not restore old student databases.

## Verification

Run `npm run test:membership` (includes callback crypto, local HTTP, ledger, concurrency, migration, platform, inquiry, delivery and reconciliation suites), `node scripts/test-wechat-mini-auth.mjs`, and `node --check server.js`.

## Activation gates — still distinct

Production inspection on 2026-10-29 found callback configuration present but no mapped live payment AppKey, OfferID or product ID, and all commerce/platform/enforcement flags off. User screenshots supply public AppID/OfferID/product metadata and IAP-enabled status; they do not establish a live paid order.

Do not set REAL_PAYMENT_ACCEPTED until actual Android/iPhone purchase and refund acceptance. Configure the current rotated AppKey privately, the exact published product and one identified testbuyer for a bounded two-hour canary. The buyer personally confirms payment. Do not reuse old chat-exposed keys, guess a buyer ID, or open all-user enforcement before a compatible released client and acceptance.

## Sources checked directly on 2026-10-29

- https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment (canonical page; old ios.html is a migration notice)
- https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order
- https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_notify_provide_goods
- https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/message-push.html
- GitHub reference: https://github.com/TencentCloudBase/CloudBase-AI-Toolkit/blob/main/config/source/skills/cloudbase-wechat-integration/references/virtual-payment.md

No third-party source code was copied. Test credentials are synthetic. Exact real provider callback samples and physical-device payment are still not verified; safe-off deployment is not payment acceptance.
