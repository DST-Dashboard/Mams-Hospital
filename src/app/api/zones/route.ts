import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { ZoneInput } from "@/contracts/tanks";
import { createZone, listZones } from "@/server/repos/zones";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireRole("viewer");
  return ok(listZones());
});

export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const input = ZoneInput.parse(await req.json());
  const id = createZone(input);
  audit({ userId: s.uid, action: "zone.create", entity: "zone", entityId: id, after: input });
  return ok({ id, ...input }, { status: 201 });
});
