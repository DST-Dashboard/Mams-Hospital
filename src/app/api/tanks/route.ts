import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { createTank, getTank, listTanks, TankInput } from "@/server/repos/tanks";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const includeDeleted = new URL(req.url).searchParams.get("deleted") === "1";
  return ok(listTanks({ includeDeleted }));
});
export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const input = TankInput.parse(await req.json());
  const id = createTank(input);
  audit({ userId: s.uid, action: "tank.create", entity: "tank", entityId: id, after: input });
  return ok(getTank(id), { status: 201 });
});
