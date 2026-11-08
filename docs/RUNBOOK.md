# Runbook (backend to flesh out in BE-10 / BE-14)

- **Go live checklist:** set `TTS_WEBHOOK_SECRET` → configure TTS webhook (`X-Webhook-Secret`) → confirm `inserted:1` responses → set `CLOCK_MODE=live` → confirm freshness turns green → disable `ENABLE_MOCKS`.
- **Backup / restore:** `scripts/backup-db.ts` daily; restore test quarterly.
- **Gateway offline:** all nodes go NO_DATA together → (BE) correlate into one GATEWAY_OFFLINE alert.
- **Locked out:** `npm run auth:reset`.
