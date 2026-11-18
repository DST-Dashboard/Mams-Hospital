import { currentSession } from "@/server/auth/guard";
import { fail, ok } from "@/server/http";
import { byId } from "@/server/repos/users";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await currentSession();
  if (!session) return fail(401, "Not signed in");

  const user = await byId(session.uid);
  return ok({
    uid: session.uid,
    role: session.role,
    name: session.name,
    mustChangePassword: Boolean(user?.mustChangePassword),
  });
}
