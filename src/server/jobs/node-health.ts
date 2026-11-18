import { db, tx } from "../db";
import * as alerts from "../repos/alerts";
import { queueNotificationDispatch } from "../repos/notifications";
import { now } from "../clock";

interface GatewayNode {
  gateway_id: string | null;
  tank_id: number;
  label: string;
  no_data_min: number;
  simulated: number;
  last_reading_at: number | null;
}

export function checkGatewayHealth(asOf = now()): { opened: number; resolved: number } {
  const rows = db().prepare(`
    SELECT d.gateway_id, t.id AS tank_id, t.label, t.no_data_min, d.simulated, MAX(r.t) AS last_reading_at
    FROM devices d
    JOIN tanks t ON t.device_id = d.device_id AND t.deleted_at IS NULL AND t.status = 'active'
    LEFT JOIN readings r ON r.device_id = d.device_id
    WHERE d.gateway_id IS NOT NULL
    GROUP BY d.gateway_id, t.id
    ORDER BY d.gateway_id, t.id
  `).all() as GatewayNode[];
  const groups = new Map<string, GatewayNode[]>();
  for (const row of rows) {
    if (!row.gateway_id) continue;
    const group = groups.get(row.gateway_id) ?? [];
    group.push(row);
    groups.set(row.gateway_id, group);
  }

  const result = { opened: 0, resolved: 0 };
  const openedAlertIds: number[] = [];
  tx(() => {
    for (const [gatewayId, nodes] of groups) {
      const offline = nodes.every((node) =>
        node.last_reading_at == null || asOf - node.last_reading_at > node.no_data_min * 60_000
      );
      const representative = nodes[0]!;
      const existing = alerts.findOpen(representative.tank_id, "GATEWAY_OFFLINE", asOf);
      if (offline && !existing) {
        openedAlertIds.push(alerts.open({
          tankId: representative.tank_id,
          type: "GATEWAY_OFFLINE",
          severity: "critical",
          message: `Gateway ${gatewayId} has no recent readings from its ${nodes.length} active tank node(s)`,
          value: null,
          at: asOf,
          triggerT: representative.last_reading_at,
          triggerDistanceCm: null,
          simulated: nodes.every((node) => node.simulated === 1),
        }));
        result.opened++;
      } else if (!offline && existing && alerts.resolve(existing.id, asOf)) {
        result.resolved++;
      }
    }
  });
  for (const alertId of openedAlertIds) queueNotificationDispatch(alertId);
  return result;
}
