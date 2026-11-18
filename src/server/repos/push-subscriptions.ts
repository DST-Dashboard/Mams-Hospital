import { db } from "../db";

export interface PushSubscriptionRecord {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function savePushSubscription(userId: number, subscription: Omit<PushSubscriptionRecord, "id">): number {
  db().prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth
  `).run(userId, subscription.endpoint, subscription.p256dh, subscription.auth, Date.now());
  const row = db().prepare("SELECT id FROM push_subscriptions WHERE endpoint = ? AND user_id = ?")
    .get(subscription.endpoint, userId) as { id: number } | undefined;
  if (!row) throw new Error("Push subscription was not persisted");
  return row.id;
}

export function listPushSubscriptions(userId: number): PushSubscriptionRecord[] {
  return db().prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as PushSubscriptionRecord[];
}

export function removePushSubscription(userId: number, endpoint: string): boolean {
  return db().prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?")
    .run(userId, endpoint).changes === 1;
}

export function removePushSubscriptionById(id: number): void {
  db().prepare("DELETE FROM push_subscriptions WHERE id = ?").run(id);
}

export function touchPushSubscription(id: number): void {
  db().prepare("UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?").run(Date.now(), id);
}
