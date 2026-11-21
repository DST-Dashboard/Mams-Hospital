# Live Data Push API

How an external system pushes tank readings into the MAMS Hospital OHTMS dashboard.
No integration with The Things Stack (or any other platform) is required: send an authenticated HTTPS request, the dashboard does the rest (level, litres, alerts, charts).

## 1. Connection details

| | |
|---|---|
| **Endpoint** | `POST https://<your-domain>/api/ingest` |
| **Authentication** | Header `X-API-Key: <your key>` (or `Authorization: Bearer <your key>`) |
| **Content type** | `Content-Type: application/json` |
| **Cadence** | One reading per tank roughly every 5 minutes. A tank with no reading for 15 minutes raises a "no data" alert. |

The API key is issued by the dashboard owner. It is a secret: send it only over HTTPS, only in the header (keys in the URL are **not** accepted), and never share or commit it.

## 2. Which tank is a reading for?

Use the `deviceId` of the tank. Current devices:

| deviceId | Tank |
|---|---|
| `wio-e5-node-01` | Tank 1 - Emergency Ward |
| `wio-e5-node-02` | Tank 2 - ICU & OT |
| `wio-e5-node-03` | Tank 3 - General Ward |
| `wio-e5-node-04` | Tank 4 - Outpatient / Dialysis |
| `wio-e5-node-05` | Tank 5 - Service / Backup |

`GET /api/ingest` (same key) returns the live list of accepted devices, so you can confirm the key works before sending data.

## 3. Sending a reading

```bash
curl -X POST "https://<your-domain>/api/ingest" \
  -H "X-API-Key: $OHTMS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"wio-e5-node-01","distanceCm":120,"batteryPct":91}'
```

### Body

Send one reading object, an array of readings, or `{ "readings": [ ... ] }` (max **100** per request, max 256 KiB).

| Field | Required | Description |
|---|---|---|
| `deviceId` | yes* | Which tank (see table above). *Or use `tankId` (number) instead. |
| `distanceCm` | yes** | Sensor-to-water distance in cm (0-5000). The dashboard converts it to level, % and litres. |
| `levelCm` | yes** | **Alternative to `distanceCm`:** water height in cm. Must not exceed the tank height. If both are sent, `distanceCm` is used. |
| `t` | no | When it was measured: epoch **milliseconds**, epoch seconds, or ISO-8601 (`2026-11-21T10:30:00Z`). Omit it to use the time the server received the reading. Future times and times older than 1 year are rejected. |
| `batteryPct` | no | Sensor battery, 0-100. |
| `rssi` | no | Signal strength in dBm (e.g. `-97`). |
| `snr` | no | Signal-to-noise ratio. |
| `fCnt` | no | Frame counter, if your system has one. |
| `gatewayId` | no | Gateway / source identifier. |

\*\* one of `distanceCm` / `levelCm`. Numbers may also be sent as numeric strings (`"120"`). Unknown extra fields are ignored.

### Batch example

```json
[
  { "deviceId": "wio-e5-node-01", "distanceCm": 120, "t": "2026-11-21T10:30:00Z" },
  { "deviceId": "wio-e5-node-02", "distanceCm": 151, "t": "2026-11-21T10:30:00Z" }
]
```

## 4. Responses

Success (`201` when something new was stored, `200` when everything was already stored):

```json
{
  "ok": true, "received": 1, "inserted": 1, "duplicates": 0,
  "results": [{
    "index": 0, "tankId": 1, "deviceId": "wio-e5-node-01", "t": 1795282164933,
    "distanceCm": 120, "levelCm": 180, "levelPct": 60, "volumeL": 5655,
    "quality": "ok", "status": "inserted"
  }]
}
```

| Status | Meaning | What to do |
|---|---|---|
| `201` / `200` | Accepted | Nothing. |
| `400` | Body is not valid JSON | Fix the request. |
| `401` | Missing or wrong API key | Check the `X-API-Key` header. |
| `413` | Body larger than 256 KiB | Send smaller batches. |
| `415` | Content-Type is not `application/json` | Set the header. |
| `422` | A reading is invalid (unknown `deviceId`, bad value, bad time...). Body lists each problem with its `index`. **Nothing from that request was stored.** | Fix the listed items and resend. |
| `503` | Ingest is not enabled on the server | Contact the dashboard owner. |
| `5xx` / timeout | Temporary problem | Retry with the same payload (see below). |

### Safe to retry

A reading is identified by tank + time (`t`). Sending the same reading again is harmless: it is reported as `"status": "duplicate"` and the stored value is **never overwritten**. If you are unsure whether a request arrived, resend it with the same `t`.
(When `t` is omitted the server time is used, so a retry becomes a new reading. Always send `t` if you retry.)

## 5. Notes for the dashboard owner

- Set the key in the `INGEST_API_KEY` environment variable (Vercel: Settings -> Environment Variables), then redeploy. Generate one with `npm run ingest:key`.
- **Rotate without downtime:** set `INGEST_API_KEY` to `<new key>,<old key>`, give the sender the new key, then remove the old one.
- Tanks marked simulated switch to live automatically when their first real reading arrives (simulated data stops for that tank).
- Rejected payloads (not unauthenticated requests) are kept in the `ingest_rejects` table to help diagnose integration problems.
