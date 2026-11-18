import { q } from "../db";
import { now } from "../clock";
import { audit } from "../repos/audit";
import { escalate } from "../repos/alerts";
import { dispatchAlertNotifications } from "../notify/dispatcher";

interface EscalationCandidate {
  id: number;
  severity: string;
  opened_at: number;
}

export async function runEscalationTick(asOf = now(), escalationDelayMin = 15): Promise<number> {
  const delayMs = escalationDelayMin * 60_000;
  const cutoff = asOf - delayMs;

  const rows = await q<EscalationCandidate>(
    `SELECT id, severity, opened_at FROM alerts
     WHERE state = 'active' AND acknowledged_at IS NULL AND resolved_at IS NULL AND opened_at <= $1
     ORDER BY opened_at ASC`,
    [cutoff]
  );

  let escalatedCount = 0;
  for (const alert of rows) {
    const success = await escalate(Number(alert.id), asOf);
    if (success) {
      escalatedCount++;
      await audit({
        userId: null,
        action: "alert.escalate",
        entity: "alert",
        entityId: alert.id,
        after: { escalatedAt: asOf, tier: 2 },
      });
      // Notify next tier (tier 2)
      await dispatchAlertNotifications(Number(alert.id), 2);
    }
  }

  return escalatedCount;
}
