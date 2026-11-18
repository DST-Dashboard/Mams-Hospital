import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { exportTanks } from "@/server/services/tank-import-export";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireRole("admin");
  const tanks = exportTanks();
  return ok({
    schema: 1,
    exportedAt: new Date().toISOString(),
    tanks,
  });
});
