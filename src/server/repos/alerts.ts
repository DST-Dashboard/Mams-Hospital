import { q, q1 } from "../db";
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
  acknowledgedBy?: number | null;
  ackNote: string | null;
  resolvedAt: number | null;
  snoozedUntil?: number | null;
  triggerT: number | null;
  triggerDistanceCm: number | null;
  simulated: boolean;
}

type Raw = Record<string, unknown>;

const map = (r: Raw): AlertRow => ({
  id: Number(r.id),
  tankId: Number(r.tank_id),
  tankLabel: (r.tank_label as string) ?? `Tank ${r.tank_id}`,
  type: r.type as AlertType,
  severity: r.severity as Severity,
  state: r.state as AlertRow["state"],
  message: r.message as string,
  value: r.value != null ? Number(r.value) : null,
  openedAt: Number(r.opened_at),
  acknowledgedAt: r.acknowledged_at ? Number(r.acknowledged_at) : null,
  acknowledgedBy: r.acknowledged_by ? Number(r.acknowledged_by) : null,
  ackNote: (r.ack_note as string) ?? null,
  resolvedAt: r.resolved_at ? Number(r.resolved_at) : null,
  snoozedUntil: r.snoozed_until ? Number(r.snoozed_until) : null,
  triggerT: r.trigger_t ? Number(r.trigger_t) : null,
  triggerDistanceCm: r.trigger_distance_cm != null ? Number(r.trigger_distance_cm) : null,
  simulated: Boolean(r.simulated),
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
  snoozedUntil: r.snoozedUntil ?? null,
  simulated: r.simulated,
});

export async function reopenExpiredSnoozes(nowMs: number): Promise<number> {
  const rows = await q(
    `UPDATE alerts
     SET state = 'active', snoozed_until = NULL
     WHERE state = 'snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= $1
     RETURNING id`,
    [nowMs]
  );
  if (rows.length > 0) {
    for (const r of rows) {
      await logAlertEvent(Number(r.id), "reopened", null, "Snooze duration elapsed", nowMs);
    }
  }
  return rows.length;
}

export async function logAlertEvent(
  alertId: number,
  event: string,
  actorId: number | null = null,
  note: string | null = null,
  t: number = Date.now()
): Promise<void> {
  await q(
    "INSERT INTO alert_events (alert_id, event, actor_id, note, t) VALUES ($1, $2, $3, $4, $5)",
    [alertId, event, actorId, note, t]
  );
}

export async function listOpen(asOf = Date.now()): Promise<AlertRow[]> {
  await reopenExpiredSnoozes(asOf);
  const rows = await q<Raw>(
    `SELECT a.*, t.label as tank_label
     FROM alerts a
     LEFT JOIN tanks t ON t.id = a.tank_id
     WHERE a.resolved_at IS NULL
     ORDER BY a.opened_at DESC`
  );
  return rows.map(map);
}

export async function listAll(limit = 200, asOf = Date.now()): Promise<AlertRow[]> {
  await reopenExpiredSnoozes(asOf);
  const rows = await q<Raw>(
    `SELECT a.*, t.label as tank_label
     FROM alerts a
     LEFT JOIN tanks t ON t.id = a.tank_id
     ORDER BY a.opened_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map(map);
}

export async function listFiltered(
  filter: {
    state?: "open" | "all";
    tankId?: number;
    severity?: Severity;
    type?: AlertType;
    from?: number;
    to?: number;
    limit?: number;
  },
  asOf = Date.now()
): Promise<AlertRow[]> {
  await reopenExpiredSnoozes(asOf);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;

  if (filter.state === "open") {
    conditions.push("a.resolved_at IS NULL");
  }
  if (filter.tankId != null) {
    conditions.push(`a.tank_id = $${pIdx++}`);
    params.push(filter.tankId);
  }
  if (filter.severity != null) {
    conditions.push(`a.severity = $${pIdx++}`);
    params.push(filter.severity);
  }
  if (filter.type != null) {
    conditions.push(`a.type = $${pIdx++}`);
    params.push(filter.type);
  }
  if (filter.from != null) {
    conditions.push(`a.opened_at >= $${pIdx++}`);
    params.push(filter.from);
  }
  if (filter.to != null) {
    conditions.push(`a.opened_at <= $${pIdx++}`);
    params.push(filter.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = `LIMIT $${pIdx++}`;
  params.push(filter.limit ?? 200);

  const sql = `SELECT a.*, t.label as tank_label FROM alerts a LEFT JOIN tanks t ON t.id = a.tank_id ${whereClause} ORDER BY a.opened_at DESC ${limitClause}`;
  const rows = await q<Raw>(sql, params);
  return rows.map(map);
}

export async function getAlert(id: number, asOf = Date.now()): Promise<AlertRow | undefined> {
  await reopenExpiredSnoozes(asOf);
  const r = await q1<Raw>(
    `SELECT a.*, t.label as tank_label
     FROM alerts a
     LEFT JOIN tanks t ON t.id = a.tank_id
     WHERE a.id = $1`,
    [id]
  );
  return r ? map(r) : undefined;
}

export async function findOpen(tankId: number, type: string, asOf = Date.now()): Promise<AlertRow | undefined> {
  await reopenExpiredSnoozes(asOf);
  const r = await q1<Raw>(
    `SELECT a.*, t.label as tank_label
     FROM alerts a
     LEFT JOIN tanks t ON t.id = a.tank_id
     WHERE a.tank_id = $1 AND a.type = $2 AND a.resolved_at IS NULL`,
    [tankId, type]
  );
  return r ? map(r) : undefined;
}

export async function lastOpenedAt(tankId: number, type: string): Promise<number | null> {
  const row = await q1<{ t: number | null }>(
    "SELECT MAX(opened_at) AS t FROM alerts WHERE tank_id = $1 AND type = $2",
    [tankId, type]
  );
  return row?.t ? Number(row.t) : null;
}

export async function open(a: {
  tankId: number;
  type: string;
  severity: Severity;
  message: string;
  value: number | null;
  at: number;
  triggerT: number | null;
  triggerDistanceCm: number | null;
  simulated: boolean;
}): Promise<number> {
  const rows = await q<{ id: number }>(
    `INSERT INTO alerts (
      tank_id, type, severity, message, value, opened_at,
      trigger_t, trigger_distance_cm, simulated
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      a.tankId,
      a.type,
      a.severity,
      a.message,
      a.value,
      a.at,
      a.triggerT,
      a.triggerDistanceCm,
      a.simulated,
    ]
  );
  const id = Number(rows[0].id);
  await logAlertEvent(id, "opened", null, a.message, a.at);
  return id;
}

