import { safeAfter } from "@/server/after";
import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { buildDashboard } from "@/server/services/dashboard";
import { runTick } from "@/server/jobs/tick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireRole("viewer");
  safeAfter(async () => {
    try {
      await runTick();
    } catch {}
  });
  return ok(await buildDashboard());
});
