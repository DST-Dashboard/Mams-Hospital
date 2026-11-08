# Dataset

Source: five The Things Stack exports (`mams-hospital_n{1..5}_week.json`, 22.7 MB). Pipeline: `npm run data:build`.

| Fact | Value |
|---|---|
| Devices | `wio-e5-node-01…05` (DevEUI `2CF7F12063500F93…97`), gateway `sensecap-gateway`, model `loraeminidevboard-e5` |
| Rows | 2,016 per device = 10,080 |
| Window | 2026-10-23 05:46 → 2026-10-30 05:43 UTC (exactly 7 days) |
| Cadence | 300 s (not the ~293 s in the project definition); nodes staggered by 20 s |
| Integrity | 0 gaps, 0 duplicate timestamps, `f_cnt` 1→2016 continuous, raw payload bytes match decoded distance on every row |
| Distance range (cm) | N1 154–206 · N2 55–189 · N3 85–238 · N4 120–275 · N5 82–141 |

## Things the code handles because the data demands it
- **Newest-first files** → build step sorts ascending.
- **Multiplexed payload**: every uplink carries `Node1…Node5_distance_cm`, only the sender's slot is non-null → normalizer requires exactly one and checks it matches the device.
- **Battery** is a carried-forward device value (≈hourly), not a per-reading measurement.
- **Timestamps** have 9 fractional digits; JS reads 3 → truncated, not rounded.
- **Static snapshot** ends 30 Oct → `CLOCK_MODE=anchored` so freshness and `NO_DATA` stay truthful.

## Patterns worth knowing (test material)
- **Tank 4** has one −155 cm single-step refill (distance 275→120). Must NOT be flagged as a sensor fault (it doesn't revert).
- **Tank 3** flaps between ~90 and ~165 cm in long stretches (from ≈ sample 85). Candidate `FLAPPING` rule (Phase 2) or genuine sensor/turbulence issue — ask whoever owns the hardware.
- **Tank 5** never crosses any default threshold.

## Open assumptions — confirm and edit
- `data/processed/devices.json → simulated`: Node 1 real, Nodes 2–5 simulated (from the project definition; the files carry no marker).
- Tank geometry: seed uses H=300 cm, R=100 cm, dead zone 25 cm for all tanks. **Replace with real values** (Admin → Nodes, or `UPDATE tanks …`). Node 4 reads up to 275 cm, so H ≥ 275.

## Storage formats
`data/processed/readings/<device>.json` — columnar: `columns:["t","d","fc","rssi","snr","bat"]`, `rows:[[epoch_ms, distance_cm, f_cnt, rssi, snr, battery_pct], …]`, ascending. SQLite `readings(device_id, t, distance_cm, f_cnt, rssi, snr, battery_pct)` with PK `(device_id, t)`.
