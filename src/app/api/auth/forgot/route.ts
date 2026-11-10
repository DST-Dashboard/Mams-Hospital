// [BE-03] OWNER: backend · Forgot password request endpoint
import { handle, ok } from "@/server/http";
import { ForgotBody } from "@/contracts";
import { createPasswordReset, byEmail } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const { email } = ForgotBody.parse(await req.json());
  const token = createPasswordReset(email);
  const user = byEmail(email);

  audit({
    userId: user ? user.id : null,
    action: "password.forgot",
    entity: "user",
    entityId: email,
  });

  // In production with email dispatcher configured, an email with the reset link containing `token` would be dispatched.
  // In dev / test, we return ok: true without disclosing user existence.
  return ok({
    ok: true,
    message: "If that email is registered, password reset instructions have been sent.",
    // Return token in development/test environments for automated testing
    ...(process.env.NODE_ENV !== "production" ? { token } : {}),
  });
});
