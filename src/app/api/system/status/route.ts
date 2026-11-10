// [BE-13] OWNER: backend · CONTRACT: SystemStatusDTO (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { systemStatus } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("admin");
  return mockOr501("SystemStatusDTO", () => systemStatus);
});
