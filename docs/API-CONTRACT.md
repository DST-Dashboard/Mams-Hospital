# API contract

Source of truth for request/response shapes: **`src/contracts/*.ts`** (zod) and **`src/lib/types.ts`** (types derived from the live services). This table says which endpoints are real.

## Conventions
- Base `/api`. Auth: httpOnly cookie `ohtms_session` (set by login). 401 = not signed in, 403 = role too low.
- Errors always `{ "error": string, "details"?: unknown }`.
- **Time = epoch milliseconds, UTC.** Convert to IST only at display (`lib/format.ts`).
- **Missing data is `null`, never `0`.**
- Distance (cm) is raw; `levelCm`, `levelPct`, `volumeL` are derived by the server. UI never recomputes them.
- Paging: `?page=1&pageSize=50` → `{ items, total, page, pageSize }`.
- **`x-mock: 1` response header = sample data from an unbuilt endpoint.** Needs `ENABLE_MOCKS=1`; otherwise those routes answer `501`.
- Roles: viewer < operator < admin.

## Endpoints
| Method · Path | Role | Status | Request → Response | Owner task |
|---|---|---|---|---|
| GET `/health` | public | LIVE | → `{status, readings, lastReadingAt, asOf, clockMode}` | — |
| POST `/auth/login` | public | LIVE | `{email,password}` → `{id,name,role}` + cookie | — |
| POST `/auth/logout` · GET `/auth/me` | any | LIVE | → `{ok}` · → `{uid,role,name}` | — |
| POST `/auth/password` | viewer | MOCK | `ChangePasswordBody` → `{ok}` | BE-03 |
| POST `/auth/forgot` · `/auth/reset` | public | MOCK | `ForgotBody` · `ResetBody` → `{ok}` | BE-03 |
| GET `/dashboard` | viewer | LIVE | → `DashboardData` (tanks[], alerts[], asOf, clockMode, summary) | — |
| GET `/tanks` | viewer | LIVE | `?deleted=1` → `TankRow[]` | — |
| POST `/tanks` | admin | LIVE | `TankInput` → `TankRow` (201) | — |
| GET · PATCH · DELETE `/tanks/:id` | viewer · admin · admin | LIVE | `TankInput` → `TankRow`; DELETE `?restore=1` restores | — |
| GET `/tanks/:id/analytics` | viewer | LIVE | `?from&to` → `AnalyticsResponse` | — |
| POST `/tanks/bulk` · `/clone` · `/import` · GET `/export` | admin | MOCK | `BulkBody` · `CloneBody` · `TankExportFile` | BE-06 |
| GET `/readings` | viewer | LIVE | `?tankId&from&to&res=auto|raw|15m|1h|1d` → `ReadingsResponse` | — |
| GET `/readings/export` | viewer | 501 | CSV file | BE-11 |
| GET `/alerts` | viewer | LIVE (basic) | `?state=open` → `AlertRow[]`; extend with `AlertListQuery` | BE-02 |
| GET `/alerts/:id` | viewer | MOCK | → `AlertDetailDTO` | BE-02 |
| POST `/alerts/:id/ack` | operator | LIVE | `AckBody` → alert | — |
| POST `/alerts/:id/resolve` · `/snooze` | operator | MOCK | `ResolveBody` · `SnoozeBody` → `{ok}` | BE-02 |
| GET `/analytics/heatmap` | viewer | MOCK | `HeatmapQuery` → `HeatmapDTO` | BE-05 |
| GET `/analytics/compare` | viewer | MOCK | `CompareQuery` → `CompareDTO` | BE-05 |
| GET `/reports/weekly` · `/monthly` · `/incident` | operator | 501 | PDF/CSV file | BE-11 |
| GET · POST `/users` | admin | MOCK | → `UserDTO[]` · `UserCreateBody` → `UserDTO` | BE-03 |
| PATCH · DELETE `/users/:id` | admin | MOCK | `UserUpdateBody` → `UserDTO` | BE-03 |
| GET `/audit` | admin | MOCK | `AuditQuery` → `Page<AuditEntryDTO>` | BE-04 |
| GET · PUT `/settings/notifications` | viewer | MOCK | `NotificationPrefsDTO` | BE-07 |
| GET `/system/status` | admin | MOCK | → `SystemStatusDTO` | BE-13 |
| POST `/ingest/tts` | secret header | LIVE (off until `TTS_WEBHOOK_SECRET`) | TTS uplink → `{inserted}` | BE-10 |

**Backend:** when you replace a mock, change its Status here to LIVE in the same PR.
