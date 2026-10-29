# Correct cancellation recovery

The actual Android cancellation exposed two contract mistakes that synthetic tests had missed:

1. WeChat returns `biz_meta` as a JSON string containing `attach`; the adapter compared the entire string directly with `attach`. A genuine closed order (status 6) was rejected as a mismatch and remained locally pending. Preserve exact HMAC binding validation, accepting the observed `{ "attach": expected }` envelope as well as the prior direct-string fixture form. Inapplicable `refund_fee` may be absent from payment rows; a present nonzero refund or reduced refundable balance remains rejected for a new paid grant.
2. Official `wx.requestVirtualPayment` explicitly makes `outTradeNo` one-use and returns -15002 for reuse. Cancellation (-2) is not permission to invoke the same provider trade number again. A local issued/pending order is now query-only and no longer returns another set of payment parameters.

## Safe retry

Only a verified provider status 6 can close an order. Record its response digest/time. For an active, same-owner/same-platform test window, atomically archive that closed trial attempt and reserve a fresh recovery key for an explicitly initiated replacement. Retain the old order and link the replacement order in `membership_testbuyer_retries`. A failed query, unconfirmed cancellation, pending/paid/fulfilled/refunded order, changed owner/platform or expired window cannot release another attempt. A maximum of three verified-closed replacements is allowed during this controlled test window, with at most one payable order at any time.

No new payment or order is automatically initiated. Older compatible clients can refresh the old order and then refresh membership to obtain the new recovery key. Client lifecycle/cancellation UX is being corrected separately; server deployment is not client upload evidence.

## Verification

`npm run test:membership` includes a regression with the real metadata shape, query-only pending retries, closure evidence, retained history, fresh trade numbers, and no replacement for unknown or paid orders. All data is synthetic. Real paid fulfillment is still a separate user-confirmed acceptance step.

Primary source: https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html
Query contract: https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order

This supersedes previous same-provider-order cancellation retry statements in membership integration/acceptance notes. UI wording must not instruct users to repay a consumed trade number.
