import { env } from "../env";
import { sendTwilioMessage } from "./sms";

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const { TWILIO_FROM_WHATSAPP: from } = env();
  if (!from) {
    throw new Error("WhatsApp delivery is not configured; set TWILIO_FROM_WHATSAPP");
  }
  const recipient = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  await sendTwilioMessage(recipient, from, body);
}
