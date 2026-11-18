import PDFDocument from "pdfkit";
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

export async function summaryReport(from: number, to: number, title: string): Promise<ReportDocument> {
  const tanks = await listTanks();
  const rows: Cell[][] = [];

  for (const tank of tanks) {
    const analytics = await tankAnalytics(tank, from, to);
    rows.push([
      tank.label,
      tank.deviceId,
      analytics.samples,
      analytics.completenessPct,
      analytics.levelPct?.mean == null ? null : Math.round(analytics.levelPct.mean * 10) / 10,
      analytics.consumedL,
      analytics.pumpedInL,
      analytics.anomalies.length,
      analytics.waterCost.estimatedCost,
    ]);
  }

  return {
    title,
    from,
    to,
    columns: ["Tank", "Device", "Samples", "Completeness %", "Mean level %", "Consumed L", "Pumped in L", "Anomalies", "Estimated cost INR"],
    rows,
  };
}

export async function weeklyReport(to = now()): Promise<ReportDocument> {
  return await summaryReport(to - 7 * DAY, to, "Weekly tank operations report");
}

export async function monthlyReport(to = now()): Promise<ReportDocument> {
  return await summaryReport(to - 30 * DAY, to, "Monthly tank operations report");
}

export async function incidentReport(alertId: number, asOf = now()): Promise<ReportDocument | undefined> {
  const alert = await getAlert(alertId, asOf);
  if (!alert) return undefined;
  const tank = await getTank(alert.tankId);
  const from = alert.openedAt - 6 * 60 * 60_000;
  const to = Math.min(alert.resolvedAt ?? asOf, alert.openedAt + 24 * 60 * 60_000);

  const rawRows = tank?.deviceId ? await readings.range(tank.deviceId, from, to) : [];
  const rows = rawRows.map((reading) => {
    const derived = derive(reading.distanceCm, tank!.geometry);
    return [
      new Date(reading.t).toISOString(),
      reading.distanceCm,
      derived.levelPct,
      derived.volumeL,
      reading.rssi ?? null,
      reading.snr ?? null,
      reading.batteryPct ?? null,
    ];
  });

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

export async function readingsExport(from: number, to: number, tankId?: number): Promise<ReportDocument> {
  const allTanks = await listTanks();
  const tanks = allTanks.filter((tank) => tankId == null || tank.id === tankId);
  const rows: Cell[][] = [];

  for (const tank of tanks) {
    if (!tank.deviceId) continue;
    const rRows = await readings.range(tank.deviceId, from, to);
    for (const reading of rRows) {
      const derived = derive(reading.distanceCm, tank.geometry);
      rows.push([
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
      ]);
    }
  }

  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  return {
    title: "Tank readings export",
    from,
    to,
    columns: [
      "UTC timestamp",
      "Tank ID",
      "Tank",
      "Device ID",
      "Distance cm",
      "Level cm",
      "Level %",
      "Volume L",
      "Quality",
      "Frame counter",
      "RSSI",
      "SNR",
      "Battery %",
    ],
    rows,
  };
}

function csvCell(value: Cell): string {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\u0000-\u0020]*[=+\-@]/.test(value)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportCsv(report: ReportDocument): string {
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

export async function generatePdfBuffer(report: ReportDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(18).font("Helvetica-Bold").text("MAMS Hospital — OHTMS", { align: "left" });
      doc.fontSize(14).font("Helvetica").text(report.title, { align: "left" });
      doc.moveDown(0.5);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#4b5563")
        .text(`Generated: ${new Date().toISOString()} | Window: ${new Date(report.from).toISOString()} to ${new Date(report.to).toISOString()}`);
      doc.moveDown(1);

      // Table Header
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827");
      const headerLine = report.columns.slice(0, 7).join("   |   ");
      doc.text(headerLine);
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();
      doc.moveDown(0.8);

      // Rows
      doc.font("Helvetica").fontSize(8).fillColor("#374151");
      const maxRows = Math.min(report.rows.length, 120);
      for (let i = 0; i < maxRows; i++) {
        const row = report.rows[i];
        const line = row.slice(0, 7).map((c) => (c == null ? "—" : String(c))).join("   |   ");
        if (doc.y > 750) {
          doc.addPage();
        }
        doc.text(line, { width: 515 });
        doc.moveDown(0.4);
      }

      if (report.rows.length > maxRows) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Oblique").fontSize(8).text(`... and ${report.rows.length - maxRows} additional records.`);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function reportDownload(report: ReportDocument, format: "csv" | "pdf"): Promise<Response> {
  const name = report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (format === "csv") {
    const csvContent = reportCsv(report);
    return new Response(csvContent, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${name}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  const pdfBuf = await generatePdfBuffer(report);
  return new Response(new Uint8Array(pdfBuf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
