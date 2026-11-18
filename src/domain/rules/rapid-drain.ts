import { derive } from "../derive";
import type { Reading, TankGeometry } from "../types";

const WINDOW_MS = 15 * 60_000;
const MIN_DROP_CM = 20;

export function rapidDrain(readings: Reading[], geometry: TankGeometry, now: number) {
  const points = readings
    .filter((reading) => reading.t <= now && reading.t >= now - WINDOW_MS)
    .map((reading) => ({ t: reading.t, levelCm: derive(reading.distanceCm, geometry).levelCm }))
    .filter((point): point is { t: number; levelCm: number } => point.levelCm != null);

  let maxDropCm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      maxDropCm = Math.max(maxDropCm, points[i]!.levelCm - points[j]!.levelCm);
    }
  }
  const latest = points.at(-1);
  const hasRecentData = latest != null && now - latest.t <= WINDOW_MS;
  const raise = hasRecentData && maxDropCm >= MIN_DROP_CM;
  return { raise, clear: hasRecentData && !raise, dropCm: maxDropCm };
}
