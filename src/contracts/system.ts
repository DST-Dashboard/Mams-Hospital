import { z } from "zod";

/** GET /api/system/status (admin) — powers Admin → System and uptime monitors. */
export const SystemStatusDTO = z.object({
  version: z.string(), clockMode: z.enum(["anchored", "live"]), asOf: z.number(), uptimeS: z.number(),
  db: z.object({ sizeMb: z.number(), readings: z.number().int(), firstReadingAt: z.number().nullable(), lastReadingAt: z.number().nullable() }),
  devices: z.array(z.object({ deviceId: z.string(), tankId: z.number().int().nullable(), lastReadingAt: z.number().nullable(), ageMin: z.number().nullable(), status: z.enum(["fresh", "stale", "offline", "none"]), rssi: z.number().nullable(), batteryPct: z.number().nullable() })),
  jobs: z.array(z.object({ name: z.string(), lastRunAt: z.number().nullable(), ok: z.boolean() })),
  ingest: z.object({ enabled: z.boolean(), lastUplinkAt: z.number().nullable() }),
});
export type SystemStatusDTO = z.infer<typeof SystemStatusDTO>;
