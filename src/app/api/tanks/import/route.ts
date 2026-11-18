import { requireRole } from "@/server/auth/guard";
import { handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { TankExportFile } from "@/contracts/tanks";
import { importTanks } from "@/server/services/tank-import-export";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const s = await requireRole("admin");
  const body = TankExportFile.parse(await req.json());

  const result = importTanks(body.tanks);
  audit({
    userId: s.uid,
    action: "tank.import",
    entity: "tank",
    after: { total: body.tanks.length, ...result },
  });

  return ok({ ok: true, ...result });
});
