import { ApiKeyCreateBody } from "@/contracts/auth";
import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { createApiKey, listApiKeys } from "@/server/repos/api-keys";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const session = await requireRole("admin");
  return ok({ items: listApiKeys(session.uid) });
});

export const POST = handle(async (req: Request) => {
  const session = await requireRole("admin");
  const input = ApiKeyCreateBody.parse(await req.json());
  const created = createApiKey({ userId: session.uid, ...input });
  audit({
    userId: session.uid,
    action: "api_key.create",
    entity: "api_key",
    entityId: created.id,
    after: { name: created.name, role: created.role },
  });
  return ok(created, { status: 201 });
});
