import { baseAreaCm2 } from "@/domain/geometry";
import { derive } from "@/domain/derive";
import type { Reading, TankGeometry } from "@/domain/types";
import { describe } from "./stats";
import { detectEvents, volumeFromEvents, type LevelPoint } from "./events";
import { detectAnomalies } from "./anomaly";

export type CompareResolution = "15m" | "1h" | "1d";
export interface CompareTankInput {
  tankId: number;
  label: string;
  simulated: boolean;
  geometry: TankGeometry;
  readings: Reading[];
}
export interface CompareTankResult {
  tankId: number;
  label: string;
  simulated: boolean;
  currentPct: number | null;
  meanPct: number | null;
  trend: "rising" | "falling" | "stable";
  consumedL: number;
  pumpedInL: number;
  anomalies: number;
  healthScore: number;
  series: { t: number; pct: number | null }[];
}

const RESOLUTION_MS: Record<CompareResolution, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function healthScore(readings: Reading[], points: LevelPoint[], anomalies: number, from: number, to: number) {
  if (!readings.length) return 0;
  const expected = Math.max(1, Math.floor((to - from) / (5 * 60_000)) + 1);
  const completeness = Math.min(1, readings.length / expected);
  const newest = readings.at(-1);
  if (!newest) return 0;
  const freshness = Math.max(0, 1 - Math.max(0, to - newest.t) / (60 * 60_000));
  const battery = newest.batteryPct == null ? 0.75 : Math.min(1, newest.batteryPct / 100);
  return Math.max(0, Math.min(100, Math.round(100 * (0.5 * completeness + 0.3 * freshness + 0.2 * battery) - anomalies * 5)));
}

export function compareTanks(
  tanks: CompareTankInput[],
  from: number,
  to: number,
  resolution: CompareResolution,
): CompareTankResult[] {
  const bucketMs = RESOLUTION_MS[resolution];
  const firstBucket = Math.floor(from / bucketMs) * bucketMs;
  const bucketTimes: number[] = [];
  for (let time = firstBucket; time <= to; time += bucketMs) bucketTimes.push(time);

  return tanks.map((tank) => {
    const readings = tank.readings.filter((reading) => reading.t >= from && reading.t <= to);
    const points: LevelPoint[] = [];
    const percentages: number[] = [];
    const buckets = new Map<number, { sum: number; count: number }>();
    for (const reading of readings) {
      const derived = derive(reading.distanceCm, tank.geometry);
      if (derived.levelCm == null || derived.levelPct == null) continue;
      points.push({ t: reading.t, v: derived.levelCm });
      percentages.push(derived.levelPct);
      const key = Math.floor(reading.t / bucketMs) * bucketMs;
      const bucket = buckets.get(key) ?? { sum: 0, count: 0 };
      bucket.sum += derived.levelPct;
      bucket.count++;
      buckets.set(key, bucket);
    }

    const summary = describe(percentages);
    const latestPct = percentages.at(-1) ?? null;
    const first = points[0];
    const last = points.at(-1);
    const percentPerHour = first && last && last.t > first.t
      ? ((last.v - first.v) / tank.geometry.heightCm) * 100 / ((last.t - first.t) / 3_600_000)
      : 0;
    const trend = percentPerHour > 0.1 ? "rising" : percentPerHour < -0.1 ? "falling" : "stable";
    const events = detectEvents(points, Math.max(10, tank.geometry.heightCm * 0.05));
    const volume = volumeFromEvents(events, baseAreaCm2(tank.geometry.shape));
    const anomalies = detectAnomalies(points).length;

    return {
      tankId: tank.tankId,
      label: tank.label,
      simulated: tank.simulated,
      currentPct: latestPct,
      meanPct: summary ? Math.round(summary.mean * 10) / 10 : null,
      trend,
      consumedL: volume.consumedL,
      pumpedInL: volume.pumpedInL,
      anomalies,
      healthScore: healthScore(readings, points, anomalies, from, to),
      series: bucketTimes.map((t) => {
        const bucket = buckets.get(t);
        return { t, pct: bucket ? Math.round((bucket.sum / bucket.count) * 10) / 10 : null };
      }),
    };
  });
}
