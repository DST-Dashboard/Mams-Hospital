// [BE-03] OWNER: backend · Change password API
import { requireRole } from "@/server/auth/guard";
import { handle, ok, fail } from "@/server/http";
import { changeUserPassword } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const body = await req.json();
  const current = body.current ?? body.currentPassword;
  const next = body.next ?? body.newPassword;

  if (!current || !next) {
    return fail(400, "Current and new password are required");
  }

  try {
    await changeUserPassword(session.uid, current, next);
    await audit({
      userId: session.uid,
      action: "password.change",
      entity: "user",
      entityId: String(session.uid),
    });
    return ok({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to change password";
    return fail(400, msg);
  }
});
