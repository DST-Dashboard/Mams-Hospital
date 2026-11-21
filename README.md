# MAMS Water — Overhead Tank Management System (OHTMS)

Hospital Overhead Tank Management System (OHTMS) for MAMS Hospital: a Next.js 15 App Router + TypeScript production application that monitors rooftop water tanks with role-based Manual Data Entry, real-time analytics, and enterprise hospital alerting.

Running on **PostgreSQL**, deployed to **Vercel Hobby** (or self-hosted Docker), with zero external vendor lock-in, zero mocks in production, and full operational data integrity.

---

## Key Features

- **Live Data Push API**: an external system sends readings to `POST /api/ingest` with an API key (`INGEST_API_KEY`); idempotent, validated, and wired into the same alert engine. See [`docs/DATA-PUSH-API.md`](docs/DATA-PUSH-API.md).
- **Role-Based Manual Data Entry**: Authorized administrators and assigned tank owners record physical telemetry directly into the Data module with bidirectional calculation, geometry validation, non-overwriting historical protection, and audit logging.
- **Rooftop Fleet Dashboard**: Live water level, volume in litres, fill percentages, and telemetry health across hospital rooftop tanks.
- **Authoritative 9 Alert Rules**:
  - `NO_DATA` (silence detection)
  - `SENSOR_FAULT` (out-of-range, non-physical values, or transient spikes)
  - `BATTERY_LOW` (telemetry battery ≤ 20%)
  - `PREDICTED_EMPTY` (consumption run-out forecast < 60 min)
  - `FLAPPING` (unstable boundary jumping)
  - `LOW_LEVEL`, `CRITICAL_LOW`, `EMPTY` (dynamic water level threshold bands)
  - `OVERFLOW_RISK` (reading inside dead zone + margin)
- **Lifecycle & Operational Controls**:
  - Acknowledge, Resolve, and Snooze (15m, 1h, 4h, until tomorrow 08:00 IST).
  - Quiet hours schedule (22:00–06:00 IST) suppressing warnings while delivering critical/emergency immediately.
  - Automated Tier 2 supervisor escalation for unattended critical alerts after 30 minutes.
- **On-Demand PDF & CSV Reports**:
  - Weekly and Monthly operational summaries, and single-page forensic Incident reports generated on the fly via `pdfkit` (no cloud storage required).
- **Security & User Management**:
  - Hospital password policy enforcement (min 8 chars, 1 letter, 1 number/symbol).
  - Single-use 30-minute hashed password reset tokens (active when `SMTP_URL` configured).
  - Mandatory password change on first login.
  - Role-based access control (Viewer, Operator/Tank Owner, Admin) with "last active admin" protection.
  - Strict Content Security Policy (CSP), HSTS, and frame-ancestors headers.
  - Append-only audit logging on all actions.

---

## Quick Start (Local Development)

### 1. Requirements
- Node.js >= 20.11 (Node 22 recommended)
- PostgreSQL >= 15 (local daemon or cloud connection)

### 2. Setup
```bash
# Clone and install dependencies
git clone https://github.com/DST-Dashboard/Mams-Hospital.git
cd Mams-Hospital
npm install

# Configure environment
cp .env.example .env
# Edit .env and verify DATABASE_URL and secrets

# Run migrations and bootstrap database
npm run setup

# Start development server
npm run dev
# Open http://localhost:3000 -> sign in with admin@mams.local / ChangeMe!2026
```

---

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Next.js optimized production build |
| `npm run start` | Start Next.js production server |
| `npm run setup` | Execute database migrations and seed bootstrap admin/tanks |
| `npm run db:migrate` | Run PostgreSQL schema migrations (`src/server/migrations/`) |
| `npm run db:bootstrap` | Provision initial tanks and admin user if missing |
| `npm run test` | Run Vitest unit & integration test suite |
| `npm run e2e` | Run Playwright end-to-end browser tests (headless Chromium) |
| `npm run typecheck` | TypeScript compiler type-check (`tsc --noEmit`) |
| `npm run lint` | ESLint verification |
| `npm run auth:reset` | Reset admin account password to `.env` configuration |
| `npm run backup:db` | Create a standalone PostgreSQL database dump |
| `npm run restore:db` | Restore database from an existing backup dump |

---

## Deployment

For full deployment instructions with Neon/Vercel Postgres, Docker, and background cron scheduling, refer to **[docs/DEPLOY.md](docs/DEPLOY.md)**.
