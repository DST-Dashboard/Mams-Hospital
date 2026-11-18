import { heatmap, type HeatmapTimezone } from "@/analytics/heatmap";
import type { Reading, TankGeometry } from "@/domain";

export function tankHeatmap(
  tankId: number,
  geometry: TankGeometry,
  readings: Reading[],
  from: number,
  to: number,
  tz: HeatmapTimezone,
) {
  return { tankId, tz, from, to, cells: heatmap(readings, geometry, from, to, tz) };
}
