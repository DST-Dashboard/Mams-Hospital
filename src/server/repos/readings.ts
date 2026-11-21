import { q, tx } from "../db";
import type { Reading } from "@/domain";

interface ReadingRow {
  t: number;
  distance_cm: number | null;
  f_cnt: number | null;
  rssi: number | null;
  snr: number | null;
  battery_pct: number | null;
  source: string | null;
}

const map = (r: ReadingRow): Reading => ({
  t: Number(r.t),
  distanceCm: r.distance_cm,
  fCnt: r.f_cnt,
  rssi: r.rssi,
  snr: r.snr,
  batteryPct: r.battery_pct,
  source: r.source ?? undefined,
});

/** Inclusive range, ascending. Uses (device_id, t) primary index. */
export async function range(deviceId: string, from: number, to: number): Promise<Reading[]> {
  const rows = await q<ReadingRow>(
    "SELECT t, distance_cm, f_cnt, rssi, snr, battery_pct, source FROM readings WHERE device_id = $1 AND t BETWEEN $2 AND $3 ORDER BY t ASC",
    [deviceId, from, to]
  );
  return rows.map(map);
}

/** Last `n` readings at or before `asOf`, returned ascending. */
export async function recent(deviceId: string, n: number, asOf: number): Promise<Reading[]> {
  const rows = await q<ReadingRow>(
    "SELECT t, distance_cm, f_cnt, rssi, snr, battery_pct, source FROM readings WHERE device_id = $1 AND t <= $2 ORDER BY t DESC LIMIT $3",
    [deviceId, asOf, n]
  );
  return rows.map(map).reverse();
}

export async function latest(deviceId: string, asOf: number): Promise<Reading | undefined> {
  const rec = await recent(deviceId, 1, asOf);
  return rec[0];
}

export async function countAll(): Promise<number> {
  const rows = await q<{ count: string | number }>("SELECT count(*)::int as count FROM readings");
  return Number(rows[0]?.count ?? 0);
}

export async function maxT(): Promise<number | null> {
  const rows = await q<{ max_t: number | null }>("SELECT max(t) as max_t FROM readings");
  return rows[0]?.max_t ? Number(rows[0].max_t) : null;
}

export interface InsertReading {
  deviceId: string;
  t: number;
  distanceCm: number | null;
  fCnt?: number | null;
  rssi?: number | null;
  snr?: number | null;
  batteryPct?: number | null;
  gatewayId?: string | null;
  source?: string;
}

/**
 * Idempotent insert (same device+time ignored) — overlapping ingestion paths are safe.
 * Returns number of rows actually inserted.
 */
export async function upsertMany(rows: InsertReading[]): Promise<number> {
  const inserted = await upsertManyWithResults(rows);
  return inserted.filter(Boolean).length;
}

export async function upsertManyWithResults(rows: InsertReading[]): Promise<boolean[]> {
  if (rows.length === 0) return [];

  return await tx(async (client) => {
    const inserted: boolean[] = [];
    for (const r of rows) {
      const res = await client.query(
        `INSERT INTO readings (device_id, t, distance_cm, f_cnt, rssi, snr, battery_pct, gateway_id, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (device_id, t) DO NOTHING`,
        [
          r.deviceId,
          r.t,
          r.distanceCm,
          r.fCnt ?? null,
          r.rssi ?? null,
          r.snr ?? null,
          r.batteryPct ?? null,
          r.gatewayId ?? null,
          r.source ?? "API",
        ]
      );
      inserted.push((res.rowCount ?? 0) > 0);
    }
    return inserted;
  });
}
