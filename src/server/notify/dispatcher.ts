import type { NotificationPrefsDTO } from "@/contracts/settings";
import { getAlert } from "../repos/alerts";
import { getNotificationPrefs } from "../repos/notification-prefs";
import { listForTank } from "../repos/recipients";
import { queueDelivery, completeDelivery } from "../repos/notifications";
import { byId } from "../repos/users";
import { q, q1 } from "../db";
import { logger } from "../logger";
import { sendEmail } from "./email";

export function inQuietHours(prefs: NotificationPrefsDTO, at: number): boolean {
  if (!prefs.quietHours?.enabled) return false;
  const [startHour, startMinute] = (prefs.quietHours.start || "22:00").split(":").map(Number);
  const [endHour, endMinute] = (prefs.quietHours.end || "06:00").split(":").map(Number);
  // IST is UTC + 5:30 (330 minutes)
  const local = new Date(at + 330 * 60_000);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** 1-per-hour-per-tank-per-channel cap */
export async function isRateLimitAllowed(tankId: number, channel: string, at: number): Promise<boolean> {
  const key = `notify_cap:${tankId}:${channel}`;
  const row = await q1<{ attempts: number; first_attempt_at: number }>(
    "SELECT attempts, first_attempt_at FROM rate_limits WHERE key = $1",
    [key]
  );

  if (!row || at - Number(row.first_attempt_at) >= 60 * 60_000) {
    await q(
      `INSERT INTO rate_limits (key, attempts, first_attempt_at, locked_until)
       VALUES ($1, 1, $2, NULL)
       ON CONFLICT (key) DO UPDATE SET attempts = 1, first_attempt_at = EXCLUDED.first_attempt_at`,
      [key, at]
    );
    return true;
  }

  // 1 per hour cap per tank per channel
  if (row.attempts >= 1) return false;

  await q("UPDATE rate_limits SET attempts = attempts + 1 WHERE key = $1", [key]);
  return true;
}

export async function dispatchAlertNotifications(alertId: number, tier = 1): Promise<{ attempted: number; sent: number }> {
  const alert = await getAlert(alertId);
  if (!alert || alert.resolvedAt != null) return { attempted: 0, sent: 0 };

  const recipients = await listForTank(alert.tankId);
  const tierRecipients = recipients.filter((r) => (r.tier ?? 1) === tier);
  const nowMs = Date.now();

  let attempted = 0;
  let sent = 0;

  for (const r of tierRecipients) {
    const user = await byId(r.userId);
    if (!user || user.disabled) continue;

    const prefs = await getNotificationPrefs(user.id);

    // Always deliver in-app notification
    if (r.channels.includes("in_app")) {
      const deliveryId = await queueDelivery(alert.id, "in_app", user.email);
      if (deliveryId) {
        attempted++;
        await completeDelivery(deliveryId, true, nowMs);
        sent++;
      }
    }

    // Email channel
    if (r.channels.includes("email")) {
      // Quiet hours check: Info / Warning deferred; Critical / Emergency always sent
      const isUrgent = alert.severity === "critical" || alert.severity === "emergency";
      if (!isUrgent && inQuietHours(prefs, nowMs)) {
        logger.info("Email deferred due to quiet hours", { userId: user.id, alertId: alert.id });
        continue;
      }

      // Check 1-per-hour cap
      const allowed = await isRateLimitAllowed(alert.tankId, "email", nowMs);
      if (!allowed) {
        logger.info("Email throttled by 1-per-hour cap", { tankId: alert.tankId });
        continue;
      }

      const deliveryId = await queueDelivery(alert.id, "email", user.email);
      if (deliveryId) {
        attempted++;
        try {
          const success = await sendEmail({
            to: user.email,
            subject: `[OHTMS ${alert.severity.toUpperCase()}] ${alert.message}`,
            text: `Alert ID: ${alert.id}\nTank: ${alert.tankLabel}\nSeverity: ${alert.severity}\nType: ${alert.type}\nMessage: ${alert.message}\nOpened At: ${new Date(alert.openedAt).toISOString()}`,
          });
          await completeDelivery(deliveryId, success, nowMs);
          if (success) sent++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await completeDelivery(deliveryId, false, nowMs, msg);
        }
      }
    }
  }

  return { attempted, sent };
}
