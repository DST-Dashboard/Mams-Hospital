import { TotpTokenBody } from "@/contracts/auth";
import { confirmTotpSetup } from "@/server/auth/totp";
import { requireRole } from "@/server/auth/guard";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const { token } = TotpTokenBody.parse(await req.json());
  if (!confirmTotpSetup(session.uid, token)) return fail(400, "Invalid or expired authenticator code");
  audit({ userId: session.uid, action: "totp.enable", entity: "user", entityId: session.uid });
  return ok({ enabled: true });
});
