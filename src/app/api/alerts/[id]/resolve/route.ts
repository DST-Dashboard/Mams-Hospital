import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, intParam, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";
import { audit } from "@/server/repos/audit";
import { ResolveBody } from "@/contracts/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireRole("operator");
  const id = intParam((await params).id);
  const body = ResolveBody.parse(await req.json().catch(() => ({})));
  const before = await alerts.getAlert(id);
  if (!before || before.resolvedAt) return fail(404, "Open alert not found");

  const at = now();
  await alerts.resolve(id, at, body.note, s.uid);
  await audit({
    userId: s.uid,
    action: "alert.resolve",
    entity: "alert",
    entityId: id,
    before,
    after: { resolvedAt: at, note: body.note },
  });

  return ok(await alerts.getAlert(id));
});
