// [BE-11] OWNER: backend · CONTRACT: ReportQuery (src/contracts/reports)
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { DAY } from "@/domain";
import { fail, handle } from "@/server/http";
import { ReportQuery } from "@/contracts/reports";
import { reportDownload, summaryReport } from "@/server/services/reports";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  await requireRole("operator");
  const query = ReportQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const to = query.to ?? now();
  const from = query.from ?? to - 7 * DAY;
  if (from >= to || to - from > 366 * DAY) return fail(400, "Invalid report time range");
  return reportDownload(summaryReport(from, to, "Weekly tank operations report"), query.format);
});
