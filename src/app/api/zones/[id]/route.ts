import { requireRole } from "@/server/auth/guard";
import { fail, handle, intParam, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { ZoneInput } from "@/contracts/tanks";
import { deleteZone, getZone, updateZone } from "@/server/repos/zones";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_: Request, { params }: Ctx) => {
  await requireRole("viewer");
  const id = intParam((await params).id);
  const zone = getZone(id);
  return zone ? ok(zone) : fail(404, "Zone not found");
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireRole("admin");
  const id = intParam((await params).id);
  const before = getZone(id);
  if (!before) return fail(404, "Zone not found");

  const input = ZoneInput.parse(await req.json());
  updateZone(id, input);
  audit({ userId: s.uid, action: "zone.update", entity: "zone", entityId: id, before, after: input });
  return ok(getZone(id));
});

export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  const s = await requireRole("admin");
  const id = intParam((await params).id);
  const before = getZone(id);
  if (!before) return fail(404, "Zone not found");

  const force = new URL(req.url).searchParams.get("force") === "1";
  deleteZone(id, force);
  audit({ userId: s.uid, action: "zone.delete", entity: "zone", entityId: id, before });
  return ok({ ok: true });
});
