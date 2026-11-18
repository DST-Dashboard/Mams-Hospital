import { db } from "../db";
import type { AlertType, Severity } from "@/domain";
import { getTank } from "./tanks";
import { derive } from "@/domain/derive";
import * as readings from "./readings";
import type { AlertDTO, AlertDetailDTO } from "@/contracts/alerts";
import { ChannelSchema } from "@/contracts/common";
import type { z } from "zod";

export interface AlertRow {
  id: number;
  tankId: number;
  tankLabel?: string;
  type: AlertType;
  severity: Severity;
  state: "active" | "acknowledged" | "snoozed" | "resolved" | "suppressed" | "escalated";
  message: string;
  value: number | null;
  openedAt: number;
  acknowledgedAt: number | null;
  acknowledgedBy: number | null;
  ackNote: string | null;
  resolvedAt: number | null;
  snoozedUntil: number | null;
  triggerT: number | null;
  triggerDistanceCm: number | null;
  simulated: boolean;
}

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const map = (r: Raw): AlertRow => ({
  id: r.id,
  tankId: r.tank_id,
  tankLabel: r.tank_label ?? `Tank ${r.tank_id}`,
  type: r.type,
  severity: r.severity,
  state: r.state,
  message: r.message,
  value: r.value,
  openedAt: r.opened_at,
  acknowledgedAt: r.acknowledged_at,
  acknowledgedBy: r.acknowledged_by ?? null,
  ackNote: r.ack_note,
  resolvedAt: r.resolved_at,
  snoozedUntil: r.snoozed_until ?? null,
  triggerT: r.trigger_t,
  triggerDistanceCm: r.trigger_distance_cm,
  simulated: !!r.simulated,
});

export const toDTO = (r: AlertRow): AlertDTO => ({
  id: r.id,
  tankId: r.tankId,
  tankLabel: r.tankLabel ?? `Tank ${r.tankId}`,
  type: r.type,
  severity: r.severity,
  state: r.state,
  message: r.message,
  value: r.value,
  openedAt: r.openedAt,
  acknowledgedAt: r.acknowledgedAt,
  ackNote: r.ackNote,
  resolvedAt: r.resolvedAt,
  snoozedUntil: r.snoozedUntil,
  simulated: r.simulated,
});

export function reopenExpiredSnoozes(nowMs: number): number {
  const result = db()
    .prepare("UPDATE alerts SET state='active', snoozed_until=NULL WHERE state='snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= ?")
    .run(nowMs);
  return result.changes;
}

export function listOpen(asOf = Date.now()): AlertRow[] {
  reopenExpiredSnoozes(asOf);
  const rows = db()
    .prepare("SELECT a.*, t.label as tank_label FROM alerts a LEFT JOIN tanks t ON t.id = a.tank_id WHERE a.resolved_at IS NULL ORDER BY a.opened_at DESC")
    .all() as Raw[];
  return rows.map(map);
}

export function listAll(limit = 200, asOf = Date.now()): AlertRow[] {
  reopenExpiredSnoozes(asOf);
  const rows = db()
    .prepare("SELECT a.*, t.label as tank_label FROM alerts a LEFT JOIN tanks t ON t.id = a.tank_id ORDER BY a.opened_at DESC LIMIT ?")
    .all(limit) as Raw[];
  return rows.map(map);
}

