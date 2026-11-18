import { DAY, HOUR } from "@/domain/time";
import { rollup } from "@/analytics/rollup";
import { db, tx } from "../db";
import { now } from "../clock";
import * as readings from "../repos/readings";

const RESOLUTIONS = [HOUR, DAY] as const;

export function refreshRollups(asOf = now()): { devices: number; buckets: number } {
  const from = asOf - 90 * DAY;
  const deviceRows = db().prepare("SELECT DISTINCT device_id FROM readings WHERE t BETWEEN ? AND ? ORDER BY device_id").all(from, asOf) as Array<{ device_id: string }>;
  const upsert = db().prepare(`
    INSERT INTO reading_rollups (device_id, resolution_ms, bucket_t, distance_avg, distance_min, distance_max, sample_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id, resolution_ms, bucket_t) DO UPDATE SET
      distance_avg=excluded.distance_avg,
      distance_min=excluded.distance_min,
      distance_max=excluded.distance_max,
      sample_count=excluded.sample_count,
      updated_at=excluded.updated_at
  `);
  let bucketCount = 0;
  tx(() => {
    for (const { device_id: deviceId } of deviceRows) {
      const source = readings.range(deviceId, from, asOf);
      for (const resolution of RESOLUTIONS) {
        for (const bucket of rollup(source, resolution)) {
          upsert.run(deviceId, resolution, bucket.t, bucket.distanceCm, bucket.min, bucket.max, bucket.n, asOf);
          bucketCount++;
        }
      }
    }
  });
  return { devices: deviceRows.length, buckets: bucketCount };
}
