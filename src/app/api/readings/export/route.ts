// [BE-11] OWNER: backend · CONTRACT: ReadingExportQuery (src/contracts/reports)
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { DAY } from "@/domain";
import { fail, handle } from "@/server/http";
import { ReadingExportQuery } from "@/contracts/reports";
import { getTank } from "@/server/repos/tanks";
import { audit } from "@/server/repos/audit";
import { readingsExport, reportDownload } from "@/server/services/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  const session = await requireRole("operator");
  const query = ReadingExportQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const to = query.to ?? now();
  const from = query.from ?? to - 7 * DAY;
  if (from >= to || to - from > 90 * DAY) {
    return fail(400, "Readings export range must be between 0 and 90 days");
  }
  if (query.tankId != null && !(await getTank(query.tankId))) {
    return fail(404, "Tank not found");
  }

  await audit({
    userId: session.uid,
    action: "readings.export",
    entity: "readings",
    entityId: query.tankId ? String(query.tankId) : "all",
    after: { from, to, format: query.format },
  });

  const doc = await readingsExport(from, to, query.tankId);
  return await reportDownload(doc, query.format);
});
