import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { COOKIE, sign } from "@/server/auth/session";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { checkLoginRateLimit, recordLoginFailure, resetLoginRateLimit } from "@/server/rate-limit";
import { createSession } from "@/server/repos/sessions";
import * as users from "@/server/repos/users";
import { hasTotpEnabled, verifyUserTotp } from "@/server/auth/totp";

const Body = z.object({ email: z.string().trim().email(), password: z.string().min(1), totp: z.string().regex(/^\d{6}$/).optional() });
// Constant-time comparison dummy
const DUMMY = bcrypt.hashSync("not-a-real-password", 10);

export const POST = handle(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || null;

  const { email, password, totp } = Body.parse(await req.json());
  const rateLimitKey = `login:${ip}:${email.toLowerCase()}`;

  // Rate limit check
  const rl = checkLoginRateLimit(rateLimitKey);
  if (!rl.allowed) {
    const mins = Math.ceil(rl.resetMs / 60_000);
    return fail(429, `Too many failed login attempts. Please try again in ${mins} minute(s).`);
  }

  const u = users.byEmail(email);
  const good = await bcrypt.compare(password, u?.passwordHash ?? DUMMY);

  if (!u || !good || u.disabled) {
    recordLoginFailure(rateLimitKey);
    audit({ userId: null, action: "login.failed", entity: "user", entityId: email, ip });
    return fail(401, "Email or password is incorrect");
  }

  if (hasTotpEnabled(u.id)) {
    if (!totp) {
      recordLoginFailure(rateLimitKey);
      audit({ userId: u.id, action: "login.failed", entity: "user", entityId: String(u.id), ip });
      return fail(401, "Two-factor authentication required", { twoFactorRequired: true });
    }
    if (!verifyUserTotp(u.id, totp)) {
      recordLoginFailure(rateLimitKey);
      audit({ userId: u.id, action: "login.failed", entity: "user", entityId: String(u.id), ip });
      return fail(401, "Email, password, or verification code is incorrect");
    }
  }

  // Login successful
  resetLoginRateLimit(rateLimitKey);
  const e = env();

  // Create persisted session record
  const sessionId = createSession(u.id, e.SESSION_HOURS, ip, userAgent);

  const token = await sign(
    { uid: u.id, role: u.role, name: u.name, sessionId },
    e.SESSION_SECRET,
    e.SESSION_HOURS
  );

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      new URL(req.url).protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: e.SESSION_HOURS * 3600,
  });

  users.touchLogin(u.id);
  audit({ userId: u.id, action: "login", entity: "user", entityId: String(u.id), ip });

  return ok({ id: u.id, name: u.name, role: u.role });
});
