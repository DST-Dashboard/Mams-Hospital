// [BE-03] OWNER: backend · Reset password completion endpoint
import { handle, ok, fail } from "@/server/http";
import { ResetBody } from "@/contracts";
import { verifyAndConsumePasswordReset } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const { token, password } = ResetBody.parse(await req.json());

  try {
    await verifyAndConsumePasswordReset(token, password);
    audit({
      userId: null,
      action: "password.reset",
      entity: "user",
      entityId: "token-consumed",
    });
    return ok({ ok: true, message: "Password has been reset successfully. Please sign in with your new password." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Password reset failed";
    return fail(400, msg);
  }
});
