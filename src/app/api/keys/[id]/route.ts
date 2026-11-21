import { handle, ok, fail, intParam } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { revokeApiKey } from "@/server/repos/api-keys";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("admin");
  const { id: rawId } = await ctx.params;
  const id = intParam(rawId);

  const revoked = await revokeApiKey(id, session.role === "admin" ? undefined : session.uid);
  if (!revoked) {
    return fail(404, "API key not found or already revoked");
  }

  await audit({
    userId: session.uid,
    action: "api_key.revoke",
    entity: "api_key",
    entityId: id,
  });

  return ok({ ok: true, revoked: true });
});
