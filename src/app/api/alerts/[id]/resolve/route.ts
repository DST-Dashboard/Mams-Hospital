import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, intParam, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";
import { audit } from "@/server/repos/audit";
import { ResolveBody } from "@/contracts/alerts";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireRole("operator");
  const id = intParam((await params).id);
  const body = ResolveBody.parse(await req.json().catch(() => ({})));
  const before = alerts.getAlert(id);
  if (!before || before.resolvedAt) return fail(404, "Open alert not found");

  const at = now();
  alerts.resolve(id, at, body.note);
  audit({
    userId: s.uid,
    action: "alert.resolve",
    entity: "alert",
    entityId: id,
    before,
    after: { resolvedAt: at, note: body.note },
  });

  return ok(alerts.getAlert(id));
});
