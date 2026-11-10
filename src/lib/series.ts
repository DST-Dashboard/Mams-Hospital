import type { Win } from "./windows";

export const UNSTABLE_EVENT_COUNT = 40;

export interface SeriesPoint {
  t: number;
  pct: number | null;
  levelCm?: number | null;
  distanceCm?: number | null;
  volumeL?: number | null;
}

export interface MinMax {
  min: number | null;
  max: number | null;
}

/**
 * Aligns points to a window and inserts null gaps whenever the elapsed time
 * between consecutive readings exceeds 2× the expected cadence.
 * Never zero-fills missing data.
 */
export function buildSeries<T extends { t: number; levelPct?: number | null; pct?: number | null }>(
  points: T[],
  win: Win,
  cadenceMs: number = 300_000 // default 5 minutes
): SeriesPoint[] {
  if (!points || points.length === 0) return [];

  // Filter to window
  const inWindow = points
    .filter((p) => p.t >= win.from && p.t <= win.to)
    .sort((a, b) => a.t - b.t);

  if (inWindow.length === 0) return [];

  const result: SeriesPoint[] = [];
  const maxGap = 2 * cadenceMs;

  for (let i = 0; i < inWindow.length; i++) {
    const cur = inWindow[i]!;
    const curPct = cur.levelPct !== undefined ? cur.levelPct : cur.pct ?? null;

    if (i > 0) {
      const prev = inWindow[i - 1]!;
      const gap = cur.t - prev.t;

      if (gap > maxGap) {
        // Insert a null gap sentinel point to break line continuation in charts
        result.push({
          t: prev.t + cadenceMs,
          pct: null,
          levelCm: null,
          distanceCm: null,
          volumeL: null,
        });
      }
    }

    result.push({
      t: cur.t,
      pct: curPct,
      ...("levelCm" in cur ? { levelCm: (cur as any).levelCm } : {}),
      ...("distanceCm" in cur ? { distanceCm: (cur as any).distanceCm } : {}),
      ...("volumeL" in cur ? { volumeL: (cur as any).volumeL } : {}),
    });
  }

  return result;
}

/**
 * Computes min and max percentage across series points.
 */
export function minMax(points: { pct?: number | null; levelPct?: number | null }[]): MinMax {
  let min: number | null = null;
  let max: number | null = null;

  for (const p of points) {
    const v = p.levelPct !== undefined ? p.levelPct : p.pct;
    if (v !== null && v !== undefined && !Number.isNaN(v)) {
      if (min === null || v < min) min = v;
      if (max === null || v > max) max = v;
    }
  }

  return { min, max };
}

/**
 * Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm.
 * Reduces large point arrays to a target threshold while preserving visual peaks and troughs.
 */
export function downsample(data: SeriesPoint[], threshold: number = 2000): SeriesPoint[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold === 0) return data;

  const sampled: SeriesPoint[] = [];
  let sampledIndex = 0;

  // Bucket size. Leave room for start and end data points
  const every = (dataLength - 2) / (threshold - 2);

  let a = 0;
  sampled[sampledIndex++] = data[a]!;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * every) + 1;
    let avgRangeEnd = Math.floor((i + 2) * every) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (let idx = avgRangeStart; idx < avgRangeEnd; idx++) {
      avgX += data[idx]!.t;
      avgY += data[idx]!.pct ?? 0;
    }
    avgX /= avgRangeLength || 1;
    avgY /= avgRangeLength || 1;

    // Get the range for bucket (containing b)
    let rangeOffs = Math.floor(i * every) + 1;
    const rangeTo = Math.floor((i + 1) * every) + 1;

    // Point a
    const pointAX = data[a]!.t;
    const pointAY = data[a]!.pct ?? 0;

    let maxArea = -1;
    let maxAreaPoint = data[rangeOffs]!;
    let nextA = rangeOffs;

    for (let idx = rangeOffs; idx < rangeTo; idx++) {
      const pt = data[idx]!;
      // Calculate triangle area over three points: a, current point, and average next bucket point
      const area =
        Math.abs(
          (pointAX - avgX) * ((pt.pct ?? 0) - pointAY) -
            (pointAX - pt.t) * (avgY - pointAY)
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = pt;
        nextA = idx;
      }
    }

    sampled[sampledIndex++] = maxAreaPoint;
    a = nextA;
  }

  // Always include the last point
  sampled[sampledIndex++] = data[dataLength - 1]!;
  return sampled;
}

export interface InferredPump {
  state: "filling" | "idle";
  label: string;
  lastFillEndT: number | null;
}

/**
 * Infers pump state from fill events.
 * Filling if latest fill event ended within 15 min of asOf, else Idle.
 */
export function inferPump(
  events: { kind: "fill" | "drain"; startT: number; endT: number }[] | undefined,
  asOf: number
): InferredPump {
  if (!events || events.length === 0) {
    return { state: "idle", label: "Idle (inferred from fill events)", lastFillEndT: null };
  }

  const fillEvents = events.filter((e) => e.kind === "fill");
  if (fillEvents.length === 0) {
    return { state: "idle", label: "Idle (inferred from fill events)", lastFillEndT: null };
  }

  // Sort by end time descending
  fillEvents.sort((a, b) => b.endT - a.endT);
  const latest = fillEvents[0]!;

  const fifteenMinMs = 15 * 60 * 1000;
  const isRecent = asOf - latest.endT <= fifteenMinMs && latest.endT <= asOf + fifteenMinMs;

  if (isRecent) {
    return {
      state: "filling",
      label: "Filling (inferred from fill events)",
      lastFillEndT: latest.endT,
    };
  }

  return {
    state: "idle",
    label: "Idle (inferred from fill events)",
    lastFillEndT: latest.endT,
  };
}

/**
 * Checks whether the signal is flapping (unstable event count > 40).
 */
export function isUnstable(
  events: { kind: string }[] | undefined
): boolean {
  return (events?.length ?? 0) > UNSTABLE_EVENT_COUNT;
}

/**
 * Extracts min and max percentage across the points of a week dataset.
 */
export function weekRange(
  points: { pct?: number | null; levelPct?: number | null }[]
): { minPct: number | null; maxPct: number | null } {
  const { min, max } = minMax(points);
  return {
    minPct: min !== null ? Math.round(min) : null,
    maxPct: max !== null ? Math.round(max) : null,
  };
}
