import { z } from "zod";
import { derive, DAY, resolutionFor, RES_MS } from "@/domain";
import { rollup } from "@/analytics";
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, ok } from "@/server/http";
import * as readings from "@/server/repos/readings";
import { getTank } from "@/server/repos/tanks";
export const dynamic = "force-dynamic";

const Q = z.object({
  tankId: z.coerce.number().int().positive(),
  from: z.coerce.number().optional(), to: z.coerce.number().optional(),
  res: z.enum(["auto", "raw", "15m", "1h", "1d"]).default("auto"),
});

/** Points carry BOTH the raw distance and derived values; null = no data (never 0). */
export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const q = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const tank = getTank(q.tankId);
  if (!tank?.deviceId) return fail(404, "Tank not found or has no device");
  const to = q.to ?? now(), from = q.from ?? to - DAY;
  if (from >= to) return fail(400, "`from` must be before `to`");
  const res = q.res === "auto" ? resolutionFor(from, to) : q.res;
  const rows = readings.range(tank.deviceId, from, to);
  const src = res === "raw" ? rows.map((r) => ({ t: r.t, distanceCm: r.distanceCm })) : rollup(rows, RES_MS[res]).map((b) => ({ t: b.t, distanceCm: b.distanceCm }));
  const points = src.map((p) => { const d = derive(p.distanceCm, tank.geometry); return { t: p.t, distanceCm: p.distanceCm, levelCm: d.levelCm, levelPct: d.levelPct, volumeL: d.volumeL, quality: d.quality }; });
  return ok({ tankId: tank.id, resolution: res, from, to, simulated: tank.simulated, dimsConfirmed: tank.dimsConfirmed, count: points.length, points });
});
