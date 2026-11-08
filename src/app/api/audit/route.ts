// [BE-04] OWNER: backend · CONTRACT: Page<AuditEntryDTO> (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { audit } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("admin");
  return mockOr501("Page<AuditEntryDTO>", () => ({ items: audit, total: audit.length, page: 1, pageSize: 50 }));
});
