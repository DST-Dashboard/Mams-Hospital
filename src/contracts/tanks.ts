import { z } from "zod";
import { TankStatusSchema } from "./common";

/** POST /api/tanks/bulk (admin) */
export const BulkBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), ids: z.array(z.number().int()).min(1), status: TankStatusSchema }),
  z.object({ action: z.literal("delete"), ids: z.array(z.number().int()).min(1) }),
  z.object({ action: z.literal("thresholds"), ids: z.array(z.number().int()).min(1), warnPct: z.number(), critPct: z.number(), emptyPct: z.number() }),
]);
/** POST /api/tanks/clone (admin) — copy dimensions + thresholds + recipients of an existing tank. */
export const CloneBody = z.object({ sourceId: z.number().int(), label: z.string().min(1).max(80), deviceId: z.string().min(1).nullable() });
/** POST /api/tanks/import (admin)  ·  GET /api/tanks/export → file download */
export const TankExportFile = z.object({ schema: z.literal(1), exportedAt: z.string(), tanks: z.array(z.record(z.string(), z.unknown())) });