export function listFiltered(filter: {
  state?: "open" | "all";
  tankId?: number;
  severity?: Severity;
  type?: AlertType;
  from?: number;
  to?: number;
  limit?: number;
}, asOf = Date.now()): AlertRow[] {
  reopenExpiredSnoozes(asOf);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter.state === "open") {
    conditions.push("a.resolved_at IS NULL");
  }
  if (filter.tankId != null) {
    conditions.push("a.tank_id = ?");
    params.push(filter.tankId);
  }
  if (filter.severity != null) {
    conditions.push("a.severity = ?");
    params.push(filter.severity);
  }
  if (filter.type != null) {
    conditions.push("a.type = ?");
    params.push(filter.type);
  }
  if (filter.from != null) {
    conditions.push("a.opened_at >= ?");
    params.push(filter.from);
  }
  if (filter.to != null) {
    conditions.push("a.opened_at <= ?");
    params.push(filter.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = `LIMIT ?`;
  params.push(filter.limit ?? 200);

  const sql = `SELECT a.*, t.label as tank_label FROM alerts a LEFT JOIN tanks t ON t.id = a.tank_id ${whereClause} ORDER BY a.opened_at DESC ${limitClause}`;
  const rows = db().prepare(sql).all(...params) as Raw[];
  return rows.map(map);
}

export function getAlert(id: number, asOf = Date.now()): AlertRow | undefined {
  reopenExpiredSnoozes(asOf);
  const r = db()
    .prepare("SELECT a.*, t.label as tank_label FROM alerts a LEFT JOIN tanks t ON t.id = a.tank_id WHERE a.id=?")
    .get(id) as Raw | undefined;
  return r && map(r);
}

export function findOpen(tankId: number, type: string, asOf = Date.now()): AlertRow | undefined {
  reopenExpiredSnoozes(asOf);
  const r = db()
    .prepare("SELECT a.*, t.label as tank_label FROM alerts a LEFT JOIN tanks t ON t.id = a.tank_id WHERE a.tank_id=? AND a.type=? AND a.resolved_at IS NULL")
    .get(tankId, type) as Raw | undefined;
  return r && map(r);
}

export function lastOpenedAt(tankId: number, type: string): number | null {
  const row = db().prepare("SELECT MAX(opened_at) AS t FROM alerts WHERE tank_id=? AND type=?").get(tankId, type) as { t: number | null } | undefined;
  return row?.t ?? null;
}

export function open(a: {
  tankId: number;
  type: string;
  severity: Severity;
  message: string;
  value: number | null;
  at: number;
  triggerT: number | null;
  triggerDistanceCm: number | null;
  simulated: boolean;
}): number {
  const r = db()
    .prepare(
      "INSERT INTO alerts (tank_id,type,severity,message,value,opened_at,trigger_t,trigger_distance_cm,simulated) VALUES (?,?,?,?,?,?,?,?,?)"
    )
    .run(a.tankId, a.type, a.severity, a.message, a.value, a.at, a.triggerT, a.triggerDistanceCm, a.simulated ? 1 : 0);
  return Number(r.lastInsertRowid);
}

export function resolve(id: number, at: number, note?: string | null): boolean {
  const r = db()
    .prepare("UPDATE alerts SET state='resolved', resolved_at=?, ack_note=COALESCE(?, ack_note) WHERE id=? AND resolved_at IS NULL")
    .run(at, note ?? null, id);
  return r.changes > 0;
}

export function acknowledge(id: number, at: number, userId: number, note: string | null): boolean {
  const r = db()
    .prepare("UPDATE alerts SET state='acknowledged', acknowledged_at=?, acknowledged_by=?, ack_note=? WHERE id=? AND resolved_at IS NULL")
    .run(at, userId, note, id);
  return r.changes > 0;
}

export function snooze(id: number, at: number, minutes: number): number {
  const snoozedUntil = at + minutes * 60_000;
  db()
    .prepare("UPDATE alerts SET state='snoozed', snoozed_until=? WHERE id=? AND resolved_at IS NULL")
    .run(snoozedUntil, id);
  return snoozedUntil;
}

export function getDetail(id: number, asOf = Date.now()): AlertDetailDTO | undefined {
  const alert = getAlert(id, asOf);
  if (!alert) return undefined;

  const tank = getTank(alert.tankId);
  const triggerLevelPct =
    alert.triggerDistanceCm != null && tank
      ? derive(alert.triggerDistanceCm, tank.geometry).levelPct
      : null;

  let sensorHealth = {
    lastReadingAgeMin: null as number | null,
    rssi: null as number | null,
    snr: null as number | null,
    batteryPct: null as number | null,
    quality: "ok" as string,
  };

  if (tank?.deviceId) {
    const lat = readings.latest(tank.deviceId, asOf);
    if (lat) {
      sensorHealth = {
        lastReadingAgeMin: Math.max(0, Math.round((asOf - lat.t) / 60_000)),
        rssi: lat.rssi ?? null,
        snr: lat.snr ?? null,
        batteryPct: lat.batteryPct ?? null,
        quality: derive(lat.distanceCm, tank.geometry).quality,
      };
    }
  }

  let acknowledgedBy: { id: number; name: string } | null = null;
  if (alert.acknowledgedBy) {
    const u = db().prepare("SELECT id, name FROM users WHERE id = ?").get(alert.acknowledgedBy) as
      | { id: number; name: string }
      | undefined;
    if (u) acknowledgedBy = u;
  }

  const deliveriesRaw = db()
    .prepare("SELECT channel, recipient, status, sent_at, error FROM notifications WHERE alert_id = ?")
    .all(id) as Array<{
    channel: z.infer<typeof ChannelSchema>;
    recipient: string;
    status: "queued" | "sent" | "failed";
    sent_at: number | null;
    error: string | null;
  }>;

  const deliveries = deliveriesRaw.map((d) => ({
    channel: ChannelSchema.parse(d.channel),
    recipient: d.recipient,
    status: d.status,
    sentAt: d.sent_at,
    error: d.error,
  }));

  const timeline: Array<{
    t: number;
    event: "opened" | "notified" | "escalated" | "acknowledged" | "snoozed" | "resolved";
    by: string | null;
  }> = [{ t: alert.openedAt, event: "opened", by: null }];

  for (const d of deliveries) {
    if (d.sentAt) {
      timeline.push({ t: d.sentAt, event: "notified", by: d.channel });
    }
  }

  const auditEntries = db()
    .prepare(
      "SELECT a.t, a.action, u.name as user_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE a.entity = 'alert' AND a.entity_id = ? ORDER BY a.t ASC"
    )
    .all(String(id)) as Array<{ t: number; action: string; user_name: string | null }>;

  for (const entry of auditEntries) {
    if (entry.action === "alert.ack" && !timeline.some((t) => t.event === "acknowledged")) {
      timeline.push({ t: entry.t, event: "acknowledged", by: entry.user_name });
    } else if (entry.action === "alert.snooze") {
      timeline.push({ t: entry.t, event: "snoozed", by: entry.user_name });
    } else if (entry.action === "alert.resolve" && !timeline.some((t) => t.event === "resolved")) {
      timeline.push({ t: entry.t, event: "resolved", by: entry.user_name });
    }
  }

  if (alert.acknowledgedAt && !timeline.some((t) => t.event === "acknowledged")) {
    timeline.push({ t: alert.acknowledgedAt, event: "acknowledged", by: acknowledgedBy?.name ?? null });
  }
  if (alert.resolvedAt && !timeline.some((t) => t.event === "resolved")) {
    timeline.push({ t: alert.resolvedAt, event: "resolved", by: null });
  }

  timeline.sort((a, b) => a.t - b.t);

  return {
    ...toDTO(alert),
    trigger: {
      t: alert.triggerT,
      distanceCm: alert.triggerDistanceCm,
      levelPct: triggerLevelPct,
    },
    sensorHealth,
    acknowledgedBy,
    deliveries,
    timeline,
  };
}
