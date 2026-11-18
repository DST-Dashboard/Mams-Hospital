import type { NotificationPrefsDTO } from "@/contracts/settings";
import { ChannelSchema } from "@/contracts/common";
import type { AlertRow } from "../repos/alerts";
import crypto from "node:crypto";
import type { z } from "zod";
import { getAlert } from "../repos/alerts";
import { db } from "../db";
import { env } from "../env";
import { getNotificationPrefs } from "../repos/notification-prefs";
import { listForTank } from "../repos/recipients";
import { completeDelivery, queueDelivery } from "../repos/notifications";
import { listPushSubscriptions, removePushSubscriptionById, touchPushSubscription } from "../repos/push-subscriptions";
import { logger } from "../logger";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import { sendWhatsApp } from "./whatsapp";
import { sendWebhook } from "./webhook";
import { sendPush } from "./push";

type Channel = z.infer<typeof ChannelSchema>;
const MAX_DELIVERY_ATTEMPTS = 5;
interface RecipientUser { id: number; email: string; name: string }

function inQuietHours(prefs: NotificationPrefsDTO, at: number): boolean {
  if (!prefs.quietHours.enabled) return false;
  const [startHour, startMinute] = prefs.quietHours.start.split(":").map(Number);
  const [endHour, endMinute] = prefs.quietHours.end.split(":").map(Number);
  const local = new Date(at + 330 * 60_000);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function rateLimitAllowed(channel: string, recipient: string, at: number): boolean {
  const maximum: Record<string, number> = { email: 30, sms: 6, whatsapp: 6, webhook: 30, push: 30 };
  const limit = maximum[channel] ?? 30;
  const key = `notify:${channel}:${crypto.createHash("sha256").update(recipient).digest("hex")}`;
  const database = db();
  return database.transaction(() => {
    const row = database.prepare("SELECT attempts, first_attempt_at FROM rate_limits WHERE key = ?").get(key) as
      | { attempts: number; first_attempt_at: number }
      | undefined;
    if (!row || at - row.first_attempt_at >= 60 * 60_000) {
      database.prepare(`
        INSERT INTO rate_limits (key, attempts, first_attempt_at, locked_until)
        VALUES (?, 1, ?, NULL)
        ON CONFLICT(key) DO UPDATE SET attempts=1, first_attempt_at=excluded.first_attempt_at, locked_until=NULL
      `).run(key, at);
      return true;
    }
    if (row.attempts >= limit) return false;
    database.prepare("UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?").run(key);
    return true;
  })();
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return "Delivery failed";
  return error.message.replace(/https?:\/\/\S+/g, "[URL]").slice(0, 500);
}

async function deliver(alert: AlertRow, user: RecipientUser, channel: Channel, recipient: string) {
  const deliveryId = queueDelivery(alert.id, channel, recipient);
  if (deliveryId == null) return;
  if (channel === "in_app") {
    completeDelivery(deliveryId, true, alert.openedAt);
    return;
  }
  if (!rateLimitAllowed(channel, recipient, Date.now())) {
    completeDelivery(deliveryId, false, Date.now(), "Notification channel rate limit exceeded");
    return;
  }
  const text = `${alert.tankLabel ?? `Tank ${alert.tankId}`}: ${alert.message}`;
  try {
    if (channel === "email") await sendEmail({ to: recipient, subject: `${alert.severity.toUpperCase()}: ${alert.tankLabel ?? "Water alert"}`, text });
    else if (channel === "sms") await sendSms(recipient, text);
    else if (channel === "whatsapp") await sendWhatsApp(recipient, text);
    else if (channel === "webhook") {
      await sendWebhook({ id: alert.id, tankId: alert.tankId, tankLabel: alert.tankLabel, type: alert.type, severity: alert.severity, message: alert.message, openedAt: alert.openedAt, simulated: alert.simulated });
    } else if (channel === "push") {
      const subscription = listPushSubscriptions(user.id).find((candidate) => `push:${candidate.id}` === recipient);
      if (!subscription) throw new Error("No push subscription is registered for this user");
      try {
        await sendPush(subscription, { title: `${alert.severity.toUpperCase()}: ${alert.tankLabel ?? "Water alert"}`, body: alert.message, url: `/alerts/${alert.id}` });
        touchPushSubscription(subscription.id);
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
          ? error.statusCode
          : null;
        if (statusCode === 404 || statusCode === 410) removePushSubscriptionById(subscription.id);
        throw error;
      }
    }
    completeDelivery(deliveryId, true, Date.now());
  } catch (error) {
    const message = errorText(error);
    completeDelivery(deliveryId, false, alert.openedAt, message);
    logger.warn("Notification delivery failed", { alertId: alert.id, channel, deliveryId, reason: message });
  }
}

export async function dispatchAlert(alertId: number): Promise<{ attempted: number }> {
  const alert = getAlert(alertId);
  if (!alert) throw new Error(`Alert ${alertId} was not found for notification dispatch`);
  const at = Date.now();
  db().prepare(`
    INSERT INTO notification_dispatches (alert_id, attempted_at, completed_at, error)
    VALUES (?, ?, NULL, NULL)
    ON CONFLICT(alert_id) DO UPDATE SET attempted_at=excluded.attempted_at, completed_at=NULL, error=NULL
  `).run(alertId, at);
  try {
    const users = db().prepare("SELECT id, email, name FROM users WHERE disabled = 0 ORDER BY id").all() as RecipientUser[];
    const explicitRecipients = new Map(listForTank(alert.tankId).map((recipient) => [recipient.userId, recipient.channels]));
    const settings = env();
    let attempted = 0;
    for (const user of users) {
      let prefs: NotificationPrefsDTO;
      try {
        prefs = getNotificationPrefs(user.id);
      } catch (error) {
        logger.error("Unable to load notification preferences", error, { alertId, userId: user.id });
        continue;
      }
      const explicit = explicitRecipients.get(user.id);
      if (prefs.tankIds.length && !prefs.tankIds.includes(alert.tankId) && !explicit) continue;
      if (inQuietHours(prefs, alert.openedAt) && alert.severity !== "critical" && alert.severity !== "emergency") continue;
      const channels = explicit ?? prefs.channelsBySeverity[alert.severity];
      for (const channel of new Set(channels)) {
        if (channel === "push") {
          for (const subscription of listPushSubscriptions(user.id)) {
            attempted++;
            await deliver(alert, user, channel, `push:${subscription.id}`);
          }
          continue;
        }
        let recipient: string | null = null;
        if (channel === "in_app") recipient = `user:${user.id}`;
        else if (channel === "email") recipient = prefs.email ?? user.email;
        else if (channel === "sms") recipient = prefs.phone;
        else if (channel === "whatsapp") recipient = prefs.whatsapp;
        else if (channel === "webhook" && settings.NOTIFY_WEBHOOK_URL) recipient = "configured-webhook";
        if (!recipient) {
          logger.warn("Notification skipped because no recipient is configured", { alertId, userId: user.id, channel });
          continue;
        }
        attempted++;
        await deliver(alert, user, channel, recipient);
      }
    }
    db().prepare("UPDATE notification_dispatches SET completed_at = ?, error = NULL WHERE alert_id = ?").run(Date.now(), alertId);
    return { attempted };
  } catch (error) {
    const message = errorText(error);
    db().prepare("UPDATE notification_dispatches SET completed_at = ?, error = ? WHERE alert_id = ?").run(Date.now(), message, alertId);
    throw error;
  }
}

export async function dispatchPendingNotifications(asOf = Date.now(), retryAfterMs = 5 * 60_000): Promise<number> {
  const rows = db().prepare(`
    SELECT a.id
    FROM alerts a
    WHERE a.resolved_at IS NULL AND a.state IN ('active', 'escalated')
      AND (
        NOT EXISTS (SELECT 1 FROM notification_dispatches d WHERE d.alert_id = a.id)
        OR EXISTS (
          SELECT 1 FROM notification_dispatches d
          WHERE d.alert_id = a.id AND d.completed_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM notification_dispatches d
          WHERE d.alert_id = a.id AND d.error IS NOT NULL AND d.attempted_at <= ?
        )
        OR EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.alert_id = a.id AND n.status != 'sent'
            AND n.attempt_count < ?
            AND (n.attempted_at IS NULL OR n.attempted_at <= ?)
        )
      )
    ORDER BY a.opened_at
  `).all(asOf - retryAfterMs, MAX_DELIVERY_ATTEMPTS, asOf - retryAfterMs) as Array<{ id: number }>;
  for (const row of rows) await dispatchAlert(row.id);
  return rows.length;
}
