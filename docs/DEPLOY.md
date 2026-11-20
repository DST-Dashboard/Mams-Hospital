# OHTMS Deployment Guide

This guide covers deploying the **Overhead Tank Management System (OHTMS)** to **Vercel Hobby** (or self-hosted Docker) with a managed PostgreSQL database (Neon / Vercel Postgres / Supabase) and role-based Manual Data Entry.

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
openssl rand -hex 32  # Run twice: once for SESSION_SECRET, once for CRON_SECRET
```

---

## 3. Vercel Hobby Deployment

1. **Import Repository**: In the [Vercel Dashboard](https://vercel.com/new), import your repository branch.
2. **Framework Preset**: Next.js (automatically detected).
3. **Build Command**: `npm run vercel-build` (automatically runs migrations and bootstraps admin user and configured tanks before compiling Next.js).
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

## 5. Role-Based Manual Data Entry

All telemetry enters the system directly through the Data module via authorized Manual Data Entry:

1. **Accessing the Form**:
   - In the **Dashboard** overview, click the **+ Record Manual Reading** button in the Tank Status header.
   - On individual **Tank Detail** views (`/tanks/[id]`), click **+ Record Reading** in the header or in the **Telemetry Frame Log** inside the Raw Inspector.
2. **Permissions**:
   - **Admins**: Can enter and verify readings for all tanks across the entire hospital facility.
   - **Tank Owners**: Can enter readings strictly for tanks assigned to them (via `tanks.owner_id` or `alert_recipients`).
   - **Viewers**: Read-only access; submission is rejected with `403 Forbidden`.
3. **Data Integrity & Non-Overwriting**:
   - All manual readings are validated against tank geometry ($0 \le d \le H$).
   - Existing readings cannot be overwritten; duplicate timestamps are rejected with `409 Conflict`.
   - The authenticated user's ID and server timestamp are automatically recorded with `source: 'manual'`.
   - Alert rules evaluate immediately upon entry.

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
- **External 1-Minute Pinger (Recommended for 24/7 Alerts)**:
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
