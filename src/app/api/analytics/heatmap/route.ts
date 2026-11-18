// [BE-05] OWNER: backend · CONTRACT: HeatmapDTO (src/contracts)
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { DAY } from "@/domain";
import { fail, handle, ok } from "@/server/http";
import { HeatmapQuery } from "@/contracts/analytics";
import { getTank } from "@/server/repos/tanks";
import * as readings from "@/server/repos/readings";
import { tankHeatmap } from "@/server/services/heatmap";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const query = HeatmapQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const to = query.to ?? now();
  const from = query.from ?? to - 7 * DAY;
  if (from >= to) return fail(400, "`from` must be earlier than `to`");
  const tank = getTank(query.tankId);
  if (!tank) return fail(404, "Tank not found");
  const rows = tank.deviceId ? readings.range(tank.deviceId, from, to) : [];
  return ok(tankHeatmap(tank.id, tank.geometry, rows, from, to, query.tz));
});
