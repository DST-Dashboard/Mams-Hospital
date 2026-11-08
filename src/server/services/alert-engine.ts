import { evaluateRules, MIN } from "@/domain";
import { tx } from "../db";
import { now } from "../clock";
import * as alerts from "../repos/alerts";
import * as readings from "../repos/readings";
import { listTanks, type TankRow } from "../repos/tanks";

/**
 * Reconciles pure rule results with stored alerts (open / resolve) for one tank.
 * Policies (docs/ALERTING.md):
 *  • only `active` tanks are evaluated (maintenance ⇒ suppressed; draft/decommissioned ⇒ silent)
 *  • until an admin confirms tank dimensions, level-based rules are skipped — percentages would be guesses
 *  • cooldown stops the same rule re-opening within `cooldownMin` of its previous open
 */
export function evaluateTank(tank: TankRow, asOf = now()): { opened: number; resolved: number } {
  const out = { opened: 0, resolved: 0 };
  if (!tank.deviceId || tank.status !== "active") return out;

  const recent = readings.recent(tank.deviceId, Math.max(12, tank.thresholds.persistence + 6), asOf);
  const latest = recent.at(-1);
  const results = evaluateRules({ readings: recent, geometry: tank.geometry, th: tank.thresholds, now: asOf })
    .filter((r) => tank.dimsConfirmed || r.type === "NO_DATA");

  tx(() => {
    for (const r of results) {
      const existing = alerts.findOpen(tank.id, r.type);
      if (r.raise && !existing) {
        const last = alerts.lastOpenedAt(tank.id, r.type);
        if (last != null && asOf - last < tank.thresholds.cooldownMin * MIN) continue;
        alerts.open({
          tankId: tank.id, type: r.type, severity: r.severity, message: r.message(tank.label), value: r.value ?? null,
          at: asOf, triggerT: latest?.t ?? null, triggerDistanceCm: latest?.distanceCm ?? null, simulated: tank.simulated,
        });
        out.opened++;
      } else if (r.clear && existing) {
        alerts.resolve(existing.id, asOf);
        out.resolved++;
      }
    }
  });
  return out;
}

export const evaluateAll = (asOf = now()) =>
  listTanks().reduce((acc, t) => { const r = evaluateTank(t, asOf); return { opened: acc.opened + r.opened, resolved: acc.resolved + r.resolved }; }, { opened: 0, resolved: 0 });
