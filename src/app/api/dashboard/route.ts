import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { buildDashboard } from "@/server/services/dashboard";
export const dynamic = "force-dynamic";
export const GET = handle(async () => { await requireRole("viewer"); return ok(buildDashboard()); });
