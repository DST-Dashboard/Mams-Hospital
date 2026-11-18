import { z } from "zod";
import { ChannelSchema, TankStatusSchema } from "./common";

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

export const TankRecipientInput = z.object({
  userId: z.number().int().positive(),
  channels: z.array(ChannelSchema).min(1).max(6),
});
export const TankRecipientDTO = TankRecipientInput.extend({
  email: z.string().email(),
  name: z.string(),
});

/** Zones API */
export const ZoneDTO = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(60),
  description: z.string().max(255).nullable(),
  createdAt: z.number(),
  tankCount: z.number().int().optional(),
});
export type ZoneDTO = z.infer<typeof ZoneDTO>;

export const ZoneInput = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(255).nullable().optional(),
});
export type ZoneInput = z.infer<typeof ZoneInput>;

/** Threshold Templates API */
export const ThresholdTemplateDTO = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(60),
  description: z.string().max(255).nullable(),
  warnPct: z.number(),
  critPct: z.number(),
  emptyPct: z.number(),
  overflowMarginCm: z.number(),
  persistence: z.number().int(),
  cooldownMin: z.number().int(),
  hysteresisPct: z.number(),
  noDataMin: z.number().int(),
  spikeCm: z.number(),
  createdAt: z.number(),
});
export type ThresholdTemplateDTO = z.infer<typeof ThresholdTemplateDTO>;

export const ThresholdTemplateInput = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(255).nullable().optional(),
  warnPct: z.number().min(1).max(99).default(40),
  critPct: z.number().min(1).max(99).default(20),
  emptyPct: z.number().min(0).max(50).default(5),
  overflowMarginCm: z.number().min(0).max(100).default(10),
  persistence: z.number().int().min(1).max(60).default(3),
  cooldownMin: z.number().int().min(0).max(1440).default(30),
  hysteresisPct: z.number().min(0).max(50).default(5),
  noDataMin: z.number().int().min(1).max(1440).default(15),
  spikeCm: z.number().min(0).max(500).default(80),
}).refine((v) => v.warnPct > v.critPct && v.critPct > v.emptyPct, "thresholds must satisfy warning > critical > empty");
export type ThresholdTemplateInput = z.infer<typeof ThresholdTemplateInput>;
