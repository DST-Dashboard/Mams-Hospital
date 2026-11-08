# MAMS Water — Overhead Tank Management System (OHTMS)

Team **DST-Dashboard** · repo `DST-Dashboard/Mams-Hospital` · 2 people: **Frontend** (UI/UX, screens) and **Backend & integrations** (API, alerts, hardware, deploy).
**Start here:** `docs/TEAM.md` (who owns what) → `docs/TASKS.md` (your task list) → `docs/API-CONTRACT.md` (what's real vs mock).

A **standalone** web application: one Next.js process, one SQLite file, the dataset shipped inside the repo.
No Supabase, no external database, no CDN, no cloud service required to run it.

```bash
nvm use                       # Node 20+ (22 recommended)
npm install
cp .env.example .env          # set SESSION_SECRET and ADMIN_PASSWORD
npm run setup                 # validates the dataset, builds var/ohtms.db
npm run dev                   # http://localhost:3000  → sign in with ADMIN_EMAIL / ADMIN_PASSWORD
```

| Command | What it does |
|---|---|
| `npm run data:build` | `data/raw/*.json` (TTS exports) → validated `data/processed/` |
| `npm run auth:reset` | Reset the admin login from `.env` **without** wiping data |
| `npm run db:reset` / `db:seed` | Rebuild / create `var/ohtms.db` from `data/processed/` |
| `npm test` | 30 unit tests (domain math, rules, analytics, dataset integrity) |
| `npm run typecheck` · `npm run lint` | Strict TS · architecture-boundary lint |
| `npm run alerts:replay` | Replays the week through the real alert engine on a scratch DB |
| `npm run rules:replay` | Fast pure-rule replay for threshold tuning |
| `docker compose up --build` | Production image, SQLite on a volume |

## What is built vs scaffolded

**Working, tested end to end:** dataset pipeline · SQLite store · derive/geometry · alert rules + engine (open/resolve/cooldown/hysteresis) ·
analytics (stats, rollups, fill/drain events, forecast) · auth (JWT cookie, roles) · tank CRUD API with audit log + soft delete ·
dashboard (5 graduated tanks, sparklines, freshness, alert banner) · tank detail (trend chart, stats, events, thresholds) ·
TTS webhook receiver (disabled until `TTS_WEBHOOK_SECRET` set) · dark/light theme · IST/UTC toggle.

**Scaffolded routes (each lists its feature IDs on screen):** analytics, alerts, alert detail, settings, admin/nodes, admin/users, admin/audit, about.
Their **APIs mostly exist** — you are building UI, not backends. See `docs/FEATURES.md`.

## Working in parallel
Unbuilt endpoints return contract-valid sample data when `ENABLE_MOCKS=1` (header `x-mock: 1`), so frontend never waits for backend. Contracts live in `src/contracts/`. Every planned file already exists with an `OWNER` / task header — grep `STATUS: TODO` to see what's left.

## Read next
`docs/ARCHITECTURE.md` · `docs/DESIGN.md` · `docs/SCREENS.md` · `docs/AI-FRONTEND-RULES.md` · `docs/GIT-WORKFLOW.md` · `docs/RUNBOOK.md` (rules of the codebase) · `docs/DATA.md` (what the dataset really contains) · `docs/ALERTING.md` · `docs/FEATURES.md` (every feature ID → status)

## Can't sign in?
1. `.env` exists and has `ADMIN_EMAIL` / `ADMIN_PASSWORD` (a `#` inside a password starts a comment — wrap it in quotes).
2. You changed the password after setup → run `npm run auth:reset`, then restart `npm run dev`.
3. "Database not found" → run `npm run setup`.
4. Default email is `admin@mams.local`.
