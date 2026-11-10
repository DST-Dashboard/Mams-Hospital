import { requireRole } from "@/server/auth/guard";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { CloneBody } from "@/contracts/tanks";
import { cloneTank, getTank } from "@/server/repos/tanks";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const body = CloneBody.parse(await req.json());

  const source = getTank(body.sourceId);
  if (!source) return fail(404, "Source tank not found");

  const newId = cloneTank(body.sourceId, body.label, body.deviceId);
  const cloned = getTank(newId);

  audit({
    userId: s.uid,
    action: "tank.clone",
    entity: "tank",
    entityId: newId,
    before: { sourceId: body.sourceId },
    after: { id: newId, label: body.label, deviceId: body.deviceId },
  });

  return ok({ ok: true, id: newId, tank: cloned }, { status: 201 });
});
