import { cookies } from "next/headers";
import { env } from "../env";
import { atLeast, COOKIE, verify, type Role, type Session } from "./session";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function currentSession(): Promise<Session | null> {
  return verify((await cookies()).get(COOKIE)?.value, env().SESSION_SECRET);
}
/** Throws 401/403 — wrap handlers with `handle()` from server/http.ts. */
export async function requireRole(min: Role = "viewer"): Promise<Session> {
  const s = await currentSession();
  if (!s) throw new HttpError(401, "Not signed in");
  if (!atLeast(s.role, min)) throw new HttpError(403, `Requires ${min} role`);
  return s;
}
