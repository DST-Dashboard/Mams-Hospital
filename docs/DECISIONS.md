# OHTMS Architecture & Implementation Decisions

This document logs all architectural, database, runtime, and dependency decisions made during the OHTMS Final Build (Vercel Hobby + PostgreSQL).

---

## Phase 0: Recon, Baseline & Safety Net

- **Branch Selection**: Created and switched to `final/live-postgres`.
- **Baseline Verification**:
  - Vitest: 44 test files, 241 tests passing 100% green.
  - Playwright E2E: 14/14 tests passing.
  - Visual Baseline: 42 screenshots captured at 360px (mobile), 768px (tablet), and 1280px (desktop) across all 14 public and authenticated routes (`tests/screenshots/baseline/`).
- **Fixture Extraction**:
  - `tests/fixtures/ttn-uplink.json`: Real TTN uplink payload with `as.up.data.forward`, gateway telemetry, and `Node1_distance_cm`.
  - `tests/fixtures/readings/`: 300 rows per device (`wio-e5-node-01` through `05`) extracted from dataset, preserving Tank 4 refill transitions, Tank 3 flapping stretches, and battery carry-forward behavior.
  - `tests/fixtures/devices.json` & `tests/fixtures/manifest.json`: Standardized device metadata and manifest for offline test isolation.
- **Local Database Tooling**:
  - PostgreSQL runtime for local Mac dev & CI testing runs real PostgreSQL binaries via `embedded-postgres` or local instance, connecting via standard `pg` connection strings. No SQLite or better-sqlite3 in production code.

---

## Phase 1: PostgreSQL Engine Migration

- **Engine Swap**:
  - Removed `better-sqlite3` and `@types/better-sqlite3`.
  - Added `pg` (v8.23.1) and `@types/pg` as production dependencies.
  - Added `pdfkit` (v0.20.2) and `@types/pdfkit` for serverless PDF generation.
  - Added `nodemailer` (v7.0.12) and `@types/nodemailer` for email dispatch.
  - Configured PostgreSQL singleton pool (`src/server/db.ts`) with `max: 3` connections suitable for Neon / Vercel Hobby pooling, int8 parser mapping BIGINT to JavaScript numbers, and advisory-locked migrations (`pg_advisory_xact_lock`).
- **Migrations**:
  - Replaced legacy SQLite migrations with standard idempotent PostgreSQL DDL in `src/server/migrations/`:
    - `001_init.sql`: Baseline schema with BIGINT timestamps, identity primary keys, JSONB columns, and compound indexes.
    - `002_alerts_notify.sql`: Alert events, alert recipients, notification preferences, and delivery logging.
    - `003_ingest_jobs.sql`: Ingest state, rejects log, job runs tracking, and rate limiting.
    - `004_dimensions.sql`: `tank_dimensions` historical dimension records with `effective_from`.
    - `005_auth.sql`: Password resets with 30-min expiry and `must_change_password` flag.
  - Created migration runner `src/server/migrations/runner.ts` tracking completed migrations in `schema_migrations`.
- **Query Optimizations**:
  - `(device_id, t)` primary key in `readings` ensures 7-day range queries use index scans (`readings_pkey`) with minimal cost.
  - Epoch-ms timestamps stored as BIGINT with parser mapping to Numbers, preserving exact arithmetic in pure domain modules.
- **Test Isolation**:
  - Created `tests/test-db.ts` which provisions unique temporary PostgreSQL schemas (`test_<timestamp>_<random>`) for parallel Vitest runners, setting `search_path` and dropping on cleanup.
- **Out-of-Scope Cleanup**:
  - Removed push notifications (`src/server/notify/push*`, `web-push`), SMS/WhatsApp stubs, API keys, TOTP/2FA, sessions table, and zones/templates tables in accordance with Lean Scope §0 and §5.
  - Replaced long-running server `setInterval` with atomic slot claims in `src/server/jobs/tick.ts` and `src/server/after.ts` for opportunistic execution.
- **Phase 1 Gate**:
  - `npm run typecheck`: Passed with 0 errors.
  - `npm run lint`: Passed with 0 errors and 0 warnings.
  - `npm test`: 40 test files, 208 tests passed 100% green.
  - `npm run build`: Production Next.js build compiled successfully with static page generation.

---

## Phase 2: Live TTN Ingestion & Deterministic Simulator

- **Live TTN Ingestion**:
  - `src/server/services/ingest.ts` processes live TTN uplinks idempotently via `(device_id, t)` conflict handling.
  - Marks `devices.simulated = FALSE` upon receiving genuine TTN uplinks.
  - Stores raw gateway telemetry (`gateway_id`, `rssi`, `snr`, `spreading_factor`, `f_cnt`, `battery_pct`).
  - Auto-provisions devices matching `config/devices.json` on first uplink.
  - Rejects unknown devices with HTTP 422 and logs to `ingest_rejects`.
- **TTN Storage Backfill**:
  - `src/server/services/backfill.ts` queries TTN storage API using stream parser and 6-second AbortController timeout budget, ensuring compatibility with Vercel Hobby execution limits.
