// [BE-07] OWNER: backend · CONTRACT: NotificationPrefsDTO (src/contracts)
import { NotificationPrefsDTO } from "@/contracts/settings";
import { requireRole } from "@/server/auth/guard";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { getNotificationPrefs, saveNotificationPrefs } from "@/server/repos/notification-prefs";
import { q1 } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  const session = await requireRole("viewer");
  return ok(await getNotificationPrefs(session.uid));
});

export const PUT = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const input = NotificationPrefsDTO.parse(await req.json());

  if (input.tankIds.length) {
    const tankIds = [...new Set(input.tankIds)];
    if (tankIds.length > 200) return fail(400, "At most 200 tanks may be selected");

    for (const tankId of tankIds) {
      const exists = await q1("SELECT 1 FROM tanks WHERE id = $1 AND deleted_at IS NULL", [tankId]);
      if (!exists) {
        return fail(400, "One or more tanks were not found");
      }
    }
  }

  const before = await getNotificationPrefs(session.uid);
  const saved = await saveNotificationPrefs(session.uid, input);
  await audit({
    userId: session.uid,
    action: "notification_prefs.update",
    entity: "notification_prefs",
    entityId: session.uid,
    before,
    after: saved,
  });
  return ok(saved);
});
