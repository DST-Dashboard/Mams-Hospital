import { z } from "zod";
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, intParam, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";
import { audit } from "@/server/repos/audit";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const s = await requireRole("operator");
  const id = intParam((await params).id);
  const { note } = z.object({ note: z.string().max(500).optional() }).parse(await req.json().catch(() => ({})));
  const before = alerts.getAlert(id);
  if (!before || before.resolvedAt) return fail(404, "Open alert not found");
  alerts.acknowledge(id, now(), s.uid, note ?? null);
  audit({ userId: s.uid, action: "alert.ack", entity: "alert", entityId: id, before, after: { note } });
  return ok(alerts.getAlert(id));
});
