// [BE-03] OWNER: backend · CONTRACT: ForgotBody (src/contracts) · STATUS: mock — replace with the real implementation

import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
export const dynamic = "force-dynamic";
export const POST = handle(async () => {
  return mockOr501("ForgotBody", () => ({ ok: true }));
});
