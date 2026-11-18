import { z } from "zod";

export const ReportFormat = z.enum(["csv", "pdf"]).default("csv");
export const ReportQuery = z.object({
  from: z.coerce.number().finite().optional(),
  to: z.coerce.number().finite().optional(),
  format: ReportFormat,
});
export const IncidentReportQuery = ReportQuery.extend({
  alertId: z.coerce.number().int().positive(),
});
export const ReadingExportQuery = ReportQuery.extend({
  tankId: z.coerce.number().int().positive().optional(),
});
