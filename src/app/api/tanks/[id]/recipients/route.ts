import { TankRecipientDTO, TankRecipientInput } from "@/contracts/tanks";
import { HttpError, requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { q, q1 } from "@/server/db";
import { removeForTank, setForTank } from "@/server/repos/recipients";
import { getTank } from "@/server/repos/tanks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function tankIdFrom(context: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await context.params;
  const idValue = intParam(id);
  const tank = await getTank(idValue);
  if (!tank || tank.deletedAt != null) throw new HttpError(404, "Tank not found");
  return idValue;
}

export const GET = handle(async (_req: Request, context: { params: Promise<{ id: string }> }) => {
  await requireRole("admin");
  const id = await tankIdFrom(context);
  const users = await q<{ userId: number; email: string; name: string; channels: unknown }>(
    `SELECT r.user_id AS "userId", u.email, u.name, r.channels
     FROM alert_recipients r
     JOIN users u ON u.id = r.user_id
     WHERE r.tank_id = $1 AND u.disabled = FALSE
     ORDER BY u.email`,
    [id]
  );
  return ok({
    items: users.map(({ channels, ...user }) =>
      TankRecipientDTO.parse({
        ...user,
        userId: Number(user.userId),
        channels: typeof channels === "string" ? JSON.parse(channels) : channels,
      })
    ),
  });
});

export const PUT = handle(async (req: Request, context: { params: Promise<{ id: string }> }) => {
  const session = await requireRole("admin");
  const id = await tankIdFrom(context);
  const input = TankRecipientInput.parse(await req.json());
  const user = await q1("SELECT id FROM users WHERE id = $1 AND disabled = FALSE", [input.userId]);
  if (!user) return fail(404, "User not found");
  await setForTank(id, input.userId, input.channels);
  await audit({
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
  const removed = await removeForTank(id, userId);
  if (!removed) return fail(404, "Tank recipient not found");
  await audit({
    userId: session.uid,
    action: "tank.recipient.remove",
    entity: "tank",
    entityId: id,
    after: { userId },
  });
  return ok({ ok: true });
});
