import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { AuditQuery } from "@/contracts/audit";
import { listAudit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const q = AuditQuery.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    entity: url.searchParams.get("entity") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const result = listAudit(q);
  return ok(result);
});
