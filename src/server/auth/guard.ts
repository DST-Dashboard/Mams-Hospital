import { cookies, headers } from "next/headers";
import { env } from "../env";
import { atLeast, COOKIE, verify, type Role, type Session } from "./session";
import { authenticateApiKey } from "../repos/api-keys";
import { validateSession } from "../repos/sessions";
import { byId } from "../repos/users";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function currentSession(): Promise<Session | null> {
  const cookieSession = await verify((await cookies()).get(COOKIE)?.value, env().SESSION_SECRET);
  if (cookieSession?.sessionId) {
    const persisted = validateSession(cookieSession.sessionId);
    if (persisted.valid && persisted.userId === cookieSession.uid) {
      const user = byId(cookieSession.uid);
      if (user && !user.disabled) {
        return { uid: user.id, role: user.role, name: user.name, sessionId: cookieSession.sessionId };
      }
    }
  }
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const apiKey = requestHeaders.get("x-api-key") ?? (authorization?.startsWith("Bearer ") ? authorization.slice(7) : null);
  return apiKey ? authenticateApiKey(apiKey) : null;
}
/** Throws 401/403 — wrap handlers with `handle()` from server/http.ts. */
export async function requireRole(min: Role = "viewer"): Promise<Session> {
  const s = await currentSession();
  if (!s) throw new HttpError(401, "Not signed in");
  if (!atLeast(s.role, min)) throw new HttpError(403, `Requires ${min} role`);
  return s;
}
