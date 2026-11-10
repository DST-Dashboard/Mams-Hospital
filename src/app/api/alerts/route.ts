import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";
import { AlertListQuery } from "@/contracts/alerts";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const url = new URL(req.url);
  const q = AlertListQuery.parse({
    state: url.searchParams.get("state") ?? undefined,
    tankId: url.searchParams.get("tankId") ?? undefined,
    severity: url.searchParams.get("severity") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const rows = alerts.listFiltered({
    state: q.state,
    tankId: q.tankId,
    severity: q.severity,
    type: q.type,
    from: q.from,
    to: q.to,
  });

  return ok(rows.map(alerts.toDTO));
});
