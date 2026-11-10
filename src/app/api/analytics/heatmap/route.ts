// [BE-05] OWNER: backend · CONTRACT: HeatmapDTO (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle, intParam } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { heatmap } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const tankId = intParam(new URL(req.url).searchParams.get("tankId"), "tankId");
  return mockOr501("HeatmapDTO", () => heatmap(tankId));
});
