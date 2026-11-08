import { z } from "zod";
import { ChannelSchema, SeveritySchema } from "./common";

/** GET/PUT /api/settings/notifications — the signed-in user's own preferences (A-28). */
export const NotificationPrefsDTO = z.object({
  channelsBySeverity: z.record(SeveritySchema, z.array(ChannelSchema)), // e.g. { critical: ["in_app","email","sms"] }
  quietHours: z.object({ enabled: z.boolean(), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) }), // IST; critical/emergency always break through
  email: z.string().email().nullable(), phone: z.string().nullable(), whatsapp: z.string().nullable(),
  tankIds: z.array(z.number().int()), // tanks this user wants alerts for; empty = all
});
export type NotificationPrefsDTO = z.infer<typeof NotificationPrefsDTO>;
