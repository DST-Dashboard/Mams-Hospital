import { cookies } from "next/headers";
import { COOKIE } from "@/server/auth/session";
import { currentSession } from "@/server/auth/guard";
import { ok } from "@/server/http";
import { revokeSession } from "@/server/repos/sessions";
export async function POST() {
  const session = await currentSession();
  if (session?.sessionId) revokeSession(session.sessionId);
  (await cookies()).delete(COOKIE);
  return ok({ ok: true });
}
