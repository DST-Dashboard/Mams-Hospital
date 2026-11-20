import { z } from "zod";
import { q, q1, tx } from "../db";
import type { Thresholds, TankGeometry } from "@/domain";

export interface TankRow {
  id: number;
  deviceId: string | null;
  label: string;
  zone: string | null;
  location: string | null;
  status: "draft" | "active" | "maintenance" | "offline" | "decommissioned";
  geometry: TankGeometry;
  thresholds: Thresholds;
  dimsConfirmed: boolean;
  simulated: boolean;
  deletedAt: number | null;
  ownerId?: number | null;
  readingCount?: number;
  lastReadingAt?: number | null;
  isAwaitingReading?: boolean;
}

const SELECT = `
  SELECT t.*, COALESCE(d.simulated, FALSE) AS simulated,
    (SELECT COUNT(*)::int FROM readings r WHERE r.device_id = t.device_id) AS reading_count,
    (SELECT MAX(t) FROM readings r WHERE r.device_id = t.device_id) AS last_reading_at
  FROM tanks t
  LEFT JOIN devices d ON d.device_id = t.device_id
`;

type Raw = Record<string, unknown>;

const map = (r: Raw): TankRow => {
  const readingCount = r.reading_count != null ? Number(r.reading_count) : 0;
  const isAwaitingReading = (r.status as string) === "active" && !!r.device_id && readingCount === 0;

  return {
    id: Number(r.id),
    deviceId: (r.device_id as string) ?? null,
    label: r.label as string,
    zone: (r.zone as string) ?? null,
    location: (r.location as string) ?? null,
    status: r.status as TankRow["status"],
    geometry: {
      heightCm: Number(r.height_cm),
      deadZoneCm: Number(r.dead_zone_cm ?? 25),
      shape:
        r.shape === "cylinder"
          ? { kind: "cylinder", radiusCm: Number(r.radius_cm ?? 100) }
          : { kind: "rectangle", widthCm: Number(r.width_cm ?? 100), lengthCm: Number(r.length_cm ?? 100) },
    },
    thresholds: {
      warnPct: Number(r.warn_pct),
      critPct: Number(r.crit_pct),
      emptyPct: Number(r.empty_pct),
      overflowMarginCm: Number(r.overflow_margin_cm),
      persistence: Number(r.persistence),
      cooldownMin: Number(r.cooldown_min),
      hysteresisPct: Number(r.hysteresis_pct),
      noDataMin: Number(r.no_data_min),
      spikeCm: Number(r.spike_cm),
      quietStart: (r.quiet_start as string) ?? null,
      quietEnd: (r.quiet_end as string) ?? null,
    },
    dimsConfirmed: Boolean(r.dims_confirmed),
    simulated: Boolean(r.simulated),
    deletedAt: r.deleted_at ? Number(r.deleted_at) : null,
    ownerId: r.owner_id != null ? Number(r.owner_id) : null,
    readingCount,
    lastReadingAt: r.last_reading_at ? Number(r.last_reading_at) : null,
    isAwaitingReading,
  };
};

export async function listTanks(opts: { includeDeleted?: boolean } = {}): Promise<TankRow[]> {
  const where = opts.includeDeleted ? "" : "WHERE t.deleted_at IS NULL";
  const rows = await q<Raw>(`${SELECT} ${where} ORDER BY t.id ASC`);
  return rows.map(map);
}

export async function getTank(id: number): Promise<TankRow | undefined> {
  const r = await q1<Raw>(`${SELECT} WHERE t.id = $1`, [id]);
  return r ? map(r) : undefined;
}

export async function getTankByDeviceId(deviceId: string): Promise<TankRow | undefined> {
  const r = await q1<Raw>(`${SELECT} WHERE t.device_id = $1 AND t.deleted_at IS NULL`, [deviceId]);
  return r ? map(r) : undefined;
}

export async function getTankByLabel(label: string): Promise<TankRow | undefined> {
  const r = await q1<Raw>(`${SELECT} WHERE t.label = $1 AND t.deleted_at IS NULL`, [label]);
  return r ? map(r) : undefined;
}

export const TankInput = z
  .object({
    label: z.string().min(1).max(80),
    deviceId: z.string().min(1).nullable().optional(),
    zone: z.string().max(60).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
    status: z.enum(["draft", "active", "maintenance", "offline", "decommissioned"]).optional(),
    shape: z.enum(["cylinder", "rectangle"]).default("cylinder"),
    heightCm: z.number().min(20).max(2000),
    radiusCm: z.number().min(10).max(1000).optional(),
    widthCm: z.number().min(10).max(5000).optional(),
    lengthCm: z.number().min(10).max(5000).optional(),
    deadZoneCm: z.number().min(0).max(100).default(25),
    dimsConfirmed: z.boolean().optional(),
    ownerId: z.number().int().positive().nullable().optional(),
    quietStart: z.string().nullable().optional(),
    quietEnd: z.string().nullable().optional(),
    warnPct: z.number().min(1).max(99).optional(),
    critPct: z.number().min(1).max(99).optional(),
    emptyPct: z.number().min(0).max(50).optional(),
    overflowMarginCm: z.number().optional(),
    persistence: z.number().optional(),
    cooldownMin: z.number().optional(),
    hysteresisPct: z.number().optional(),
    noDataMin: z.number().optional(),
    spikeCm: z.number().optional(),
  })
  .refine((v) => v.deadZoneCm < v.heightCm, "dead zone must be smaller than tank height")
  .refine(
    (v) => (v.shape === "cylinder" ? v.radiusCm != null : v.widthCm != null && v.lengthCm != null),
    "dimensions missing for chosen shape"
  )
  .refine(
    (v) => (v.warnPct ?? 40) > (v.critPct ?? 20) && (v.critPct ?? 20) > (v.emptyPct ?? 5),
    "thresholds must satisfy warning > critical > empty"
  );

