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
| POST `/readings` | operator | LIVE | `{tankId, t?, distanceCm?, levelCm?, batteryPct?, rssi?, snr?, notes?}` → `{ok: true, reading}` | Role-based Manual Data Entry (Admin & Tank Owner, conflict guard, audited) |
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
| GET `/system/status` | admin | LIVE | → System health, database size, device statuses | System & hardware operational status |
| GET `/cron/tick` | public | LIVE | `?full=1` (bearer: `CRON_SECRET`) → `{ok: true, jobs}` | Scheduled background evaluator |
