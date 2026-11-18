# Architecture

## 1. Shape
One deployable. Next.js (App Router) serves pages **and** the REST API; an in-process scheduler (`src/instrumentation.ts` → `server/jobs`) runs the alert engine; SQLite (`better-sqlite3`) stores everything. The browser only ever talks to `/api/*`.

```
data/raw ─► scripts/build-dataset ─► data/processed ─► scripts/seed-db ─► var/ohtms.db
                                                                    │
TTS webhook ─► /api/ingest/tts ─► normalize ─► readings (upsert) ───┤
                                                                    ▼
                         domain (pure) ◄── services (alert-engine, dashboard, analytics) ──► /api/* ──► React UI
```

## 2. Folder map & dependency direction
```
src/domain      pure physics + rules. No I/O, no React.            ← depends on nothing
src/analytics   pure stats/rollups/events/forecast.                ← domain
src/dataset     TTS schema, normalize, validate, file formats.     ← (zod only)
src/server      db, repos (SQL), services, auth, jobs, http.       ← domain, analytics, dataset
src/app         routes: pages + /api handlers (thin).              ← server, features
src/features    screen-level client components (one folder per screen)
src/components  shared UI: tank/, charts/, status/, ui/
src/lib         client helpers: api fetcher, store, format, types
```
Enforced by ESLint (`.eslintrc.json`): domain/analytics/dataset cannot import React/Next/server; UI cannot import server code except **types**.
API handlers stay ≤ ~20 lines: parse → authorise → call a service/repo → respond. Business rules live in `domain/` and `server/services/`.

## 3. Rules of the codebase
1. **Distance is the only stored truth.** Level, %, litres are derived (`domain/derive.ts` is the only place). Changing tank H/R re-derives all history instantly.
2. **Level space for every delta.** Δlevel > 0 = filling. (The project definition mixes distance- and level-space in §5.2/§9; this resolves it.) Charts plot level; if you ever plot raw distance, invert the axis.
3. **Missing is `null`, never `0`.** Types enforce it; charts leave gaps.
4. **Nobody calls `Date.now()` for domain logic.** Use `server/clock.ts` (`anchored` = newest reading; `live` = wall clock). This keeps a static snapshot honest.
5. **Everything state-changing is audited** (`repos/audit.ts`) and **role-checked** (`requireRole`).
6. **Soft delete only** for tanks. Restorable; purge job is Phase 3.
7. **Idempotent ingest**: `(device_id, t)` is the primary key; `INSERT OR IGNORE`.
8. **Unconfirmed dimensions pause level alerts.** Seed values (H=300, R=100, dead zone 25) are placeholders — `dims_confirmed=0`.

## 4. Decisions (ADR-lite)
| # | Decision | Why | Revisit when |
|---|---|---|---|
| 1 | Standalone, file-seeded SQLite instead of Supabase | 10k rows, offline demos, deterministic tests, zero credentials | >50 tanks or multi-instance → Postgres/Timescale behind the same repos |
| 2 | Single Next.js app instead of Next + Fastify | one process, one deploy; webhook + scheduler fit in-process | heavy notification volume → split a worker |
| 3 | Rollups computed in TS on read | 2k rows/tank/week; no SQL aggregation needed | >90-day windows → add `rollups_hourly` table + job |
| 4 | JWT in httpOnly cookie, roles viewer/operator/admin | simple, edge-verifiable in middleware | SSO (S-07) |
| 5 | Repos return domain shapes, never raw rows | swap SQLite→Postgres by rewriting `server/repos/*` only | — |

## 5. Where to put new work
New alert type → `domain/rules.ts` (+ test) · new endpoint → `app/api/.../route.ts` + `server/services` · new screen → `app/(app)/x/page.tsx` + `features/x/` · new chart → `components/charts/`.