export async function resolve(id: number, at: number, note?: string | null, actorId?: number | null): Promise<boolean> {
  const rows = await q(
    `UPDATE alerts
     SET state = 'resolved', resolved_at = $1, ack_note = COALESCE($2, ack_note)
     WHERE id = $3 AND resolved_at IS NULL
     RETURNING id`,
    [at, note ?? null, id]
  );
  if (rows.length > 0) {
    await logAlertEvent(id, "resolved", actorId ?? null, note ?? null, at);
    return true;
  }
  return false;
}

export async function acknowledge(id: number, at: number, userId: number, note: string | null): Promise<boolean> {
  const rows = await q(
    `UPDATE alerts
     SET state = 'acknowledged', acknowledged_at = $1, acknowledged_by = $2, ack_note = $3
     WHERE id = $4 AND resolved_at IS NULL
     RETURNING id`,
    [at, userId, note, id]
  );
  if (rows.length > 0) {
    await logAlertEvent(id, "acknowledged", userId, note, at);
    return true;
  }
  return false;
}

export async function snooze(id: number, at: number, minutes: number, actorId?: number | null): Promise<number> {
  const snoozedUntil = at + minutes * 60_000;
  await q(
    `UPDATE alerts
     SET state = 'snoozed', snoozed_until = $1
     WHERE id = $2 AND resolved_at IS NULL`,
    [snoozedUntil, id]
  );
  await logAlertEvent(id, "snoozed", actorId ?? null, `Snoozed for ${minutes} min`, at);
  return snoozedUntil;
}

export async function escalate(id: number, at: number): Promise<boolean> {
  const rows = await q(
    `UPDATE alerts
     SET state = 'escalated'
     WHERE id = $1 AND resolved_at IS NULL AND state != 'escalated'
     RETURNING id`,
    [id]
  );
  if (rows.length > 0) {
    await logAlertEvent(id, "escalated", null, "Unacknowledged escalation trigger", at);
    return true;
  }
  return false;
}

export async function getDetail(id: number, asOf = Date.now()): Promise<AlertDetailDTO | undefined> {
  const alert = await getAlert(id, asOf);
  if (!alert) return undefined;

  const tank = await getTank(alert.tankId);
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
    const lat = await readings.latest(tank.deviceId, asOf);
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
    const u = await q1<{ id: number; name: string }>(
      "SELECT id, name FROM users WHERE id = $1",
      [alert.acknowledgedBy]
    );
    if (u) acknowledgedBy = u;
  }

  const deliveriesRaw = await q<{
    channel: string;
    recipient: string;
    status: string;
    sent_at: number | null;
    error: string | null;
  }>(
    "SELECT channel, recipient, status, sent_at, error FROM notifications WHERE alert_id = $1 ORDER BY id ASC",
    [alert.id]
  );

  const deliveries = deliveriesRaw.map((d) => {
    const parsedChannel = ChannelSchema.safeParse(d.channel);
    const channel: z.infer<typeof ChannelSchema> = parsedChannel.success ? parsedChannel.data : "in_app";
    const status: "queued" | "sent" | "failed" =
      d.status === "sent" ? "sent" : d.status === "failed" ? "failed" : "queued";
    return {
      channel,
      recipient: d.recipient ?? "—",
      status,
      sentAt: d.sent_at ? Number(d.sent_at) : null,
      error: d.error ?? null,
    };
  });

  const eventsRaw = await q<{
    event: string;
    actor_id: number | null;
    note: string | null;
    t: number;
    actor_name: string | null;
  }>(
    `SELECT e.*, u.name as actor_name
     FROM alert_events e
     LEFT JOIN users u ON u.id = e.actor_id
     WHERE e.alert_id = $1
     ORDER BY e.t ASC`,
    [alert.id]
  );

  const validEvents = new Set(["opened", "notified", "escalated", "acknowledged", "snoozed", "resolved"]);
  const timeline: {
    t: number;
    event: "opened" | "notified" | "escalated" | "acknowledged" | "snoozed" | "resolved";
    by: string | null;
  }[] = eventsRaw.map((e) => ({
    t: Number(e.t),
    event: (validEvents.has(e.event) ? e.event : "notified") as "opened" | "notified" | "escalated" | "acknowledged" | "snoozed" | "resolved",
    by: e.actor_name ?? (e.note ?? null),
  }));

  if (timeline.length === 0) {
    timeline.push({ t: alert.openedAt, event: "opened", by: null });
    if (alert.acknowledgedAt) {
      timeline.push({
        t: alert.acknowledgedAt,
        event: "acknowledged",
        by: acknowledgedBy ? acknowledgedBy.name : null,
      });
    }
    if (alert.resolvedAt) {
      timeline.push({ t: alert.resolvedAt, event: "resolved", by: alert.ackNote ?? null });
    }
  }

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
