import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import * as alerts from "@/server/repos/alerts";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const open = new URL(req.url).searchParams.get("state") === "open";
  return ok(open ? alerts.listOpen() : alerts.listAll());
});
