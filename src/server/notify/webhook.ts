import crypto from "node:crypto";
import { env } from "../env";

export async function sendWebhook(payload: unknown): Promise<void> {
  const settings = env();
  if (!settings.NOTIFY_WEBHOOK_URL || !settings.NOTIFY_WEBHOOK_SECRET) {
    throw new Error("Webhook delivery is not configured; set NOTIFY_WEBHOOK_URL and NOTIFY_WEBHOOK_SECRET");
  }
  const url = new URL(settings.NOTIFY_WEBHOOK_URL);
  if (settings.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("Production notification webhooks must use HTTPS");
  }
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = crypto.createHmac("sha256", settings.NOTIFY_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mams-timestamp": timestamp,
      "x-mams-signature": `v1=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Notification webhook rejected the request (HTTP ${response.status})`);
}
