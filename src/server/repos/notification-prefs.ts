import type { NotificationPrefsDTO } from "@/contracts/settings";
import { NotificationPrefsDTO as NotificationPrefsSchema } from "@/contracts/settings";
import { db } from "../db";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsDTO = {
  channelsBySeverity: {
    info: ["in_app"],
    warning: ["in_app"],
    critical: ["in_app"],
    emergency: ["in_app"],
  },
  quietHours: { enabled: false, start: "22:00", end: "06:00" },
  email: null,
  phone: null,
  whatsapp: null,
  tankIds: [],
};

export function getNotificationPrefs(userId: number): NotificationPrefsDTO {
  const row = db().prepare("SELECT prefs_json FROM notification_prefs WHERE user_id = ?").get(userId) as
    | { prefs_json: string }
    | undefined;
  if (!row) return DEFAULT_NOTIFICATION_PREFS;
  let stored: unknown;
  try {
    stored = JSON.parse(row.prefs_json);
  } catch (error) {
    throw new Error("Stored notification preferences are not valid JSON", { cause: error });
  }
  const parsed = NotificationPrefsSchema.safeParse(stored);
  if (!parsed.success) throw new Error("Stored notification preferences do not match the current contract", { cause: parsed.error });
  return parsed.data;
}

export function saveNotificationPrefs(userId: number, input: NotificationPrefsDTO): NotificationPrefsDTO {
  const prefs = NotificationPrefsSchema.parse(input);
  db().prepare(`
    INSERT INTO notification_prefs (user_id, prefs_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET prefs_json=excluded.prefs_json, updated_at=excluded.updated_at
  `).run(userId, JSON.stringify(prefs), Date.now());
  return prefs;
}
