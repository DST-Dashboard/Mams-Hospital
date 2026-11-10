import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { BulkBody } from "@/contracts/tanks";
import { bulkDelete, bulkUpdateStatus, bulkUpdateThresholds } from "@/server/repos/tanks";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const body = BulkBody.parse(await req.json());

  let count = 0;
  if (body.action === "status") {
    count = bulkUpdateStatus(body.ids, body.status);
    audit({ userId: s.uid, action: "tank.bulk_status", entity: "tank", after: { ids: body.ids, status: body.status } });
  } else if (body.action === "delete") {
    count = bulkDelete(body.ids);
    audit({ userId: s.uid, action: "tank.bulk_delete", entity: "tank", after: { ids: body.ids } });
  } else if (body.action === "thresholds") {
    count = bulkUpdateThresholds(body.ids, {
      warnPct: body.warnPct,
      critPct: body.critPct,
      emptyPct: body.emptyPct,
    });
    audit({
      userId: s.uid,
      action: "tank.bulk_thresholds",
      entity: "tank",
      after: { ids: body.ids, warnPct: body.warnPct, critPct: body.critPct, emptyPct: body.emptyPct },
    });
  }

  return ok({ ok: true, count });
});
