import { currentSession } from "@/server/auth/guard";
import { fail, ok } from "@/server/http";
export async function GET() {
  const session = await currentSession();
  return session
    ? ok({ uid: session.uid, role: session.role, name: session.name })
    : fail(401, "Not signed in");
}
