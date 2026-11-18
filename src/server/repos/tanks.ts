import { z } from "zod";
import { db, tx } from "../db";
import type { Thresholds, TankGeometry } from "@/domain";
import { listForTank, setForTank } from "./recipients";

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
  readingCount?: number;
  lastReadingAt?: number | null;
  isAwaitingReading?: boolean;
}

const SELECT = `
  SELECT t.*, COALESCE(d.simulated,0) AS simulated,
    (SELECT COUNT(*) FROM readings r WHERE r.device_id = t.device_id) AS reading_count,
    (SELECT MAX(t) FROM readings r WHERE r.device_id = t.device_id) AS last_reading_at
  FROM tanks t
  LEFT JOIN devices d ON d.device_id = t.device_id
`;

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const map = (r: Raw): TankRow => {
  const readingCount = r.reading_count != null ? Number(r.reading_count) : 0;
  const isAwaitingReading = r.status === "active" && !!r.device_id && readingCount === 0;

  return {
    id: r.id,
    deviceId: r.device_id,
    label: r.label,
    zone: r.zone,
    location: r.location,
    status: r.status,
    geometry: {
      heightCm: r.height_cm,
      deadZoneCm: r.dead_zone_cm,
      shape:
        r.shape === "cylinder"
          ? { kind: "cylinder", radiusCm: r.radius_cm ?? 100 }
          : { kind: "rectangle", widthCm: r.width_cm ?? 100, lengthCm: r.length_cm ?? 100 },
    },
    thresholds: {
      warnPct: r.warn_pct,
      critPct: r.crit_pct,
      emptyPct: r.empty_pct,
      overflowMarginCm: r.overflow_margin_cm,
      persistence: r.persistence,
      cooldownMin: r.cooldown_min,
      hysteresisPct: r.hysteresis_pct,
      noDataMin: r.no_data_min,
      spikeCm: r.spike_cm,
      quietStart: r.quiet_start ?? null,
      quietEnd: r.quiet_end ?? null,
    },
    dimsConfirmed: !!r.dims_confirmed,
    simulated: !!r.simulated,
    deletedAt: r.deleted_at,
    readingCount,
    lastReadingAt: r.last_reading_at ?? null,
    isAwaitingReading,
  };
};

export const listTanks = (opts: { includeDeleted?: boolean } = {}): TankRow[] =>
  (
    db()
      .prepare(`${SELECT} ${opts.includeDeleted ? "" : "WHERE t.deleted_at IS NULL"} ORDER BY t.id`)
      .all() as Raw[]
  ).map(map);

export const getTank = (id: number): TankRow | undefined => {
  const r = db().prepare(`${SELECT} WHERE t.id = ?`).get(id) as Raw | undefined;
  return r && map(r);
};

export const getTankByLabel = (label: string): TankRow | undefined => {
  const r = db().prepare(`${SELECT} WHERE t.label = ? AND t.deleted_at IS NULL`).get(label) as Raw | undefined;
  return r && map(r);
};

/** Validation for create/update. Plausible physical ranges so bad dimensions can't poison every derived number. */
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
    quietStart: z.string().nullable().optional(),
    quietEnd: z.string().nullable().optional(),
    warnPct: z.number().min(1).max(99).optional(),
    critPct: z.number().min(1).max(99).optional(),
    emptyPct: z.number().min(0).max(50).optional(),
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

function validateRelationships(i: { zone?: string | null; deviceId?: string | null }) {
  if (i.zone) {
    const zoneExists = db().prepare("SELECT id FROM zones WHERE name = ?").get(i.zone);
    if (!zoneExists) {
      // Auto-create zone if it doesn't exist, to maintain compatibility while logging
      db().prepare("INSERT INTO zones (name, description, created_at) VALUES (?, ?, ?)").run(i.zone, "Auto-created from tank assignment", Date.now());
    }
  }
  if (i.deviceId) {
    const deviceExists = db().prepare("SELECT device_id FROM devices WHERE device_id = ?").get(i.deviceId);
    if (!deviceExists) {
      // Auto-register device
      db().prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run(i.deviceId, Date.now());
    }
  }
}

const nullish = {
  zone: null,
  location: null,
  radiusCm: null,
  widthCm: null,
  lengthCm: null,
  deviceId: null,
  quietStart: null,
  quietEnd: null,
};

