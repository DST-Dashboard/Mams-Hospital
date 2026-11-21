# Runbook (backend to flesh out in BE-10 / BE-14)

- **Go live checklist:** configure PostgreSQL and secrets → provision an API key → confirm `/api/v1/readings` returns `inserted:true` → confirm dashboard freshness turns green.
- **Backup / restore:** `scripts/backup-db.ts` daily; restore test quarterly.
- **Gateway offline:** all nodes go NO_DATA together → (BE) correlate into one GATEWAY_OFFLINE alert.
- **Locked out:** `npm run auth:reset`.
