import nodemailer from "nodemailer";
import { env } from "../env";
import { logger } from "../logger";

export async function sendEmail(message: { to: string; subject: string; text: string }): Promise<boolean> {
  const settings = env();
  if (!settings.SMTP_URL) {
    logger.info("Email delivery skipped (SMTP_URL not configured)", { to: message.to, subject: message.subject });
    return false;
  }

  const transport = nodemailer.createTransport(settings.SMTP_URL);
  try {
    await transport.sendMail({
      from: settings.EMAIL_FROM,
      to: message.to,
      subject: message.subject.replace(/[\r\n]+/g, " ").slice(0, 180),
      text: message.text,
    });
    return true;
  } finally {
    transport.close();
  }
}
