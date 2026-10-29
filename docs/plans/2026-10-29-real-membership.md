# Real membership completion plan

**Goal:** Complete the existing CNY 28.80 / 30 day, manually renewed membership lifecycle for Android and Apple IAP without treating synthetic tests as live acceptance.

**Architecture:** Shared IELTSist identity remains the membership authority. The Mini Program requests server-owned orders and invokes native virtual payment; authenticated server notifications/order queries alone grant or revoke access. Existing user history, public compatibility routes and free daily PDF allowance remain intact during controlled acceptance.

**Implementation sequence (TDD):**
1. Reconcile live source hashes and configuration readiness, without reading user records or printing secret values.
2. Add failing callback/provider tests for Apple refund inquiries, encrypted business responses, failed/partial/mismatched refund events and platform/type mismatches.
3. Implement bounded encrypted inquiry replies using only established local fulfillment facts; never claim consumption evidence that is not recorded. Refund recommendation is advisory and does not revoke membership.
4. Require authenticated final refund evidence bound to its payment/refund identifiers, full amount and platform before reversing its ledger grant. A standalone ambiguous status number must not revoke access.
5. Verify existing checkout/cancel/recovery, renewal/expiry, cross-account isolation and duplicate-notification suites. Inspect account-level entitlement consumption in STEM/PDF quota code.
6. Sync only reviewed source changes; deploy only exact matching allowlisted backend files after a fresh readiness gate and verified rollback. General checkout/enforcement remain off pending real device acceptance.
7. Controlled human-confirmed purchase on Android and iPhone, callback fulfillment, recovery and refund acceptance are required before all-user activation. Test buyer identity must be supplied by its owner; do not guess it from database rows.

## Research
- Tencent original integration reference: https://github.com/TencentCloudBase/CloudBase-AI-Toolkit/blob/main/config/source/skills/cloudbase-wechat-integration/references/virtual-payment.md
- Official callback: https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/message-push.html
- Official virtual payment: https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/
- Query order: https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order

No external implementation is copied or new dependency installed. Official page retrieval is being checked separately; ambiguous fields are not invented.
