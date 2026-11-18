import { env } from "../env";

export async function sendTwilioMessage(to: string, from: string, body: string): Promise<void> {
  const settings = env();
  if (!settings.TWILIO_ACCOUNT_SID || !settings.TWILIO_AUTH_TOKEN) {
    throw new Error("SMS delivery is not configured; set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN");
  }
  const accountSid = settings.TWILIO_ACCOUNT_SID;
  const authorization = Buffer.from(`${accountSid}:${settings.TWILIO_AUTH_TOKEN}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${authorization}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`SMS provider rejected the request (HTTP ${response.status})`);
}

export async function sendSms(to: string, body: string): Promise<void> {
  const from = env().TWILIO_FROM_SMS;
  if (!from) throw new Error("SMS delivery is not configured; set TWILIO_FROM_SMS");
  await sendTwilioMessage(to, from, body);
}
