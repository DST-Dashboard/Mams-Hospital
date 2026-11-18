import { z } from "zod";
import { ChannelSchema, SeveritySchema } from "./common";

const ClockTime = z.string().regex(/^\d{2}:\d{2}$/).refine((value) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours! < 24 && minutes! < 60;
}, "time must be between 00:00 and 23:59");

/** GET/PUT /api/settings/notifications — the signed-in user's own preferences (A-28). */
export const NotificationPrefsDTO = z.object({
  channelsBySeverity: z.record(SeveritySchema, z.array(ChannelSchema)), // e.g. { critical: ["in_app","email","sms"] }
  quietHours: z.object({ enabled: z.boolean(), start: ClockTime, end: ClockTime }), // IST; critical/emergency always break through
  email: z.string().email().nullable(), phone: z.string().nullable(), whatsapp: z.string().nullable(),
  tankIds: z.array(z.number().int()), // tanks this user wants alerts for; empty = all
});
export type NotificationPrefsDTO = z.infer<typeof NotificationPrefsDTO>;
