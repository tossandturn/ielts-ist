# IELTS-ist User Database

Default database file:

```text
data/ieltsist.sqlite
```

Navicat can open this SQLite file directly. The server creates tables automatically on first use.

## Tables

- `users`: username is the unique account key.
- `sessions`: hashed login tokens.
- `memberships`: current plan and expiry for each user.
- `redemption_codes`: week/month/year codes.
- `redemption_uses`: code usage history.
- `drafts`: autosaved practice drafts.
- `vocabulary_items`: Help vocabulary notebook entries.

## Redemption Code API

Create codes from a fulfillment service:

```http
POST /api/admin/redemption-codes
X-Admin-Secret: <ADMIN_API_SECRET>
Content-Type: application/json

{
  "plan": "week",
  "count": 1,
  "maxUses": 1,
  "prefix": "IELTS"
}
```

Supported plans:

- `week`: 7 days
- `month`: 31 days
- `year`: 366 days

Student redemption:

```http
POST /api/redeem
Authorization: Bearer <student-token>
Content-Type: application/json

{ "code": "IELTS-XXXX" }
```
