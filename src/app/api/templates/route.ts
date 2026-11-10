import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { ThresholdTemplateInput } from "@/contracts/tanks";
import { createTemplate, listTemplates } from "@/server/repos/templates";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireRole("viewer");
  return ok(listTemplates());
});

export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const input = ThresholdTemplateInput.parse(await req.json());
  const id = createTemplate(input);
  audit({ userId: s.uid, action: "template.create", entity: "template", entityId: id, after: input });
  return ok({ id, ...input }, { status: 201 });
});