export type TankInput = z.infer<typeof TankInput>;

export async function createTank(i: TankInput): Promise<number> {
  const t = Date.now();
  if (i.deviceId) {
    await q(
      "INSERT INTO devices (device_id, simulated, created_at) VALUES ($1, FALSE, $2) ON CONFLICT (device_id) DO NOTHING",
      [i.deviceId, t]
    );
  }

  const rows = await q<{ id: number }>(
    `INSERT INTO tanks (
      device_id, label, zone, location, status, shape,
      height_cm, radius_cm, width_cm, length_cm, dead_zone_cm,
      dims_confirmed, quiet_start, quiet_end, warn_pct, crit_pct, empty_pct,
      overflow_margin_cm, persistence, cooldown_min, hysteresis_pct, no_data_min, spike_cm,
      owner_id, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23,
      $24, $25, $25
    ) RETURNING id`,
    [
      i.deviceId ?? null,
      i.label,
      i.zone ?? null,
      i.location ?? null,
      i.status ?? "draft",
      i.shape ?? "cylinder",
      i.heightCm,
      i.radiusCm ?? null,
      i.widthCm ?? null,
      i.lengthCm ?? null,
      i.deadZoneCm ?? 25,
      Boolean(i.dimsConfirmed),
      i.quietStart ?? null,
      i.quietEnd ?? null,
      i.warnPct ?? 40,
      i.critPct ?? 20,
      i.emptyPct ?? 5,
      i.overflowMarginCm ?? 10,
      i.persistence ?? 3,
      i.cooldownMin ?? 30,
      i.hysteresisPct ?? 5,
      i.noDataMin ?? 15,
      i.spikeCm ?? 80,
      i.ownerId ?? null,
      t,
    ]
  );

  const tankId = Number(rows[0].id);
  await q(
    `INSERT INTO tank_dimensions (tank_id, height_cm, radius_cm, width_cm, length_cm, dead_zone_cm, effective_from, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7)`,
    [
      tankId,
      i.heightCm,
      i.radiusCm ?? null,
      i.widthCm ?? null,
      i.lengthCm ?? null,
      i.deadZoneCm ?? 25,
      t,
    ]
  );

  return tankId;
}

