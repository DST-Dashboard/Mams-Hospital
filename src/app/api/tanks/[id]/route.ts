import { requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { getTank, restoreTank, softDeleteTank, TankInput, updateTank } from "@/server/repos/tanks";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_: Request, { params }: Ctx) => {
  await requireRole("viewer");
  const t = getTank(intParam((await params).id));
  return t ? ok(t) : fail(404, "Tank not found");
});
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireRole("admin");
  const id = intParam((await params).id);
  const before = getTank(id);
  if (!before) return fail(404, "Tank not found");
  const input = TankInput.parse(await req.json());
  updateTank(id, input);
  audit({ userId: s.uid, action: "tank.update", entity: "tank", entityId: id, before, after: input });
  return ok(getTank(id));
});
/** Soft delete only. ?restore=1 brings it back. Typing-the-label confirmation is enforced in the UI. */
export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireRole("admin");
  const id = intParam((await params).id);
  const before = getTank(id);
  if (!before) return fail(404, "Tank not found");
  const restore = new URL(req.url).searchParams.get("restore") === "1";
  if (restore) restoreTank(id);
  else softDeleteTank(id);
  audit({ userId: s.uid, action: restore ? "tank.restore" : "tank.delete", entity: "tank", entityId: id, before });
  return ok({ ok: true });
});
