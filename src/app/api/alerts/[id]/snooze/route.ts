// [BE-02] OWNER: backend · CONTRACT: SnoozeBody (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle, intParam } from "@/server/http";
import { mockOr501 } from "@/server/mock";
export const dynamic = "force-dynamic";
export const POST = handle(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("operator");
  intParam((await params).id);
  return mockOr501("SnoozeBody", () => ({ ok: true, snoozedUntil: Date.now() + 30 * 60_000 }));
});