export function createTank(i: TankInput): number {
  validateRelationships(i);
  const t = Date.now();
  const r = db()
    .prepare(
      `INSERT INTO tanks (device_id,label,zone,location,status,shape,height_cm,radius_cm,width_cm,length_cm,dead_zone_cm,dims_confirmed,quiet_start,quiet_end,warn_pct,crit_pct,empty_pct,created_at,updated_at)
    VALUES (@deviceId,@label,@zone,@location,@status,@shape,@heightCm,@radiusCm,@widthCm,@lengthCm,@deadZoneCm,@dimsConfirmed,@quietStart,@quietEnd,@warnPct,@critPct,@emptyPct,@t,@t)`
    )
    .run({
      ...nullish,
      ...i,
      status: i.status ?? "draft",
      dimsConfirmed: i.dimsConfirmed ? 1 : 0,
      warnPct: i.warnPct ?? 40,
      critPct: i.critPct ?? 20,
      emptyPct: i.emptyPct ?? 5,
      t,
    });
  return Number(r.lastInsertRowid);
}

export function updateTank(id: number, i: Partial<TankInput>): void {
  validateRelationships(i);
  db()
    .prepare(
      `UPDATE tanks SET label=COALESCE(@label,label), device_id=COALESCE(@deviceId,device_id), zone=COALESCE(@zone,zone), location=COALESCE(@location,location), status=COALESCE(@status,status), shape=COALESCE(@shape,shape),
    height_cm=COALESCE(@heightCm,height_cm), radius_cm=COALESCE(@radiusCm,radius_cm), width_cm=COALESCE(@widthCm,width_cm), length_cm=COALESCE(@lengthCm,length_cm), dead_zone_cm=COALESCE(@deadZoneCm,dead_zone_cm),
    dims_confirmed=COALESCE(@dimsConfirmed,dims_confirmed), quiet_start=COALESCE(@quietStart,quiet_start), quiet_end=COALESCE(@quietEnd,quiet_end), warn_pct=COALESCE(@warnPct,warn_pct), crit_pct=COALESCE(@critPct,crit_pct), empty_pct=COALESCE(@emptyPct,empty_pct), updated_at=@t WHERE id=@id`
    )
    .run({
      ...nullish,
      status: null,
      label: null,
      heightCm: null,
      deadZoneCm: null,
      shape: null,
      warnPct: null,
      critPct: null,
      emptyPct: null,
      ...i,
      dimsConfirmed: i.dimsConfirmed == null ? null : i.dimsConfirmed ? 1 : 0,
      t: Date.now(),
      id,
    });
}

export const softDeleteTank = (id: number) =>
  void db().prepare("UPDATE tanks SET deleted_at=?, status='decommissioned', updated_at=? WHERE id=?").run(Date.now(), Date.now(), id);

export const restoreTank = (id: number) =>
  void db().prepare("UPDATE tanks SET deleted_at=NULL, status='active', updated_at=? WHERE id=?").run(Date.now(), id);

// ── Bulk Operations ──────────────────────────────────────────

export function bulkUpdateStatus(ids: number[], status: string): number {
  return tx(() => {
    const stmt = db().prepare("UPDATE tanks SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL");
    const t = Date.now();
    let count = 0;
    for (const id of ids) {
      count += stmt.run(status, t, id).changes;
    }
    return count;
  });
}

export function bulkDelete(ids: number[]): number {
  return tx(() => {
    const stmt = db().prepare("UPDATE tanks SET deleted_at = ?, status = 'decommissioned', updated_at = ? WHERE id = ? AND deleted_at IS NULL");
    const t = Date.now();
    let count = 0;
    for (const id of ids) {
      count += stmt.run(t, t, id).changes;
    }
    return count;
  });
}

export function bulkUpdateThresholds(
  ids: number[],
  th: { warnPct: number; critPct: number; emptyPct: number }
): number {
  if (th.warnPct <= th.critPct || th.critPct <= th.emptyPct) {
    throw new Error("Thresholds must satisfy warn > crit > empty");
  }
  return tx(() => {
    const stmt = db().prepare(
      "UPDATE tanks SET warn_pct = ?, crit_pct = ?, empty_pct = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL"
    );
    const t = Date.now();
    let count = 0;
    for (const id of ids) {
      count += stmt.run(th.warnPct, th.critPct, th.emptyPct, t, id).changes;
    }
    return count;
  });
}

