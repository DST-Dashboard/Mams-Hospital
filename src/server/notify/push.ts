import * as webpush from "web-push";
import { env } from "../env";
import type { PushSubscriptionRecord } from "../repos/push-subscriptions";
import { createPushEndpointAgent } from "./push-endpoint";

let configuredFor: string | null = null;

export async function sendPush(subscription: PushSubscriptionRecord, payload: { title: string; body: string; url: string }): Promise<void> {
  const settings = env();
  if (!settings.VAPID_PUBLIC_KEY || !settings.VAPID_PRIVATE_KEY || !settings.VAPID_SUBJECT) {
    throw new Error("Push delivery is not configured; set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT");
  }
  const fingerprint = `${settings.VAPID_SUBJECT}:${settings.VAPID_PUBLIC_KEY}`;
  if (configuredFor !== fingerprint) {
    webpush.setVapidDetails(settings.VAPID_SUBJECT, settings.VAPID_PUBLIC_KEY, settings.VAPID_PRIVATE_KEY);
    configuredFor = fingerprint;
  }
  const agent = await createPushEndpointAgent(subscription.endpoint);
  try {
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, JSON.stringify(payload), { TTL: 60, urgency: "high", timeout: 10_000, agent });
  } finally {
    agent.destroy();
  }
}
