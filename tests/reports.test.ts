import { describe, expect, it } from "vitest";
import { reportDownload, type ReportDocument } from "@/server/services/reports";

const report: ReportDocument = {
  title: "Tank export",
  from: Date.UTC(2026, 9, 1),
  to: Date.UTC(2026, 9, 2),
  columns: ["Tank", "Note", "Value"],
  rows: [
    ["North tank", 'line, with "quotes"', -12],
    ["=HYPERLINK(\"https://example.test\")", "+SUM(1,2)", null],
  ],
};

describe("report serializers", () => {
  it("generates escaped CSV and neutralizes spreadsheet formulas in text fields", async () => {
    const response = reportDownload(report, "csv");
    const csv = await response.text();
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("tank-export.csv");
    expect(csv).toContain('"line, with ""quotes"""');
    expect(csv).toContain(",-12");
    expect(csv).toContain("\"'=HYPERLINK");
    expect(csv).toContain("\"'+SUM");
  });

  it("generates a structurally indexed PDF", async () => {
    const response = reportDownload(report, "pdf");
    const pdf = await response.text();
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    const startXref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(startXref, startXref + 4)).toBe("xref");
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
  });

  it("includes report rows beyond the first PDF page", async () => {
    const largeReport: ReportDocument = {
      ...report,
      rows: Array.from({ length: 60 }, (_, index) => [`Tank ${index}`, null, index]),
    };
    const response = reportDownload(largeReport, "pdf");
    const pdf = await response.text();
    expect(pdf).toContain("(Tank 59 |  | 59) Tj");
    expect(pdf.match(/\/Type \/Page \/Parent/g)).toHaveLength(2);
  });
});
