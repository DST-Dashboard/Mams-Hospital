import { ChannelSchema } from "@/contracts/common";
import type { z } from "zod";
import { db } from "../db";

type Channel = z.infer<typeof ChannelSchema>;
export interface Delivery {
  id: number;
  channel: Channel;
  recipient: string;
  status: "queued" | "sent" | "failed";
  sentAt: number | null;
  error: string | null;
}

export function queueNotificationDispatch(alertId: number): void {
  db().prepare(`
    INSERT OR IGNORE INTO notification_dispatches (alert_id, attempted_at, completed_at, error)
    VALUES (?, ?, NULL, NULL)
  `).run(alertId, Date.now());
}

export function queueDelivery(alertId: number, channel: Channel, recipient: string): number | null {
  const database = db();
  const at = Date.now();
  return database.transaction(() => {
    const existing = database.prepare(`
      SELECT id, status, attempt_count FROM notifications
      WHERE alert_id = ? AND channel = ? AND recipient = ?
      ORDER BY id DESC LIMIT 1
    `).get(alertId, channel, recipient) as { id: number; status: string; attempt_count: number } | undefined;
    if (existing?.status === "sent") return null;
    if (existing) {
      database.prepare(`
        UPDATE notifications
        SET status='queued', sent_at=NULL, error=NULL, attempted_at=?, attempt_count=attempt_count + 1
        WHERE id=?
      `).run(at, existing.id);
      return existing.id;
    }
    const result = database.prepare(`
      INSERT INTO notifications (alert_id, channel, recipient, status, attempted_at, attempt_count)
      VALUES (?, ?, ?, 'queued', ?, 1)
    `).run(alertId, channel, recipient, at);
    return Number(result.lastInsertRowid);
  })();
}

export function completeDelivery(id: number, sent: boolean, at: number, error?: string): void {
  db().prepare("UPDATE notifications SET status=?, sent_at=?, error=? WHERE id=?")
    .run(sent ? "sent" : "failed", sent ? at : null, error?.slice(0, 500) ?? null, id);
}

export function listDeliveries(alertId: number): Delivery[] {
  const rows = db().prepare(`
    SELECT id, channel, recipient, status, sent_at, error
    FROM notifications WHERE alert_id = ? ORDER BY id
  `).all(alertId) as Array<{
    id: number;
    channel: Channel;
    recipient: string | null;
    status: "queued" | "sent" | "failed";
    sent_at: number | null;
    error: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    channel: ChannelSchema.parse(row.channel),
    recipient: row.recipient ?? "unknown",
    status: row.status,
    sentAt: row.sent_at,
    error: row.error,
  }));
}
