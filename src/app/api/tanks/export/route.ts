// [BE-06] OWNER: backend · CONTRACT: TankExportFile (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("admin");
  return mockOr501("TankExportFile", () => ({ schema: 1, exportedAt: new Date().toISOString(), tanks: [] }));
});
