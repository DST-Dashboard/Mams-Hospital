import nodemailer from "nodemailer";
import { env } from "../env";

export async function sendEmail(message: { to: string; subject: string; text: string }): Promise<void> {
  const settings = env();
  if (!settings.SMTP_URL || !settings.SMTP_FROM) {
    throw new Error("Email delivery is not configured; set SMTP_URL and SMTP_FROM");
  }
  const transport = nodemailer.createTransport(settings.SMTP_URL);
  try {
    await transport.sendMail({
      from: settings.SMTP_FROM,
      to: message.to,
      subject: message.subject.replace(/[\r\n]+/g, " ").slice(0, 180),
      text: message.text,
    });
  } finally {
    transport.close();
  }
}
