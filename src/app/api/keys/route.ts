import { z } from "zod";
import { handle, ok } from "@/server/http";
import { requireRole } from "@/server/auth/guard";
import { createApiKey, listApiKeys } from "@/server/repos/api-keys";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateKeySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  role: z.enum(["viewer", "operator", "admin"]).default("operator"),
  tankId: z.coerce.number().int().positive().nullable().optional(),
  expiresAt: z.coerce.number().int().positive().nullable().optional(),
});

export const GET = handle(async () => {
  const session = await requireRole("operator");
  const keys = await listApiKeys(session.role === "admin" ? undefined : session.uid);
  return ok(keys);
});

export const POST = handle(async (req: Request) => {
  const session = await requireRole("admin");
  const body = CreateKeySchema.parse(await req.json());

  const created = await createApiKey({
    name: body.name,
    role: body.role,
    userId: session.uid,
    tankId: body.tankId ?? null,
    expiresAt: body.expiresAt ?? null,
  });

  await audit({
    userId: session.uid,
    action: "api_key.create",
    entity: "api_key",
    entityId: created.id,
    after: { name: created.name, role: created.role, tankId: created.tankId, prefix: created.keyPrefix },
  });

  const { rawKey, ...keyInfo } = created;
  return ok({ ok: true, key: rawKey, ...keyInfo }, { status: 201 });
});
