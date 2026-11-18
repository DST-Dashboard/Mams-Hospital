import { requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("viewer");
  const id = intParam((await params).id);
  const detail = await alerts.getDetail(id);
  if (!detail) return fail(404, "Alert not found");
  return ok(detail);
});
