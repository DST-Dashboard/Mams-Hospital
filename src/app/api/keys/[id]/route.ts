import { requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { revokeApiKey } from "@/server/repos/api-keys";

export const dynamic = "force-dynamic";

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("admin");
  const id = intParam((await params).id);
  if (!revokeApiKey(id, session.uid)) return fail(404, "API key not found");
  audit({ userId: session.uid, action: "api_key.revoke", entity: "api_key", entityId: id });
  return ok({ revoked: true });
});
