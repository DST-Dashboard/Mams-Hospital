import { z } from "zod";
import { db } from "../db";
import type { Thresholds, TankGeometry } from "@/domain";

export interface TankRow {
  id: number; deviceId: string | null; label: string; zone: string | null; location: string | null;
  status: "draft" | "active" | "maintenance" | "offline" | "decommissioned";
  geometry: TankGeometry; thresholds: Thresholds; dimsConfirmed: boolean; simulated: boolean; deletedAt: number | null;
}

const SELECT = `SELECT t.*, COALESCE(d.simulated,0) AS simulated FROM tanks t LEFT JOIN devices d ON d.device_id = t.device_id`;
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const map = (r: Raw): TankRow => ({
  id: r.id, deviceId: r.device_id, label: r.label, zone: r.zone, location: r.location, status: r.status,
  geometry: {
    heightCm: r.height_cm, deadZoneCm: r.dead_zone_cm,
    shape: r.shape === "cylinder" ? { kind: "cylinder", radiusCm: r.radius_cm ?? 100 } : { kind: "rectangle", widthCm: r.width_cm ?? 100, lengthCm: r.length_cm ?? 100 },
  },
  thresholds: {
    warnPct: r.warn_pct, critPct: r.crit_pct, emptyPct: r.empty_pct, overflowMarginCm: r.overflow_margin_cm,
    persistence: r.persistence, cooldownMin: r.cooldown_min, hysteresisPct: r.hysteresis_pct, noDataMin: r.no_data_min, spikeCm: r.spike_cm,
  },
  dimsConfirmed: !!r.dims_confirmed, simulated: !!r.simulated, deletedAt: r.deleted_at,
});

export const listTanks = (opts: { includeDeleted?: boolean } = {}): TankRow[] =>
  (db().prepare(`${SELECT} ${opts.includeDeleted ? "" : "WHERE t.deleted_at IS NULL"} ORDER BY t.id`).all() as Raw[]).map(map);
export const getTank = (id: number): TankRow | undefined => {
  const r = db().prepare(`${SELECT} WHERE t.id = ?`).get(id) as Raw | undefined;
  return r && map(r);
};

/** Validation for create/update. Plausible physical ranges so bad dimensions can't poison every derived number. */
export const TankInput = z.object({
  label: z.string().min(1).max(80),
  deviceId: z.string().min(1).nullable().optional(),
  zone: z.string().max(60).nullable().optional(), location: z.string().max(120).nullable().optional(),
  status: z.enum(["draft", "active", "maintenance", "offline", "decommissioned"]).optional(),
  shape: z.enum(["cylinder", "rectangle"]).default("cylinder"),
  heightCm: z.number().min(20).max(2000),
  radiusCm: z.number().min(10).max(1000).optional(), widthCm: z.number().min(10).max(5000).optional(), lengthCm: z.number().min(10).max(5000).optional(),
  deadZoneCm: z.number().min(0).max(100).default(25),
  dimsConfirmed: z.boolean().optional(),
  warnPct: z.number().min(1).max(99).optional(), critPct: z.number().min(1).max(99).optional(), emptyPct: z.number().min(0).max(50).optional(),
}).refine((v) => v.deadZoneCm < v.heightCm, "dead zone must be smaller than tank height")
  .refine((v) => (v.shape === "cylinder" ? v.radiusCm != null : v.widthCm != null && v.lengthCm != null), "dimensions missing for chosen shape")
  .refine((v) => (v.warnPct ?? 40) > (v.critPct ?? 20) && (v.critPct ?? 20) > (v.emptyPct ?? 5), "thresholds must satisfy warning > critical > empty");
export type TankInput = z.infer<typeof TankInput>;

const nullish = { zone: null, location: null, radiusCm: null, widthCm: null, lengthCm: null, deviceId: null };

export function createTank(i: TankInput): number {
  const t = Date.now();
  const r = db().prepare(`INSERT INTO tanks (device_id,label,zone,location,status,shape,height_cm,radius_cm,width_cm,length_cm,dead_zone_cm,dims_confirmed,warn_pct,crit_pct,empty_pct,created_at,updated_at)
    VALUES (@deviceId,@label,@zone,@location,@status,@shape,@heightCm,@radiusCm,@widthCm,@lengthCm,@deadZoneCm,@dimsConfirmed,@warnPct,@critPct,@emptyPct,@t,@t)`)
    .run({ ...nullish, ...i, status: i.status ?? "draft", dimsConfirmed: i.dimsConfirmed ? 1 : 0, warnPct: i.warnPct ?? 40, critPct: i.critPct ?? 20, emptyPct: i.emptyPct ?? 5, t });
  return Number(r.lastInsertRowid);
}

export function updateTank(id: number, i: TankInput): void {
  db().prepare(`UPDATE tanks SET label=@label, device_id=@deviceId, zone=@zone, location=@location, status=COALESCE(@status,status), shape=@shape,
    height_cm=@heightCm, radius_cm=@radiusCm, width_cm=@widthCm, length_cm=@lengthCm, dead_zone_cm=@deadZoneCm,
    dims_confirmed=COALESCE(@dimsConfirmed,dims_confirmed), warn_pct=@warnPct, crit_pct=@critPct, empty_pct=@emptyPct, updated_at=@t WHERE id=@id`)
    .run({ ...nullish, status: null, ...i, dimsConfirmed: i.dimsConfirmed == null ? null : i.dimsConfirmed ? 1 : 0, warnPct: i.warnPct ?? 40, critPct: i.critPct ?? 20, emptyPct: i.emptyPct ?? 5, t: Date.now(), id });
}
export const softDeleteTank = (id: number) => void db().prepare("UPDATE tanks SET deleted_at=?, status='decommissioned', updated_at=? WHERE id=?").run(Date.now(), Date.now(), id);
export const restoreTank = (id: number) => void db().prepare("UPDATE tanks SET deleted_at=NULL, status='active', updated_at=? WHERE id=?").run(Date.now(), id);
