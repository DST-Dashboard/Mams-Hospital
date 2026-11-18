// [BE-11] OWNER: backend · CONTRACT: ReadingExportQuery (src/contracts/reports)
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { DAY } from "@/domain";
import { fail, handle } from "@/server/http";
import { ReadingExportQuery } from "@/contracts/reports";
import { getTank } from "@/server/repos/tanks";
import { readingsExport, reportDownload } from "@/server/services/reports";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  await requireRole("operator");
  const query = ReadingExportQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const to = query.to ?? now();
  const from = query.from ?? to - 7 * DAY;
  if (from >= to || to - from > 90 * DAY) return fail(400, "Readings export range must be between 0 and 90 days");
  if (query.tankId != null && !getTank(query.tankId)) return fail(404, "Tank not found");
  return reportDownload(readingsExport(from, to, query.tankId), query.format);
});
