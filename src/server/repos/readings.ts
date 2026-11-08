import { db, tx } from "../db";
import type { Reading } from "@/domain";

type R = { t: number; distance_cm: number | null; f_cnt: number | null; rssi: number | null; snr: number | null; battery_pct: number | null };
const map = (r: R): Reading => ({ t: r.t, distanceCm: r.distance_cm, fCnt: r.f_cnt, rssi: r.rssi, snr: r.snr, batteryPct: r.battery_pct });

/** Inclusive range, ascending. */
export const range = (deviceId: string, from: number, to: number): Reading[] =>
  (db().prepare("SELECT t,distance_cm,f_cnt,rssi,snr,battery_pct FROM readings WHERE device_id=? AND t BETWEEN ? AND ? ORDER BY t").all(deviceId, from, to) as R[]).map(map);

/** Last `n` readings at or before `asOf`, returned ascending. */
export const recent = (deviceId: string, n: number, asOf: number): Reading[] =>
  (db().prepare("SELECT t,distance_cm,f_cnt,rssi,snr,battery_pct FROM readings WHERE device_id=? AND t<=? ORDER BY t DESC LIMIT ?").all(deviceId, asOf, n) as R[]).map(map).reverse();

export const latest = (deviceId: string, asOf: number): Reading | undefined => recent(deviceId, 1, asOf)[0];

export interface Insert { deviceId: string; t: number; distanceCm: number | null; fCnt?: number | null; rssi?: number | null; snr?: number | null; batteryPct?: number | null }
/** Idempotent (same device+time ignored) — the live webhook and backfills can overlap safely. Returns rows actually inserted. */
export function upsertMany(rows: Insert[]): number {
  const stmt = db().prepare("INSERT OR IGNORE INTO readings (device_id,t,distance_cm,f_cnt,rssi,snr,battery_pct) VALUES (?,?,?,?,?,?,?)");
  return tx(() => rows.reduce((n, r) => n + stmt.run(r.deviceId, r.t, r.distanceCm, r.fCnt ?? null, r.rssi ?? null, r.snr ?? null, r.batteryPct ?? null).changes, 0));
}
