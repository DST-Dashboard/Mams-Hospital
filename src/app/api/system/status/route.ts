import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { getSystemStatus } from "@/server/services/system-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireRole("admin");
  const status = await getSystemStatus();
  return ok(status);
});
