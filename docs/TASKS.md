# Task board

**Legend** — Owner: FE = frontend, BE = backend · Status: ✅ done · 🟡 API live/mock exists · ⬜ todo · Block = what it unblocks.
Feature IDs (F-, C-, A-, N-, U-, S-, I-, M-) refer to `00-project-definition.md` §4 and `FEATURES.md`.

## Sprint 0 — day 1 (both)
- Push repo, both run `npm run setup`, both sign in. Fix login issues with `npm run auth:reset`.
- **Decision input:** real tank dimensions, real-vs-simulated nodes, hosting, notification providers.

## Frontend (you)
| ID | Task | Key files | Needs | Phase |
|---|---|---|---|---|
| FE-01 | UI kit + typed SWR hooks | `components/ui/*` `lib/hooks.ts` | — | 1 |
| FE-02 | Shell: alert bell, global banner, mode indicator, mobile nav | `features/shell/*` | live `/api/alerts` | 1 |
| FE-03 | Dashboard completion: week heatmap, all-tanks trend, node health grid, extract Sparkline | `features/dashboard/*` `components/charts/*` | mock `/analytics/heatmap` `/compare` | 1 |
| FE-04 | Time navigation + URL state | `features/time-nav/*` `lib/url-state.ts` | — | 1 |
| FE-05 | Tank detail completion: alert history, signal, raw inspector, events overlay, CSV | `features/tank-detail/*` `lib/csv.ts` | live readings/analytics | 1 |
| FE-06 | Alerts: list, filters, detail, ack, snooze, resolve | `features/alerts/*` `app/(app)/alerts/**` | ack live · detail/snooze/resolve mock → BE-02 | 1 |
| FE-07 | **Nodes admin: DimensionsModal FIRST**, then edit, delete, status, add wizard, deleted list | `features/nodes-admin/*` `app/(app)/admin/nodes/**` | CRUD live | 1 |
| FE-08 | Settings: thresholds, quiet hours, notification prefs | `features/settings/*` | thresholds live · prefs mock → BE-07 | 1–2 |
| FE-09 | Analytics: compare, ranking, reports list, playback | `features/analytics/*` | mock → BE-05, BE-11 | 2–3 |
| FE-10 | Users, audit, system status screens | `features/users/*` `features/audit/*` | mock → BE-03/04/13 | 2 |
| FE-11 | About: diagram, glossary, methodology | `features/about/*` | — | 2 |
| FE-12 | Forgot / reset / change password | `features/auth/*` | mock → BE-03 | 2 |
| FE-13 | Kiosk mode | `app/kiosk` | — | 3 |
| FE-14 | States + responsive + accessibility pass on every screen | all | — | continuous |
| FE-15 | PWA, print styles | `public/sw.js` `styles/print.css` | BE-16 push | 3 |
| FE-16 | Playwright E2E | `e2e/*` | — | 2 |

## Backend & integrations (teammate)
| ID | Task | Key files | Blocks | Phase |
|---|---|---|---|---|
| BE-01 | Migration runner; split `schema.sql` into numbered migrations; `seed-db` uses it | `server/migrations/*` `db.ts` | all schema work | 1 |
| BE-02 | Alerts API (detail, resolve, snooze) + engine: snooze, quiet hours, maintenance, state machine | `domain/alert-state.ts` `alert-engine.ts` `app/api/alerts/**` | FE-06 | 1 |
| BE-03 | Users CRUD, password policy, change/forgot/reset, sessions, **rate limiting** | `repos/users.ts` `rate-limit.ts` `app/api/users/**` `app/api/auth/**` | FE-10, FE-12 | 1–2 |
| BE-04 | Audit list API (filters, paging) | `repos/audit.ts` `app/api/audit` | FE-10 | 1 |
| BE-05 | Heatmap + compare services/endpoints (replace mocks) | `analytics/heatmap.ts` `analytics/compare.ts` `services/*` | FE-03, FE-09 | 2 |
| BE-06 | Tank bulk/clone/import/export, zones, templates, **"awaiting first reading" state** | `repos/tanks.ts` `repos/zones.ts` `app/api/tanks/**` | FE-07 | 2 |
| BE-07 | Notifications core: prefs, recipients, dispatcher, email channel | `notify/*` `repos/notification-prefs.ts` | FE-08 | 2 |
| BE-08 | SMS, WhatsApp, webhook channels; escalation job; per-channel rate limit | `notify/*` `jobs/escalation.ts` | — | 2 |
| BE-09 | Phase-2 rules: RAPID_DRAIN, PREDICTED_EMPTY, FLATLINE, DATA_GAP, BATTERY_LOW, **FLAPPING** (+ tests) | `domain/rules/*` | — | 2 |
| BE-10 | **Go live:** harden webhook, optional MQTT, backfill, `CLOCK_MODE=live` cutover runbook | `app/api/ingest/tts` `docs/RUNBOOK.md` | production | 2 |
| BE-11 | Reports (weekly/monthly/incident PDF+CSV), readings export | `services/reports.ts` | FE-09 | 3 |
| BE-12 | Jobs: rollups cache, retention purge, node health | `jobs/*` | — | 3 |
| BE-13 | System status API, structured logging | `app/api/system/status` `logger.ts` | FE-10 | 2 |
| BE-14 | API integration tests, engine tests, CI, Caddy, backups | `tests/*` `.github/workflows` `infra/*` `scripts/backup-db.ts` | quality | 1–2 |
| BE-15 | Anomaly, completeness, leak, cost analytics | `analytics/*` | — | 3 |
| BE-16 | 2FA, API keys, push, security headers/CSRF review | `auth/totp.ts` `repos/api-keys.ts` | — | 3 |

## Suggested order
- **Sprint 1:** BE-01, BE-02, BE-03 (half), BE-14 (CI) · FE-01, FE-07 (DimensionsModal → edit/delete → wizard), FE-02, FE-03
- **Sprint 2:** BE-04, BE-05, BE-06, BE-13 · FE-04, FE-05, FE-06, FE-08, FE-14
- **Sprint 3:** BE-07, BE-09 · FE-09, FE-10, FE-11, FE-12 · **integrate, QA, demo**
- **Sprint 4 (go live):** BE-08, BE-10, BE-11, BE-12 · FE-13, FE-15, FE-16
