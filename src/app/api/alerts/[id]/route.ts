// [BE-02] OWNER: backend · CONTRACT: AlertDetailDTO (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle, intParam } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { alertDetail } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("viewer");
  const id = intParam((await params).id);
  return mockOr501("AlertDetailDTO", () => alertDetail(id));
});
