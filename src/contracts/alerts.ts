import { z } from "zod";
import { AlertStateSchema, AlertTypeSchema, ChannelSchema, SeveritySchema } from "./common";

/** GET /api/alerts, GET /api/dashboard → alerts[] */
export const AlertDTO = z.object({
  id: z.number().int(), tankId: z.number().int(), tankLabel: z.string(),
  type: AlertTypeSchema, severity: SeveritySchema, state: AlertStateSchema,
  message: z.string(), value: z.number().nullable(),
  openedAt: z.number(), acknowledgedAt: z.number().nullable(), ackNote: z.string().nullable(), resolvedAt: z.number().nullable(),
  snoozedUntil: z.number().nullable(), simulated: z.boolean(),
});
export type AlertDTO = z.infer<typeof AlertDTO>;

/** GET /api/alerts/:id — everything the detail page needs in ONE call (§5.8 forensic record). */
export const AlertDetailDTO = AlertDTO.extend({
  trigger: z.object({ t: z.number().nullable(), distanceCm: z.number().nullable(), levelPct: z.number().nullable() }),
  sensorHealth: z.object({ lastReadingAgeMin: z.number().nullable(), rssi: z.number().nullable(), snr: z.number().nullable(), batteryPct: z.number().nullable(), quality: z.string() }),
  acknowledgedBy: z.object({ id: z.number(), name: z.string() }).nullable(),
  deliveries: z.array(z.object({ channel: ChannelSchema, recipient: z.string(), status: z.enum(["queued", "sent", "failed"]), sentAt: z.number().nullable(), error: z.string().nullable() })),
  timeline: z.array(z.object({ t: z.number(), event: z.enum(["opened", "notified", "escalated", "acknowledged", "snoozed", "resolved"]), by: z.string().nullable() })),
});
export type AlertDetailDTO = z.infer<typeof AlertDetailDTO>;

export const AlertListQuery = z.object({
  state: z.enum(["open", "all"]).default("all"),
  tankId: z.coerce.number().int().optional(), severity: SeveritySchema.optional(), type: AlertTypeSchema.optional(),
  from: z.coerce.number().optional(), to: z.coerce.number().optional(),
});
/** POST /api/alerts/:id/ack */
export const AckBody = z.object({ note: z.string().max(500).optional() });
/** POST /api/alerts/:id/resolve */
export const ResolveBody = z.object({ note: z.string().max(500).optional() });
/** POST /api/alerts/:id/snooze */
export const SnoozeBody = z.object({ minutes: z.number().int().min(5).max(24 * 60) });
