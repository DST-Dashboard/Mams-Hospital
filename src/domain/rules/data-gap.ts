import type { Reading } from "../types";

const DEFAULT_CADENCE_MS = 5 * 60_000;

export function dataGap(readings: Reading[], now: number) {
  const points = readings.filter((reading) => reading.t <= now).slice(-12);
  const latest = points.at(-1);
  const previous = points.at(-2);
  if (!latest || !previous) return { raise: false, clear: false, gapMs: null, missedFrames: 0 };

  const intervals = points.slice(1).map((reading, index) => reading.t - points[index]!.t)
    .filter((interval) => interval > 0 && interval <= 60 * 60_000)
    .sort((a, b) => a - b);
  const cadenceMs = intervals.length
    ? intervals[Math.floor(intervals.length / 2)]!
    : DEFAULT_CADENCE_MS;
  const gapMs = latest.t - previous.t;
  const missedFrames = latest.fCnt != null && previous.fCnt != null && latest.fCnt > previous.fCnt
    ? Math.max(0, latest.fCnt - previous.fCnt - 1)
    : 0;
  const raise = missedFrames > 0 || gapMs > cadenceMs * 2;
  return { raise, clear: !raise, gapMs, missedFrames };
}
