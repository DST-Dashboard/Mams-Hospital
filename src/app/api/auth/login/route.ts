import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { COOKIE, sign } from "@/server/auth/session";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import * as users from "@/server/repos/users";

const Body = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
// Constant-time-ish: always compare against a hash so unknown emails cost the same as wrong passwords.
const DUMMY = bcrypt.hashSync("not-a-real-password", 10);

export const POST = handle(async (req: Request) => {
  const { email, password } = Body.parse(await req.json());
  const u = users.byEmail(email);
  const good = await bcrypt.compare(password, u?.passwordHash ?? DUMMY);
  if (!u || !good || u.disabled) {
    audit({ userId: null, action: "login.failed", entity: "user", entityId: email });
    return fail(401, "Email or password is incorrect");
  }
  const e = env();
  const token = await sign({ uid: u.id, role: u.role, name: u.name }, e.SESSION_SECRET, e.SESSION_HOURS);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https", path: "/", maxAge: e.SESSION_HOURS * 3600 });
  users.touchLogin(u.id);
  audit({ userId: u.id, action: "login", entity: "user", entityId: u.id });
  return ok({ id: u.id, name: u.name, role: u.role });
});
