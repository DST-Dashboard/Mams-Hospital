import { requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { ThresholdTemplateInput } from "@/contracts/tanks";
import { deleteTemplate, getTemplate, updateTemplate } from "@/server/repos/templates";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_: Request, { params }: Ctx) => {
  await requireRole("viewer");
  const id = intParam((await params).id);
  const tmpl = getTemplate(id);
  return tmpl ? ok(tmpl) : fail(404, "Template not found");
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireRole("admin");
  const id = intParam((await params).id);
  const before = getTemplate(id);
  if (!before) return fail(404, "Template not found");

  const input = ThresholdTemplateInput.parse(await req.json());
  updateTemplate(id, input);
  audit({ userId: s.uid, action: "template.update", entity: "template", entityId: id, before, after: input });
  return ok(getTemplate(id));
});

export const DELETE = handle(async (_: Request, { params }: Ctx) => {
  const s = await requireRole("admin");
  const id = intParam((await params).id);
  const before = getTemplate(id);
  if (!before) return fail(404, "Template not found");

  deleteTemplate(id);
  audit({ userId: s.uid, action: "template.delete", entity: "template", entityId: id, before });
  return ok({ ok: true });
});
