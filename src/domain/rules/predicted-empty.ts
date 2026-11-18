import { minutesToEmpty } from "@/analytics/forecast";
import { derive } from "../derive";
import type { Reading, TankGeometry } from "../types";

const LOOKBACK = 12;

export function predictedEmpty(readings: Reading[], geometry: TankGeometry, now: number) {
  const series = readings
    .filter((reading) => reading.t <= now)
    .slice(-LOOKBACK)
    .flatMap((reading) => {
      const levelCm = derive(reading.distanceCm, geometry).levelCm;
      return levelCm == null ? [] : [{ t: reading.t, v: levelCm }];
    });
  const forecastMin = minutesToEmpty(series);
  const latest = series.at(-1);
  const hasRecentData = latest != null && now - latest.t <= 15 * 60_000;
  const raise = hasRecentData && forecastMin != null && forecastMin < 60;
  return { raise, clear: hasRecentData && (forecastMin == null || forecastMin >= 60), minutes: forecastMin };
}
