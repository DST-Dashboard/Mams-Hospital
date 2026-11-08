import { db } from "../db";
import type { AlertType, Severity } from "@/domain";

export interface AlertRow {
  id: number; tankId: number; type: AlertType; severity: Severity;
  state: "active" | "acknowledged" | "snoozed" | "resolved" | "suppressed" | "escalated";
  message: string; value: number | null; openedAt: number; acknowledgedAt: number | null; ackNote: string | null; resolvedAt: number | null;
  triggerT: number | null; triggerDistanceCm: number | null; simulated: boolean;
}
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const map = (r: Raw): AlertRow => ({
  id: r.id, tankId: r.tank_id, type: r.type, severity: r.severity, state: r.state, message: r.message, value: r.value,
  openedAt: r.opened_at, acknowledgedAt: r.acknowledged_at, ackNote: r.ack_note, resolvedAt: r.resolved_at,
  triggerT: r.trigger_t, triggerDistanceCm: r.trigger_distance_cm, simulated: !!r.simulated,
});

export const listOpen = (): AlertRow[] => (db().prepare("SELECT * FROM alerts WHERE resolved_at IS NULL ORDER BY opened_at DESC").all() as Raw[]).map(map);
export const listAll = (limit = 200): AlertRow[] => (db().prepare("SELECT * FROM alerts ORDER BY opened_at DESC LIMIT ?").all(limit) as Raw[]).map(map);
export const getAlert = (id: number): AlertRow | undefined => { const r = db().prepare("SELECT * FROM alerts WHERE id=?").get(id) as Raw | undefined; return r && map(r); };
export const findOpen = (tankId: number, type: string): AlertRow | undefined => { const r = db().prepare("SELECT * FROM alerts WHERE tank_id=? AND type=? AND resolved_at IS NULL").get(tankId, type) as Raw | undefined; return r && map(r); };
export const lastOpenedAt = (tankId: number, type: string): number | null => (db().prepare("SELECT MAX(opened_at) AS t FROM alerts WHERE tank_id=? AND type=?").get(tankId, type) as { t: number | null }).t;

export function open(a: { tankId: number; type: string; severity: Severity; message: string; value: number | null; at: number; triggerT: number | null; triggerDistanceCm: number | null; simulated: boolean }) {
  db().prepare("INSERT INTO alerts (tank_id,type,severity,message,value,opened_at,trigger_t,trigger_distance_cm,simulated) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(a.tankId, a.type, a.severity, a.message, a.value, a.at, a.triggerT, a.triggerDistanceCm, a.simulated ? 1 : 0);
}
export const resolve = (id: number, at: number) => void db().prepare("UPDATE alerts SET state='resolved', resolved_at=? WHERE id=?").run(at, id);
export const acknowledge = (id: number, at: number, userId: number, note: string | null) =>
  void db().prepare("UPDATE alerts SET state='acknowledged', acknowledged_at=?, acknowledged_by=?, ack_note=? WHERE id=? AND resolved_at IS NULL").run(at, userId, note, id);
