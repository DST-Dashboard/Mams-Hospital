import { ChannelSchema } from "@/contracts/common";
import type { z } from "zod";
import { q, q1, tx } from "../db";

type Channel = z.infer<typeof ChannelSchema>;

export interface Delivery {
  id: number;
  channel: Channel;
  recipient: string;
  status: "queued" | "sent" | "failed";
  sentAt: number | null;
  error: string | null;
  attemptCount: number;
}

export async function queueDelivery(
  alertId: number,
  channel: Channel,
  recipient: string
): Promise<number | null> {
  const at = Date.now();
  return await tx(async (client) => {
    const existing = await q1<{ id: number; status: string; attempt_count: number }>(
      `SELECT id, status, attempt_count FROM notifications
       WHERE alert_id = $1 AND channel = $2 AND recipient = $3
       ORDER BY id DESC LIMIT 1`,
      [alertId, channel, recipient],
      client
    );

    if (existing?.status === "sent") return null;

    if (existing) {
      await client.query(
        `UPDATE notifications
         SET status = 'queued', sent_at = NULL, error = NULL, attempted_at = $1, attempt_count = attempt_count + 1
         WHERE id = $2`,
        [at, existing.id]
      );
      return Number(existing.id);
    }

    const res = await client.query<{ id: number }>(
      `INSERT INTO notifications (alert_id, channel, recipient, status, attempted_at, attempt_count)
       VALUES ($1, $2, $3, 'queued', $4, 1)
       RETURNING id`,
      [alertId, channel, recipient, at]
    );
    return Number(res.rows[0].id);
  });
}

export async function completeDelivery(
  id: number,
  sent: boolean,
  at: number,
  error?: string
): Promise<void> {
  await q(
    "UPDATE notifications SET status = $1, sent_at = $2, error = $3 WHERE id = $4",
    [sent ? "sent" : "failed", sent ? at : null, error?.slice(0, 500) ?? null, id]
  );
}

export async function listDeliveries(alertId: number): Promise<Delivery[]> {
  const rows = await q<{
    id: number;
    channel: string;
    recipient: string | null;
    status: string;
    sent_at: number | null;
    error: string | null;
    attempt_count: number;
  }>(
    "SELECT id, channel, recipient, status, sent_at, error, attempt_count FROM notifications WHERE alert_id = $1 ORDER BY id ASC",
    [alertId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    channel: ChannelSchema.parse(row.channel),
    recipient: row.recipient ?? "unknown",
    status: (row.status === "sent" ? "sent" : row.status === "failed" ? "failed" : "queued") as "queued" | "sent" | "failed",
    sentAt: row.sent_at ? Number(row.sent_at) : null,
    error: row.error,
    attemptCount: Number(row.attempt_count ?? 0),
  }));
}

/** Get pending retries (queued or failed with attempt_count < 3) */
export async function listPendingRetries(limit = 10): Promise<Delivery[]> {
  const rows = await q<{
    id: number;
    channel: string;
    recipient: string | null;
    status: string;
    sent_at: number | null;
    error: string | null;
    attempt_count: number;
  }>(
    `SELECT id, channel, recipient, status, sent_at, error, attempt_count
     FROM notifications
     WHERE status IN ('queued', 'failed') AND attempt_count < 3
     ORDER BY id ASC
     LIMIT $1`,
    [limit]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    channel: ChannelSchema.parse(row.channel),
    recipient: row.recipient ?? "unknown",
    status: (row.status === "sent" ? "sent" : row.status === "failed" ? "failed" : "queued") as "queued" | "sent" | "failed",
    sentAt: row.sent_at ? Number(row.sent_at) : null,
    error: row.error,
    attemptCount: Number(row.attempt_count ?? 0),
  }));
}
