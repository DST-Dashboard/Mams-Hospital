import type { LevelPoint } from "./events";

export interface Anomaly { t: number; value: number; zScore: number }

/** Rolling z-score against the preceding valid values; the current sample never trains its own baseline. */
export function detectAnomalies(points: LevelPoint[], windowSize = 12, threshold = 3): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (let index = windowSize; index < points.length; index++) {
    const history = points.slice(index - windowSize, index).map((point) => point.v);
    const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
    const variance = history.reduce((sum, value) => sum + (value - mean) ** 2, 0) / history.length;
    const deviation = Math.sqrt(variance);
    const current = points[index]!;
    const zScore = deviation === 0
      ? current.v === mean ? 0 : Math.sign(current.v - mean) * threshold
      : (current.v - mean) / deviation;
    if (Math.abs(zScore) >= threshold) anomalies.push({ t: current.t, value: current.v, zScore });
  }
  return anomalies;
}
