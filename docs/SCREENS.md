# Screens (frontend spec)

Every screen needs: **loading** (skeletons), **empty** (guidance + action), **error** (message + retry), keyboard support, and works at 375 / 768 / 1440 px. Times use the global IST/UTC toggle and are relative on screen with absolute on hover. Simulated tanks always show the Simulated badge.

| Route | Purpose (persona) | Data | Role | Task |
|---|---|---|---|---|
| `/login` ✅ | Sign in | POST `/auth/login` | public | — |
| `/dashboard` ✅✏️ | Glance: is any tank in trouble in 3 s? (Priya) | `/dashboard`, `/analytics/heatmap`, `/analytics/compare` | viewer | FE-02/03 |
| `/tanks/[id]` ✅✏️ | Deep dive, diagnose (Suresh) | `/dashboard`, `/readings`, `/tanks/:id/analytics`, `/alerts?tankId` | viewer | FE-05 |
| `/alerts` | Log, filter, acknowledge (Priya, Suresh) | `/alerts` | viewer / ack: operator | FE-06 |
| `/alerts/[id]` | Evidence + sensor health + timeline | `/alerts/:id` | viewer | FE-06 |
| `/analytics` · `/compare` · `/reports` · `/playback` | Trends, compliance exports (Rajesh, Dr. Sharma) | `/analytics/*`, `/reports/*` | viewer | FE-09 |
| `/settings` · `/settings/thresholds` · `/settings/notifications` | Tune alerts | `/tanks/:id`, `/settings/notifications` | operator | FE-08 |
| `/admin/nodes` · `/new` · `/[id]` · `/deleted` | Manage tanks (admin) | `/tanks`, `/tanks/:id` | admin | FE-07 |
| `/admin/users` · `/admin/audit` · `/admin/system` | People, accountability, health | `/users`, `/audit`, `/system/status` | admin | FE-10 |
| `/about` | Diagram, glossary, methodology (honesty page) | static | viewer | FE-11 |
| `/forgot-password` · `/reset-password` | Account recovery | `/auth/forgot`, `/auth/reset` | public | FE-12 |
| `/kiosk` | Control-room fullscreen | `/dashboard` | viewer | FE-13 |

## Global behaviours
- **Alert banner** on every page when any alert is open; bell shows count.
- **Freshness** pill: Live ≤ 10 min, Delayed ≤ 30, Offline > 30 (server provides `freshness`).
- **Unconfirmed dimensions** banner until an admin confirms H/R; percentages are provisional.
- **Honest data:** `null` renders as "—" or a chart gap, never 0.
- **Destructive actions** (delete tank) need typing the label. **Editing H/R** warns it recomputes history.
