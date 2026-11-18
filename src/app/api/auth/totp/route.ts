import bcrypt from "bcryptjs";
import { TotpDisableBody } from "@/contracts/auth";
import { disableTotp } from "@/server/auth/totp";
import { requireRole } from "@/server/auth/guard";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { byId } from "@/server/repos/users";

export const dynamic = "force-dynamic";

export const DELETE = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const input = TotpDisableBody.parse(await req.json());
  const user = byId(session.uid);
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    return fail(401, "Current password is incorrect");
  }
  if (!disableTotp(session.uid, input.token)) return fail(400, "Invalid or expired authenticator code");
  audit({ userId: session.uid, action: "totp.disable", entity: "user", entityId: session.uid });
  return ok({ enabled: false });
});
