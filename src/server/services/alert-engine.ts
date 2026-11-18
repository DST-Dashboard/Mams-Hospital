import { evaluateRules, MIN, shouldDeferForQuietHours, resolveThresholds } from "@/domain";
import { now } from "../clock";
import * as alerts from "../repos/alerts";
import * as readings from "../repos/readings";
import { listTanks, type TankRow } from "../repos/tanks";

/**
 * Reconciles pure rule results with stored alerts (open / resolve) for one tank.
 * Policies:
 *  • only `active` tanks are evaluated (maintenance ⇒ suppressed; draft/decommissioned ⇒ silent)
 *  • awaiting-first-reading: tanks with no readings never raise NO_DATA
 *  • until an admin confirms tank dimensions, level-based rules are skipped — percentages would be guesses
 *  • cooldown stops the same rule re-opening within `cooldownMin` of its previous open
 *  • quiet hours suppress non-critical alerts
 *  • expired snoozes are reopened
 */
export async function evaluateTank(
  tank: TankRow,
  asOf = now()
): Promise<{ opened: number; resolved: number }> {
  const out = { opened: 0, resolved: 0 };
  if (!tank.deviceId || tank.status !== "active") return out;

  await alerts.reopenExpiredSnoozes(asOf);

  const thresholds = resolveThresholds(tank.thresholds);
  const recent = await readings.recent(tank.deviceId, Math.max(12, thresholds.persistence + 6), asOf);

  // Awaiting-first-reading rule: a tank with zero readings never raises NO_DATA
  if (recent.length === 0) return out;

  const latest = recent.at(-1);
  const results = evaluateRules({ readings: recent, geometry: tank.geometry, th: thresholds, now: asOf })
    .filter((r) => tank.dimsConfirmed || r.type === "NO_DATA");

  const openedAlertIds: number[] = [];

  for (const r of results) {
    const existing = await alerts.findOpen(tank.id, r.type, asOf);

    // If snoozed, do not re-open or notify
    if (existing && existing.state === "snoozed") {
      continue;
    }

    if (r.raise && !existing) {
      if (shouldDeferForQuietHours(r.severity, asOf, thresholds.quietStart, thresholds.quietEnd)) {
        continue;
      }
      const last = await alerts.lastOpenedAt(tank.id, r.type);
      if (last != null && asOf - last < thresholds.cooldownMin * MIN) continue;

      const id = await alerts.open({
        tankId: tank.id,
        type: r.type,
        severity: r.severity,
        message: r.message(tank.label),
        value: r.value ?? null,
        at: asOf,
        triggerT: latest?.t ?? null,
        triggerDistanceCm: latest?.distanceCm ?? null,
        simulated: tank.simulated,
      });
      openedAlertIds.push(id);
      out.opened++;
    } else if (r.clear && existing && existing.state !== "resolved") {
      await alerts.resolve(existing.id, asOf, "Automatic recovery: condition cleared");
      out.resolved++;
    }
  }

  return out;
}

export async function evaluateAll(asOf = now()): Promise<{ opened: number; resolved: number }> {
  const tanks = await listTanks();
  let totalOpened = 0;
  let totalResolved = 0;
  for (const t of tanks) {
    const res = await evaluateTank(t, asOf);
    totalOpened += res.opened;
    totalResolved += res.resolved;
  }
  return { opened: totalOpened, resolved: totalResolved };
}
