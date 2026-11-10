// [BE-11] OWNER: backend · CONTRACT: file download (PDF/CSV) (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("operator");
  return mockOr501("file download", () => ({ note: "Real endpoint returns a PDF/CSV file; no JSON mock." }));
});
