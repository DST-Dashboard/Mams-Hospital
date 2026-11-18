import { IST_OFFSET_MS, type Tz } from "./format";
import type { CalendarDayItem } from "./windows";

export interface HeatmapCell {
  dayIndex: number;
  dayKey: string;
  dayLabel: string;
  hour: number; // 0..23
  pct: number | null; // null if no data, never 0
  count: number;
}

export interface HeatmapGrid {
  days: {
    key: string;
    label: string;
    partial: boolean;
  }[];
  hours: number[];
  cells: HeatmapCell[];
  minPct: number | null;
  maxPct: number | null;
}

export interface PointLike {
  t: number;
  levelPct?: number | null;
  pct?: number | null;
}

/**
 * Aggregates points into a Day × 24-Hour grid for the week window.
 * Empty cells contain null (rendered as blank, never 0).
 */
export function aggregateHeatmap(
  points: PointLike[],
  tz: Tz = "IST",
  calendarDays: CalendarDayItem[]
): HeatmapGrid {
  const offset = tz === "IST" ? IST_OFFSET_MS : 0;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Map each calendar day to its row index
  const dayMap = new Map<string, { index: number; item: CalendarDayItem }>();
  calendarDays.forEach((day, index) => {
    dayMap.set(day.key, { index, item: day });
  });

  // Buckets: dayIndex -> hour (0..23) -> values[]
  const buckets: Map<number, Map<number, number[]>> = new Map();
  for (let d = 0; d < calendarDays.length; d++) {
    const hourMap = new Map<number, number[]>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, []);
    }
    buckets.set(d, hourMap);
  }

  // Populate buckets
  for (const pt of points) {
    const val = pt.levelPct !== undefined ? pt.levelPct : pt.pct;
    if (val === null || val === undefined || Number.isNaN(val)) continue;

    const localT = pt.t + offset;
    const date = new Date(localT);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    const hour = date.getUTCHours();

    const dayEntry = dayMap.get(key);
    if (dayEntry) {
      buckets.get(dayEntry.index)?.get(hour)?.push(val);
    }
  }

  const cells: HeatmapCell[] = [];
  let minPct: number | null = null;
  let maxPct: number | null = null;

  for (let d = 0; d < calendarDays.length; d++) {
    const day = calendarDays[d]!;
    const label = day.partial ? `${day.label} (partial)` : day.label;

    for (let h = 0; h < 24; h++) {
      const vals = buckets.get(d)?.get(h) ?? [];
      let mean: number | null = null;

      if (vals.length > 0) {
        const sum = vals.reduce((acc, v) => acc + v, 0);
        mean = Math.round((sum / vals.length) * 10) / 10;

        if (minPct === null || mean < minPct) minPct = mean;
        if (maxPct === null || mean > maxPct) maxPct = mean;
      }

      cells.push({
        dayIndex: d,
        dayKey: day.key,
        dayLabel: label,
        hour: h,
        pct: mean,
        count: vals.length,
      });
    }
  }

  return {
    days: calendarDays.map((d) => ({
      key: d.key,
      label: d.partial ? `${d.label} (partial)` : d.label,
      partial: d.partial,
    })),
    hours,
    cells,
    minPct,
    maxPct,
  };
}

/**
 * Combines multiple tanks' points for an "All Tanks" heatmap average.
 */
export function aggregateMultiTankHeatmap(
  tanksPoints: PointLike[][],
  tz: Tz = "IST",
  calendarDays: CalendarDayItem[]
): HeatmapGrid {
  const flattened = tanksPoints.flat();
  return aggregateHeatmap(flattened, tz, calendarDays);
}

