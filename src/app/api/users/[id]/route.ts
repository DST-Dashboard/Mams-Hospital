// [BE-03] OWNER: backend · User detail, update, and disable API
import { requireRole } from "@/server/auth/guard";
import { handle, intParam, ok, fail } from "@/server/http";
import { UserUpdateBody } from "@/contracts";
import { byId, updateUser, deleteUser } from "@/server/repos/users";
import { audit } from "@/server/repos/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_: Request, { params }: Ctx) => {
  await requireRole("admin");
  const id = intParam((await params).id);
  const user = byId(id);
  if (!user) return fail(404, "User not found");
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    disabled: user.disabled,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  });
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const session = await requireRole("admin");
  const id = intParam((await params).id);
  const before = byId(id);
  if (!before) return fail(404, "User not found");

  const body = UserUpdateBody.parse(await req.json());

  try {
    const updated = updateUser(id, body);
    audit({
      userId: session.uid,
      action: "user.update",
      entity: "user",
      entityId: String(id),
      before: { name: before.name, role: before.role, disabled: before.disabled },
      after: { name: updated.name, role: updated.role, disabled: updated.disabled },
    });
    return ok(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    return fail(400, msg);
  }
});

export const DELETE = handle(async (_: Request, { params }: Ctx) => {
  const session = await requireRole("admin");
  const id = intParam((await params).id);
  const before = byId(id);
  if (!before) return fail(404, "User not found");

  deleteUser(id);
  audit({
    userId: session.uid,
    action: "user.delete",
    entity: "user",
    entityId: String(id),
    before: { name: before.name, role: before.role, disabled: before.disabled },
  });

  return ok({ ok: true, message: "User disabled successfully" });
});
