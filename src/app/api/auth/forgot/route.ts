// [BE-03] OWNER: backend · Forgot password request endpoint
import crypto from "node:crypto";
import { after } from "next/server";
import { handle, ok } from "@/server/http";
import { ForgotBody } from "@/contracts";
import { createPasswordReset, byEmail } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";
import { checkGeneralRateLimit } from "@/server/rate-limit";
import { env } from "@/server/env";
import { sendEmail } from "@/server/notify/email";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const startedAt = Date.now();
  const { email } = ForgotBody.parse(await req.json());
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkGeneralRateLimit(`password-reset-ip:${ip}`, 10, 15 * 60_000).allowed) {
    await maintainMinimumResponseTime(startedAt);
    return ok({ ok: true, message: "If that email is registered, password reset instructions have been sent." });
  }
  const emailHash = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  if (!checkGeneralRateLimit(`password-reset-email:${emailHash}`, 3, 60 * 60_000).allowed) {
    await maintainMinimumResponseTime(startedAt);
    return ok({ ok: true, message: "If that email is registered, password reset instructions have been sent." });
  }
  const token = createPasswordReset(email);
  const user = byEmail(email);

  if (user) {
    const settings = env();
    if (settings.APP_BASE_URL && settings.SMTP_URL && settings.SMTP_FROM) {
      const resetUrl = new URL("/reset-password", settings.APP_BASE_URL);
      resetUrl.searchParams.set("token", token);
      after(async () => {
        try {
          await sendEmail({
          to: user.email,
          subject: "Reset your MAMS Hospital password",
          text: `Use this link within one hour to reset your password: ${resetUrl.toString()}`,
          });
        } catch (error) {
          logger.error("Password reset email delivery failed", error, { userId: user.id });
        }
      });
    } else {
      logger.warn("Password reset email is not configured", { userId: user.id });
    }
  }

  audit({
    userId: user ? user.id : null,
    action: "password.forgot",
    entity: "user",
    entityId: email,
  });

  await maintainMinimumResponseTime(startedAt);
  return ok({
    ok: true,
    message: "If that email is registered, password reset instructions have been sent.",
  });
});

async function maintainMinimumResponseTime(startedAt: number): Promise<void> {
  const remaining = 250 - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}
