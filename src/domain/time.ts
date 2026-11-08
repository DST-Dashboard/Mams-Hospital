export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
export const IST_OFFSET_MS = 5.5 * HOUR;

/** Floor a timestamp to a bucket boundary (UTC-aligned). */
export const bucketStart = (t: number, bucketMs: number) => Math.floor(t / bucketMs) * bucketMs;

export type Tz = "UTC" | "IST";
/** Shift epoch ms so that UTC getters on the result read as local wall-clock time in `tz`. */
export const toZoned = (t: number, tz: Tz) => new Date(t + (tz === "IST" ? IST_OFFSET_MS : 0));

/** Pick a sensible rollup resolution for a time window so charts stay ≤ ~600 points. */
export function resolutionFor(fromMs: number, toMs: number): "raw" | "15m" | "1h" | "1d" {
  const span = toMs - fromMs;
  if (span <= 2 * DAY) return "raw"; // 5-min cadence → ≤ 576 points
  if (span <= 14 * DAY) return "15m";
  if (span <= 90 * DAY) return "1h";
  return "1d";
}
export const RES_MS = { raw: 0, "15m": 15 * MIN, "1h": HOUR, "1d": DAY } as const;
