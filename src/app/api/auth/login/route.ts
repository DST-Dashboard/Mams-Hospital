import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { COOKIE, sign } from "@/server/auth/session";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { checkLoginRateLimit, recordLoginFailure, resetLoginRateLimit } from "@/server/rate-limit";
import * as users from "@/server/repos/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const POST = handle(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const { email, password } = Body.parse(await req.json());
  const rateLimitKey = `login:${ip}:${email.toLowerCase()}`;

  // Rate limit check
  const rl = await checkLoginRateLimit(rateLimitKey);
  if (!rl.allowed) {
    const mins = Math.ceil(rl.resetMs / 60_000);
    return fail(429, `Too many failed login attempts. Please try again in ${mins} minute(s).`);
  }

  const u = await users.byEmail(email);
  const good = await bcrypt.compare(password, u?.passwordHash ?? DUMMY_HASH);

  if (!u || !good || u.disabled) {
    await recordLoginFailure(rateLimitKey);
    await audit({ userId: null, action: "login.failed", entity: "user", entityId: email, ip });
    return fail(401, "Email or password is incorrect");
  }

  // Login successful
  await resetLoginRateLimit(rateLimitKey);
  const e = env();

  const token = await sign(
    { uid: u.id, role: u.role, name: u.name },
    e.SESSION_SECRET,
    e.SESSION_HOURS
  );

  const isSecure =
    new URL(req.url).protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https" ||
    process.env.NODE_ENV === "production";

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: e.SESSION_HOURS * 3600,
  });

  await users.touchLogin(u.id);
  await audit({ userId: u.id, action: "login", entity: "user", entityId: String(u.id), ip });

  return ok({
    id: u.id,
    name: u.name,
    role: u.role,
    mustChangePassword: u.mustChangePassword,
  });
});
