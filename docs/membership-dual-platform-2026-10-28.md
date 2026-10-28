# Dual-platform membership candidate — Stage A only

Status: local implementation and synthetic verification; **NOT FOR PRODUCTION ACTIVATION**.

## Changes

- Orders persist `platform` (android / ios); unknown legacy orders remain query-only. An exact legacy Android canary owner/key/product match may establish its platform, including crash-before-bind recovery.
- Android canary slot and four-key `commerce.canary` remain compatible with 1.0.63. A separate durable iOS slot uses the same canonical test buyer and its own at-most-two-hour window.
- A SQLite `BEGIN IMMEDIATE` transaction serializes cross-table same-key checks and reservation. The losing platform leaves no slot. Recheck the clock after acquiring the lock.
- Only authenticated, configured owners receive per-platform descriptors. Public/other-owner catalogs never expose recovery identifiers.
- Paid provider order type is bound to the recorded platform (Android 0, iOS 7). Existing member entitlements remain account-level, not device-level.

## Test commands

Use the already installed dependency directory for this process only:

```powershell
$env:NODE_PATH = 'D:\CodexWork\ielts-trainer\node_modules'
npm run test:membership
node --check server.js
```

All HTTP test servers bind loopback and use synthetic identities, keys and temporary databases. `pretest:membership` includes legacy-schema migration, two-connection cross-platform same/different-key races and lock-acquisition expiry checks.

## Mandatory remaining release gates

The payment statistics screenshots do not establish Apple IAP activation or approved product/price. No merchant settings, production flags, live keys, real order or payment were changed for this candidate.

**Stage B remains unimplemented and blocks iOS activation:** strict iOS refund inquiry parsing, truthful and approved evidence/recommendation policy, encrypted business response within three seconds, and verified final refund notification/query matching (including refund IDs and platform order types). Current generic acknowledgments and the previous `status=8` mapping are not iOS refund acceptance evidence. Do not enable iOS, general checkout, enforcement, or real-payment acceptance from Stage A tests.

The Mini Program candidate permits iOS only through a validated private platform descriptor; it does not open general iOS commerce. Keep source delivery, development upload, experience designation, platform IAP approval and real-device payment acceptance as separate statuses.

## References and diagnostic notes

- [Tencent original virtual-payment integration reference](https://github.com/TencentCloudBase/CloudBase-AI-Toolkit/blob/main/config/source/skills/cloudbase-wechat-integration/references/virtual-payment.md), reviewed 2026-10-28; follow its linked official APIs for exact refund fields. Direct official-page retrieval and the merchant browser connection were unavailable in this run.
- Initial local HTTP tests lacked pdfkit because this selective source checkout has no node_modules. Reusing the known local IELTSist dependency path resolved the test setup without installing or changing dependencies.
- All D-drive edits used scoped permission and the system apply_patch entry. No global security configuration was changed.
