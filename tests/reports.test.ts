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
    const response = await reportDownload(report, "csv");
    const csv = await response.text();
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("tank-export.csv");
    expect(csv).toContain('"line, with ""quotes"""');
    expect(csv).toContain(",-12");
    expect(csv).toContain("\"'=HYPERLINK");
    expect(csv).toContain("\"'+SUM");
  });

  it("generates a structurally valid PDF", async () => {
    const response = await reportDownload(report, "pdf");
    const buf = Buffer.from(await response.arrayBuffer());
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("tank-export.pdf");
    expect(buf.toString("ascii", 0, 5)).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(100);
  });

  it("includes report rows beyond the first PDF page", async () => {
    const largeReport: ReportDocument = {
      ...report,
      rows: Array.from({ length: 60 }, (_, index) => [`Tank ${index}`, null, index]),
    };
    const response = await reportDownload(largeReport, "pdf");
    const buf = Buffer.from(await response.arrayBuffer());
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(buf.toString("ascii", 0, 5)).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(2000);
    expect(buf.toString("ascii")).toContain("/Count 2");
  });
});
