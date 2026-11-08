// [BE-07] OWNER: backend · CONTRACT: NotificationPrefsDTO (src/contracts) · STATUS: mock — replace with the real implementation
import { requireRole } from "@/server/auth/guard";
import { handle } from "@/server/http";
import { mockOr501 } from "@/server/mock";
import { notificationPrefs } from "@/contracts/fixtures";
export const dynamic = "force-dynamic";
export const GET = handle(async () => {
  await requireRole("viewer");
  return mockOr501("NotificationPrefsDTO", () => notificationPrefs);
});
export const PUT = handle(async () => {
  await requireRole("viewer");
  return mockOr501("NotificationPrefsDTO", () => notificationPrefs);
});
