import { z } from "zod";

/** GET /api/analytics/heatmap?tankId&from&to — 7 × 24 grid. dow: 0=Mon … 6=Sun, hour 0–23 in the requested tz. avgPct null = no data (never 0). */
export const HeatmapQuery = z.object({ tankId: z.coerce.number().int().positive(), from: z.coerce.number().optional(), to: z.coerce.number().optional(), tz: z.enum(["UTC", "IST"]).default("IST") });
export const HeatmapDTO = z.object({
  tankId: z.number().int(), tz: z.enum(["UTC", "IST"]), from: z.number(), to: z.number(),
  cells: z.array(z.object({ dow: z.number().int().min(0).max(6), hour: z.number().int().min(0).max(23), avgPct: z.number().nullable(), minPct: z.number().nullable(), n: z.number().int() })),
});
export type HeatmapDTO = z.infer<typeof HeatmapDTO>;

/** GET /api/analytics/compare?from&to — all tanks, normalised for one chart + ranking table. */
export const CompareQuery = z.object({ from: z.coerce.number().optional(), to: z.coerce.number().optional(), res: z.enum(["15m", "1h", "1d"]).default("1h") });
export const CompareDTO = z.object({
  from: z.number(), to: z.number(), resolution: z.string(),
  tanks: z.array(z.object({
    tankId: z.number().int(), label: z.string(), simulated: z.boolean(),
    currentPct: z.number().nullable(), meanPct: z.number().nullable(), trend: z.enum(["rising", "falling", "stable"]),
    consumedL: z.number(), pumpedInL: z.number(), anomalies: z.number().int(), healthScore: z.number().min(0).max(100),
    series: z.array(z.object({ t: z.number(), pct: z.number().nullable() })),
  })),
});
export type CompareDTO = z.infer<typeof CompareDTO>;
