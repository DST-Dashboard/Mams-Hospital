// [BE-11] OWNER: backend · CONTRACT: IncidentReportQuery (src/contracts/reports)
import { requireRole } from "@/server/auth/guard";
import { fail, handle } from "@/server/http";
import { IncidentReportQuery } from "@/contracts/reports";
import { incidentReport, reportDownload } from "@/server/services/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  await requireRole("operator");
  const query = IncidentReportQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const report = await incidentReport(query.alertId);
  if (!report) return fail(404, "Alert not found");
  return await reportDownload(report, query.format);
});
