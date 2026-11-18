import { derive } from "@/domain/derive";
import type { Reading, TankGeometry } from "@/domain/types";

export type HeatmapTimezone = "UTC" | "IST";
export interface HeatmapCell { dow: number; hour: number; avgPct: number | null; minPct: number | null; n: number }

export function heatmap(
  readings: Reading[],
  geometry: TankGeometry,
  from: number,
  to: number,
  tz: HeatmapTimezone,
): HeatmapCell[] {
  const cells = Array.from({ length: 7 * 24 }, () => ({ sum: 0, min: Infinity, n: 0 }));
  const offsetMs = tz === "IST" ? 330 * 60_000 : 0;
  for (const reading of readings) {
    const pct = derive(reading.distanceCm, geometry).levelPct;
    if (reading.t < from || reading.t > to || pct == null) continue;
    const local = new Date(reading.t + offsetMs);
    const dow = (local.getUTCDay() + 6) % 7;
    const hour = local.getUTCHours();
    const cell = cells[dow * 24 + hour]!;
    cell.sum += pct;
    cell.min = Math.min(cell.min, pct);
    cell.n++;
  }
  return cells.map((cell, index) => ({
    dow: Math.floor(index / 24),
    hour: index % 24,
    avgPct: cell.n ? Math.round((cell.sum / cell.n) * 10) / 10 : null,
    minPct: cell.n ? Math.round(cell.min * 10) / 10 : null,
    n: cell.n,
  }));
}
