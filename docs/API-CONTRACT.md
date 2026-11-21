# API Contract

Source of truth for request/response shapes: **`src/contracts/*.ts`** (zod) and **`src/lib/types.ts`** (types derived from the live services). This table reflects all production endpoints.

## Conventions
- Base `/api`. Auth: httpOnly cookie `ohtms_session` (set by login). 401 = not signed in, 403 = role too low.
- Errors always `{ "error": string, "details"?: unknown }`.
- **Time = epoch milliseconds, UTC.** Display format converts to IST (`Asia/Kolkata`) in client views.
- **Missing data is `null`, never `0`.**
- Distance (cm) is raw; `levelCm`, `levelPct`, `volumeL` are derived on the fly by the server. UI never recomputes them.
- Paging: `?page=1&pageSize=50` → `{ items, total, page, pageSize }`.
- Roles: viewer < operator < admin.
- Operates 100% on **PostgreSQL**; zero mocks, zero locks, zero sample data.

## Endpoints

| Method · Path | Role | Status | Request → Response | Details |
|---|---|---|---|---|
| GET `/health` | public | LIVE | → `{ok: true, db: true, timestamp, clockMode: "live"}` | Health & DB check |
| POST `/auth/login` | public | LIVE | `{email, password}` → `{id, name, role, mustChangePassword}` + cookie | Authentication (5 attempts / 15m rate limit) |
| POST `/auth/logout` · GET `/auth/me` | any | LIVE | → `{ok: true}` · → `{uid, role, name, mustChangePassword}` | Session management |
| POST `/auth/password` | viewer | LIVE | `{current, next}` → `{ok: true}` | Password change with policy validation |
| GET · POST `/auth/forgot` | public | LIVE | GET → `{smtpConfigured}`; POST `{email}` → `{ok: true}` | Single-use 30-min hashed reset token |
| POST `/auth/reset` | public | LIVE | `{token, password}` → `{ok: true}` | Password reset completion |
| GET `/dashboard` | viewer | LIVE | → `DashboardData` (tanks[], alerts[], asOf, clockMode: "live", summary) | Core rooftop fleet dashboard |
| GET `/tanks` | viewer | LIVE | `?deleted=1` → `TankRow[]` | List all tanks |
| POST `/tanks` | admin | LIVE | `TankInput` → `TankRow` (201) | Commission new tank node |
| GET · PATCH · DELETE `/tanks/:id` | viewer · admin · admin | LIVE | `TankInput` → `TankRow`; DELETE soft-deletes (`?restore=1` restores) | Tank lifecycle & geometry calibration |
| GET `/tanks/:id/analytics` | viewer | LIVE | `?from&to` → `AnalyticsResponse` (events, anomalies, consumption) | Tank analytics & statistics |
| GET · PUT `/tanks/:id/recipients` | operator | LIVE | `TankRecipientInput[]` → `TankRecipientDTO[]` | Per-tank alert notification recipients |
| GET `/readings` | viewer | LIVE | `?tankId&from&to&res=auto\|raw\|15m\|1h\|1d` → `ReadingsResponse` | Telemetry series |
| GET `/readings/export` | operator | LIVE | `?tankId&from&to` → CSV streaming download | Raw telemetry export (audited) |
| GET `/alerts` | viewer | LIVE | `?state=open\|acknowledged\|snoozed\|resolved\|all` → `AlertRow[]` | Active & historical incidents |
| GET `/alerts/:id` | viewer | LIVE | → `AlertDetailDTO` with evidence & telemetry | Forensic incident record |
| POST `/alerts/:id/ack` | operator | LIVE | `{note?: string}` → `{ok: true}` | Acknowledge alert |
| POST `/alerts/:id/resolve` | operator | LIVE | `{note?: string}` → `{ok: true}` | Resolve alert |
| POST `/alerts/:id/snooze` | operator | LIVE | `{minutes: number}` → `{ok: true, snoozedUntil}` | Snooze alert |
| GET `/reports/weekly` | operator | LIVE | `?format=pdf\|csv` → File download | Weekly operational report |
| GET `/reports/monthly` | operator | LIVE | `?format=pdf\|csv` → File download | Monthly synoptic report |
| GET `/reports/incident` | operator | LIVE | `?alertId=ID&format=pdf` → File download | Single-page forensic incident report |
| GET · PUT `/settings/notifications` | viewer | LIVE | `NotificationPrefsDTO` → `NotificationPrefsDTO` | User email alerts, daily digest, quiet hours |
| GET · POST `/users` | admin | LIVE | → `UserDTO[]` · `UserCreateBody` → `UserDTO` | User management |
| GET · PATCH · DELETE `/users/:id` | admin | LIVE | `UserUpdateBody` → `UserDTO` | User update / disable ("last admin" protected) |
| GET `/audit` | admin | LIVE | `?page&pageSize&entity&userId&action&from&to` → `AuditPage` | Append-only audit trail |
| GET `/system/status` | admin | LIVE | → System health and operational status | Hardware & operational status |
| GET · POST `/readings/manual` | operator/admin | LIVE | GET → permitted tanks; POST `{tankId,distanceCm,batteryPct?,t?,notes?}` → reading | Manual entry; server validates tank assignments |
| GET · DELETE `/keys` · `/keys/:id` | operator · admin · admin | LIVE | GET key metadata; POST `{name,role,tankId?,expiresAt?}` → raw key once; DELETE revokes | API key provisioning and revocation |
| POST `/v1/readings` | API key | LIVE | `{tankId?,deviceId?,distanceCm,batteryPct?,t?,rssi?,snr?,fCnt?,gatewayId?}` or array up to 100 | Generic REST ingestion (operator/admin key, optional tank scope) |
| GET `/cron/tick` | public | LIVE | `?full=1` (bearer: `CRON_SECRET`) → `{ok: true, jobs}` | Scheduled background evaluator |

