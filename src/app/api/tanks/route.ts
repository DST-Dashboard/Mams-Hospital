import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { createTank, getTank, listTanks, TankInput } from "@/server/repos/tanks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const includeDeleted = new URL(req.url).searchParams.get("deleted") === "1";
  return ok(await listTanks({ includeDeleted }));
});

export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const input = TankInput.parse(await req.json());
  const id = await createTank(input);
  await audit({ userId: s.uid, action: "tank.create", entity: "tank", entityId: id, after: input });
  const created = await getTank(id);
  return ok(created, { status: 201 });
});
