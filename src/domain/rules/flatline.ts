import { derive } from "../derive";
import type { Reading, TankGeometry } from "../types";

const WINDOW_MS = 6 * 60 * 60_000;
const MAX_RANGE_CM = 1.5;
const FULL_LEVEL_PCT = 95;

export function flatline(readings: Reading[], geometry: TankGeometry, now: number) {
  const points = readings
    .filter((reading) => reading.t <= now && reading.t >= now - WINDOW_MS)
    .flatMap((reading) => {
      const derived = derive(reading.distanceCm, geometry);
      return derived.levelCm == null || derived.levelPct == null
        ? []
        : [{ t: reading.t, levelCm: derived.levelCm, levelPct: derived.levelPct }];
    });
  const spansWindow = points.length > 1 && points.at(-1)!.t - points[0]!.t >= WINDOW_MS;
  const range = points.length ? Math.max(...points.map((point) => point.levelCm)) - Math.min(...points.map((point) => point.levelCm)) : Infinity;
  const latest = points.at(-1);
  const full = latest != null && latest.levelPct >= FULL_LEVEL_PCT;
  const raise = spansWindow && range <= MAX_RANGE_CM && latest != null && !full;
  return { raise, clear: spansWindow && (!raise || full), rangeCm: Number.isFinite(range) ? range : null };
}
