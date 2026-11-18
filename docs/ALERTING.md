# Alerting

**Pure rules** (`domain/rules.ts`) say what is true; the **engine** (`server/services/alert-engine.ts`) opens/resolves stored alerts. Scheduler runs it every 60 s; the webhook runs it after each new reading.

## Implemented
| Type | Severity | Raises when | Clears when |
|---|---|---|---|
| LOW_LEVEL | warning | N consecutive readings in [crit, warn) % | ≥ warn + hysteresis, or drops into a lower band |
| CRITICAL_LOW | critical | N consecutive in [empty, crit) % | ≥ crit + hysteresis, or drops lower |
| EMPTY | emergency | N consecutive < empty % | ≥ empty + hysteresis |
| OVERFLOW_RISK | critical | distance ≤ dead zone + 10 cm for N readings | distance > limit + 5 cm |
| SENSOR_FAULT | critical | invalid / beyond tank floor, or a >80 cm jump that reverts (judged one reading late) | reading plausible |
| NO_DATA | warning | silent > 15 min | fresh reading |

Defaults: warn 40 %, crit 20 %, empty 5 %, persistence 3, cooldown 30 min, hysteresis 5 %.
The level ladder is **exclusive** — one level alert open per tank, not three.

## Policies
Only `active` tanks evaluate · maintenance suppresses · unconfirmed dimensions pause level rules · cooldown blocks re-open within 30 min · every ack is audited.

## Registered, not implemented (Phase 2)
RAPID_DRAIN, PREDICTED_EMPTY (use `analytics/forecast.ts`), FLATLINE, PUMP_STUCK, DATA_GAP (f_cnt), BATTERY_LOW, GATEWAY_OFFLINE, plus a **FLAPPING** rule suggested by Tank 3.
Add each as a function in `rules.ts` returning a `RuleResult`; engine picks it up automatically. Notifications: implement `server/notify/*` and call from the engine's `alerts.open`; escalation job goes in `jobs/scheduler.ts`.

Known gap: a brand-new tank with no readings reports `NO_DATA` immediately — add an "awaiting first reading" state when you build the Add-node wizard (§6.3).
