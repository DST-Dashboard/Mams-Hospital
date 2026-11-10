// [BE-03] OWNER: backend · CONTRACT: UserUpdateBody (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle, intParam } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { users } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const PATCH = handle(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin");
  intParam((await params).id);
  return mockOr501("UserUpdateBody", () => users[1]);
});
export const DELETE = handle(async (_: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin");
  intParam((await params).id);
  return mockOr501("disable user", () => ({ ok: true }));
});
