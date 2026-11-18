import { TankRecipientDTO, TankRecipientInput } from "@/contracts/tanks";
import { HttpError, requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { db } from "@/server/db";
import { removeForTank, setForTank } from "@/server/repos/recipients";
import { getTank } from "@/server/repos/tanks";

export const dynamic = "force-dynamic";

async function tankIdFrom(context: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await context.params;
  const idValue = intParam(id);
  const tank = getTank(idValue);
  if (!tank || tank.deletedAt != null) throw new HttpError(404, "Tank not found");
  return idValue;
}

export const GET = handle(async (_req: Request, context: { params: Promise<{ id: string }> }) => {
  await requireRole("admin");
  const id = await tankIdFrom(context);
  const users = db().prepare(`
    SELECT r.user_id AS userId, u.email, u.name, r.channels
    FROM alert_recipients r
    JOIN users u ON u.id = r.user_id
    WHERE r.tank_id = ? AND u.disabled = 0
    ORDER BY u.email
  `).all(id) as Array<{ userId: number; email: string; name: string; channels: string }>;
  return ok({
    items: users.map(({ channels, ...user }) => TankRecipientDTO.parse({ ...user, channels: JSON.parse(channels) })),
  });
});

export const PUT = handle(async (req: Request, context: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("admin");
  const id = await tankIdFrom(context);
  const input = TankRecipientInput.parse(await req.json());
  const user = db().prepare("SELECT id FROM users WHERE id = ? AND disabled = 0").get(input.userId);
  if (!user) return fail(404, "User not found");
  setForTank(id, input.userId, input.channels);
  audit({
    userId: session.uid,
    action: "tank.recipient.set",
    entity: "tank",
    entityId: id,
    after: { userId: input.userId, channels: input.channels },
  });
  return ok({ ok: true });
});

export const DELETE = handle(async (req: Request, context: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("admin");
  const id = await tankIdFrom(context);
  const userId = intParam(new URL(req.url).searchParams.get("userId"), "userId");
  if (!removeForTank(id, userId)) return fail(404, "Tank recipient not found");
  audit({
    userId: session.uid,
    action: "tank.recipient.remove",
    entity: "tank",
    entityId: id,
    before: { userId },
  });
  return ok({ ok: true });
});
