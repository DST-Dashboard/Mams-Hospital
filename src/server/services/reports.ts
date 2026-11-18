import { derive } from "@/domain/derive";
import { DAY } from "@/domain/time";
import { now } from "../clock";
import { getAlert } from "../repos/alerts";
import * as readings from "../repos/readings";
import { getTank, listTanks } from "../repos/tanks";
import { tankAnalytics } from "./analytics";

type Cell = string | number | null;
export interface ReportDocument {
  title: string;
  from: number;
  to: number;
  columns: string[];
  rows: Cell[][];
}

export function summaryReport(from: number, to: number, title: string): ReportDocument {
  const rows = listTanks().map((tank) => {
    const analytics = tankAnalytics(tank, from, to);
    return [
      tank.label,
      tank.deviceId,
      analytics.samples,
      analytics.completenessPct,
      analytics.levelPct?.mean == null ? null : Math.round(analytics.levelPct.mean * 10) / 10,
      analytics.consumedL,
      analytics.pumpedInL,
      analytics.anomalies.length,
      analytics.waterCost.estimatedCost,
    ];
  });
  return {
    title,
    from,
    to,
    columns: ["Tank", "Device", "Samples", "Completeness %", "Mean level %", "Consumed L", "Pumped in L", "Anomalies", "Estimated cost INR"],
    rows,
  };
}

export function weeklyReport(to = now()): ReportDocument {
  return summaryReport(to - 7 * DAY, to, "Weekly tank operations report");
}

export function monthlyReport(to = now()): ReportDocument {
  return summaryReport(to - 30 * DAY, to, "Monthly tank operations report");
}

export function incidentReport(alertId: number, asOf = now()): ReportDocument | undefined {
  const alert = getAlert(alertId, asOf);
  if (!alert) return undefined;
  const tank = getTank(alert.tankId);
  const from = alert.openedAt - 6 * 60 * 60_000;
  const to = Math.min(alert.resolvedAt ?? asOf, alert.openedAt + 24 * 60 * 60_000);
  const rows = tank?.deviceId
    ? readings.range(tank.deviceId, from, to).map((reading) => {
      const derived = derive(reading.distanceCm, tank.geometry);
      return [
        new Date(reading.t).toISOString(),
        reading.distanceCm,
        derived.levelPct,
        derived.volumeL,
        reading.rssi ?? null,
        reading.snr ?? null,
        reading.batteryPct ?? null,
      ];
    })
    : [];
  return {
    title: `Incident ${alert.id} - ${alert.tankLabel ?? `Tank ${alert.tankId}`}`,
    from,
    to,
    columns: ["UTC timestamp", "Distance cm", "Level %", "Volume L", "RSSI", "SNR", "Battery %"],
    rows: [
      [`Alert ${alert.id}: ${alert.type}`, alert.severity, alert.state, alert.message, null, null, null],
      ...rows,
    ],
  };
}

export function readingsExport(from: number, to: number, tankId?: number): ReportDocument {
  const tanks = listTanks().filter((tank) => tankId == null || tank.id === tankId);
  const rows = tanks.flatMap((tank) => tank.deviceId
    ? readings.range(tank.deviceId, from, to).map((reading) => {
      const derived = derive(reading.distanceCm, tank.geometry);
      return [
        new Date(reading.t).toISOString(),
        tank.id,
        tank.label,
        tank.deviceId,
        reading.distanceCm,
        derived.levelCm,
        derived.levelPct,
        derived.volumeL,
        derived.quality,
        reading.fCnt ?? null,
        reading.rssi ?? null,
        reading.snr ?? null,
        reading.batteryPct ?? null,
      ];
    })
    : []);
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return {
    title: "Tank readings export",
    from,
    to,
    columns: ["UTC timestamp", "Tank ID", "Tank", "Device ID", "Distance cm", "Level cm", "Level %", "Volume L", "Quality", "Frame counter", "RSSI", "SNR", "Battery %"],
    rows,
  };
}

function csvCell(value: Cell): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(value)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function reportCsv(report: ReportDocument): string {
  const rows: Cell[][] = [
    ["Report", report.title],
    ["From (UTC)", new Date(report.from).toISOString()],
    ["To (UTC)", new Date(report.to).toISOString()],
    [],
    report.columns,
    ...report.rows,
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function pdfText(value: Cell): string {
  return (value == null ? "" : String(value))
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function reportPdf(report: ReportDocument): string {
  const rowsPerPage = 42;
  const rowPages: Cell[][][] = [];
  for (let index = 0; index < report.rows.length; index += rowsPerPage) {
    rowPages.push(report.rows.slice(index, index + rowsPerPage));
  }
  if (!rowPages.length) rowPages.push([]);

  const streams = rowPages.map((rows, pageIndex) => {
    const lines = [
      report.title,
      `From UTC: ${new Date(report.from).toISOString()}`,
      `To UTC: ${new Date(report.to).toISOString()}`,
      `Page ${pageIndex + 1} of ${rowPages.length}`,
      report.columns.join(" | "),
      ...rows.map((row) => row.map(pdfText).join(" | ")),
    ];
    return `BT\n/F1 9 Tf\n40 800 Td\n${lines.map((line, index) => `${index ? "0 -15 Td\n" : ""}(${pdfText(line)}) Tj`).join("\n")}\nET`;
  });
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${streams.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${streams.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  streams.forEach((stream, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
  });
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, "ascii"));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, "ascii");
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) document += `${String(offset).padStart(10, "0")} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return document;
}

export function reportDownload(report: ReportDocument, format: "csv" | "pdf"): Response {
  const name = report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const body = format === "csv" ? reportCsv(report) : reportPdf(report);
  const contentType = format === "csv" ? "text/csv; charset=utf-8" : "application/pdf";
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${name}.${format}"`,
      "cache-control": "no-store",
    },
  });
}
