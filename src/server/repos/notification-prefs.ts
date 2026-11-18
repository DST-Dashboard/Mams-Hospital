import type { NotificationPrefsDTO } from "@/contracts/settings";
import { NotificationPrefsDTO as NotificationPrefsSchema } from "@/contracts/settings";
import { q, q1 } from "../db";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsDTO = {
  channelsBySeverity: {
    info: ["in_app"],
    warning: ["in_app"],
    critical: ["in_app", "email"],
    emergency: ["in_app", "email"],
  },
  quietHours: { enabled: false, start: "22:00", end: "06:00" },
  email: null,
  phone: null,
  whatsapp: null,
  tankIds: [],
};

interface PrefsRow {
  user_id: number;
  email_alerts: boolean;
  daily_digest: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  updated_at: number;
}

export async function getNotificationPrefs(userId: number): Promise<NotificationPrefsDTO> {
  const row = await q1<PrefsRow>(
    "SELECT * FROM notification_prefs WHERE user_id = $1",
    [userId]
  );
  if (!row) return DEFAULT_NOTIFICATION_PREFS;

  const emailAlerts = Boolean(row.email_alerts);
  return {
    channelsBySeverity: {
      info: ["in_app"],
      warning: ["in_app"],
      critical: emailAlerts ? ["in_app", "email"] : ["in_app"],
      emergency: emailAlerts ? ["in_app", "email"] : ["in_app"],
    },
    quietHours: {
      enabled: Boolean(row.quiet_hours_enabled),
      start: row.quiet_hours_start ?? "22:00",
      end: row.quiet_hours_end ?? "06:00",
    },
    email: null,
    phone: null,
    whatsapp: null,
    tankIds: [],
  };
}

export async function saveNotificationPrefs(
  userId: number,
  input: NotificationPrefsDTO
): Promise<NotificationPrefsDTO> {
  const prefs = NotificationPrefsSchema.parse(input);
  const emailAlerts =
    prefs.channelsBySeverity.critical.includes("email") ||
    prefs.channelsBySeverity.emergency.includes("email");

  await q(
    `INSERT INTO notification_prefs (
      user_id, email_alerts, daily_digest, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, updated_at
    ) VALUES ($1, $2, FALSE, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET
      email_alerts = EXCLUDED.email_alerts,
      quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
      quiet_hours_start = EXCLUDED.quiet_hours_start,
      quiet_hours_end = EXCLUDED.quiet_hours_end,
      updated_at = EXCLUDED.updated_at`,
    [
      userId,
      emailAlerts,
      Boolean(prefs.quietHours?.enabled),
      prefs.quietHours?.start ?? "22:00",
      prefs.quietHours?.end ?? "06:00",
      Date.now(),
    ]
  );
  return prefs;
}