## Generic REST Reading Ingestion

- **Endpoint:** `POST /api/v1/readings`
- **Authentication:** `X-API-Key: mams_api_...` or `Authorization: Bearer mams_api_...`
- **Provisioning:** Admin calls `POST /api/keys` with `{ "name", "role", "tankId", "expiresAt" }`. The raw key is returned only in the `201` response and must be stored securely.
- **Revocation:** Admin calls `DELETE /api/keys/:id`. Revoked and expired keys return `401`.
- **Tank scope:** Set `tankId` to scope a key to one tank. Omit it for a key that may submit to any tank. Server-side authorization is always enforced.
- **Payload:** one reading or an array of 1–100 readings. Fields: `tankId` or `deviceId`, `distanceCm`, optional `batteryPct`, `t` (epoch ms), `rssi`, `snr`, `fCnt`, `gatewayId`.
- **Limits:** 1 MiB body; 120 requests/minute per key; timestamps must be within 5 minutes in the future and 1 year in the past.
- **Source:** accepted readings are stored as `API`; duplicate `(deviceId,t)` rows are ignored for idempotency.
- **Responses:** `200 {ok:true,...}` or `200 {ok:true,count,readings}`; `400` validation, `401` key, `403` role/tank scope, `404` tank, `413` body size, `429` rate limit.

cURL:
```bash
curl -X POST https://mams-hospital-app.vercel.app/api/v1/readings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mams_api_REPLACE_ME" \
  -d '{"tankId":1,"distanceCm":150,"batteryPct":90}'
```

Python:
```python
import requests

requests.post(
    "https://mams-hospital-app.vercel.app/api/v1/readings",
    headers={"X-API-Key": "mams_api_REPLACE_ME"},
    json={"tankId": 1, "distanceCm": 150, "batteryPct": 90},
    timeout=15,
).raise_for_status()
```

JavaScript:
```javascript
await fetch("https://mams-hospital-app.vercel.app/api/v1/readings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "mams_api_REPLACE_ME",
  },
  body: JSON.stringify({ tankId: 1, distanceCm: 150, batteryPct: 90 }),
});
```