export async function updateTank(
  id: number,
  i: Partial<TankInput>,
  opts: { applyFromNowOnly?: boolean; effectiveFrom?: number } = {}
): Promise<void> {
  const t = Date.now();

  await tx(async (client) => {
    if (i.deviceId) {
      await client.query(
        "INSERT INTO devices (device_id, simulated, created_at) VALUES ($1, FALSE, $2) ON CONFLICT (device_id) DO NOTHING",
        [i.deviceId, t]
      );
    }

    if (opts.applyFromNowOnly && (i.heightCm != null || i.radiusCm != null || i.widthCm != null || i.lengthCm != null || i.deadZoneCm != null)) {
      // Record historic dimensions in tank_dimensions table
      const effectiveFrom = opts.effectiveFrom ?? t;
      await client.query(
        `INSERT INTO tank_dimensions (tank_id, height_cm, radius_cm, width_cm, length_cm, dead_zone_cm, effective_from, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          i.heightCm ?? 300,
          i.radiusCm ?? null,
          i.widthCm ?? null,
          i.lengthCm ?? null,
          i.deadZoneCm ?? 25,
          effectiveFrom,
          t,
        ]
      );
    }

    await client.query(
      `UPDATE tanks SET
        label = COALESCE($1, label),
        device_id = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE device_id END,
        zone = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE zone END,
        location = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE location END,
        status = COALESCE($5, status),
        shape = COALESCE($6, shape),
        height_cm = COALESCE($7, height_cm),
        radius_cm = COALESCE($8, radius_cm),
        width_cm = COALESCE($9, width_cm),
        length_cm = COALESCE($10, length_cm),
        dead_zone_cm = COALESCE($11, dead_zone_cm),
        dims_confirmed = COALESCE($12, dims_confirmed),
        quiet_start = CASE WHEN $13::text IS NOT NULL THEN $13 ELSE quiet_start END,
        quiet_end = CASE WHEN $14::text IS NOT NULL THEN $14 ELSE quiet_end END,
        warn_pct = COALESCE($15, warn_pct),
        crit_pct = COALESCE($16, crit_pct),
        empty_pct = COALESCE($17, empty_pct),
        owner_id = CASE WHEN $18::text = '__CLEAR__' THEN NULL WHEN $19::int IS NOT NULL THEN $19 ELSE owner_id END,
        updated_at = $20
      WHERE id = $21`,
      [
        i.label ?? null,
        i.deviceId !== undefined ? i.deviceId : null,
        i.zone !== undefined ? i.zone : null,
        i.location !== undefined ? i.location : null,
        i.status ?? null,
        i.shape ?? null,
        i.heightCm ?? null,
        i.radiusCm ?? null,
        i.widthCm ?? null,
        i.lengthCm ?? null,
        i.deadZoneCm ?? null,
        i.dimsConfirmed !== undefined ? Boolean(i.dimsConfirmed) : null,
        i.quietStart !== undefined ? i.quietStart : null,
        i.quietEnd !== undefined ? i.quietEnd : null,
        i.warnPct ?? null,
        i.critPct ?? null,
        i.emptyPct ?? null,
        i.ownerId === null ? "__CLEAR__" : null,
        i.ownerId ?? null,
        t,
        id,
      ]
    );
  });
}

export async function softDeleteTank(id: number): Promise<void> {
  const t = Date.now();
  await q(
    "UPDATE tanks SET deleted_at = $1, status = 'decommissioned', updated_at = $1 WHERE id = $2",
    [t, id]
  );
}

export async function restoreTank(id: number): Promise<void> {
  const t = Date.now();
  await q(
    "UPDATE tanks SET deleted_at = NULL, status = 'active', updated_at = $1 WHERE id = $2",
    [t, id]
  );
}

/** Purge soft-deleted tanks older than 90 days (readings are preserved) */
export async function purgeSoftDeleted(olderThanMs: number): Promise<number> {
  const rows = await q(
    "DELETE FROM tanks WHERE deleted_at IS NOT NULL AND deleted_at < $1 RETURNING id",
    [olderThanMs]
  );
  return rows.length;
}

/** Get geometry valid at time `t` for a tank (respecting historic changes if any) */
export async function getGeometryAt(tank: TankRow, t: number): Promise<TankGeometry> {
  const hist = await q1<{
    height_cm: number;
    radius_cm: number | null;
    width_cm: number | null;
    length_cm: number | null;
    dead_zone_cm: number;
  }>(
    `SELECT height_cm, radius_cm, width_cm, length_cm, dead_zone_cm
     FROM tank_dimensions
     WHERE tank_id = $1 AND effective_from <= $2
     ORDER BY effective_from DESC
     LIMIT 1`,
    [tank.id, t]
  );

  if (!hist) return tank.geometry;

  const shape = tank.geometry.shape;
  return {
    heightCm: Number(hist.height_cm),
    deadZoneCm: Number(hist.dead_zone_cm),
    shape:
      shape.kind === "cylinder"
        ? { kind: "cylinder", radiusCm: Number(hist.radius_cm ?? (shape as { radiusCm: number }).radiusCm) }
        : {
            kind: "rectangle",
            widthCm: Number(hist.width_cm ?? (shape as { widthCm: number }).widthCm),
            lengthCm: Number(hist.length_cm ?? (shape as { lengthCm: number }).lengthCm),
          },
  };
}

/**
 * Checks whether a user has permission to submit a manual reading for a specific tank:
 * - Admin can submit for any tank.
 * - Operator can submit if they are the tank's owner or an assigned alert recipient for that tank.
 * - Viewers/others cannot submit.
 */
export async function canUserSubmitManualReading(
  userId: number,
  role: string,
  tankId: number
): Promise<boolean> {
  if (role === "admin") return true;
  if (role !== "operator") return false;

  const tank = await getTank(tankId);
  if (!tank || tank.deletedAt != null) return false;
  if (tank.ownerId === userId) return true;

  const recipient = await q1(
    "SELECT 1 FROM alert_recipients WHERE tank_id = $1 AND user_id = $2",
    [tankId, userId]
  );
  return Boolean(recipient);
}

/**
 * Lists all tanks that a user is authorized to submit manual readings for:
 * - Admin: all non-deleted tanks.
 * - Operator: tanks where user is owner_id or in alert_recipients.
 * - Viewer: empty list.
 */
export async function listAuthorizedTanksForUser(
  userId: number,
  role: string
): Promise<TankRow[]> {
  const allTanks = await listTanks();
  if (role === "admin") return allTanks;
  if (role !== "operator") return [];

  const recipientRows = await q<{ tank_id: number }>(
    "SELECT DISTINCT tank_id FROM alert_recipients WHERE user_id = $1",
    [userId]
  );
  const assignedIds = new Set(recipientRows.map((r) => Number(r.tank_id)));

  return allTanks.filter((t) => (t.ownerId != null && t.ownerId === userId) || assignedIds.has(t.id));
}
