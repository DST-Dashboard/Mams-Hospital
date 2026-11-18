import { TotpSetupBody } from "@/contracts/auth";
import { beginTotpSetup, hasTotpEnabled, provisioningUri, verifyUserTotp } from "@/server/auth/totp";
import { requireRole } from "@/server/auth/guard";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { byId } from "@/server/repos/users";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const input = TotpSetupBody.parse(await req.json());
  if (hasTotpEnabled(session.uid) && (!input.currentToken || !verifyUserTotp(session.uid, input.currentToken))) {
    return fail(401, "A current two-factor code is required to rotate the authenticator");
  }
  const user = byId(session.uid);
  if (!user || user.disabled) return fail(404, "User not found");
  const secret = beginTotpSetup(session.uid);
  audit({ userId: session.uid, action: "totp.setup", entity: "user", entityId: session.uid });
  return ok({ secret, provisioningUri: provisioningUri(secret, user.email) });
});
