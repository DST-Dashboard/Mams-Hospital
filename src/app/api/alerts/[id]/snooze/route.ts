import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, intParam, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";
import { audit } from "@/server/repos/audit";
import { SnoozeBody } from "@/contracts/alerts";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireRole("operator");
  const id = intParam((await params).id);
  const body = SnoozeBody.parse(await req.json());
  const before = alerts.getAlert(id);
  if (!before || before.resolvedAt) return fail(404, "Open alert not found");

  const at = now();
  const snoozedUntil = alerts.snooze(id, at, body.minutes);
  audit({
    userId: s.uid,
    action: "alert.snooze",
    entity: "alert",
    entityId: id,
    before,
    after: { snoozedUntil, minutes: body.minutes },
  });

  return ok(alerts.getAlert(id));
});