- **Deterministic Simulator**:
  - `src/server/simulator.ts` provides fallback readings for tanks flagged `simulated = TRUE` or when no readings have arrived for >10 minutes.
  - Generates diurnal consumption sine-wave levels (120–220 cm) with diurnal patterns and battery decay.
  - Never touches or overwrites genuine TTN readings.
- **Phase 2 Gate**:
  - `tests/phase2-gate.test.ts` passed 3/3 tests verifying idempotent ingestion, device promotion, auto-provisioning, reject logging, and isolated simulation.
  - `npm run typecheck`, `npm run lint`, `npm test` (41 test files, 211 tests), and `npm run build` all green.

---

## Phase 3: Remove Sample Dataset, Mocks, and Demo Mode

- **Complete Data Purge**:
  - Deleted `data/` directory (all 60+ MB of JSON files purged; offline fixtures in `tests/fixtures/` preserved).
  - Deleted obsolete dataset generation and replay scripts: `scripts/build-dataset.ts`, `scripts/replay-check.ts`.
  - Deleted `src/dataset/files.ts`, `src/dataset/validate.ts`, and `src/server/mock.ts`.
  - Kept only `schema.ts` and `normalize.ts` in `src/dataset/`.
- **UI Decoupling & Modernization**:
  - Completely removed `SampleDataBadge` and `ModeToggle` (Demo/Live toggle). Renamed controls to `src/features/shell/ShellControls.tsx`.
  - Cleaned up anchored clock branches in `DashboardView.tsx`, `Footer.tsx`, `Hero.tsx`, `MegaNav.tsx`, and `TankDetailView.tsx`.
  - Standardized all views on the live production clock with continuous live telemetry.
  - Implemented clean empty-state guards across dashboard and tank tiles: shows "Awaiting initial uplink" / "Awaiting uplink" instead of NaN, unconfirmed calculations, or false "all-clear" flags when no sensor readings have arrived.
- **Phase 3 Gate**:
  - `grep -rn "SampleDataBadge\|ModeToggle\|ENABLE_MOCKS\|CLOCK_MODE" src` returns exactly ZERO matches.
  - Directory `data/` does not exist.
  - `npm run typecheck`: 0 errors.
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm test`: 41 test files, 211 tests passing 100% green.
  - `npm run build`: Production Next.js build compiled successfully with static and dynamic pages.

---

## Phase 4: Alerts & Notifications Lean Engine

- **Authoritative 9 Alert Rules**:
  - Registered and verified the complete set of 9 rules in pure domain `src/domain/rules.ts`:
    1. `NO_DATA`: Sensor silence beyond `noDataMin`.
    2. `SENSOR_FAULT`: Distances beyond tank geometry, invalid readings, or transient spikes.
    3. `BATTERY_LOW`: Telemetry battery percentage at or below 20%.
    4. `PREDICTED_EMPTY`: Forecasted exhaustion in under 60 minutes.
    5. `FLAPPING`: Unstable signal alternating jumps (>3 alternations in lookback).
    6. `LOW_LEVEL`: Water level in warning band (`critPct` to `warnPct`).
    7. `CRITICAL_LOW`: Water level in critical band (`emptyPct` to `critPct`).
    8. `EMPTY`: Water level below `emptyPct`.
    9. `OVERFLOW_RISK`: Sensor reading inside dead zone + margin.
  - Safely purged rule stubs: `flatline.ts`, `rapid-drain.ts`, and `data-gap.ts`.
- **Pure Alert State Machine**:
  - `src/domain/alert-state.ts`: Implemented `transitionAlert` covering `active`, `acknowledged`, `snoozed`, `escalated`, and `resolved`.
  - Enforced transition logic: ACKNOWLEDGE records user/timestamp while keeping alert active; SNOOZE schedules wake-up at `t + minutes * 60_000`; EXPIRE_SNOOZE restores to active; ESCALATE triggers when open >= 30 minutes unacknowledged; RESOLVE terminates the lifecycle.
- **Email Dispatcher & Escalation**:
  - `src/server/notify/dispatcher.ts`: Supports email dispatch via `nodemailer` with graceful fallback when `SMTP_URL` is omitted.
  - Enforced quiet hours (defers warning severity during quiet periods; critical and emergency alerts always dispatch immediately).
  - Enforced rate limiting (1 email per hour per tank for warnings; critical and emergency bypass the throttle).
  - Implemented `checkAndEscalateAlerts` for automated tier 2 notification escalation for unattended critical alerts after 30 minutes.
- **Phase 4 Gate**:
  - `tests/alert-engine.test.ts`: 21 tests covering all 9 rules, the pure state machine, quiet hours, rate limits, escalation, and nodemailer transport.
  - `npm run typecheck`: 0 errors.
  - `npm run lint`: 0 warnings, 0 errors.
  - `npm test`: 41 test files, 223 tests passing 100% green.
  - `npm run build`: Production Next.js build compiled successfully.


