import { db, tx } from "../db";
import { now } from "../clock";
import { audit } from "../repos/audit";
import { dispatchAlert } from "../notify/dispatcher";

interface EscalationCandidate { id: number; severity: "warning" | "critical" | "emergency"; opened_at: number }

export async function escalateUnacknowledged(asOf = now()): Promise<number> {
  const rows = db().prepare(`
    SELECT id, severity, opened_at FROM alerts
    WHERE state = 'active' AND resolved_at IS NULL
    ORDER BY opened_at
  `).all() as EscalationCandidate[];
  let count = 0;
  for (const alert of rows) {
    const delay = alert.severity === "emergency" || alert.severity === "critical" ? 10 * 60_000 : 30 * 60_000;
    if (asOf - alert.opened_at < delay) continue;
    const changed = tx(() => db().prepare("UPDATE alerts SET state = 'escalated' WHERE id = ? AND state = 'active' AND resolved_at IS NULL").run(alert.id).changes);
    if (!changed) continue;
    audit({ userId: null, action: "alert.escalate", entity: "alert", entityId: alert.id });
    await dispatchAlert(alert.id);
    count++;
  }
  return count;
}
