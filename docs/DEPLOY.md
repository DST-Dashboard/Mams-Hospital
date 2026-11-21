# OHTMS Deployment Guide

This guide covers deploying the **Overhead Tank Management System (OHTMS)** to **Vercel Hobby** with managed PostgreSQL (Neon / Vercel Postgres / Supabase) and generic REST/manual reading ingestion.

---

## 1. Managed PostgreSQL Setup

1. Create a PostgreSQL database on **[Neon](https://neon.tech)**, **Vercel Postgres**, or **Supabase**.
2. Copy the **Pooled Connection String** (port 5432 or 6543) into `DATABASE_URL`.
3. (Optional) Copy the **Direct (Unpooled) Connection String** into `DATABASE_URL_UNPOOLED` if offered.

Example:
```env
DATABASE_URL=postgres://user:pass@ep-cool-fog-12345-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgres://user:pass@ep-cool-fog-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 2. Secrets Generation

Generate high-entropy 32-byte hexadecimal secrets for session signing and cron authentication:
```bash
openssl rand -hex 32  # Run twice for CRON_SECRET and SESSION_SECRET
```

---

## 3. Vercel Hobby Deployment

1. **Import Repository**: In the [Vercel Dashboard](https://vercel.com/new), import your repository branch `final/live-postgres` (or `main`).
2. **Framework Preset**: Next.js (automatically detected).
3. **Build Command**: `npm run vercel-build` (automatically runs migrations and bootstraps admin user and configured devices before compiling Next.js).
4. **Environment Variables**: Under **Settings → Environment Variables**, configure:

| Variable | Description | Example / Note |
|---|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection string | `postgres://user:pass@ep-xyz-pooler...` |
| `DATABASE_URL_UNPOOLED` | Direct PostgreSQL connection string (optional) | `postgres://user:pass@ep-xyz...` |
| `SESSION_SECRET` | 32-byte secret for JWT session tokens | Generated hex string |
| `CRON_SECRET` | Secret token for securing `/api/cron/*` endpoints | Generated hex string |
| `ADMIN_EMAIL` | Initial administrator login email | `admin@mams.local` |
| `ADMIN_PASSWORD` | Initial administrator password (change required) | `HospitalSecure!2026` |
| `SMTP_URL` | (Optional) Outbound email SMTP relay | `smtp://user:pass@smtp.example.com:587` |
| `EMAIL_FROM` | (Optional) Outbound email sender | `alerts@mams.local` |

5. Click **Deploy**. Vercel will build and deploy the application.

---

## 4. First-Load Verification & Configuration

1. Visit `https://<your-vercel-domain>/api/health` to confirm database connectivity (`{"ok":true,"db":true}`).
2. Sign in at `https://<your-vercel-domain>/login` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. If `ADMIN_PASSWORD` was set to an initial temporary value, the **Password Change Required** modal will prompt you to set a personal password.
4. The **Dimensions Modal (M1)** will display unconfirmed rooftop tanks. Enter the verified physical dimensions (Total Height H, Radius R or Width W / Length L, and Dead Zone) for each hospital tank.

---

## 5. REST API Ingestion

Provision keys only through an authenticated admin session:

1. Sign in as an administrator.
2. Call `POST /api/keys` with a key name, role, optional tank scope, and optional expiry.
3. Store the returned raw key immediately; it is not returned again.
4. Send readings to `POST /api/v1/readings` with `X-API-Key` or `Authorization: Bearer mams_api_...`.
5. Revoke keys with `DELETE /api/keys/:id`.

No TTN or MQTT credentials are required by MAMS. Existing TTN resources and historical PostgreSQL readings remain unchanged.

---

## 6. Background Jobs & Cron Scheduling

- **Vercel Cron**: Configured in `vercel.json` to execute daily maintenance and digest generation at 20:00 UTC (01:30 IST):
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/tick?full=1",
        "schedule": "0 20 * * *"
      }
    ]
  }
  ```
- **Opportunistic Ticks**: Every page visit to `/api/dashboard` asynchronously dispatches an opportunistic evaluation tick via `safeAfter()`.
- **External 1-Minute Pinger (Recommended for 24/7 NO_DATA Alerts)**:
  To ensure alerts trigger even when no browser tabs are active, configure a free job on [cron-job.org](https://cron-job.org):
  - URL: `https://<your-vercel-domain>/api/cron/tick`
  - Schedule: Every 1 minute
  - Header: `Authorization: Bearer <CRON_SECRET>`

---

## 7. Backups and Rollbacks

### Database Backup
Use standard PostgreSQL utilities or the included CLI script:
```bash
# Using pg_dump
pg_dump -d "$DATABASE_URL" -Fc -f ohtms-backup-$(date +%Y%m%d).dump

# Using project CLI script
npm run backup:db
```

### Database Restore
```bash
# Using pg_restore
pg_restore -d "$DATABASE_URL" --clean --no-owner ohtms-backup-XXXXXX.dump

# Using project CLI script
npm run restore:db
```

### Vercel Instant Rollback
In the Vercel Dashboard under **Deployments**, select any previous deployment and click **Promote to Production** for instant, zero-downtime rollback.

---

## 8. Self-Hosted Docker Deployment

To run OHTMS in a self-hosted Docker environment:
```bash
docker compose up -d
```
This spins up:
- Next.js web application on port `3000`
- PostgreSQL 16 container with persistent volumes
- Local migrations and bootstrap runners

