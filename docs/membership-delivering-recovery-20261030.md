# Recover paid orders during WeChat delivery-in-progress

## Failure and change

The query adapter mapped WeChat numeric order status `3` (delivery in progress) to a pending payment. The encrypted delivery callback also calls this adapter and requires a verified paid event before granting the membership. Waiting for status `4` therefore left a paid order unfulfilled when the provider was waiting for our delivery acknowledgment.

Status `3` now uses the same verified paid-event path as `2` and `4`. The existing trade number, signed metadata, environment, platform, original/paid amount, remaining amount, provider identity and payment-time validation remain mandatory. The event identity and grant key stay stable across states, callback replays and query recovery.

Query recovery acknowledges delivery for status `2` or `3` only after the entitlement transaction is durable. An acknowledgment outage does not remove the entitlement or ask the buyer to pay again. The existing bounded reconciler retries the acknowledgment. No schema, price, duration, public checkout flag or client package change is required.

## Verification

- A failing adapter test reproduced `pending !== paid` for status 3 before the fix.
- A failing encrypted-callback/ledger integration test reproduced the retry deadlock before the fix.
- Added actual adapter + encrypted callback + SQLite tests for status 3, concurrent/duplicate callbacks and queries, Android/iOS platform matching, delivery acknowledgment failure/retry, unpaid orders, ten invalid identity/amount/state inputs, and refunded-order replay.
- Full `npm run test:membership`, WeChat identity exchange checks and server syntax checks pass with the existing local workspace dependencies supplied through process-local `NODE_PATH`.
- Production rollout replaces only `server/membership.js` and `server/membershipWechatVirtual.js`, with pinned prior-file hashes, reversible code backup and before/after service/resource checks. The original order is reconciled through the normal verified query path; no direct SQL payment/grant override or new order is used.

## Primary sources

- [WeChat query_order](https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order): numeric status, paid amount, payment time, environment and order-type fields.
- [WeChat notify_provide_goods](https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_notify_provide_goods): delivery acknowledgment after fulfillment when the normal callback path did not complete.
- [TencentCloudBase original integration reference](https://github.com/TencentCloudBase/CloudBase-AI-Toolkit/blob/main/config/source/skills/cloudbase-wechat-integration/references/virtual-payment.md): callback verification, idempotent fulfillment and query recovery. Used as protocol context; no source code copied.
