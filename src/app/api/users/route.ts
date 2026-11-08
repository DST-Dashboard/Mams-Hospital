// [BE-03] OWNER: backend · CONTRACT: UserDTO[] · UserCreateBody (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { users } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("admin");
  return mockOr501("UserDTO[]", () => users);
});
export const POST = handle(async () => {
  await requireRole("admin");
  return mockOr501("UserCreateBody", () => users[1], { status: 201 });
});
