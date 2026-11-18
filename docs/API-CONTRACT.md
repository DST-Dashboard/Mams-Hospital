# API contract

Source of truth for request/response shapes: **`src/contracts/*.ts`** (zod) and **`src/lib/types.ts`** (types derived from the live services). This table reflects all production endpoints.

## Conventions
- Base `/api`. Auth: httpOnly cookie `ohtms_session` (set by login) or `Authorization: Bearer mams_...` (API keys). 401 = not signed in, 403 = role too low.
- Errors always `{ "error": string, "details"?: unknown }`.
- **Time = epoch milliseconds, UTC.** Convert to IST only at display (`lib/format.ts`).
- **Missing data is `null`, never `0`.**
- Distance (cm) is raw; `levelCm`, `levelPct`, `volumeL` are derived by the server. UI never recomputes them.
- Paging: `?page=1&pageSize=50` → `{ items, total, page, pageSize }`.
- Roles: viewer < operator < admin.
- `ENABLE_MOCKS=0` in production / CI; all routes connect to SQLite and live data.

## Endpoints
| Method · Path | Role | Status | Request → Response | Details |
|---|---|---|---|---|
| GET `/health` | public | LIVE | → `{status, readings, lastReadingAt, asOf, clockMode}` | System health |
| POST `/auth/login` | public | LIVE | `{email,password}` → `{id,name,role}` + cookie | Authentication |
| POST `/auth/logout` · GET `/auth/me` | any | LIVE | → `{ok}` · → `{uid,role,name}` | Session management |
| POST `/auth/password` | viewer | LIVE | `ChangePasswordBody` → `{ok}` | Password change |
| POST `/auth/forgot` · `/auth/reset` | public | LIVE | `ForgotBody` · `ResetBody` → `{ok}` | Password recovery |
| GET · POST `/auth/totp` · `/auth/totp/setup` · `/auth/totp/verify` | viewer | LIVE | TOTP MFA enrollment and verification | MFA security |
| GET `/dashboard` | viewer | LIVE | → `DashboardData` (tanks[], alerts[], asOf, clockMode, summary) | Core dashboard |
| GET `/tanks` | viewer | LIVE | `?deleted=1` → `TankRow[]` | List all tanks |
| POST `/tanks` | admin | LIVE | `TankInput` → `TankRow` (201) | Create tank |
| GET · PATCH · DELETE `/tanks/:id` | viewer · admin · admin | LIVE | `TankInput` → `TankRow`; DELETE `?restore=1` restores | Tank lifecycle |
| GET `/tanks/:id/analytics` | viewer | LIVE | `?from&to` → `AnalyticsResponse` | Tank analytics |
| GET · PUT `/tanks/:id/recipients` | operator | LIVE | `TankRecipientInput[]` → `TankRecipientDTO[]` | Per-tank alerts |
| POST `/tanks/bulk` · `/clone` · `/import` · GET `/export` | admin | LIVE | `BulkBody` · `CloneBody` · `TankExportFile` | Tank administration |
| GET `/readings` | viewer | LIVE | `?tankId&from&to&res=auto\|raw\|15m\|1h\|1d` → `ReadingsResponse` | Telemetry series |
| GET `/readings/export` | viewer | LIVE | CSV file stream | Raw export |
| GET `/alerts` | viewer | LIVE | `?state=open` → `AlertRow[]`; `AlertListQuery` | Active/history alerts |
| GET `/alerts/:id` | viewer | LIVE | → `AlertDetailDTO` with evidence & telemetry | Alert details |
| POST `/alerts/:id/ack` | operator | LIVE | `AckBody` → alert | Acknowledge alert |
| POST `/alerts/:id/resolve` · `/snooze` | operator | LIVE | `ResolveBody` · `SnoozeBody` → `{ok}` | Resolve / snooze |
| GET `/analytics/heatmap` | viewer | LIVE | `HeatmapQuery` → `HeatmapDTO` | Hourly heatmap |
| GET `/analytics/compare` | viewer | LIVE | `CompareQuery` → `CompareDTO` | Cross-tank metrics |
| GET `/reports/weekly` · `/monthly` · `/incident` | operator | LIVE | PDF/CSV file download | Compliance reports |
| GET · POST `/users` | admin | LIVE | → `UserDTO[]` · `UserCreateBody` → `UserDTO` | User management |
| PATCH · DELETE `/users/:id` | admin | LIVE | `UserUpdateBody` → `UserDTO` | User edit / deactivate |
| GET `/audit` | admin | LIVE | `AuditQuery` → `Page<AuditEntryDTO>` | Audit trail |
| GET · PUT `/settings/notifications` | viewer · operator | LIVE | `NotificationPrefsDTO` | Dispatch preferences |
| GET `/system/status` | admin | LIVE | → `SystemStatusDTO` | Telemetry & jobs status |
| POST `/ingest/tts` | secret header | LIVE | TTS uplink JSON → `{inserted}` | Hardware uplink |
| GET · POST `/keys` · DELETE `/keys/:id` | viewer · admin | LIVE | Manage scoped API keys | Developer API keys |
| GET · POST `/zones` · GET · PATCH · DELETE `/zones/:id` | viewer · admin | LIVE | Manage facility zones | Zone taxonomy |
| GET · POST `/templates` · GET · PATCH · DELETE `/templates/:id` | viewer · admin | LIVE | Threshold configuration templates | Policy templates |
| POST `/notifications/push` | viewer | LIVE | Web push subscription management | Browser notifications |
