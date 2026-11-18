import { cookies } from "next/headers";
import { env } from "../env";
import { atLeast, COOKIE, verify, type Role, type Session } from "./session";
import { byId } from "../repos/users";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function currentSession(): Promise<Session | null> {
  const cookieVal = (await cookies()).get(COOKIE)?.value;
  const cookieSession = await verify(cookieVal, env().SESSION_SECRET);
  if (!cookieSession) return null;

  const user = await byId(cookieSession.uid);
  if (!user || user.disabled) return null;

  return {
    uid: user.id,
    role: user.role,
    name: user.name,
  };
}

/** Throws 401/403. Every mutation calls requireRole and writes audit(). */
export async function requireRole(min: Role = "viewer"): Promise<Session> {
  const s = await currentSession();
  if (!s) throw new HttpError(401, "Not signed in");
  if (!atLeast(s.role, min)) throw new HttpError(403, `Requires ${min} role`);
  return s;
}
