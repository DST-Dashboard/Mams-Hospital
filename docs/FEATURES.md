# Feature status

IDs are from `00-project-definition.md` §4.

| ID | Feature | Status |
|---|---|---|
| F-01 | 5-tank overview grid, animated SVG tanks | Built |
| F-02 | Status per tank (level, volume, %, distance) | Built |
| F-03 | Week heatmap | UI to build (data: /api/readings res=1h) |
| F-04 | Trend chart with zoom | Built on tank detail; all-tanks view to build |
| F-05 | Day selector | UI to build |
| F-06 | Range presets | Built (6h/24h/7d); add 1h + custom |
| F-07 | Per-tank deep-dive page | Built (alert history + raw inspector to add) |
| F-08 | Global alert banner | Built on dashboard; move to shell |
| F-09 | Node health grid | UI to build (data in /api/dashboard) |
| F-10 | Signal quality panel | UI to build (rssi/snr stored) |
| F-11 | Freshness pill | Built |
| F-12 | Data completeness | API built (completenessPct); UI shows on detail |
| C-01 | First-load dimensions modal | UI to build (API: PATCH /api/tanks/:id) |
| C-02..C-07 | Tank settings, thresholds, add/edit/delete/status | API built; UI to build |
| C-08..C-12 | Zones, bulk, clone, import/export, templates | Phase 2 |
| A-01..A-06 | Multi-level, low/critical/overflow/sensor-fault/no-data | Built (engine + rules) |
| A-07..A-09 | Battery, rapid drain, predict-and-warn | Phase 2 (forecast.ts ready) |
| A-10,A-11 | Banner, bell with badge | Banner built; bell to build |
| A-12,A-13 | Alert detail, alert log + filters | API built (/api/alerts); UI to build |
| A-14,A-15 | Acknowledge, resolve | Ack API built; UI to build; manual resolve to add |
| A-16..A-19 | Email, SMS, WhatsApp, webhook out | Phase 2 (server/notify/*) |
| A-23,A-24,A-27,A-28,A-30 | Escalation, quiet hours, rate limit, prefs, snooze | Phase 2 |
| A-25 | Maintenance mode | Status field built; engine honours it |
| A-26 | Deduplication | Built (one open per tank+type, cooldown) |
| N-01..N-04 | Stats, fill/drain events, consumption | Built (/api/tanks/:id/analytics) |
| N-05..N-15 | Cross-tank, reports, anomaly, leak, cost, playback | Phase 2–3 |
| U-01..U-08 | Responsive, theme, skeletons, empty/error, tz, a11y | Built in shell/dashboard/detail; apply to new screens |
| U-11 | URL state | To build (range is in zustand only) |
| U-15 | Demo / Live toggle | CLOCK_MODE env today; UI toggle to build |
| S-01,S-02 | Login, roles | Built |
| S-03 | Audit log | Written on every change; viewer UI to build |
| S-04..S-10 | Sessions, API keys, reset, SSO, export, backup, health | Phase 2–3 (/api/health exists) |
| I-01 | TTS webhook receiver | Built (needs TTS_WEBHOOK_SECRET) |
| M-01..M-06 | Simulator | Dataset already contains sim/real data; generator only if you need more weeks |
