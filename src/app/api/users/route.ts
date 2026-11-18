// [BE-03] OWNER: backend · User listing and creation API
import { requireRole } from "@/server/auth/guard";
import { handle, ok, fail } from "@/server/http";
import { UserCreateBody } from "@/contracts";
import { listUsers, createUser } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireRole("admin");
  return ok(await listUsers());
});

export const POST = handle(async (req: Request) => {
  const session = await requireRole("admin");
  const body = UserCreateBody.parse(await req.json());

  try {
    const newUser = await createUser(body);
    await audit({
      userId: session.uid,
      action: "user.create",
      entity: "user",
      entityId: String(newUser.id),
      after: { email: newUser.email, name: newUser.name, role: newUser.role },
    });
    return ok(newUser, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create user";
    return fail(400, msg);
  }
});
