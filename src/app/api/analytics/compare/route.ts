// [BE-05] OWNER: backend · CONTRACT: CompareDTO (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { compare } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("viewer");
  return mockOr501("CompareDTO", () => compare);
});
