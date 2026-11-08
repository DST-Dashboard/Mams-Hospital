import { derive, baseAreaCm2, MIN, type TankGeometry } from "@/domain";
import { describe, detectEvents, minutesToEmpty, volumeFromEvents, type LevelPoint } from "@/analytics";
import * as readings from "../repos/readings";
import type { TankRow } from "../repos/tanks";

export function tankAnalytics(tank: TankRow, from: number, to: number, cadenceMs = 5 * MIN) {
  const rows = tank.deviceId ? readings.range(tank.deviceId, from, to) : [];
  const g: TankGeometry = tank.geometry;
  const series: LevelPoint[] = [];
  for (const r of rows) { const d = derive(r.distanceCm, g); if (d.levelCm != null) series.push({ t: r.t, v: d.levelCm }); }
  const events = detectEvents(series, Math.max(10, g.heightCm * 0.05)); // swing must exceed 5 % of height (≥10 cm) to count
  const pct = series.map((p) => (p.v / g.heightCm) * 100);
  const expected = Math.max(1, Math.floor((to - from) / cadenceMs));
  return {
    window: { from, to }, samples: rows.length, validSamples: series.length,
    completenessPct: Math.min(100, Math.round((rows.length / expected) * 1000) / 10),
    levelPct: describe(pct), events, ...volumeFromEvents(events, baseAreaCm2(g.shape)),
    minutesToEmpty: minutesToEmpty(series.slice(-12)), // last hour
  };
}