// ── Clone Tank ──────────────────────────────────────────────

export function cloneTank(sourceId: number, newLabel: string, newDeviceId: string | null): number {
  const source = getTank(sourceId);
  if (!source || source.deletedAt != null) throw new Error("Source tank not found");

  const input: TankInput = {
    label: newLabel,
    deviceId: newDeviceId,
    zone: source.zone,
    location: source.location,
    status: "draft",
    shape: source.geometry.shape.kind,
    heightCm: source.geometry.heightCm,
    deadZoneCm: source.geometry.deadZoneCm,
    radiusCm: source.geometry.shape.kind === "cylinder" ? source.geometry.shape.radiusCm : undefined,
    widthCm: source.geometry.shape.kind === "rectangle" ? source.geometry.shape.widthCm : undefined,
    lengthCm: source.geometry.shape.kind === "rectangle" ? source.geometry.shape.lengthCm : undefined,
    dimsConfirmed: source.dimsConfirmed,
    warnPct: source.thresholds.warnPct,
    critPct: source.thresholds.critPct,
    emptyPct: source.thresholds.emptyPct,
    quietStart: source.thresholds.quietStart,
    quietEnd: source.thresholds.quietEnd,
  };

  return tx(() => {
    const newId = createTank(input);
    db().prepare(`
      UPDATE tanks SET overflow_margin_cm = ?, persistence = ?, cooldown_min = ?,
        hysteresis_pct = ?, no_data_min = ?, spike_cm = ?
      WHERE id = ?
    `).run(
      source.thresholds.overflowMarginCm ?? 10,
      source.thresholds.persistence ?? 3,
      source.thresholds.cooldownMin ?? 30,
      source.thresholds.hysteresisPct ?? 5,
      source.thresholds.noDataMin ?? 15,
      source.thresholds.spikeCm ?? 80,
      newId
    );
    for (const recipient of listForTank(sourceId)) setForTank(newId, recipient.userId, recipient.channels);
    return newId;
  });
}

// ── Export / Import ──────────────────────────────────────────

export function exportTanks(): Record<string, unknown>[] {
  const rows = db().prepare("SELECT * FROM tanks WHERE deleted_at IS NULL ORDER BY id ASC").all() as Raw[];
  return rows.map((r) => ({
    label: r.label,
    deviceId: r.device_id,
    zone: r.zone,
    location: r.location,
    status: r.status,
    shape: r.shape,
    heightCm: r.height_cm,
    radiusCm: r.radius_cm,
    widthCm: r.width_cm,
    lengthCm: r.length_cm,
    deadZoneCm: r.dead_zone_cm,
    dimsConfirmed: !!r.dims_confirmed,
    warnPct: r.warn_pct,
    critPct: r.crit_pct,
    emptyPct: r.empty_pct,
    overflowMarginCm: r.overflow_margin_cm,
    persistence: r.persistence,
    cooldownMin: r.cooldown_min,
    hysteresisPct: r.hysteresis_pct,
    noDataMin: r.no_data_min,
    spikeCm: r.spike_cm,
    quietStart: r.quiet_start,
    quietEnd: r.quiet_end,
  }));
}

export function importTanks(records: Record<string, unknown>[]): { imported: number; updated: number } {
  return tx(() => {
    let imported = 0;
    let updated = 0;

    for (const rec of records) {
      const input = TankInput.parse({
        label: rec.label,
        deviceId: rec.deviceId ?? null,
        zone: rec.zone ?? null,
        location: rec.location ?? null,
        status: rec.status ?? "draft",
        shape: rec.shape ?? "cylinder",
        heightCm: rec.heightCm,
        radiusCm: rec.radiusCm,
        widthCm: rec.widthCm,
        lengthCm: rec.lengthCm,
        deadZoneCm: rec.deadZoneCm ?? 25,
        dimsConfirmed: !!rec.dimsConfirmed,
        warnPct: rec.warnPct,
        critPct: rec.critPct,
        emptyPct: rec.emptyPct,
        quietStart: rec.quietStart,
        quietEnd: rec.quietEnd,
      });

      const existing = getTankByLabel(input.label);
      if (existing) {
        updateTank(existing.id, input);
        updated++;
      } else {
        createTank(input);
        imported++;
      }
    }

    return { imported, updated };
  });
}
