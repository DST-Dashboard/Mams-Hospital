import { bucketStart } from "@/domain/time";
import type { Reading } from "@/domain/types";

export interface Bucket { t: number; distanceCm: number; min: number; max: number; n: number }

/** Average DISTANCE per bucket (the truthful raw quantity); derive level/volume afterwards. Nulls are skipped, never zero-filled. */
export function rollup(readings: Reading[], bucketMs: number): Bucket[] {
  const map = new Map<number, { sum: number; min: number; max: number; n: number }>();
  for (const r of readings) {
    if (r.distanceCm == null) continue;
    const k = bucketStart(r.t, bucketMs);
    const b = map.get(k) ?? { sum: 0, min: Infinity, max: -Infinity, n: 0 };
    b.sum += r.distanceCm; b.n++; b.min = Math.min(b.min, r.distanceCm); b.max = Math.max(b.max, r.distanceCm);
    map.set(k, b);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
    .map(([t, b]) => ({ t, distanceCm: b.sum / b.n, min: b.min, max: b.max, n: b.n }));
}
