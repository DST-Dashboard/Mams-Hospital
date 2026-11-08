// [BE-03] OWNER: backend · CONTRACT: ChangePasswordBody (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
export const dynamic = "force-dynamic";
export const POST = handle(async () => {
  await requireRole("viewer");
  return mockOr501("ChangePasswordBody", () => ({ ok: true }));
});
