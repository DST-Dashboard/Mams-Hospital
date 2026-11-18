// [BE-03] OWNER: backend · Forgot password request endpoint
import { safeAfter } from "@/server/after";
import { handle, ok } from "@/server/http";
import { ForgotBody } from "@/contracts";
import { createPasswordReset, byEmail } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";
import { env } from "@/server/env";
import { sendEmail } from "@/server/notify/email";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  const settings = env();
  return ok({
    smtpConfigured: Boolean(settings.SMTP_URL),
  });
});

export const POST = handle(async (req: Request) => {
  const startedAt = Date.now();
  const { email } = ForgotBody.parse(await req.json());
  const token = await createPasswordReset(email);
  const user = await byEmail(email);

  if (user) {
    const settings = env();
    if (settings.SMTP_URL) {
      const baseUrl = settings.APP_BASE_URL || "http://localhost:3000";
      const resetUrl = new URL("/reset-password", baseUrl);
      resetUrl.searchParams.set("token", token);
      safeAfter(async () => {
        try {
          await sendEmail({
            to: user.email,
            subject: "Reset your MAMS Hospital password",
            text: `Use this link within 30 minutes to reset your password: ${resetUrl.toString()}`,
          });
        } catch (error) {
          logger.error("Password reset email delivery failed", error, { userId: user.id });
        }
      });
    } else {
      logger.warn("Password reset requested but SMTP is not configured", { userId: user.id });
    }
  }

  await audit({
    userId: user ? user.id : null,
    action: "password.forgot",
    entity: "user",
    entityId: email,
  });

  const remaining = 250 - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

  return ok({
    ok: true,
    message: "If that email is registered, password reset instructions have been sent.",
  });
});
